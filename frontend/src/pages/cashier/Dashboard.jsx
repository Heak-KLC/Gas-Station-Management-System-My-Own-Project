
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Fuel, ShoppingCart, Banknote, ClipboardList, Bell, AlertCircle,
  AlertTriangle, CheckCircle, FileBarChart, ShoppingBasket, Undo2,
  X, Download, RefreshCw, LoaderCircle, Clock3, Play, Square,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

const COLORS = {
  fuel: "#2563eb",
  store: "#22a65a",
  payments: ["#3b82f6", "#34b37a", "#f5a623", "#8b5cf6", "#64748b"],
};

const usd = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(n) || 0);

const money = (n) => Number(n) || 0;

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2, "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
};

const isToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2, "0"
    )}-${String(date.getDate()).padStart(2, "0")}` === getToday()
  );
};

const paymentLabel = (method) => {
  const labels = {
    cash: "Cash",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_transfer: "Bank Transfer",
    qr_payment: "QR Payment",
    aba: "ABA / QR Payment",
  };

  return (
    labels[String(method || "").toLowerCase()] ||
    (method
      ? String(method)
          .replaceAll("_", " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "Other")
  );
};

const saleStatus = (status) =>
  String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Laravel Eloquent normally serializes fuelType as fuel_type.
const getFuelName = (sale) =>
  sale?.fuel_type?.fuel_name ||
  sale?.fuel_type?.fuel_type_name ||
  sale?.fuel_type?.name ||
  sale?.fuelType?.fuel_name ||
  sale?.fuelType?.fuel_type_name ||
  sale?.fuelType?.name ||
  sale?.fuel_name ||
  sale?.fuel_type_name ||
  "Fuel";

const getPumpName = (sale) =>
  sale?.pump?.pump_name ||
  sale?.pump?.pump_number ||
  sale?.pump?.name ||
  sale?.pump_name ||
  (sale?.pump_id != null
    ? `Pump ${String(sale.pump_id).padStart(2, "0")}`
    : "—");

const getStoreItems = (sale) =>
  Array.isArray(sale?.items) ? sale.items : [];

const getProductName = (item) =>
  item?.product?.product_name ||
  item?.product?.name ||
  item?.product_name ||
  "Product";

const downloadCSV = (filename, rows) => {
  const escapeCell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv =
    "\uFEFF" + rows.map((row) => row.map(escapeCell).join(",")).join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser time to start downloading before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

async function apiGet(path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body.message || `API request failed (${response.status}): ${path}`
    );
  }

  return body;
}

async function apiPost(path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationMessage =
      body.errors?.shift?.[0] ||
      body.errors?.message?.[0];

    throw new Error(
      validationMessage ||
      body.message ||
      `API request failed (${response.status}): ${path}`
    );
  }

  return body;
}

// Laravel endpoints may return either an array or a paginated response.
async function fetchAllPages(path, token) {
  const first = await apiGet(path, token);

  if (Array.isArray(first)) return first;

  if (!Array.isArray(first?.data)) {
    throw new Error(`Unexpected API response format: ${path}`);
  }

  const allRows = [...first.data];
  const lastPage = Number(first.last_page || 1);

  for (let page = 2; page <= lastPage; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const result = await apiGet(
      `${path}${separator}page=${page}`,
      token
    );

    if (Array.isArray(result?.data)) {
      allRows.push(...result.data);
    }
  }

  return allRows;
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
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

const Btn = ({
  children,
  v = "blue",
  className = "",
  ...props
}) => {
  const styles = {
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  };

  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[v]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ title, action, children, className = "" }) => (
  <section
    className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 ${className}`}
  >
    {(title || action) && (
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {action}
      </div>
    )}
    {children}
  </section>
);

const Stat = ({ icon: Icon, label, value, note, tone, text }) => (
  <div className={`rounded-2xl p-4 ring-1 ring-slate-100 ${tone}`}>
    <div className="flex items-start gap-3">
      <Icon size={32} className={text} />
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${text}`}>{label}</p>
        <p className="break-words text-2xl font-bold text-slate-900">
          {value}
        </p>
        <p className="text-xs text-slate-500">{note}</p>
      </div>
    </div>
  </div>
);

function LineChart({ buckets, show }) {
  const [hover, setHover] = useState(null);

  const W = 520;
  const H = 220;
  const L = 42;
  const R = 10;
  const T = 12;
  const B = 26;
  const n = 12;

  const maxValue = Math.max(10, ...buckets.fuel, ...buckets.store);
  const MAX = Math.ceil(maxValue / 50) * 50;

  const x = (i) => L + (i / (n - 1)) * (W - L - R);
  const y = (v) => T + (1 - v / MAX) * (H - T - B);

  const path = (values) =>
    values
      .map((value, i) => {
        const point = [x(i), y(value)];

        if (i === 0) return `M${point[0]},${point[1]}`;

        const previous = [x(i - 1), y(values[i - 1])];
        const cx = (previous[0] + point[0]) / 2;

        return `C${cx},${previous[1]} ${cx},${point[1]} ${point[0]},${point[1]}`;
      })
      .join(" ");

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;

    setHover(
      Math.max(
        0,
        Math.min(
          n - 1,
          Math.round(((px - L) / (W - L - R)) * (n - 1))
        )
      )
    );
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Fuel and store sales by two-hour interval"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const value = (MAX / 4) * i;

        return (
          <g key={i}>
            <line
              x1={L}
              x2={W - R}
              y1={y(value)}
              y2={y(value)}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
            <text
              x={L - 6}
              y={y(value) + 3}
              textAnchor="end"
              fontSize="9"
              fill="#94a3b8"
            >
              {Math.round(value)}
            </text>
          </g>
        );
      })}

      {[0, 2, 4, 6, 8, 10].map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fontSize="9"
          fill="#94a3b8"
        >
          {`${String(i * 2).padStart(2, "0")}:00`}
        </text>
      ))}

      {show.store && (
        <path
          d={path(buckets.store)}
          fill="none"
          stroke={COLORS.store}
          strokeWidth="2.2"
        />
      )}

      {show.fuel && (
        <path
          d={path(buckets.fuel)}
          fill="none"
          stroke={COLORS.fuel}
          strokeWidth="2.2"
        />
      )}

      {hover !== null && (
        <g>
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={T}
            y2={H - B}
            stroke="#94a3b8"
          />
          <g
            transform={`translate(${Math.min(x(hover) + 8, W - 125)},${T})`}
          >
            <rect width="120" height="48" rx="6" fill="#0f172a" opacity="0.94" />
            <text x="8" y="13" fontSize="9" fill="#cbd5e1">
              {`${String(hover * 2).padStart(2, "0")}:00–${String(
                hover * 2 + 2
              ).padStart(2, "0")}:00`}
            </text>
            <text x="8" y="28" fontSize="10" fill="#93c5fd">
              Fuel: {usd(buckets.fuel[hover])}
            </text>
            <text x="8" y="41" fontSize="10" fill="#86efac">
              Store: {usd(buckets.store[hover])}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

function Donut({ payments }) {
  const [hover, setHover] = useState(null);
  const total = payments.reduce((sum, item) => sum + item.value, 0);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  const active = hover !== null ? payments[hover] : null;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-44 w-44 shrink-0 -rotate-90">
        {payments.map((payment, index) => {
          const length = total
            ? (payment.value / total) * circumference
            : 0;

          const offset = -accumulated;
          accumulated += length;

          return (
            <circle
              key={payment.name}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={payment.color}
              strokeWidth={hover === index ? 30 : 26}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={offset}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer transition-all"
            />
          );
        })}

        <g
          className="rotate-90"
          style={{ transformOrigin: "80px 80px" }}
        >
          <text
            x="80"
            y="76"
            textAnchor="middle"
            fontSize="10"
            fill="#475569"
          >
            {active?.name || "Total"}
          </text>
          <text
            x="80"
            y="94"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="#0f172a"
          >
            {usd(active ? active.value : total)}
          </text>
        </g>
      </svg>

      <ul className="min-w-[200px] flex-1 divide-y text-sm">
        {payments.map((payment, index) => (
          <li
            key={payment.name}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center gap-2 py-2.5 ${
              hover === index ? "bg-slate-50" : ""
            }`}
          >
            <i
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: payment.color }}
            />
            <span className="flex-1">{payment.name}</span>
            <span className="text-slate-600">
              {usd(payment.value)} (
              {total
                ? ((payment.value / total) * 100).toFixed(1)
                : "0.0"}
              %)
            </span>
          </li>
        ))}

        {!payments.length && (
          <li className="py-4 text-center text-xs text-slate-400">
            No paid sales today.
          </li>
        )}
      </ul>
    </div>
  );
}

const REMINDERS0 = [
  {
    id: 1,
    icon: AlertCircle,
    tone: "text-red-500",
    title: "Check fuel tank level",
    text: "Review fuel tank levels.",
    done: false,
  },
  {
    id: 2,
    icon: AlertTriangle,
    tone: "text-blue-600",
    title: "Daily shift summary",
    text: "Don't forget to close your shift.",
    done: false,
    go: "shift-handover",
  },
  {
    id: 3,
    icon: CheckCircle,
    tone: "text-emerald-600",
    title: "Check cash drawer balance",
    text: "Verify the cash drawer balance.",
    done: false,
  },
];

const PUMP_CLS = {
  Available: "bg-emerald-50 text-emerald-600",
  "In Use": "bg-orange-50 text-orange-500",
  Maintenance: "bg-red-100 text-red-500",
  Offline: "bg-slate-100 text-slate-500",
};

const PUMP_ICON = {
  Available: "text-emerald-500",
  "In Use": "text-orange-400",
  Maintenance: "text-red-500",
  Offline: "text-slate-400",
};

function getPumpStatus(pump) {
  const raw = String(
    pump?.status || pump?.pump_status || "offline"
  ).toLowerCase();

  if (["available", "active", "idle", "ready", "available now"].includes(raw)) {
    return "Available";
  }

  if (["in_use", "in use", "busy", "dispensing"].includes(raw)) {
    return "In Use";
  }

  if (raw.includes("maintenance")) return "Maintenance";

  return "Offline";
}

export default function Dashboard({ onNavigate = () => {} }) {
  const [fuelSales, setFuelSales] = useState([]);
  const [storeSales, setStoreSales] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [show, setShow] = useState({ fuel: true, store: true });
  const [reminders, setReminders] = useState(REMINDERS0);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [currentShift, setCurrentShift] = useState(null);
const [shiftLoading, setShiftLoading] = useState(true);
const [shiftActionLoading, setShiftActionLoading] = useState(false);
const [shiftError, setShiftError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("gas_station_token");

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const [fuelRows, storeRows, pumpResponse] = await Promise.all([
        fetchAllPages("/fuel-sales", token),
        fetchAllPages("/store-sales", token),
        apiGet("/fuel-pumps", token),
      ]);

      const pumpRows = Array.isArray(pumpResponse)
        ? pumpResponse
        : Array.isArray(pumpResponse?.data)
          ? pumpResponse.data
          : [];

      setFuelSales(fuelRows.filter((sale) => isToday(sale.sale_date)));
      setStoreSales(storeRows.filter((sale) => isToday(sale.sale_date)));
      setPumps(pumpRows);
    } catch (err) {
      setError(err.message || "Unable to load Dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);


  const loadCurrentShift = useCallback(async () => {
  setShiftLoading(true);
  setShiftError("");

  try {
    const token = sessionStorage.getItem("gas_station_token");

    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const result = await apiGet("/shifts/current", token);

    setCurrentShift(result.data || null);
  } catch (err) {
    setShiftError(
      err.message || "Unable to load current shift."
    );
  } finally {
    setShiftLoading(false);
  }
}, []);

const handleShiftAction = async (action) => {
  if (shiftActionLoading) return;

  setShiftActionLoading(true);
  setShiftError("");

  try {
    const token = sessionStorage.getItem("gas_station_token");

    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const endpoint =
      action === "start" ? "/shifts/start" : "/shifts/end";

    const result = await apiPost(endpoint, token);

    // Refresh current shift from Laravel.
    await loadCurrentShift();

    // Refresh today's sales and other dashboard information.
    await loadDashboard();

    setToast(
      result.message ||
        (action === "start"
          ? "Shift started successfully."
          : "Shift ended successfully.")
    );
  } catch (err) {
    setShiftError(
      err.message || "Unable to update shift."
    );

    // Re-check the real status from Laravel.
    await loadCurrentShift();
  } finally {
    setShiftActionLoading(false);
  }
};

useEffect(() => {
  loadCurrentShift();
}, [loadCurrentShift]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const paidFuel = useMemo(
    () =>
      fuelSales.filter(
        (sale) => String(sale.payment_status || "").toLowerCase() === "paid"
      ),
    [fuelSales]
  );

  const paidStore = useMemo(
    () =>
      storeSales.filter(
        (sale) => String(sale.payment_status || "").toLowerCase() === "paid"
      ),
    [storeSales]
  );

  const fuelTotal = useMemo(
    () => paidFuel.reduce((sum, sale) => sum + money(sale.total_amount), 0),
    [paidFuel]
  );

  const storeTotal = useMemo(
    () => paidStore.reduce((sum, sale) => sum + money(sale.total_amount), 0),
    [paidStore]
  );

  const totalSales = fuelTotal + storeTotal;
  const fuelTransactions = paidFuel.length;
  const storeTransactions = paidStore.length;
  const totalTransactions = fuelTransactions + storeTransactions;
  const averageFuelSale = fuelTransactions ? fuelTotal / fuelTransactions : 0;

  const buckets = useMemo(() => {
    const fuel = Array(12).fill(0);
    const store = Array(12).fill(0);

    paidFuel.forEach((sale) => {
      const date = new Date(sale.sale_date);
      if (!Number.isNaN(date.getTime())) {
        fuel[Math.min(11, Math.floor(date.getHours() / 2))] += money(
          sale.total_amount
        );
      }
    });

    paidStore.forEach((sale) => {
      const date = new Date(sale.sale_date);
      if (!Number.isNaN(date.getTime())) {
        store[Math.min(11, Math.floor(date.getHours() / 2))] += money(
          sale.total_amount
        );
      }
    });

    return { fuel, store };
  }, [paidFuel, paidStore]);

  const payments = useMemo(() => {
    const groups = new Map();

    [...paidFuel, ...paidStore].forEach((sale) => {
      const label = paymentLabel(sale.payment_method);
      groups.set(
        label,
        (groups.get(label) || 0) + money(sale.total_amount)
      );
    });

    return [...groups.entries()]
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS.payments[index % COLORS.payments.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [paidFuel, paidStore]);

  const recentFuelSales = useMemo(
    () =>
      [...fuelSales]
        .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))
        .slice(0, 5)
        .map((sale) => ({
          raw: sale,
          id: sale.sale_id,
          no:
            sale.sale_number ||
            sale.receipt_number ||
            `Sale #${sale.sale_id}`,
          time: formatTime(sale.sale_date),
          pump: getPumpName(sale),
          fuel: getFuelName(sale),
          qty: money(sale.quantity),
          total: money(sale.total_amount),
          pay: paymentLabel(sale.payment_method),
          status: saleStatus(sale.payment_status),
        })),
    [fuelSales]
  );

  const bestSellingFuel = useMemo(() => {
    const groups = new Map();

    paidFuel.forEach((sale) => {
      const name = getFuelName(sale);
      groups.set(name, (groups.get(name) || 0) + money(sale.quantity));
    });

    return [...groups.entries()]
      .map(([name, liters], index) => ({
        name,
        liters,
        color: COLORS.payments[index % COLORS.payments.length],
      }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);
  }, [paidFuel]);

  const maxBest = Math.max(1, ...bestSellingFuel.map((item) => item.liters));

  const discounts = [...paidFuel, ...paidStore].reduce(
    (sum, sale) => sum + money(sale.discount),
    0
  );

  const taxes = [...paidFuel, ...paidStore].reduce(
    (sum, sale) => sum + money(sale.tax),
    0
  );

  const pending = reminders.filter((item) => !item.done).length;

  const exportReport = () => {
    const rows = [
      [
        "Sale Type",
        "Sale No",
        "Date/Time",
        "Pump",
        "Fuel Type / Products",
        "Quantity",
        "Total Amount",
        "Payment Method",
        "Payment Status",
      ],
      ...fuelSales.map((sale) => [
        "Fuel",
        sale.sale_number || sale.receipt_number || sale.sale_id,
        sale.sale_date || "",
        getPumpName(sale),
        getFuelName(sale),
        sale.quantity,
        sale.total_amount,
        paymentLabel(sale.payment_method),
        sale.payment_status,
      ]),
      ...storeSales.map((sale) => [
        "Store",
        sale.sale_number || sale.receipt_number || sale.store_sale_id,
        sale.sale_date || "",
        "",
        getStoreItems(sale).map(getProductName).join("; "),
        getStoreItems(sale).reduce(
          (sum, item) => sum + money(item.quantity),
          0
        ),
        sale.total_amount,
        paymentLabel(sale.payment_method),
        sale.payment_status,
      ]),
    ];

    downloadCSV("sales_report_today.csv", rows);
    setToast("Today's sales report downloaded.");
  };

  return (
    <div className="min-h-full bg-gray-100 p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Cashier Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Today's sales · {new Date().toLocaleDateString()}
          </p>
        </div>

        <Btn
          v="ghost"
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </Btn>
      </div>

      <Card
  title="Current Shift"
  action={
    <button
      type="button"
      onClick={loadCurrentShift}
      disabled={shiftLoading || shiftActionLoading}
      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
    >
      <RefreshCw
        size={14}
        className={shiftLoading ? "animate-spin" : ""}
      />
      Refresh Shift
    </button>
  }
>
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <div
        className={`rounded-xl p-3 ${
          currentShift
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        <Clock3 size={26} />
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-slate-800">
            {shiftLoading
              ? "Checking shift..."
              : currentShift
                ? "Shift Active"
                : "No Active Shift"}
          </p>

          {!shiftLoading && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                currentShift
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {currentShift ? "Active" : "Not Started"}
            </span>
          )}
        </div>

        {currentShift && (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Shift ID: {currentShift.shift_id}
            </p>

            <p className="text-sm text-slate-500">
              Started:{" "}
              {currentShift.start_time
                ? new Date(
                    currentShift.start_time
                  ).toLocaleString()
                : "—"}
            </p>
          </>
        )}

        {!currentShift && !shiftLoading && (
          <p className="mt-1 text-sm text-slate-500">
            Start your shift before selling fuel or products.
          </p>
        )}
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      {!currentShift ? (
        <Btn
          onClick={() => handleShiftAction("start")}
          disabled={shiftLoading || shiftActionLoading}
          className="flex items-center justify-center gap-2"
        >
          {shiftActionLoading ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
          Start Shift
        </Btn>
      ) : (
        <Btn
          v="ghost"
          onClick={() => {
            const confirmed = window.confirm(
              "Are you sure you want to end your current shift?"
            );

            if (confirmed) {
              handleShiftAction("end");
            }
          }}
          disabled={shiftLoading || shiftActionLoading}
          className="flex items-center justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
        >
          {shiftActionLoading ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Square size={15} />
          )}
          End Shift
        </Btn>
      )}
    </div>
  </div>

  {shiftError && (
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{shiftError}</div>

      <button
        type="button"
        onClick={loadCurrentShift}
        className="font-semibold underline"
      >
        Retry
      </button>
    </div>
  )}
</Card>
<br />

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load Dashboard</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1 text-xs">
              Check that Laravel is running, the Sanctum token is valid, and
              the API endpoints are accessible.
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">
          <LoaderCircle size={18} className="animate-spin" />
          Loading sales from Laravel API...
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              icon={Fuel}
              label="Today's Fuel Sales"
              value={usd(fuelTotal)}
              note={`${fuelTransactions} paid transactions`}
              tone="bg-blue-50"
              text="text-blue-600"
            />
            <Stat
              icon={ShoppingCart}
              label="Today's Store Sales"
              value={usd(storeTotal)}
              note={`${storeTransactions} paid transactions`}
              tone="bg-emerald-50"
              text="text-emerald-600"
            />
            <Stat
              icon={Banknote}
              label="Total Sales (Today)"
              value={usd(totalSales)}
              note={`${totalTransactions} paid transactions`}
              tone="bg-orange-50"
              text="text-orange-500"
            />
            <Stat
              icon={ClipboardList}
              label="Avg. Fuel Sale"
              value={usd(averageFuelSale)}
              note="Per paid transaction"
              tone="bg-violet-50"
              text="text-violet-600"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Sale Overview (Today)">
              <div className="mb-1 flex flex-wrap gap-4 text-xs">
                {[
                  ["fuel", "Fuel Sales", COLORS.fuel],
                  ["store", "Store Sales", COLORS.store],
                ].map(([key, label, color]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setShow((old) => ({ ...old, [key]: !old[key] }))
                    }
                    className={`flex items-center gap-1.5 ${
                      show[key] ? "" : "opacity-40 line-through"
                    }`}
                  >
                    <i
                      className="h-2 w-2 rounded-full"
                      style={{ background: color }}
                    />
                    {label}
                  </button>
                ))}
                <span className="ml-auto text-slate-400">per 2 hours</span>
              </div>
              <LineChart buckets={buckets} show={show} />
            </Card>

            <Card title="Payment Method Breakdown">
              <Donut payments={payments} />
            </Card>
          </div>

          <Card
            title="Recent Fuel Sales"
            action={
              <button
                onClick={() => onNavigate("daily-sales-and-refunds")}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                View all
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-slate-600">
                    {[
                      "Sale No",
                      "Time",
                      "Pump",
                      "Fuel Type",
                      "Quantity (L)",
                      "Total Amount",
                      "Payment",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-3 py-2.5 text-sm font-medium"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentFuelSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-3">
                        <button
                          onClick={() => setModal({ type: "sale", sale })}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {sale.no}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {sale.time}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {sale.pump}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {sale.fuel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {sale.qty.toFixed(3)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {usd(sale.total)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {sale.pay}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${
                            sale.status.toLowerCase() === "paid"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!loading && !recentFuelSales.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        No fuel sales recorded today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card title="Best Selling Fuel (Today)">
              <div className="space-y-3">
                {bestSellingFuel.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <b>{item.name}</b>
                      <span className="text-slate-500">
                        {item.liters.toLocaleString()} L
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(item.liters / maxBest) * 100}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {!loading && !bestSellingFuel.length && (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No paid fuel sales today.
                  </p>
                )}
              </div>
            </Card>

            <Card title="Quick Actions">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [
                    Fuel,
                    "New Fuel Sale",
                    "bg-blue-50 text-blue-600",
                    () => onNavigate("pos-terminal"),
                  ],
                  [
                    ShoppingBasket,
                    "New Store Sale",
                    "bg-emerald-50 text-emerald-600",
                    () => onNavigate("pos-terminal"),
                  ],
                  [
                    Undo2,
                    "Refund/Void Sale",
                    "bg-violet-50 text-violet-600",
                    () => onNavigate("daily-sales-and-refunds"),
                  ],
                  [
                    FileBarChart,
                    "Sales Report",
                    "bg-orange-50 text-orange-500",
                    () => setModal({ type: "report" }),
                  ],
                ].map(([Icon, label, cls, go]) => (
                  <button
                    key={label}
                    onClick={go}
                    className={`flex flex-col items-center gap-2 rounded-xl p-4 text-xs font-semibold transition hover:shadow-md ${cls}`}
                  >
                    <Icon size={26} />
                    {label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-5">
          <Card title="Sale Summary">
            <dl className="space-y-2 text-sm">
              {[
                ["Total Transaction", totalTransactions],
                ["Fuel Sales", usd(fuelTotal)],
                ["Store Sales", usd(storeTotal)],
                ["Discounts", `-${usd(discounts)}`],
                ["Taxes (included)", usd(taxes)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-3"
                >
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-3 text-base font-bold">
                <dt>Net Total</dt>
                <dd className="text-emerald-600">{usd(totalSales)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-400">
              Shows paid sales only. Refunds are not deducted in this summary.
            </p>
          </Card>

          <Card title="Pump Status">
            <ul className="divide-y">
              {pumps.map((pump) => {
                const status = getPumpStatus(pump);
                const name =
                  pump.pump_name ||
                  pump.pump_number ||
                  pump.name ||
                  `Pump ${pump.pump_id}`;

                const fuel =
                  pump.fuel_type?.fuel_name ||
                  pump.fuel_type?.fuel_type_name ||
                  pump.fuelType?.fuel_name ||
                  pump.fuelType?.name ||
                  pump.fuel_type_name ||
                  "Fuel pump";

                const available = status === "Available";

                return (
                  <li key={pump.pump_id ?? name}>
                    <button
                      disabled={!available}
                      onClick={() => onNavigate("pos-terminal")}
                      title={
                        available
                          ? "Open POS Terminal"
                          : `${name} is ${status}`
                      }
                      className="flex w-full items-center gap-3 py-3 text-left enabled:hover:bg-slate-50 disabled:cursor-default"
                    >
                      <Fuel size={26} className={PUMP_ICON[status]} />
                      <span className="flex-1 text-sm">
                        <b className="block font-medium">{name}</b>
                        <span className="text-xs text-slate-500">
                          {fuel}
                        </span>
                      </span>
                      <span
                        className={`rounded px-2.5 py-1 text-xs font-medium ${PUMP_CLS[status]}`}
                      >
                        {status}
                      </span>
                    </button>
                  </li>
                );
              })}

              {!loading && !pumps.length && (
                <li className="py-4 text-center text-xs text-slate-400">
                  No pump data available.
                </li>
              )}
            </ul>
          </Card>

          <Card
            title={`Reminders${pending ? ` (${pending})` : ""}`}
            action={<Bell size={16} className="text-slate-400" />}
          >
            <div className="space-y-2.5">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    reminder.done
                      ? "bg-slate-50 opacity-60"
                      : "bg-white"
                  }`}
                >
                  <button
                    aria-label="Toggle done"
                    onClick={() =>
                      setReminders((all) =>
                        all.map((item) =>
                          item.id === reminder.id
                            ? { ...item, done: !item.done }
                            : item
                        )
                      )
                    }
                  >
                    <reminder.icon
                      size={20}
                      className={
                        reminder.done
                          ? "text-emerald-500"
                          : reminder.tone
                      }
                    />
                  </button>

                  <div className="flex-1 text-xs">
                    <p
                      className={`font-semibold ${
                        reminder.done ? "line-through" : ""
                      }`}
                    >
                      {reminder.title}
                    </p>
                    <p className="text-slate-500">{reminder.text}</p>

                    {reminder.go && !reminder.done && (
                      <button
                        onClick={() => onNavigate(reminder.go)}
                        className="mt-1 font-semibold text-blue-600 hover:underline"
                      >
                        Open shift handover →
                      </button>
                    )}
                  </div>

                  <button
                    aria-label="Dismiss"
                    onClick={() =>
                      setReminders((all) =>
                        all.filter((item) => item.id !== reminder.id)
                      )
                    }
                    className="text-slate-300 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {!reminders.length && (
                <p className="py-4 text-center text-xs text-slate-400">
                  No reminders.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {modal?.type === "sale" && (
        <Modal
          title={modal.sale.no}
          onClose={() => setModal(null)}
        >
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Time</dt>
            <dd>{modal.sale.time}</dd>

            <dt className="text-slate-500">Pump</dt>
            <dd>{modal.sale.pump}</dd>

            <dt className="text-slate-500">Fuel type</dt>
            <dd>{modal.sale.fuel}</dd>

            <dt className="text-slate-500">Quantity</dt>
            <dd>{modal.sale.qty.toFixed(3)} L</dd>

            <dt className="text-slate-500">Unit price</dt>
            <dd>
              {modal.sale.qty
                ? usd(modal.sale.total / modal.sale.qty)
                : usd(0)}{" "}
              / L
            </dd>

            <dt className="text-slate-500">Total</dt>
            <dd className="font-semibold">{usd(modal.sale.total)}</dd>

            <dt className="text-slate-500">Payment</dt>
            <dd>{modal.sale.pay}</dd>

            <dt className="text-slate-500">Status</dt>
            <dd>{modal.sale.status}</dd>
          </dl>

          <div className="mt-5 flex justify-end gap-2">
            <Btn v="ghost" onClick={() => setModal(null)}>
              Close
            </Btn>
            <Btn
              onClick={() => {
                setModal(null);
                onNavigate("daily-sales-and-refunds");
              }}
            >
              Refund / Void
            </Btn>
          </div>
        </Modal>
      )}

      {modal?.type === "report" && (
        <Modal
          title="Sales Report · Today"
          onClose={() => setModal(null)}
        >
          <dl className="space-y-1.5 text-sm">
            {[
              ["Transactions", totalTransactions],
              ["Fuel sales", usd(fuelTotal)],
              ["Store sales", usd(storeTotal)],
              ["Discounts", `-${usd(discounts)}`],
              ["Taxes (included)", usd(taxes)],
              ["Net total", usd(totalSales)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mb-1 mt-4 text-xs font-semibold text-slate-500">
            By payment method
          </p>

          {payments.map((payment) => (
            <div
              key={payment.name}
              className="flex justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <i
                  className="h-2 w-2 rounded-full"
                  style={{ background: payment.color }}
                />
                {payment.name}
              </span>
              <span>{usd(payment.value)}</span>
            </div>
          ))}

          <div className="mt-5 flex justify-end gap-2">
            <Btn v="ghost" onClick={() => setModal(null)}>
              Close
            </Btn>
            <Btn
              onClick={exportReport}
              className="flex items-center gap-2"
            >
              <Download size={15} />
              Download CSV
            </Btn>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
