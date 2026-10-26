
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Fuel,
  ShoppingCart,
  Undo2,
  DollarSign,
  BarChart3,
  Download,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

const REASONS = [
  "Wrong Fuel",
  "Over Payment",
  "Customer Change Mind",
  "System Error",
  "Damaged Product",
  "Other",
];

const STATUS_CLS = {
  approved: "bg-emerald-50 text-emerald-600",
  pending: "bg-orange-50 text-orange-500",
  rejected: "bg-red-50 text-red-600",
};

const usd = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const nf = (n, d = 2) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const sum = (rows, key) =>
  rows.reduce((total, row) => total + Number(row[key] || 0), 0);

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getHeaders = () => ({
  Accept: "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("gas_station_token") || ""}`,
});

async function requestJSON(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        result.message ||
        `Request failed (${response.status})`
    );
  }

  return result;
}

// Fetch every Laravel pagination page so totals are not limited to 15 rows.
async function fetchAllPages(url) {
  const allRows = [];
  let nextUrl = url;

  while (nextUrl) {
    const result = await requestJSON(nextUrl);

    if (Array.isArray(result)) {
      allRows.push(...result);
      break;
    }

    if (Array.isArray(result.data)) {
      allRows.push(...result.data);
    }

    nextUrl = result.next_page_url || null;
  }

  return allRows;
}

const getSaleId = (sale, kind) =>
  Number(
    kind === "Fuel Sale"
      ? sale.sale_id
      : sale.store_sale_id
  );

const getSaleReference = (sale) =>
  sale.sale_number ||
  sale.receipt_number ||
  `Sale #${sale.sale_id ?? sale.store_sale_id}`;

const getSaleAmount = (sale) =>
  Number(sale.total_amount ?? sale.subtotal ?? 0);

const getSaleDate = (sale) => sale.sale_date || sale.created_at || "";

const getRefundStatus = (refund) =>
  String(refund.status || "pending").toLowerCase();

const getRefundKind = (refund) =>
  refund.original_sale_id != null ? "Fuel Sale" : "Store Sale";

const getRefundReference = (refund) => {
  const sale =
    refund.fuel_sale ||
    refund.fuelSale ||
    refund.store_sale ||
    refund.storeSale;

  if (sale) return getSaleReference(sale);

  if (refund.original_sale_id != null) {
    return `Fuel Sale #${refund.original_sale_id}`;
  }

  if (refund.original_store_sale_id != null) {
    return `Store Sale #${refund.original_store_sale_id}`;
  }

  return `Refund #${refund.refund_id}`;
};

const getTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getLocalDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const getFuelName = (sale) =>
  sale.fuel_type?.fuel_name ||
  sale.fuel_type?.name ||
  sale.fuelType?.fuel_name ||
  sale.fuelType?.name ||
  sale.fuelType?.type_name ||
  sale.fuel_type_name ||
  `Fuel #${sale.fuel_id ?? "Unknown"}`;

function buildFuelRows(sales) {
  const groups = {};

  sales.forEach((sale) => {
    const type = getFuelName(sale);

    if (!groups[type]) {
      groups[type] = { type, qty: 0, amount: 0, tx: 0 };
    }

    groups[type].qty += Number(sale.quantity || 0);
    groups[type].amount += getSaleAmount(sale);
    groups[type].tx += 1;
  });

  return Object.values(groups).sort((a, b) =>
    a.type.localeCompare(b.type)
  );
}

function buildStoreRows(sales) {
  const groups = {};

  sales.forEach((sale) => {
    const items = sale.items || [];

    if (!items.length) {
      const category = "Other";

      if (!groups[category]) {
        groups[category] = { cat: category, amount: 0, tx: 0 };
      }

      groups[category].amount += getSaleAmount(sale);
      groups[category].tx += 1;
      return;
    }

    // Distribute the sale's transaction count across its item categories.
    // Amounts use the stored item subtotal and are grouped by product category.
    const categoryAmounts = {};

    items.forEach((item) => {
      const product = item.product || {};
      const category =
        product.category?.category_name ||
        product.category?.name ||
        product.category_name ||
        product.category ||
        "Other";

      const itemAmount = Number(
        item.subtotal ??
          Number(item.quantity || 0) * Number(item.unit_price || 0)
      );

      categoryAmounts[category] =
        (categoryAmounts[category] || 0) + itemAmount;
    });

    const itemTotal = Object.values(categoryAmounts).reduce(
      (total, amount) => total + amount,
      0
    );

    Object.entries(categoryAmounts).forEach(([category, amount]) => {
      if (!groups[category]) {
        groups[category] = { cat: category, amount: 0, tx: 0 };
      }

      // Include sale-level tax/discount proportionally so category totals
      // reconcile with the sale total.
      const allocatedAmount =
        itemTotal > 0
          ? amount * (getSaleAmount(sale) / itemTotal)
          : 0;

      groups[category].amount += allocatedAmount;
      groups[category].tx += 1;
    });
  });

  return Object.values(groups).sort((a, b) =>
    a.cat.localeCompare(b.cat)
  );
}

const downloadCSV = (filename, rows) => {
  const escape = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const blob = new Blob(
    ["\uFEFF", rows.map((row) => row.map(escape).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const Btn = ({ children, v = "blue", className = "", ...props }) => {
  const styles = {
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "border bg-white text-slate-700 hover:bg-slate-50",
    red: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${styles[v]} ${className}`}
    >
      {children}
    </button>
  );
};

const Field = ({ label, ...props }) => (
  <label className="block text-sm text-slate-700">
    {label}
    <input
      {...props}
      className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-sky-400"
    />
  </label>
);

const Sel = ({ label, options, ...props }) => (
  <label className="block text-sm text-slate-700">
    {label}
    <select
      {...props}
      className="mt-1 w-full rounded-lg border px-3 py-2"
    >
      {options.map((option) =>
        typeof option === "string" ? (
          <option key={option} value={option}>
            {option}
          </option>
        ) : (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        )
      )}
    </select>
  </label>
);

export default function DailySales() {
  const [date, setDate] = useState(getToday);
  const [view, setView] = useState("All");
  const [refunds, setRefunds] = useState([]);
  const [fuelSales, setFuelSales] = useState([]);
  const [storeSales, setStoreSales] = useState([]);
  const [rFilter, setRFilter] = useState("All");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    kind: "Fuel Sale",
    saleId: "",
    amount: "",
    reason: REASONS[0],
    other: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadDailySales = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [fuelData, storeData, refundData] = await Promise.all([
        fetchAllPages(
          `${API_URL}/fuel-sales?date=${encodeURIComponent(date)}&payment_status=paid`
        ),
        fetchAllPages(
          `${API_URL}/store-sales?date=${encodeURIComponent(date)}&payment_status=paid`
        ),
        fetchAllPages(`${API_URL}/refunds`),
      ]);

      setFuelSales(
        fuelData.filter(
          (sale) =>
            sale.payment_status === "paid" &&
            getLocalDate(getSaleDate(sale)) === date
        )
      );

      setStoreSales(
        storeData.filter(
          (sale) =>
            sale.payment_status === "paid" &&
            getLocalDate(getSaleDate(sale)) === date
        )
      );

      setRefunds(
        refundData.filter(
          (refund) =>
            getLocalDate(refund.refund_date) === date
        )
      );
    } catch (err) {
      setError(err.message || "Failed to load daily sales.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadDailySales();
  }, [loadDailySales]);

  const fuelRows = useMemo(
    () => buildFuelRows(fuelSales),
    [fuelSales]
  );

  const storeRows = useMemo(
    () => buildStoreRows(storeSales),
    [storeSales]
  );

  const fuelTotal = sum(fuelSales.map((sale) => ({
    amount: getSaleAmount(sale),
  })), "amount");

  const fuelTx = fuelSales.length;
  const fuelQty = sum(fuelSales.map((sale) => ({
    qty: Number(sale.quantity || 0),
  })), "qty");

  const storeTotal = sum(storeSales.map((sale) => ({
    amount: getSaleAmount(sale),
  })), "amount");

  const storeTx = storeSales.length;

  const refundTotal = sum(
    refunds.map((refund) => ({
      amount: Number(refund.refund_amount || 0),
    })),
    "amount"
  );

  // Only approved refunds are deducted from Net Sales.
  // Pending and rejected requests are not treated as refunded money.
  const approvedRefundTotal = sum(
    refunds
      .filter((refund) => getRefundStatus(refund) === "approved")
      .map((refund) => ({
        amount: Number(refund.refund_amount || 0),
      })),
    "amount"
  );

  const net = fuelTotal + storeTotal - approvedRefundTotal;

  const shown = refunds.filter((refund) => {
    const status = getRefundStatus(refund);

    return (
      rFilter === "All" ||
      status === rFilter.toLowerCase()
    );
  });

  const selectedRefund = modal?.id
    ? refunds.find(
        (refund) => Number(refund.refund_id) === Number(modal.id)
      )
    : null;

  const availableSales =
    form.kind === "Fuel Sale" ? fuelSales : storeSales;

  const selectedSale = availableSales.find(
    (sale) => getSaleId(sale, form.kind) === Number(form.saleId)
  );

  const close = () => {
    setModal(null);
    setError("");
  };

  const openNewRefund = () => {
    setForm({
      kind: "Fuel Sale",
      saleId: "",
      amount: "",
      reason: REASONS[0],
      other: "",
    });
    setError("");
    setModal({ type: "new" });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const amount = Number(form.amount);
    const saleId = Number(form.saleId);

    if (!saleId || !selectedSale) {
      setError("Select an actual sale to refund.");
      return;
    }

    if (!(amount > 0)) {
      setError("Enter an amount greater than 0.");
      return;
    }

    if (amount > getSaleAmount(selectedSale)) {
      setError("Refund amount cannot exceed the original sale total.");
      return;
    }

    if (form.reason === "Other" && !form.other.trim()) {
      setError("Describe the reason.");
      return;
    }

    const payload = {
      original_sale_id:
        form.kind === "Fuel Sale" ? saleId : null,
      original_store_sale_id:
        form.kind === "Store Sale" ? saleId : null,
      refund_amount: amount,
      reason:
        form.reason === "Other"
          ? form.other.trim()
          : form.reason,
    };

    setSubmitting(true);

    try {
      await requestJSON(`${API_URL}/refunds`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      close();
      setToast("Refund request submitted for approval.");
      await loadDailySales();
    } catch (err) {
      setError(err.message || "Failed to submit refund.");
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    downloadCSV(`daily_sales_refunds_${date}.csv`, [
      ["DAILY SALES AND REFUNDS", date],
      [],
      ["FUEL SALES"],
      ["Fuel Type", "Quantity (L)", "Amount ($)", "Transactions"],
      ...fuelRows.map((row) => [
        row.type,
        row.qty,
        row.amount,
        row.tx,
      ]),
      ["Total Fuel Sales", fuelQty, fuelTotal, fuelTx],
      [],
      ["STORE SALES"],
      ["Category", "Amount ($)", "Transactions"],
      ...storeRows.map((row) => [
        row.cat,
        row.amount,
        row.tx,
      ]),
      ["Total Store Sales", storeTotal, storeTx],
      [],
      ["REFUNDS"],
      ["Type", "Reference", "Amount ($)", "Reason", "Time", "Status"],
      ...refunds.map((refund) => [
        getRefundKind(refund),
        getRefundReference(refund),
        refund.refund_amount,
        refund.reason,
        getTime(refund.refund_date),
        getRefundStatus(refund),
      ]),
      ["Total Refund Requests", refundTotal],
      ["Approved Refunds", approvedRefundTotal],
      [],
      ["NET SALES", net],
    ]);

    setToast("Daily report downloaded.");
  };

  const Stat = ({ icon: Icon, bg, label, value, note, tone }) => (
    <div
      className={`flex items-center gap-4 rounded-2xl p-5 ring-1 ring-slate-100 ${tone}`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white ${bg}`}
      >
        <Icon size={26} />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {note}
      </div>
    </div>
  );

  const th = "px-3 py-2 text-left text-xs font-medium text-slate-600";

  return (
    <div className="space-y-4 bg-slate-300 -m-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Daily Sales &amp; Refunds
          </h2>
          <p className="text-sm text-slate-500">
            Actual sales and refund requests from the database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-slate-600">
            Report date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="ml-2 rounded-lg border px-3 py-2"
            />
          </label>

          <Btn
            v="ghost"
            onClick={loadDailySales}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={15} />
            Refresh
          </Btn>
        </div>
      </div>

      {error && !modal && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-sm text-slate-700">
          Loading sales and refunds...
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          icon={Fuel}
          bg="bg-blue-600"
          tone="bg-blue-50"
          label="Fuel Sales"
          value={usd(fuelTotal)}
          note={
            <p className="text-xs text-slate-500">
              {fuelTx} Transactions
            </p>
          }
        />

        <Stat
          icon={ShoppingCart}
          bg="bg-green-600"
          tone="bg-green-50"
          label="Store Sales"
          value={usd(storeTotal)}
          note={
            <p className="text-xs text-slate-500">
              {storeTx} Transactions
            </p>
          }
        />

        <Stat
          icon={Undo2}
          bg="bg-red-500"
          tone="bg-red-50"
          label="Refund Requests"
          value={usd(refundTotal)}
          note={
            <p className="text-xs text-slate-500">
              {refunds.length} Requests
            </p>
          }
        />

        <Stat
          icon={DollarSign}
          bg="bg-amber-400"
          tone="bg-amber-50"
          label="Net Sales"
          value={usd(net)}
          note={
            <p className="text-xs text-slate-500">
              After approved refunds
            </p>
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-3 text-xl font-bold text-slate-800">
                <BarChart3 className="text-blue-600" />
                Daily Sales
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {["All", "Fuel Sales", "Store Sales"].map((value) => (
                  <button
                    key={value}
                    onClick={() => setView(value)}
                    className={`rounded px-4 py-1.5 text-sm font-medium transition ${
                      view === value
                        ? "bg-blue-600 text-white"
                        : "border border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold">Total Sales</p>
              <p className="text-2xl font-bold text-blue-600">
                {usd(fuelTotal + storeTotal)}
              </p>
              <button
                onClick={exportCSV}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {view !== "Store Sales" && (
            <div className="mt-4 overflow-x-auto">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Fuel size={18} className="text-blue-600" />
                Fuel Sales Summary
              </p>

              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {["Fuel Type", "Quantity (L)", "Amount ($)", "Transactions"].map((heading) => (
                      <th key={heading} className={th}>{heading}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {fuelRows.map((row) => (
                    <tr key={row.type} className="border-b">
                      <td className="px-3 py-2.5">{row.type}</td>
                      <td className="px-3 py-2.5">{nf(row.qty)}</td>
                      <td className="px-3 py-2.5">{usd(row.amount)}</td>
                      <td className="px-3 py-2.5">{row.tx}</td>
                    </tr>
                  ))}

                  {!fuelRows.length && (
                    <tr>
                      <td colSpan={4} className="py-5 text-center text-slate-400">
                        No fuel sales for this date.
                      </td>
                    </tr>
                  )}

                  <tr className="border border-blue-400 bg-blue-50 font-bold text-blue-700">
                    <td className="px-3 py-2.5">Total Fuel Sales</td>
                    <td className="px-3 py-2.5">{nf(fuelQty)}</td>
                    <td className="px-3 py-2.5">{usd(fuelTotal)}</td>
                    <td className="px-3 py-2.5">{fuelTx}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {view !== "Fuel Sales" && (
            <div className="mt-5 overflow-x-auto">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart size={18} className="text-green-600" />
                Store Sales Summary
              </p>

              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {["Category", "Amount ($)", "Transactions"].map((heading) => (
                      <th key={heading} className={th}>{heading}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {storeRows.map((row) => (
                    <tr key={row.cat} className="border-b">
                      <td className="px-3 py-2.5">{row.cat}</td>
                      <td className="px-3 py-2.5">{usd(row.amount)}</td>
                      <td className="px-3 py-2.5">{row.tx}</td>
                    </tr>
                  ))}

                  {!storeRows.length && (
                    <tr>
                      <td colSpan={3} className="py-5 text-center text-slate-400">
                        No store sales for this date.
                      </td>
                    </tr>
                  )}

                  <tr className="border border-green-500 bg-green-50 font-bold text-green-700">
                    <td className="px-3 py-2.5">Total Store Sales</td>
                    <td className="px-3 py-2.5">{usd(storeTotal)}</td>
                    <td className="px-3 py-2.5">{storeTx}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {view === "All" && (
            <div className="mt-4 flex items-center justify-between rounded border border-blue-400 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700">
              <span>Total Sales (Fuel + Store)</span>
              <span>{usd(fuelTotal + storeTotal)}</span>
              <span>{fuelTx + storeTx}</span>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-3 text-xl font-bold text-slate-800">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <Undo2 size={20} />
                </span>
                Daily Refunds
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {["All", "Approved", "Pending", "Rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setRFilter(status)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      rFilter === status
                        ? "bg-slate-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {status} (
                    {status === "All"
                      ? refunds.length
                      : refunds.filter(
                          (refund) =>
                            getRefundStatus(refund) === status.toLowerCase()
                        ).length}
                    )
                  </button>
                ))}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold">Refund Requests</p>
              <p className="text-2xl font-bold text-red-500">
                {usd(refundTotal)}
              </p>
              <p className="text-xs text-slate-500">
                {refunds.length} Requests
              </p>

              <Btn
                onClick={openNewRefund}
                className="mt-2 flex items-center gap-1.5 !px-3 !py-1.5 !text-xs"
              >
                <Plus size={14} />
                New Refund
              </Btn>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y bg-slate-50">
                  {["Type", "Reference No.", "Amount ($)", "Reason", "Time", "Status"].map((heading) => (
                    <th key={heading} className="px-3 py-2.5 text-left font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {shown.map((refund) => {
                  const status = getRefundStatus(refund);
                  const kind = getRefundKind(refund);
                  const id = refund.refund_id;

                  return (
                    <tr key={id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            kind === "Fuel Sale"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-green-50 text-green-600"
                          }`}
                        >
                          {kind === "Fuel Sale" ? (
                            <Fuel size={22} />
                          ) : (
                            <ShoppingCart size={22} />
                          )}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <button
                          onClick={() => setModal({ type: "detail", id })}
                          className="text-left hover:underline"
                        >
                          <span className="block">{kind}</span>
                          <span className="font-medium text-blue-700">
                            {getRefundReference(refund)}
                          </span>
                        </button>
                      </td>

                      <td className="px-3 py-3 font-semibold text-red-500">
                        {usd(refund.refund_amount)}
                      </td>

                      <td className="px-3 py-3">{refund.reason || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {getTime(refund.refund_date)}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`rounded px-2 py-0.5 font-semibold ${
                            STATUS_CLS[status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {!shown.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No refunds for this date.
                    </td>
                  </tr>
                )}

                <tr className="font-bold text-red-500">
                  <td colSpan={2} className="px-3 py-3">Displayed Refunds</td>
                  <td className="px-3 py-3">
                    {usd(
                      sum(
                        shown.map((refund) => ({
                          amount: Number(refund.refund_amount || 0),
                        })),
                        "amount"
                      )
                    )}
                  </td>
                  <td colSpan={3} className="px-3 py-3">{shown.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="flex items-center justify-between gap-4 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white">
            <DollarSign size={24} />
          </span>
          <div>
            <p className="text-xl font-bold text-slate-900">Net Sales</p>
            <p className="text-sm text-slate-600">
              Fuel Sales + Store Sales − Approved Refunds
            </p>
          </div>
        </div>

        <div className="rounded border border-emerald-400 bg-emerald-50 px-6 py-2 text-center">
          <p className="text-2xl font-bold text-emerald-600">{usd(net)}</p>
          <p className="text-sm text-emerald-600">Net Sales</p>
        </div>
      </section>

      {modal?.type === "new" && (
        <Modal title="New refund" onClose={close}>
          <form onSubmit={submit} className="space-y-3">
            <Sel
              label="Sale type"
              options={["Fuel Sale", "Store Sale"]}
              value={form.kind}
              onChange={(event) => {
                setForm({
                  ...form,
                  kind: event.target.value,
                  saleId: "",
                  amount: "",
                });
                setError("");
              }}
            />

            <Sel
              label="Original sale"
              options={[
                { value: "", label: "Select a sale..." },
                ...availableSales.map((sale) => ({
                  value: String(getSaleId(sale, form.kind)),
                  label: `${getSaleReference(sale)} — ${usd(getSaleAmount(sale))}`,
                })),
              ]}
              value={form.saleId}
              onChange={(event) => {
                const sale = availableSales.find(
                  (item) =>
                    getSaleId(item, form.kind) === Number(event.target.value)
                );

                setForm({
                  ...form,
                  saleId: event.target.value,
                  amount: sale ? String(getSaleAmount(sale)) : "",
                });
                setError("");
              }}
              required
            />

            {selectedSale && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="text-slate-500">Original sale amount</p>
                <p className="font-bold text-slate-800">
                  {usd(getSaleAmount(selectedSale))}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {getSaleDate(selectedSale)
                    ? new Date(getSaleDate(selectedSale)).toLocaleString()
                    : ""}
                </p>
              </div>
            )}

            <Field
              label="Refund amount ($)"
              type="number"
              min="0.01"
              max={selectedSale ? getSaleAmount(selectedSale) : undefined}
              step="0.01"
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
              required
            />

            <Sel
              label="Reason"
              options={REASONS}
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
            />

            {form.reason === "Other" && (
              <Field
                label="Describe the reason"
                value={form.other}
                onChange={(event) =>
                  setForm({ ...form, other: event.target.value })
                }
                required
              />
            )}

            <p className="text-xs text-slate-500">
              This request will remain Pending until an authorized Admin or
              Manager reviews it.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2">
              <Btn type="button" v="ghost" onClick={close}>
                Cancel
              </Btn>
              <Btn
                type="submit"
                disabled={submitting || loading || !availableSales.length}
              >
                {submitting ? "Submitting..." : "Submit refund"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "detail" && selectedRefund && (
        <Modal
          title={`Refund #${selectedRefund.refund_id}`}
          onClose={close}
        >
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Type</dt>
            <dd>{getRefundKind(selectedRefund)}</dd>

            <dt className="text-slate-500">Reference</dt>
            <dd className="break-words">
              {getRefundReference(selectedRefund)}
            </dd>

            <dt className="text-slate-500">Amount</dt>
            <dd className="font-semibold text-red-500">
              {usd(selectedRefund.refund_amount)}
            </dd>

            <dt className="text-slate-500">Reason</dt>
            <dd>{selectedRefund.reason || "—"}</dd>

            <dt className="text-slate-500">Date / Time</dt>
            <dd>{getTime(selectedRefund.refund_date)}</dd>

            <dt className="text-slate-500">Status</dt>
            <dd>
              {getRefundStatus(selectedRefund).toUpperCase()}
            </dd>
          </dl>

          <div className="mt-5 flex justify-end">
            <Btn v="ghost" onClick={close}>Close</Btn>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
