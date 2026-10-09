
import { useEffect, useState } from "react";
import {
  Undo2,
  Printer,
  Calendar,
  X,
  ChevronDown,
} from "lucide-react";

import { Panel, StatusBadge } from "../components/ui";
import { getFuelSales } from "../api/fuelSaleApi";
import { getStoreSales } from "../api/storeSaleApi";
import { createRefund } from "../api/refundApi";

/*
|--------------------------------------------------------------------------
| Reusable Modal
|--------------------------------------------------------------------------
*/
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Format Money
|--------------------------------------------------------------------------
*/
function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

/*
|--------------------------------------------------------------------------
| Format Date
|--------------------------------------------------------------------------
*/
function getDateKey(value) {
  if (!value) return "";

  const datePart = String(value).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const dateKey = getDateKey(value);

  if (!dateKey) return "—";

  const [year, month, day] = dateKey.split("-");

  return `${day}/${month}/${year}`;
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/*
|--------------------------------------------------------------------------
| Format Payment Method
|--------------------------------------------------------------------------
*/
function formatPaymentMethod(method) {
  const labels = {
    cash: "Cash",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_transfer: "Bank Transfer",
    qr_payment: "QR Payment",
  };

  return labels[String(method ?? "").toLowerCase()] ?? method ?? "—";
}

/*
|--------------------------------------------------------------------------
| Format Payment Status
|--------------------------------------------------------------------------
*/
function formatStatus(status) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "paid") return "Paid";
  if (normalized === "pending") return "Pending";
  if (normalized === "failed") return "Failed";

  return status || "Unknown";
}

/*
|--------------------------------------------------------------------------
| Format Refund Status
|--------------------------------------------------------------------------
*/
function formatRefundStatus(status) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "pending") return "Refund Pending";
  if (normalized === "approved") return "Refunded";
  if (normalized === "rejected") return "Refund Rejected";

  return "—";
}

/*
|--------------------------------------------------------------------------
| Get Records from Laravel API Response
|--------------------------------------------------------------------------
| Supports:
| 1. A direct array
| 2. Axios response containing an array
| 3. Laravel paginated response containing data.data
|--------------------------------------------------------------------------
*/
function getApiRecords(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| Map Fuel Sale API Data
|--------------------------------------------------------------------------
*/
function mapFuelSale(sale) {
  const pump = sale.pump ?? {};
  const fuelType = sale.fuelType ?? sale.fuel_type ?? {};

  const rawUser =
    sale.soldBy ??
    sale.sold_by_user ??
    sale.sold_by;

  const user =
    rawUser && typeof rawUser === "object"
      ? rawUser
      : {};

  const attendant =
    (typeof rawUser === "string" ? rawUser : null) ??
    user.full_name ??
    user.name ??
    user.user?.full_name ??
    (typeof sale.sold_by === "number" ||
    typeof sale.sold_by === "string"
      ? `User ${sale.sold_by}`
      : "—");

  return {
    id: sale.sale_id,
    saleNumber: sale.sale_number ?? "",
    receiptNumber: sale.receipt_number ?? "",

    date: formatDate(sale.sale_date),
    dateKey: getDateKey(sale.sale_date),
    time: formatTime(sale.sale_date),

    pump:
      pump.pump_number ??
      pump.pump_name ??
      pump.pump_code ??
      (sale.pump_id != null
        ? `Pump ${sale.pump_id}`
        : "—"),

    pumpId: sale.pump_id,

    fuel:
      fuelType.fuel_name ??
      fuelType.fuel_type ??
      fuelType.name ??
      (sale.fuel_id != null
        ? `Fuel ${sale.fuel_id}`
        : "—"),

    fuelId: sale.fuel_id,
    liters: Number(sale.quantity ?? 0),
    unitPrice: Number(sale.unit_price ?? 0),
    amount: Number(sale.total_amount ?? 0),
    subtotal: Number(sale.subtotal ?? 0),
    tax: Number(sale.tax ?? 0),
    discount: Number(sale.discount ?? 0),

    attendant,
    soldById: sale.sold_by,
    payment: sale.payment_method ?? "",

    // Original payment status.
    status: sale.payment_status ?? "pending",

    // Latest refund status returned by Laravel.
    refundStatus: sale.refund_status ?? null,
  };
}

/*
|--------------------------------------------------------------------------
| Map Store Sale API Data
|--------------------------------------------------------------------------
*/
function mapStoreSale(sale) {
  const items = Array.isArray(sale.items) ? sale.items : [];

  const rawUser =
    sale.soldBy ??
    sale.sold_by_user ??
    sale.sold_by;

  const user =
    rawUser && typeof rawUser === "object"
      ? rawUser
      : {};

  const cashier =
    (typeof rawUser === "string" ? rawUser : null) ??
    user.full_name ??
    user.name ??
    user.user?.full_name ??
    (typeof sale.sold_by === "number" ||
    typeof sale.sold_by === "string"
      ? `User ${sale.sold_by}`
      : "—");

  const productNames = items
    .map((item) => {
      const product = item.product ?? {};

      const productName =
        product.product_name ??
        product.productName ??
        product.name ??
        (item.product_id != null
          ? `Product ${item.product_id}`
          : "");

      const quantity = Number(item.quantity ?? 0);

      return productName
        ? `${productName}${quantity > 0 ? ` (x${quantity})` : ""}`
        : "";
    })
    .filter(Boolean);

  const totalQuantity = items.reduce(
    (total, item) => total + Number(item.quantity ?? 0),
    0
  );

  return {
    id: sale.store_sale_id,
    saleNumber: sale.sale_number ?? "",
    receiptNumber: sale.receipt_number ?? "",

    products: productNames.join(", ") || "—",
    quantity: totalQuantity,

    amount: Number(sale.total_amount ?? 0),
    subtotal: Number(sale.subtotal ?? 0),
    tax: Number(sale.tax ?? 0),
    discount: Number(sale.discount ?? 0),

    payment: sale.payment_method ?? "",
    date: formatDate(sale.sale_date),
    dateKey: getDateKey(sale.sale_date),
    time: formatTime(sale.sale_date),

    cashier,
    soldById: sale.sold_by,

    // Original payment status.
    status: sale.payment_status ?? "pending",

    // Latest refund status returned by Laravel.
    refundStatus: sale.refund_status ?? null,
  };
}

/*
|--------------------------------------------------------------------------
| Check Whether a Sale Can Receive Another Refund Request
|--------------------------------------------------------------------------
| Only paid sales without a pending refund request are eligible here.
| Laravel must still validate the remaining refundable amount.
|--------------------------------------------------------------------------
*/
function canRequestRefund(sale) {
  const isPaid =
    String(sale.status ?? "").toLowerCase() === "paid";

  const refundStatus =
    String(sale.refundStatus ?? "").toLowerCase();

  return isPaid && refundStatus !== "pending";
}

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/
export default function POSSalesHistory() {
  /*
  |--------------------------------------------------------------------------
  | Main Section
  |--------------------------------------------------------------------------
  */
  const [activeSaleType, setActiveSaleType] = useState("fuel");

  /*
  |--------------------------------------------------------------------------
  | API Data State
  |--------------------------------------------------------------------------
  */
  const [fuelSales, setFuelSales] = useState([]);
  const [storeSales, setStoreSales] = useState([]);

  const [fuelLoading, setFuelLoading] = useState(true);
  const [storeLoading, setStoreLoading] = useState(true);

  const [fuelError, setFuelError] = useState("");
  const [storeError, setStoreError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Fuel Sale Filters
  |--------------------------------------------------------------------------
  */
  const [fuelDate, setFuelDate] = useState("");
  const [fuelPump, setFuelPump] = useState("All");
  const [fuelUser, setFuelUser] = useState("All");

  /*
  |--------------------------------------------------------------------------
  | Store Sale Filters
  |--------------------------------------------------------------------------
  */
  const [storeDate, setStoreDate] = useState("");
  const [storePayment, setStorePayment] = useState("All");
  const [storeUser, setStoreUser] = useState("All");

  /*
  |--------------------------------------------------------------------------
  | Refund State
  |--------------------------------------------------------------------------
  */
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundType, setRefundType] = useState("");
  const [refundId, setRefundId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const [refundReason, setRefundReason] = useState(
    "Customer changed mind"
  );

  const [refundDone, setRefundDone] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundSuccessMessage, setRefundSuccessMessage] = useState("");
  const [refundProcessing, setRefundProcessing] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Print Receipt State
  |--------------------------------------------------------------------------
  */
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printType, setPrintType] = useState("");
  const [printId, setPrintId] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Refresh Sale Histories
  |--------------------------------------------------------------------------
  | Reload both histories after Laravel successfully creates a refund.
  |--------------------------------------------------------------------------
  */
  async function refreshSaleHistories() {
    setFuelLoading(true);
    setStoreLoading(true);

    // Refresh Fuel Sale History.
    try {
      const response = await getFuelSales();
      const records = getApiRecords(response);

      setFuelSales(records.map(mapFuelSale));
      setFuelError("");
    } catch (error) {
      setFuelError(
        error.response?.data?.message ||
          "Unable to refresh Fuel Sale History."
      );
    } finally {
      setFuelLoading(false);
    }

    // Refresh Store Sale History.
    try {
      const response = await getStoreSales();
      const records = getApiRecords(response);

      setStoreSales(records.map(mapStoreSale));
      setStoreError("");
    } catch (error) {
      setStoreError(
        error.response?.data?.message ||
          "Unable to refresh Store Sale History."
      );
    } finally {
      setStoreLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Initial Load: Fuel and Store Sale History
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    let cancelled = false;

    async function loadFuelSales() {
      setFuelLoading(true);
      setFuelError("");

      try {
        const response = await getFuelSales();
        const records = getApiRecords(response);

        if (!cancelled) {
          setFuelSales(records.map(mapFuelSale));
        }
      } catch (error) {
        if (!cancelled) {
          setFuelError(
            error.response?.data?.message ||
              "Unable to load Fuel Sale History. Please check your login and API."
          );
        }
      } finally {
        if (!cancelled) {
          setFuelLoading(false);
        }
      }
    }

    async function loadStoreSales() {
      setStoreLoading(true);
      setStoreError("");

      try {
        const response = await getStoreSales();
        const records = getApiRecords(response);

        if (!cancelled) {
          setStoreSales(records.map(mapStoreSale));
        }
      } catch (error) {
        if (!cancelled) {
          setStoreError(
            error.response?.data?.message ||
              "Unable to load Store Sale History. Please check your login and API."
          );
        }
      } finally {
        if (!cancelled) {
          setStoreLoading(false);
        }
      }
    }

    loadFuelSales();
    loadStoreSales();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Filter Fuel Sales
  |--------------------------------------------------------------------------
  */
  const filteredFuelSales = fuelSales.filter((sale) => {
    const matchDate =
      fuelDate === "" || sale.dateKey === fuelDate;

    const matchPump =
      fuelPump === "All" ||
      String(sale.pumpId) === String(fuelPump);

    const matchUser =
      fuelUser === "All" ||
      String(sale.soldById) === String(fuelUser);

    return matchDate && matchPump && matchUser;
  });

  /*
  |--------------------------------------------------------------------------
  | Filter Store Sales
  |--------------------------------------------------------------------------
  */
  const filteredStoreSales = storeSales.filter((sale) => {
    const matchDate =
      storeDate === "" || sale.dateKey === storeDate;

    const matchPayment =
      storePayment === "All" ||
      String(sale.payment).toLowerCase() ===
        String(storePayment).toLowerCase();

    const matchUser =
      storeUser === "All" ||
      String(sale.soldById) === String(storeUser);

    return matchDate && matchPayment && matchUser;
  });

  /*
  |--------------------------------------------------------------------------
  | Distinct Filter Options
  |--------------------------------------------------------------------------
  */
  const fuelDateOptions = [
    ...new Set(fuelSales.map((sale) => sale.dateKey).filter(Boolean)),
  ].sort().reverse();

  const fuelPumpOptions = [
    ...new Map(
      fuelSales
        .filter((sale) => sale.pumpId != null)
        .map((sale) => [String(sale.pumpId), sale.pump])
    ),
  ];

  const fuelUserOptions = [
    ...new Map(
      fuelSales
        .filter((sale) => sale.soldById != null)
        .map((sale) => [String(sale.soldById), sale.attendant])
    ),
  ];

  const storeDateOptions = [
    ...new Set(storeSales.map((sale) => sale.dateKey).filter(Boolean)),
  ].sort().reverse();

  const storePaymentOptions = [
    ...new Set(storeSales.map((sale) => sale.payment).filter(Boolean)),
  ];

  const storeUserOptions = [
    ...new Map(
      storeSales
        .filter((sale) => sale.soldById != null)
        .map((sale) => [String(sale.soldById), sale.cashier])
    ),
  ];

  /*
  |--------------------------------------------------------------------------
  | Open Refund Modal
  |--------------------------------------------------------------------------
  */
  function openRefund(type) {
    const sales = (
      type === "fuel" ? filteredFuelSales : filteredStoreSales
    ).filter(canRequestRefund);

    if (sales.length === 0) {
      return;
    }

    const firstSale = sales[0];

    setRefundType(type);
    setRefundId(String(firstSale.id));
    setRefundAmount(String(firstSale.amount));

    setRefundDone(false);
    setRefundError("");
    setRefundSuccessMessage("");
    setRefundProcessing(false);
    setRefundReason("Customer changed mind");

    setIsRefundOpen(true);
  }

  /*
  |--------------------------------------------------------------------------
  | Process Refund Request
  |--------------------------------------------------------------------------
  */
  async function handleProcessRefund(event) {
    event.preventDefault();

    if (!refundId || refundProcessing) {
      return;
    }

    const amount = Number(refundAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setRefundError(
        "Please enter a valid refund amount greater than zero."
      );
      return;
    }

    // Find the selected sale in the correct collection.
    const selectedSale =
      refundType === "fuel"
        ? fuelSales.find(
            (sale) => String(sale.id) === String(refundId)
          )
        : storeSales.find(
            (sale) => String(sale.id) === String(refundId)
          );

    if (!selectedSale) {
      setRefundError("The selected sale could not be found.");
      return;
    }

    // Only paid sales can be refunded.
    if (String(selectedSale.status).toLowerCase() !== "paid") {
      setRefundError("Only paid sales can be refunded.");
      return;
    }

    // Do not submit another request while a refund is pending.
    if (
      String(selectedSale.refundStatus ?? "").toLowerCase() ===
      "pending"
    ) {
      setRefundError(
        "This sale already has a pending refund request."
      );
      return;
    }

    // Basic frontend validation. Laravel performs final validation.
    if (amount > Number(selectedSale.amount)) {
      setRefundError(
        "Refund amount cannot exceed the original sale amount."
      );
      return;
    }

    setRefundProcessing(true);
    setRefundError("");
    setRefundSuccessMessage("");

    try {
      /*
       * Fuel Sale uses original_sale_id.
       * Store Sale uses original_store_sale_id.
       */
      const refundData = {
        original_sale_id:
          refundType === "fuel" ? Number(refundId) : null,

        original_store_sale_id:
          refundType === "store" ? Number(refundId) : null,

        refund_amount: amount,
        reason: refundReason,
      };

      // Submit the refund request to Laravel.
      const response = await createRefund(refundData);

      const createdRefund = response.data?.data;

      // Refresh both histories to get the latest refund status.
      await refreshSaleHistories();

      setRefundSuccessMessage(
        `Refund request #${createdRefund?.refund_id ?? "—"} created successfully. Status: ${
          createdRefund?.status ?? "pending"
        }.`
      );

      setRefundDone(true);
    } catch (error) {
      // Display Laravel validation errors when available.
      const validationErrors = error.response?.data?.errors;

      const firstValidationError = validationErrors
        ? Object.values(validationErrors).flat()[0]
        : null;

      setRefundError(
        firstValidationError ||
          error.response?.data?.message ||
          error.message ||
          "Unable to create the refund request. Please try again."
      );
    } finally {
      setRefundProcessing(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Open Print Receipt
  |--------------------------------------------------------------------------
  */
  function openPrint(type) {
    const sales = type === "fuel" ? fuelSales : storeSales;

    if (sales.length === 0) return;

    setPrintType(type);
    setPrintId(String(sales[0].id));
    setIsPrintOpen(true);
  }

  /*
  |--------------------------------------------------------------------------
  | Selected Records for Modals
  |--------------------------------------------------------------------------
  */
  const selectedFuelSale = fuelSales.find(
    (sale) => String(sale.id) === String(printId)
  );

  const selectedStoreSale = storeSales.find(
    (sale) => String(sale.id) === String(printId)
  );

  const refundFuelSale = fuelSales.find(
    (sale) => String(sale.id) === String(refundId)
  );

  const refundStoreSale = storeSales.find(
    (sale) => String(sale.id) === String(refundId)
  );

  /*
  |--------------------------------------------------------------------------
  | Main UI
  |--------------------------------------------------------------------------
  */
  return (
    <div className="min-h-screen space-y-4 bg-gray-300 p-6">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-700">
          POS &amp; Sales History
        </h2>
      </div>

      {/* SALE TYPE SWITCH */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveSaleType("fuel")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            activeSaleType === "fuel"
              ? "bg-cyan-500 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Fuel Sale
        </button>

        <button
          type="button"
          onClick={() => setActiveSaleType("store")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            activeSaleType === "store"
              ? "bg-cyan-500 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Store Sale
        </button>
      </div>

      {/* ================================================================
          FUEL SALE HISTORY
      ================================================================= */}
      {activeSaleType === "fuel" && (
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-700">
              Fuel Sale History
            </h3>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openRefund("fuel")}
                disabled={!filteredFuelSales.some(canRequestRefund)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Undo2 size={15} />
                Return / Refund
              </button>

              <button
                type="button"
                onClick={() => openPrint("fuel")}
                disabled={fuelSales.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={15} />
                Print Receipt
              </button>
            </div>
          </div>

          {/* FUEL FILTERS */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div>
              <div className="mb-1 text-sm font-medium text-black">
                Date
              </div>

              <div className="relative">
                <select
                  value={fuelDate}
                  onChange={(event) => setFuelDate(event.target.value)}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400"
                >
                  <option value="">All Dates</option>

                  {fuelDateOptions.map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>

                <Calendar
                  className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400"
                  size={14}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium text-black">
                Pump
              </div>

              <div className="relative">
                <select
                  value={fuelPump}
                  onChange={(event) => setFuelPump(event.target.value)}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400"
                >
                  <option value="All">All Pumps</option>

                  {fuelPumpOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400"
                  size={14}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium text-black">
                User
              </div>

              <div className="relative">
                <select
                  value={fuelUser}
                  onChange={(event) => setFuelUser(event.target.value)}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400"
                >
                  <option value="All">All Users</option>

                  {fuelUserOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400"
                  size={14}
                />
              </div>
            </div>
          </div>

          {/* FUEL API ERROR */}
          {fuelError && (
            <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {fuelError}
            </p>
          )}

          {/* FUEL TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-base">
              <thead>
                <tr className="border-b border-gray-200 bg-blue-300 text-black">
                  <th className="px-3 py-2 font-medium">Transaction ID</th>
                  <th className="px-3 py-2 font-medium">Pump</th>
                  <th className="px-3 py-2 font-medium">Fuel Type</th>
                  <th className="px-3 py-2 font-medium">Liters</th>
                  <th className="px-3 py-2 font-medium">Amount (KHR)</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Attendant</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Refund Status</th>
                </tr>
              </thead>

              <tbody>
                {fuelLoading ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="py-8 text-center text-slate-400"
                    >
                      Loading Fuel Sale History...
                    </td>
                  </tr>
                ) : filteredFuelSales.length > 0 ? (
                  filteredFuelSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-gray-200 hover:bg-slate-50/60"
                    >
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {sale.saleNumber ||
                          `FUEL-${String(sale.id).padStart(4, "0")}`}
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {sale.pump}
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {sale.fuel}
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {sale.liters.toLocaleString("en-US")} L
                      </td>

                      <td className="px-3 py-2 font-medium text-slate-600">
                        {formatMoney(sale.amount)}
                      </td>

                      <td className="px-3 py-2 text-slate-400">
                        <div>{sale.date}</div>
                        <div>{sale.time}</div>
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {sale.attendant}
                      </td>

                      {/* Original payment status */}
                      <td className="px-3 py-2">
                        <StatusBadge status={formatStatus(sale.status)} />
                      </td>

                      {/* Latest refund status */}
                      <td className="px-3 py-2">
                        {sale.refundStatus ? (
                          <StatusBadge
                            status={formatRefundStatus(sale.refundStatus)}
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="py-8 text-center text-slate-400"
                    >
                      No Fuel Sales found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ================================================================
          STORE SALE HISTORY
      ================================================================= */}
      {activeSaleType === "store" && (
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-700">
              Store Sale History
            </h3>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openRefund("store")}
                disabled={!filteredStoreSales.some(canRequestRefund)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Undo2 size={15} />
                Return / Refund
              </button>

              <button
                type="button"
                onClick={() => openPrint("store")}
                disabled={storeSales.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer size={15} />
                Print Receipt
              </button>
            </div>
          </div>

          {/* STORE FILTERS */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div>
              <div className="mb-1 text-sm font-medium text-black">
                Date
              </div>

              <div className="relative">
                <select
                  value={storeDate}
                  onChange={(event) => setStoreDate(event.target.value)}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400"
                >
                  <option value="">All Dates</option>

                  {storeDateOptions.map((date) => (
                    <option key={date} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>

                <Calendar
                  className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400"
                  size={14}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium text-black">
                Payment
              </div>

              <div className="relative">
                <select
                  value={storePayment}
                  onChange={(event) => setStorePayment(event.target.value)}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400"
                >
                  <option value="All">All Payments</option>

                  {storePaymentOptions.map((payment) => (
                    <option key={payment} value={payment}>
                      {formatPaymentMethod(payment)}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400"
                  size={14}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-medium text-black">
                User
              </div>

              <div className="relative">
                <select
                  value={storeUser}
                  onChange={(event) => setStoreUser(event.target.value)}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400"
                >
                  <option value="All">All Users</option>

                  {storeUserOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400"
                  size={14}
                />
              </div>
            </div>
          </div>

          {/* STORE API ERROR */}
          {storeError && (
            <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {storeError}
            </p>
          )}

          {/* STORE TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-base">
              <thead>
                <tr className="border-b border-gray-200 bg-blue-300 text-black">
                  <th className="px-3 py-2 font-medium">Sale Number</th>
                  <th className="px-3 py-2 font-medium">Products</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Amount (KHR)</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Cashier</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Refund Status</th>
                </tr>
              </thead>

              <tbody>
                {storeLoading ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="py-8 text-center text-slate-400"
                    >
                      Loading Store Sale History...
                    </td>
                  </tr>
                ) : filteredStoreSales.length > 0 ? (
                  filteredStoreSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-gray-200 hover:bg-slate-50/60"
                    >
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {sale.saleNumber || "—"}
                      </td>

                      <td
                        className="max-w-[280px] truncate px-3 py-2 text-slate-500"
                        title={sale.products}
                      >
                        {sale.products}
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {sale.quantity}
                      </td>

                      <td className="px-3 py-2 font-medium text-slate-600">
                        {formatMoney(sale.amount)}
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {formatPaymentMethod(sale.payment)}
                      </td>

                      <td className="px-3 py-2 text-slate-400">
                        <div>{sale.date}</div>
                        <div>{sale.time}</div>
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {sale.cashier}
                      </td>

                      {/* Original payment status */}
                      <td className="px-3 py-2">
                        <StatusBadge status={formatStatus(sale.status)} />
                      </td>

                      {/* Latest refund status */}
                      <td className="px-3 py-2">
                        {sale.refundStatus ? (
                          <StatusBadge
                            status={formatRefundStatus(sale.refundStatus)}
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="py-8 text-center text-slate-400"
                    >
                      No Store Sales found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ================================================================
          REFUND MODAL
      ================================================================= */}
      {isRefundOpen && (
        <Modal
          title={
            refundType === "fuel"
              ? "Fuel Sale Refund"
              : "Store Sale Refund"
          }
          onClose={() => {
            if (!refundProcessing) {
              setIsRefundOpen(false);
            }
          }}
        >
          {refundDone ? (
            <div className="flex flex-col items-center gap-3 py-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                ✓
              </div>

              <p className="text-sm font-medium text-slate-700">
                {refundSuccessMessage}
              </p>

              <p className="text-xs text-amber-600">
                This is a refund request. The actual money has not been
                transferred.
              </p>

              <button
                type="button"
                onClick={() => setIsRefundOpen(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleProcessRefund} className="space-y-4">
              {/* Select transaction */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Transaction
                </label>

                <select
                  value={refundId}
                  onChange={(event) => {
                    const nextId = event.target.value;

                    setRefundId(nextId);
                    setRefundError("");

                    // Update the default amount for the selected sale.
                    const sales =
                      refundType === "fuel" ? fuelSales : storeSales;

                    const selected = sales.find(
                      (sale) => String(sale.id) === nextId
                    );

                    setRefundAmount(
                      selected ? String(selected.amount) : ""
                    );
                  }}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                >
                  {(refundType === "fuel"
                    ? filteredFuelSales
                    : filteredStoreSales
                  )
                    .filter(canRequestRefund)
                    .map((sale) => (
                      <option key={sale.id} value={sale.id}>
                        {refundType === "fuel"
                          ? sale.saleNumber ||
                            `FUEL-${String(sale.id).padStart(4, "0")}`
                          : sale.saleNumber || `STORE-${sale.id}`}
                        {" — "}
                        {formatMoney(sale.amount)} KHR
                      </option>
                    ))}
                </select>

                <p className="mt-1 text-xs text-slate-400">
                  Selected transaction:{" "}
                  {refundType === "fuel"
                    ? refundFuelSale?.saleNumber ||
                      (refundFuelSale
                        ? `FUEL-${String(refundFuelSale.id).padStart(4, "0")}`
                        : "—")
                    : refundStoreSale?.saleNumber || "—"}
                </p>
              </div>

              {/* Refund amount */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Refund Amount (KHR)
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={
                    refundType === "fuel"
                      ? refundFuelSale?.amount ?? ""
                      : refundStoreSale?.amount ?? ""
                  }
                  value={refundAmount}
                  onChange={(event) => {
                    setRefundAmount(event.target.value);
                    setRefundError("");
                  }}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                  placeholder="Enter refund amount"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Original sale amount:{" "}
                  {formatMoney(
                    refundType === "fuel"
                      ? refundFuelSale?.amount
                      : refundStoreSale?.amount
                  )}{" "}
                  KHR
                </p>
              </div>

              {/* Refund reason */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Reason
                </label>

                <select
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                >
                  <option>Customer changed mind</option>
                  <option>Incorrect product / fuel</option>
                  <option>Payment error</option>
                  <option>Damaged product</option>
                  <option>Equipment malfunction</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Backend validation errors */}
              {refundError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                >
                  {refundError}
                </p>
              )}

              {/* Modal buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={refundProcessing}
                  onClick={() => setIsRefundOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    !refundId ||
                    !refundAmount ||
                    Number(refundAmount) <= 0 ||
                    refundProcessing
                  }
                  className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refundProcessing ? "Processing..." : "Process Refund"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ================================================================
          PRINT RECEIPT MODAL
      ================================================================= */}
      {isPrintOpen && (
        <Modal
          title={
            printType === "fuel"
              ? "Fuel Sale Receipt"
              : "Store Sale Receipt"
          }
          onClose={() => setIsPrintOpen(false)}
        >
          {/* FUEL RECEIPT */}
          {printType === "fuel" && (
            <>
              <select
                value={printId}
                onChange={(event) => setPrintId(event.target.value)}
                className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
              >
                {fuelSales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.saleNumber ||
                      `FUEL-${String(sale.id).padStart(4, "0")}`}
                    {" — "}
                    {formatMoney(sale.amount)} KHR
                  </option>
                ))}
              </select>

              {selectedFuelSale && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 font-mono text-xs text-slate-700">
                  <div className="text-center">
                    <h4 className="text-sm font-black text-slate-900">
                      V-SYCHL GAS STATION
                    </h4>

                    <p className="text-[10px] text-slate-400">
                      Fuel Sale Receipt
                    </p>
                  </div>

                  <div className="my-3 border-t border-dashed border-slate-300" />

                  <div className="space-y-1">
                    <div className="flex justify-between gap-3">
                      <span>Transaction:</span>
                      <span>
                        {selectedFuelSale.saleNumber ||
                          `FUEL-${String(selectedFuelSale.id).padStart(4, "0")}`}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Receipt No:</span>
                      <span>{selectedFuelSale.receiptNumber || "—"}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Date:</span>
                      <span>{selectedFuelSale.date}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Time:</span>
                      <span>{selectedFuelSale.time}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Pump:</span>
                      <span>{selectedFuelSale.pump}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Fuel:</span>
                      <span>{selectedFuelSale.fuel}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Unit Price:</span>
                      <span>
                        {formatMoney(selectedFuelSale.unitPrice)} KHR
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Liters:</span>
                      <span>{selectedFuelSale.liters} L</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Attendant:</span>
                      <span>{selectedFuelSale.attendant}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Payment:</span>
                      <span>
                        {formatPaymentMethod(selectedFuelSale.payment)}
                      </span>
                    </div>
                  </div>

                  <div className="my-3 border-t border-dashed border-slate-300" />

                  <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span>
                      {formatMoney(selectedFuelSale.amount)} KHR
                    </span>
                  </div>

                  <p className="mt-3 text-center text-[10px] text-slate-400">
                    Thank you!
                  </p>
                </div>
              )}
            </>
          )}

          {/* STORE RECEIPT */}
          {printType === "store" && (
            <>
              <select
                value={printId}
                onChange={(event) => setPrintId(event.target.value)}
                className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
              >
                {storeSales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.saleNumber}
                    {" — "}
                    {formatMoney(sale.amount)} KHR
                  </option>
                ))}
              </select>

              {selectedStoreSale && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 font-mono text-xs text-slate-700">
                  <div className="text-center">
                    <h4 className="text-sm font-black text-slate-900">
                      V-SYCHL GAS STATION
                    </h4>

                    <p className="text-[10px] text-slate-400">
                      Store Sale Receipt
                    </p>
                  </div>

                  <div className="my-3 border-t border-dashed border-slate-300" />

                  <div className="space-y-1">
                    <div className="flex justify-between gap-3">
                      <span>Sale No:</span>
                      <span>{selectedStoreSale.saleNumber}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Receipt No:</span>
                      <span>{selectedStoreSale.receiptNumber || "—"}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Date:</span>
                      <span>{selectedStoreSale.date}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Time:</span>
                      <span>{selectedStoreSale.time}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Products:</span>
                      <span className="max-w-[180px] text-right">
                        {selectedStoreSale.products}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Quantity:</span>
                      <span>{selectedStoreSale.quantity}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Cashier:</span>
                      <span>{selectedStoreSale.cashier}</span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Payment:</span>
                      <span>
                        {formatPaymentMethod(selectedStoreSale.payment)}
                      </span>
                    </div>
                  </div>

                  <div className="my-3 border-t border-dashed border-slate-300" />

                  <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span>
                      {formatMoney(selectedStoreSale.amount)} KHR
                    </span>
                  </div>

                  <p className="mt-3 text-center text-[10px] text-slate-400">
                    Thank you!
                  </p>
                </div>
              )}
            </>
          )}

          {/* Print buttons */}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPrintOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                printType === "fuel"
                  ? !selectedFuelSale
                  : !selectedStoreSale
              }
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={15} />
              Print Receipt
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}