
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Fuel,
  ShoppingCart,
  BellRing,
  Search,
  Wrench,
  Truck,
  Tag,
  X,
  Fuel as PumpIcon,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import api from "../../api/axios";

const PAY_FILTERS = [
  "ALL",
  "Cash",
  "QR Payment",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
];

const STATUS_STYLE = {
  Paid: "text-emerald-600",
  Pending: "text-amber-500",
  Failed: "text-red-500",
};

const ATTENDANCE_CONFIG = [
  { key: "present", label: "Present", dot: "bg-emerald-500" },
  { key: "absent", label: "Absent", dot: "bg-red-500" },
  { key: "late", label: "Late", dot: "bg-yellow-400" },
  { key: "holiday", label: "Holiday", dot: "bg-violet-500" },
  { key: "half_day", label: "Half day", dot: "bg-orange-400" },
];

const PUMP_STATUS = {
  available: {
    label: "Available",
    short: "Active",
    style: "bg-emerald-500 text-white",
  },
  in_use: {
    label: "In Use",
    short: "In Use",
    style: "bg-sky-500 text-white",
  },
  out_of_service: {
    label: "Out of Service",
    short: "OFS",
    style: "bg-red-500 text-white",
  },
  under_maintenance: {
    label: "Under Maintenance",
    short: "UMTN",
    style: "bg-amber-500 text-white",
  },
};

const NOTIFICATION_ICONS = {
  fuel_low_stock: Fuel,
  maintenance_reminder: Wrench,
  delivery_reminder: Truck,
  price_update: Tag,
  promotion: Tag,
  system_alert: BellRing,
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const numberFormat = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

// ប្រើកាលបរិច្ឆេទតាមម៉ោង Local របស់ Browser។
const todayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// គាំទ្រ Array, Laravel paginator និង response ដែលមាន data ជាន់គ្នា។
const getArray = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
};

// រក Laravel pagination metadata ទោះមាន data wrapper ក៏ដោយ។
const getPagination = (payload) => {
  if (payload?.meta && typeof payload.meta === "object") {
    return payload.meta;
  }

  if (payload?.data?.meta && typeof payload.data.meta === "object") {
    return payload.data.meta;
  }

  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload || {};
};

// ទាញគ្រប់ទំព័រ ប្រសិនបើ API ប្រើ Laravel pagination។
async function fetchAllPages(endpoint, params = {}) {
  const firstResponse = await api.get(endpoint, {
    params: { ...params, page: 1 },
  });

  const firstPayload = firstResponse.data;
  const records = [...getArray(firstPayload)];
  const pagination = getPagination(firstPayload);

  const lastPage = Math.max(
    1,
    Number(
      pagination.last_page ??
        pagination.lastPage ??
        1
    )
  );

  for (let page = 2; page <= lastPage; page += 1) {
    const response = await api.get(endpoint, {
      params: { ...params, page },
    });

    records.push(...getArray(response.data));
  }

  return records;
}

function getPaymentLabel(method) {
  const labels = {
    cash: "Cash",
    qr_payment: "QR Payment",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_transfer: "Bank Transfer",
  };

  const key = String(method || "").toLowerCase();

  return labels[key] || method || "—";
}

function getPaymentStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid") return "Paid";
  if (value === "pending") return "Pending";
  if (value === "failed") return "Failed";

  return status || "—";
}

function getTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(value) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;

  return `${Math.floor(seconds / 86400)} days ago`;
}

// ពិនិត្យថាប្រតិបត្តិការបាន Paid រួចឬនៅ។
const isPaid = (record) =>
  String(record?.payment_status || "").toLowerCase() === "paid";

function StatCard({ label, value, note, icon: Icon, tone, onReview }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>

        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon size={22} />
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{note}</span>

        <button
          type="button"
          onClick={onReview}
          className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600"
        >
          Review
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate = () => {} }) {
  const [pay, setPay] = useState("ALL");
  const [query, setQuery] = useState("");

  // ប្រវត្តិការលក់ទាំងអស់សម្រាប់តារាង។
  const [fuelSales, setFuelSales] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 5;

  // ការលក់ថ្ងៃនេះសម្រាប់កាតស្ថិតិ។
  const [todayFuelSales, setTodayFuelSales] = useState([]);
  const [todayStoreSales, setTodayStoreSales] = useState([]);

  const [pumps, setPumps] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [products, setProducts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [notifs, setNotifs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState([]);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrors([]);

    const today = todayString();

    // API ប្រវត្តិ Fuel Sales មិនកំណត់ date filter។
    // API សម្រាប់ស្ថិតិទាញតែទិន្នន័យថ្ងៃនេះ។
    const requests = [
      {
        label: "Fuel sales history",
        run: () => fetchAllPages("/fuel-sales"),
        save: setFuelSales,
      },
      {
        label: "Today's fuel sales",
        run: () => fetchAllPages("/fuel-sales", { date: today }),
        save: setTodayFuelSales,
      },
      {
        label: "Today's store sales",
        run: () => fetchAllPages("/store-sales", { date: today }),
        save: setTodayStoreSales,
      },
      {
        label: "Pumps",
        run: () => api.get("/fuel-pumps"),
        save: (response) => setPumps(getArray(response.data)),
      },
      {
        label: "Fuel tanks",
        run: () => api.get("/fuel-tanks"),
        save: (response) => setTanks(getArray(response.data)),
      },
      {
        label: "Products",
        run: () => api.get("/products"),
        save: (response) => setProducts(getArray(response.data)),
      },
      
{
  label: "Attendance",
  run: () =>
    api.get("/employee-attendances", {
      params: { date: today },
    }),
  save: (response) => {
    console.log("Attendance API response:", response.data);
    console.log("Today's date:", today);

    const records = getArray(response.data);

    console.log("Attendance records:", records);

    setAttendance(records);
  },
},

      {
        label: "Notifications",
        run: () => api.get("/notifications"),
        save: (response) => setNotifs(getArray(response.data)),
      },
    ];

    try {
      const results = await Promise.allSettled(
        requests.map((request) => request.run())
      );

      const failed = [];

      results.forEach((result, index) => {
        const request = requests[index];

        if (result.status === "fulfilled") {
          try {
            request.save(result.value);
          } catch (error) {
            console.error(`Failed to process ${request.label}:`, error);
            failed.push(request.label);
          }
        } else {
          console.error(
            `Failed to load ${request.label}:`,
            result.reason
          );
          failed.push(request.label);
        }
      });

      setErrors(failed);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setErrors(["Dashboard data"]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // បម្លែងប្រវត្តិការលក់សម្រាប់តារាង Recently Fuel Sale។
  const fuelRows = useMemo(() => {
    return fuelSales
      .map((sale) => ({
        id: sale.sale_id ?? sale.id ?? sale.sale_number,
        time: getTime(sale.sale_date),
        pump:
          sale.pump?.pump_number ||
          sale.pump?.pump_name ||
          (sale.pump_id ? `Pump #${sale.pump_id}` : "—"),
        fuel:
          sale.fuelType?.fuel_name ||
          sale.fuel_type?.fuel_name ||
          sale.fuelType?.name ||
          sale.fuel_type?.name ||
          "Fuel",
        amount: Number(sale.total_amount || 0),
        cashier:
          sale.soldBy?.full_name ||
          sale.soldBy?.name ||
          sale.sold_by_user?.full_name ||
          sale.sold_by_user?.name ||
          (typeof sale.sold_by === "object"
            ? sale.sold_by?.full_name || sale.sold_by?.name
            : "") ||
          "—",
        payment: getPaymentLabel(sale.payment_method),
        status: getPaymentStatus(sale.payment_status),
      }))
      .filter((sale) => pay === "ALL" || sale.payment === pay)
      .filter((sale) => {
        const q = query.trim().toLowerCase();

        if (!q) return true;

        return [
          sale.time,
          sale.pump,
          sale.fuel,
          sale.cashier,
          sale.payment,
          sale.status,
        ].some((value) =>
          String(value).toLowerCase().includes(q)
        );
      });
  }, [fuelSales, pay, query]);


  const totalPages = Math.ceil(
  fuelRows.length / rowsPerPage
);

const paginatedFuelRows = useMemo(() => {
  const startIndex = (currentPage - 1) * rowsPerPage;

  return fuelRows.slice(
    startIndex,
    startIndex + rowsPerPage
  );
}, [fuelRows, currentPage]);

const startRow =
  fuelRows.length === 0
    ? 0
    : (currentPage - 1) * rowsPerPage + 1;

const endRow = Math.min(
  currentPage * rowsPerPage,
  fuelRows.length
);

  // ស្ថិតិ Fuel គិតតែការលក់ថ្ងៃនេះដែល Paid។
  const paidFuelSales = useMemo(
    () => todayFuelSales.filter(isPaid),
    [todayFuelSales]
  );

  // ស្ថិតិ Store គិតតែការលក់ថ្ងៃនេះដែល Paid។
  const paidStoreSales = useMemo(
    () => todayStoreSales.filter(isPaid),
    [todayStoreSales]
  );

  const todayFuelRevenue = paidFuelSales.reduce(
    (total, sale) => total + Number(sale.total_amount || 0),
    0
  );

  const todayStoreRevenue = paidStoreSales.reduce(
    (total, sale) => total + Number(sale.total_amount || 0),
    0
  );

  const todayFuelVolume = paidFuelSales.reduce(
    (total, sale) => total + Number(sale.quantity || 0),
    0
  );

  // Fuel tanks ដែលនៅសល់តិចជាង ឬស្មើ min_volume។
  const lowFuelTanks = useMemo(
    () =>
      tanks.filter((tank) => {
        const status = String(tank.status || "").toLowerCase();

        return (
          !["maintenance", "under_maintenance", "inactive"].includes(status) &&
          Number(tank.current_volume || 0) <= Number(tank.min_volume || 0)
        );
      }),
    [tanks]
  );

  // ផលិតផលដែលស្តុកទាប។
  const lowStockProducts = useMemo(
    () =>
      products.filter((product) => {
        const active =
          product.is_active === undefined ||
          product.is_active === null ||
          ![0, "0", false, "false"].includes(product.is_active);

        const quantity = Number(
          product.quantity_in_stock ??
            product.stock_quantity ??
            product.quantity ??
            0
        );

        const minimum = Number(
          product.min_stock_level ??
            product.minimum_stock ??
            product.min_stock ??
            0
        );

        return active && quantity <= minimum;
      }),
    [products]
  );

  const lowStockCount = lowFuelTanks.length + lowStockProducts.length;

  // រាប់ Attendance តាម status ដែល API ផ្ញើមក។
  
const normalizeAttendanceStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const attendanceCounts = ATTENDANCE_CONFIG.map((item) => ({
  ...item,
  count: attendance.filter(
    (record) =>
      normalizeAttendanceStatus(record.status) === item.key
  ).length,
}));

  const totalEmployeesPresentInAttendance = attendance.length;

  const unread = notifs.filter(
    (notification) =>
      !(
        notification.is_read === true ||
        Number(notification.is_read) === 1
      )
  ).length;

  // Mark notification មួយថាបានអាន។
  const markOneAsRead = async (notificationId) => {
    const selected = notifs.find(
      (notification) =>
        String(notification.notification_id) === String(notificationId)
    );

    if (!selected) {
      onNavigate("notifications");
      return;
    }

    const alreadyRead =
      selected.is_read === true || Number(selected.is_read) === 1;

    if (!alreadyRead) {
      try {
        await api.patch(`/notifications/${notificationId}/read`);

        setNotifs((current) =>
          current.map((notification) =>
            String(notification.notification_id) === String(notificationId)
              ? { ...notification, is_read: 1 }
              : notification
          )
        );
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    onNavigate("notifications");
  };

  // Mark notifications ទាំងអស់ថាបានអាន។
  const markAllAsRead = async () => {
    if (!unread) return;

    try {
      await api.patch("/notifications/read-all");

      setNotifs((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: 1,
        }))
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <div className="space-y-4 bg-slate-300 p-6 -m-6">
      {/* Dashboard header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">
          Main Dashboard
        </h2>

        <button
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* បង្ហាញ API ដែលមានបញ្ហា */}
      {errors.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">
              Some dashboard data could not be loaded.
            </p>
            <p className="mt-1">
              {errors.join(", ")}. Please check the API routes,
              authentication, and Laravel server.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's Revenues"
            value={
              loading
                ? "Loading..."
                : money(todayFuelRevenue + todayStoreRevenue)
            }
            note="Paid fuel and store sales today"
            icon={Banknote}
            tone="bg-amber-100 text-amber-600"
            onReview={() => onNavigate("branch-reports")}
          />

          <StatCard
            label="Fuel Volume Sold"
            value={
              loading
                ? "Loading..."
                : `${numberFormat(todayFuelVolume)} L`
            }
            note="Paid fuel sales today"
            icon={Fuel}
            tone="bg-sky-100 text-sky-600"
            onReview={() => onNavigate("fuel-and-tank-monitoring")}
          />

          <StatCard
            label="Store Sales"
            value={loading ? "Loading..." : money(todayStoreRevenue)}
            note="Paid store sales today"
            icon={ShoppingCart}
            tone="bg-violet-100 text-violet-600"
            onReview={() => onNavigate("store-inventory")}
          />

          <StatCard
            label="Low Stock Alert"
            value={loading ? "Loading..." : `${lowStockCount} Items`}
            note={`${lowFuelTanks.length} tanks / ${lowStockProducts.length} products`}
            icon={BellRing}
            tone="bg-red-100 text-red-500"
            onReview={() => onNavigate("store-inventory")}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Recently Fuel Sale */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              Recently Fuel Sale
            </h2>

            <div className="relative mb-3">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search cashier, pumps..."
                className="w-full rounded-full border border-slate-300 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {PAY_FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter}
                  onClick={() => setPay(filter)}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                    pay === filter
                      ? "bg-yellow-300 text-slate-900"
                      : "bg-slate-600 text-white hover:bg-slate-700"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                    {[
                      "TIME",
                      "PUMP",
                      "FUEL",
                      "AMOUNT",
                      "CASHIER",
                      "PAYMENT",
                      "STATUS",
                    ].map((heading) => (
                      <th key={heading} className="px-3 py-2">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-slate-400"
                      >
                        Loading fuel sales...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {paginatedFuelRows.map((sale, index) => (
                        <tr
                          key={sale.id ?? index}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-3 py-2.5">{sale.time}</td>
                          <td className="px-3 py-2.5">{sale.pump}</td>
                          <td className="px-3 py-2.5">{sale.fuel}</td>
                          <td className="px-3 py-2.5">
                            {money(sale.amount)}
                          </td>
                          <td className="px-3 py-2.5">{sale.cashier}</td>
                          <td className="px-3 py-2.5">{sale.payment}</td>
                          <td
                            className={`px-3 py-2.5 font-semibold ${
                              STATUS_STYLE[sale.status] || "text-slate-500"
                            }`}
                          >
                            {sale.status}
                          </td>
                        </tr>
                      ))}

                      {!fuelRows.length && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-8 text-center text-slate-400"
                          >
                            No fuel sales match your search or payment filter.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-sm text-gray-500">
    Showing{" "}
    <span className="font-medium text-gray-700">
      {startRow}
    </span>
    {" "}to{" "}
    <span className="font-medium text-gray-700">
      {endRow}
    </span>
    {" "}of{" "}
    <span className="font-medium text-gray-700">
      {fuelRows.length}
    </span>
    {" "}results
  </p>

  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={() =>
        setCurrentPage((page) => Math.max(1, page - 1))
      }
      disabled={currentPage === 1}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Previous
    </button>

    {Array.from(
      { length: totalPages },
      (_, index) => index + 1
    ).map((page) => (
      <button
        key={page}
        type="button"
        onClick={() => setCurrentPage(page)}
        className={`min-w-9 rounded-lg border px-3 py-2 text-sm transition ${
          currentPage === page
            ? "border-indigo-600 bg-indigo-600 text-white"
            : "border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        {page}
      </button>
    ))}

    <button
      type="button"
      onClick={() =>
        setCurrentPage((page) =>
          Math.min(totalPages, page + 1)
        )
      }
      disabled={
        currentPage >= totalPages || totalPages === 0
      }
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Next
    </button>
  </div>
</div>
          </section>

          {/* Pumps Status */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <PumpIcon className="text-orange-500" />
                Pumps Status
              </h2>

              <button
                type="button"
                onClick={() => onNavigate("pumps-status")}
                className="text-sm font-semibold text-sky-600 hover:underline"
              >
                View all
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {loading ? (
                <p className="text-sm text-slate-400">Loading pumps...</p>
              ) : pumps.length ? (
                pumps.map((pump, index) => {
                  const pumpStatus = String(
                    pump.status || ""
                  ).toLowerCase();

                  const status = PUMP_STATUS[pumpStatus] || {
                    label: pump.status || "Unknown",
                    short: pump.status || "Unknown",
                    style: "bg-slate-500 text-white",
                  };

                  const pumpName =
                    pump.pump_number ||
                    pump.pump_name ||
                    `Pump #${pump.pump_id ?? index + 1}`;

                  const fuelName =
                    pump.fuelType?.fuel_name ||
                    pump.fuel_type?.fuel_name ||
                    pump.fuelType?.name ||
                    pump.fuel_type?.name ||
                    "Fuel";

                  return (
                    <div
                      key={pump.pump_id ?? index}
                      className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <PumpIcon size={22} className="text-orange-500" />

                        <div className="leading-tight">
                          <p className="text-sm font-semibold">
                            {pumpName} · {fuelName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {status.label}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.style}`}
                      >
                        {status.short}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400">
                  No pump records found.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          {/* Employees Attendance */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Employees Attendance
              </h2>

              <button
                type="button"
                onClick={() => onNavigate("employees-and-attendance")}
                className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                View
              </button>
            </div>

            <p className="mb-3 inline-block rounded-md bg-slate-600 px-3 py-1 text-xs text-white">
              Today's Attendance
            </p>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {attendanceCounts.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onNavigate("employees-and-attendance")}
                    className="flex items-center gap-2 text-left hover:text-sky-600"
                  >
                    <i
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`}
                    />
                    {item.label} {item.count}{" "}
                    {item.count === 1 ? "employee" : "employees"}
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t pt-3 text-center font-semibold text-slate-700">
              Total Attendance Records: {totalEmployeesPresentInAttendance}
            </p>
          </section>

          {/* Recently Notification */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Recently Notification{" "}
                {unread > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs text-white">
                    {unread}
                  </span>
                )}
              </h2>

              <button
                type="button"
                disabled={!unread}
                onClick={markAllAsRead}
                className="text-sm font-semibold text-yellow-600 hover:underline disabled:text-slate-300 disabled:no-underline"
              >
                Mark all read
              </button>
            </div>

            <ul className="divide-y">
              {loading ? (
                <li className="py-6 text-center text-sm text-slate-400">
                  Loading notifications...
                </li>
              ) : (
                <>
                  {notifs.slice(0, 5).map((notification, index) => {
                    const Icon =
                      NOTIFICATION_ICONS[
                        notification.notification_type
                      ] || BellRing;

                    const isRead =
                      notification.is_read === true ||
                      Number(notification.is_read) === 1;

                    return (
                      <li
                        key={
                          notification.notification_id ??
                          notification.id ??
                          index
                        }
                        className="flex items-center gap-3 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            markOneAsRead(
                              notification.notification_id ??
                                notification.id
                            )
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <Icon
                            size={22}
                            className={
                              isRead
                                ? "shrink-0 text-slate-300"
                                : "shrink-0 text-slate-700"
                            }
                          />

                          <span className="min-w-0">
                            <span
                              className={`block truncate text-sm ${
                                isRead
                                  ? "text-slate-400"
                                  : "font-medium text-slate-800"
                              }`}
                            >
                              {notification.title ||
                                notification.message ||
                                "Notification"}
                            </span>

                            {notification.title && notification.message && (
                              <span className="block truncate text-xs text-slate-500">
                                {notification.message}
                              </span>
                            )}

                            <span className="text-xs text-slate-400">
                              {timeAgo(notification.created_at)}
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-label="View notifications"
                          title="View notifications"
                          onClick={() => onNavigate("notifications")}
                          className="shrink-0 text-slate-400 hover:text-sky-600"
                        >
                          <X size={16} />
                        </button>
                      </li>
                    );
                  })}

                  {!notifs.length && (
                    <li className="py-6 text-center text-sm text-slate-400">
                      No notifications available.
                    </li>
                  )}
                </>
              )}
            </ul>

            <button
              type="button"
              onClick={() => onNavigate("notifications")}
              className="mt-3 w-full border-t pt-3 text-center text-sm font-semibold text-sky-600 hover:underline"
            >
              View all notifications
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
