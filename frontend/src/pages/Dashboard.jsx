import { useCallback, useEffect, useMemo, useState } from "react";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import {
  TrendingUp,
  Gauge,
  Users2,
  DollarSign,
  FileText,
  DatabaseBackup,
  TriangleAlert,
  Fuel,
  X,
  Save,
  CheckCircle,
  Loader2,
} from "lucide-react";

import { Panel, StatCard } from "../components/ui";
import api from "../api/axios";
import pumpImage from "../image/pump.jpg";

// ======================================================
// Constants
// ======================================================

const CHART_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
];

const EMPTY_PRICE = {
  fuelId: "",
  price: "",
};

const EMPTY_PO = {
  supplierId: "",
  fuelId: "",
  quantity: "",
  unitPrice: "",
  orderDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

// ======================================================
// Helpers
// ======================================================

// Support API responses returned as arrays or { success, data }.
function getArray(response) {
  const body = response?.data;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.data)) return body.data.data;

  return [];
}

// Format numbers using Khmer Riel.
function formatKHR(value) {
  return `${Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} KHR`;
}

// Format a number with units.
function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

// Safely format a date.
function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("en-CA");
}

// Safely format date and time.
function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Read a useful error message from Laravel validation responses.
function getErrorMessage(error) {
  const response = error?.response?.data;

  if (response?.errors) {
    const firstError = Object.values(response.errors).flat()[0];

    if (firstError) return firstError;
  }

  return (
    response?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

// Convert database maintenance statuses into display labels.
function maintenanceStatusLabel(status) {
  const labels = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return labels[status] || status || "Unknown";
}

// Convert display status into the database enum value.
function maintenanceStatusValue(status) {
  const values = {
    Scheduled: "scheduled",
    "In Progress": "in_progress",
    Completed: "completed",
    Cancelled: "cancelled",
  };

  return values[status] || status;
}

// Create a readable equipment label.
function getEquipmentLabel(record) {
  const type = record?.equipment_type || "Equipment";
  const id = record?.equipment_id ?? "";

  return `${type.replaceAll("_", " ")} ${id}`.trim();
}

// ======================================================
// Alert Theme
// ======================================================

const ALERT_THEME = {
  "Critical Stock": {
    row: "bg-rose-50",
    icon: "text-rose-500",
    badge: "bg-rose-500 text-white",
    Icon: TriangleAlert,
  },

  "Low Stock": {
    row: "bg-amber-50",
    icon: "text-amber-500",
    badge: "bg-amber-500 text-white",
    Icon: TriangleAlert,
  },

  "In Stock": {
    row: "bg-emerald-50",
    icon: "text-emerald-500",
    badge: "bg-emerald-500 text-white",
    Icon: Fuel,
  },
};

// ======================================================
// Fuel Alert Row
// ======================================================

function FuelAlertRow({ tank, note, status }) {
  const theme = ALERT_THEME[status] || ALERT_THEME["Low Stock"];
  const Icon = theme.Icon;

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${theme.row}`}
    >
      <div className="flex items-start gap-2">
        <Icon
          size={16}
          className={`mt-0.5 shrink-0 ${theme.icon}`}
        />

        <div>
          <div className="text-sm font-semibold text-slate-700">
            {tank}
          </div>

          <div className="text-xs text-slate-500">
            {note}
          </div>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
      >
        {status}
      </span>
    </li>
  );
}

// ======================================================
// Tank Battery
// ======================================================


function TankBattery({ pump, pct, status }) {
  const theme =
    status === "In Stock"
      ? {
          pill: "bg-emerald-50 text-emerald-600",
          from: "#34d399",
          to: "#059669",
        }
      : status === "Critical Stock"
        ? {
            pill: "bg-rose-50 text-rose-600",
            from: "#fb7185",
            to: "#e11d48",
          }
        : {
            pill: "bg-amber-50 text-amber-700",
            from: "#fbbf24",
            to: "#d97706",
          };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${theme.pill}`}
      >
        {status}
      </span>

      <div className="h-1 w-4 rounded-t-sm bg-slate-300" />

      <div className="relative h-24 w-14 overflow-hidden rounded-md border-2 border-slate-200 bg-slate-50">
        <div
          className="absolute bottom-0 left-0 w-full rounded-b-sm transition-all duration-500"
          style={{
            height: `${Math.min(100, Math.max(0, pct))}%`,
            background: `linear-gradient(180deg, ${theme.from}, ${theme.to})`,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[10px] font-bold"
            style={{
              color: pct > 45 ? "#ffffff" : "#334155",
            }}
          >
            {formatNumber(pct, 1)}%
          </span>
        </div>
      </div>

      <div className="max-w-20 text-center text-[11px] font-medium capitalize text-slate-600">
        {pump}
      </div>
    </div>
  );
}


function Pagination({ currentPage, totalItems, pageSize, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
      <p className="text-xs text-slate-500">
        Showing {startItem}–{endItem} of {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
          (page) => (
            <button
              type="button"
              key={page}
              onClick={() => onPageChange(page)}
              aria-current={currentPage === page ? "page" : undefined}
              className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                currentPage === page
                  ? "bg-slate-800 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ======================================================
// Dashboard
// ======================================================

export default function Dashboard() {
  // ----------------------------------------------------
  // API data
  // ----------------------------------------------------

  const [fuelTypes, setFuelTypes] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [maintenanceRows, setMaintenanceRows] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

const [maintenancePage, setMaintenancePage] = useState(1);
const [activityPage, setActivityPage] = useState(1);

const pageSize = 5;

  const [fuelSales, setFuelSales] = useState([]);
  const [storeSales, setStoreSales] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ----------------------------------------------------
  // Modal state
  // ----------------------------------------------------

  const [modal, setModal] = useState(null);

  const [priceData, setPriceData] = useState(EMPTY_PRICE);
  const [poData, setPoData] = useState(EMPTY_PO);
  const [maintenanceData, setMaintenanceData] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Backup is deliberately not marked successful until a
  // real backend backup endpoint has been implemented.
  const [backupStatus, setBackupStatus] = useState("idle");

  // ----------------------------------------------------
  // Load Dashboard data
  // ----------------------------------------------------

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    // Each request is independent so one unavailable
    // endpoint does not prevent the other panels loading.
    const requests = [
      ["fuelTypes", () => api.get("/fuel-types")],
      ["tanks", () => api.get("/fuel-tanks")],
      ["pumps", () => api.get("/fuel-pumps")],
      ["suppliers", () => api.get("/suppliers")],
      ["maintenance", () => api.get("/equipment-maintenance")],
      ["activity", () => api.get("/activity-logs")],
      ["fuelSales", () => api.get("/fuel-sales")],
      ["storeSales", () => api.get("/store-sales")],
      ["employees", () => api.get("/employees")],
    ];

    const results = await Promise.allSettled(
      requests.map(([, request]) => request())
    );

    const failedRequests = [];

    results.forEach((result, index) => {
      const key = requests[index][0];

      if (result.status === "rejected") {
        failedRequests.push(key);
        return;
      }

      const response = result.value;

      switch (key) {
        case "fuelTypes":
          setFuelTypes(getArray(response));
          break;

        case "tanks":
          setTanks(getArray(response));
          break;

        case "pumps":
          setPumps(getArray(response));
          break;

        case "suppliers":
          setSuppliers(
            getArray(response).filter(
              (supplier) => supplier.is_active !== false
            )
          );
          break;

        case "maintenance":
          setMaintenanceRows(getArray(response));
          break;

        case "activity": {
          const body = response.data;

          setRecentActivity(
            Array.isArray(body?.data)
              ? body.data
              : Array.isArray(body)
                ? body
                : []
          );
          break;
        }

        case "fuelSales":
          setFuelSales(getArray(response));
          break;

        case "storeSales":
          setStoreSales(getArray(response));
          break;

        case "employees":
          setEmployees(getArray(response));
          break;

        default:
          break;
      }
    });

    if (failedRequests.length > 0) {
      setLoadError(
        `Some Dashboard data could not be loaded: ${failedRequests.join(", ")}. Check your Laravel routes, login token, and server.`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);



useEffect(() => {
  setMaintenancePage(1);
}, [maintenanceRows]);

useEffect(() => {
  setActivityPage(1);
}, [recentActivity]);



const paginatedMaintenance = useMemo(() => {
  const start = (maintenancePage - 1) * pageSize;

  return maintenanceRows.slice(start, start + pageSize);
}, [maintenanceRows, maintenancePage]);

const paginatedActivity = useMemo(() => {
  const start = (activityPage - 1) * pageSize;

  return recentActivity.slice(start, start + pageSize);
}, [recentActivity, activityPage]);

  // ----------------------------------------------------
  // General modal helpers
  // ----------------------------------------------------

  const openModal = (type) => {
    setFormError("");
    setFormSuccess("");
    setModal(type);
  };

  const closeModal = () => {
    if (submitting) return;

    setModal(null);
    setFormError("");
    setFormSuccess("");
    setMaintenanceData(null);
    setBackupStatus("idle");
  };

  // ----------------------------------------------------
  // Calculated tank levels
  // ----------------------------------------------------

  
const tankLevels = useMemo(() => {
  return tanks.map((tank) => {
    const capacity = Number(tank.capacity ?? 0);
    const currentVolume = Number(tank.current_volume ?? 0);
    const minVolume = Number(tank.min_volume ?? 0);

    const pct =
      capacity > 0
        ? Math.min(
            100,
            Math.max(0, (currentVolume / capacity) * 100)
          )
        : 0;

    // Critical: fuel is at or below 10% of tank capacity.
    const isCritical = capacity > 0 && pct <= 10;

    // Low: fuel is at/below configured minimum
    // OR at/below 20% of tank capacity.
    const isLow =
      isCritical ||
      currentVolume <= minVolume ||
      (capacity > 0 && pct <= 20);

    const fuel = fuelTypes.find(
      (item) =>
        Number(item.fuel_id) === Number(tank.fuel_id)
    );

    return {
      id: tank.tank_id,
      pump: tank.tank_number || `Tank ${tank.tank_id}`,
      pct,
      status: isCritical
        ? "Critical Stock"
        : isLow
          ? "Low Stock"
          : "In Stock",
      fuelName: fuel?.fuel_name || "Unknown fuel",
      currentVolume,
      capacity,
      minVolume,
      tankStatus: String(tank.status ?? "").toLowerCase(),
    };
  });
}, [tanks, fuelTypes]);


  // ----------------------------------------------------
  // Low fuel alerts
  // ----------------------------------------------------

  
const lowFuelAlerts = useMemo(() => {
  return tankLevels
    .filter(
      (tank) =>
        tank.status !== "In Stock" &&
        tank.tankStatus !== "inactive"
    )
    .map((tank) => ({
      tank: `${tank.pump} - ${tank.fuelName}`,
      note: `${formatNumber(tank.currentVolume)} L remaining of ${formatNumber(tank.capacity)} L capacity`,
      status: tank.status,
    }));
}, [tankLevels]);


  // ----------------------------------------------------
  // Fuel sales by type
  //
  // Note: fuel-sales endpoint is paginated. This chart
  // represents returned rows, not all-time totals.
  // ----------------------------------------------------

  const salesByType = useMemo(() => {
    const totals = new Map();

    fuelSales
      .filter((sale) => sale.payment_status === "paid")
      .forEach((sale) => {
        const fuelId = Number(sale.fuel_id);
        const amount = Number(sale.quantity || 0);

        totals.set(
          fuelId,
          (totals.get(fuelId) || 0) + amount
        );
      });

    const entries = fuelTypes.map((fuel, index) => ({
      name: fuel.fuel_name,
      value: totals.get(Number(fuel.fuel_id)) || 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    const grandTotal = entries.reduce(
      (sum, entry) => sum + entry.value,
      0
    );

    return entries.map((entry) => ({
      ...entry,
      percent:
        grandTotal > 0
          ? (entry.value / grandTotal) * 100
          : 0,
    }));
  }, [fuelSales, fuelTypes]);

  // ----------------------------------------------------
  // Pump activity
  //
  // Uses real pump status and latest returned sale.
  // It does not simulate a live counting meter.
  // ----------------------------------------------------

  const pumpFeed = useMemo(() => {
    return pumps.map((pump) => {
      const latestSale = fuelSales.find(
        (sale) => Number(sale.pump_id) === Number(pump.pump_id)
      );

      const fuel = fuelTypes.find(
        (item) => Number(item.fuel_id) === Number(pump.fuel_id)
      );

      const statusLabels = {
        available: "Available",
        in_use: "In Use",
        under_maintenance: "Under Maintenance",
        out_of_service: "Out of Service",
      };

      let amount = "No recent sale found";

      if (latestSale) {
        amount = `${formatNumber(latestSale.quantity)} L, ${formatKHR(latestSale.total_amount)}`;
      } else if (pump.meter_reading != null) {
        amount = `Meter reading: ${formatNumber(pump.meter_reading)}`;
      }

      return {
        id: pump.pump_id,
        pump: pump.pump_number || `Pump ${pump.pump_id}`,
        fuelType: fuel?.fuel_name || "Unknown fuel",
        status: statusLabels[pump.status] || pump.status || "Unknown",
        amount,
        active: pump.status === "in_use",
      };
    });
  }, [pumps, fuelSales, fuelTypes]);

  // ----------------------------------------------------
  // Dashboard stats
  // ----------------------------------------------------

  const totalPumps = pumps.length;

  const activePumps = pumps.filter(
    (pump) => pump.status === "in_use"
  ).length;

  const employeeCount = employees.length;

  // Sales endpoints paginate results. These figures are
  // explicitly based on the returned records only.
  const today = new Date().toDateString();

  const todayFuelSales = fuelSales.filter((sale) => {
    return (
      sale.sale_date &&
      new Date(sale.sale_date).toDateString() === today &&
      sale.payment_status === "paid"
    );
  });

  const todayFuelLiters = todayFuelSales.reduce(
    (sum, sale) => sum + Number(sale.quantity || 0),
    0
  );

  // Do not call this monthly revenue: the existing API
  // does not return a complete month-level aggregate.
  const visibleSalesRevenue = [...fuelSales, ...storeSales]
    .filter((sale) => sale.payment_status === "paid")
    .reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    );

  // ----------------------------------------------------
  // Revenue chart
  //
  // This chart groups returned paid fuel-sale records
  // into weekdays. It is not a complete daily aggregate
  // until a dedicated report endpoint is added.
  // ----------------------------------------------------

  const dailyRevenue = useMemo(() => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);

      const label = date.toLocaleDateString("en-US", {
        weekday: "short",
      });

      const value = fuelSales
        .filter((sale) => {
          if (!sale.sale_date || sale.payment_status !== "paid") {
            return false;
          }

          const saleDate = new Date(sale.sale_date);
          return saleDate.toDateString() === date.toDateString();
        })
        .reduce(
          (sum, sale) => sum + Number(sale.total_amount || 0),
          0
        );

      days.push({
        day: label,
        value,
      });
    }

    return days;
  }, [fuelSales]);

  // ----------------------------------------------------
  // Adjust fuel price
  // ----------------------------------------------------

  const handleAdjustPrice = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      if (!priceData.fuelId) {
        throw new Error("Please select a fuel type.");
      }

      const price = Number(priceData.price);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Please enter a valid fuel price.");
      }

      const response = await api.put(
        `/fuel-types/${priceData.fuelId}`,
        {
          selling_price: price,
        }
      );

      setFormSuccess(
        response.data?.message || "Fuel price updated successfully."
      );

      await loadDashboard();

      setPriceData(EMPTY_PRICE);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Create purchase order
  // ----------------------------------------------------

  const handleCreatePO = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      if (!poData.supplierId || !poData.fuelId) {
        throw new Error("Please select a supplier and fuel type.");
      }

      const quantity = Number(poData.quantity);
      const unitPrice = Number(poData.unitPrice);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Quantity must be greater than zero.");
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error("Please enter a valid purchase price.");
      }

      // Use a timestamp-based reference. The backend still
      // validates uniqueness and reports any conflict.
      const poNumber = `PO-${Date.now()}`;

      const response = await api.post("/purchase-orders", {
        po_number: poNumber,
        supplier_id: Number(poData.supplierId),
        fuel_id: Number(poData.fuelId),
        quantity,
        unit_price: unitPrice,
        order_date: poData.orderDate,
        notes: poData.notes || null,
        status: "pending",
      });

      setFormSuccess(
        response.data?.message || "Purchase order created successfully."
      );

      await loadDashboard();

      setPoData(EMPTY_PO);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // System backup
  //
  // No backup endpoint was included in the supplied
  // backend code. Do not simulate successful completion.
  // ----------------------------------------------------

  const handleBackup = () => {
    setBackupStatus("unavailable");
  };

  // ----------------------------------------------------
  // Maintenance details
  // ----------------------------------------------------

  const openMaintenanceDetail = (maintenance) => {
    setMaintenanceData({
      ...maintenance,
      status: maintenance.status || "scheduled",
    });

    setFormError("");
    setFormSuccess("");
    setModal("maintenance");
  };

  const handleUpdateMaintenance = async () => {
    if (!maintenanceData?.maintenance_id) {
      setFormError("Maintenance record ID is missing.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      const status = maintenanceStatusValue(
        maintenanceData.status
      );

      const payload = { status };

      // When marked completed, record the performed date
      // if it has not already been entered.
      if (
        status === "completed" &&
        !maintenanceData.performed_date
      ) {
        payload.performed_date = new Date()
          .toISOString()
          .slice(0, 10);
      }

      const response = await api.put(
        `/equipment-maintenance/${maintenanceData.maintenance_id}`,
        payload
      );

      setFormSuccess(
        response.data?.message ||
          "Maintenance record updated successfully."
      );

      await loadDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Shared status message
  // ----------------------------------------------------

  const StatusMessage = ({ error, success }) => (
    <>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}
    </>
  );

  // ======================================================
  // Render
  // ======================================================

  return (
    <>
      <div className="space-y-4 bg-gray-400 p-6">
        {/* Dashboard loading / API errors */}

        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>{loadError}</span>

            <button
              onClick={loadDashboard}
              className="shrink-0 rounded-lg border border-amber-300 px-3 py-1.5 font-medium hover:bg-amber-100"
            >
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 rounded-lg bg-white/80 px-4 py-3 text-sm text-slate-600">
            <Loader2 size={18} className="animate-spin" />
            Loading Dashboard data...
          </div>
        )}

        {/* ===================================== */}
        {/* STAT CARDS */}
        {/* ===================================== */}

        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={
              <img
                src={pumpImage}
                className="h-10 w-10"
                alt="Fuel pump"
              />
            }
            label="Total Fuel Sales Today"
            value={`${formatNumber(todayFuelLiters)} L`}
            delta="Based on returned paid fuel-sale records"
          />

          <StatCard
            icon={
              <TrendingUp
                size={18}
                className="h-10 w-10 text-emerald-500"
              />
            }
            label="Revenue in Loaded Sales"
            value={formatKHR(visibleSalesRevenue)}
            delta="Loaded records only — not the monthly total"
          />

          <StatCard
            icon={
              <Gauge
                size={18}
                className="h-10 w-10 text-indigo-500"
              />
            }
            label="Total Pumps"
            value={`${activePumps}/${totalPumps}`}
            delta="Pumps currently marked In Use"
            deltaTone="neutral"
          />

          <StatCard
            icon={
              <Users2
                size={18}
                className="h-10 w-10 text-amber-500"
              />
            }
            label="Employees"
            value={loading ? "..." : String(employeeCount)}
            delta="Employees returned by the API"
            deltaTone="neutral"
          />
        </div>

        {/* ===================================== */}
        {/* CHARTS */}
        {/* ===================================== */}

        <div className="grid grid-cols-3 gap-4">
          {/* Daily Revenue */}

          <Panel title="Daily Revenue" className="col-span-1">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(70.5% 0.015 286.067)"
                />

                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 13, fill: "black" }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: "black" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(value) => [
                    formatKHR(value),
                    "Loaded fuel sales",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>

            <p className="mt-2 text-xs text-slate-400">
              Based on returned fuel-sale records. Complete daily totals
              require a reporting endpoint.
            </p>
          </Panel>

          {/* Fuel Tanks */}

          <Panel title="Fuel Tanks" className="col-span-1">
            {tankLevels.length > 0 ? (
              <div className="flex min-h-[200px] flex-wrap items-center justify-around gap-4 py-2">
                {tankLevels.map((tank) => (
                  <TankBattery
                    key={tank.id}
                    pump={tank.pump}
                    pct={tank.pct}
                    status={tank.status}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
                {loading ? "Loading tanks..." : "No tank records found."}
              </div>
            )}
          </Panel>

          {/* Fuel Sales Chart */}

          <Panel title="Fuel Sales by Type Chart" className="col-span-1">
            {salesByType.some((item) => item.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={salesByType.filter((item) => item.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ percent }) =>
                        `${Math.round(percent * 100)}%`
                      }
                      labelLine={false}
                    >
                      {salesByType
                        .filter((item) => item.value > 0)
                        .map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                          />
                        ))}
                    </Pie>

                    <Tooltip
                      formatter={(value, name) => [
                        `${formatNumber(value)} L`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
                  {salesByType
                    .filter((item) => item.value > 0)
                    .map((item) => (
                      <span
                        key={item.name}
                        className="flex items-center gap-1"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: item.color }}
                        />

                        {item.name}
                      </span>
                    ))}
                </div>
              </>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
                {loading
                  ? "Loading fuel sales..."
                  : "No paid fuel sales found in the returned records."}
              </div>
            )}
          </Panel>
        </div>

        {/* ===================================== */}
        {/* QUICK ACTION + PUMP ACTIVITY */}
        {/* ===================================== */}

        <div className="grid grid-cols-3 gap-4">
          {/* Quick Action */}

          <Panel title="Quick Action" className="col-span-1">
            <div className="flex flex-col gap-2">
              {[
                {
                  label: "Adjust Price",
                  icon: DollarSign,
                  primary: true,
                },
                {
                  label: "Issue PO",
                  icon: FileText,
                  primary: false,
                },
                {
                  label: "System Backup",
                  icon: DatabaseBackup,
                  primary: false,
                },
              ].map(({ label, icon: Icon, primary }) => (
                <button
                  key={label}
                  onClick={() => openModal(label)}
                  className={`flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
                    primary
                      ? "bg-cyan-500 text-white hover:bg-cyan-600"
                      : "border border-cyan-200 bg-white text-cyan-600 hover:bg-cyan-50"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </Panel>

          {/* Pump Activity */}

          <Panel className="col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                <Fuel size={18} className="text-white" />
              </div>

              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                STATUS
              </span>

              <h3 className="text-xl font-bold text-slate-800">
                Pump Activity Feed
              </h3>
            </div>

            <div className="overflow-x-auto rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-sky-100 text-slate-700">
                    <th className="px-3 py-2 font-semibold">Pump</th>
                    <th className="px-3 py-2 font-semibold">Fuel Type</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">
                      Latest Returned Record
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pumpFeed.map((pump) => (
                    <tr
                      key={pump.id}
                      className={
                        pump.active ? "bg-emerald-50" : "bg-sky-50"
                      }
                    >
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {pump.pump}
                      </td>

                      <td className="px-3 py-2 capitalize text-slate-600">
                        {pump.fuelType}
                      </td>

                      <td className="px-3 py-2 text-slate-600">
                        {pump.status}
                      </td>

                      <td className="px-3 py-2 text-slate-600">
                        {pump.amount}
                      </td>
                    </tr>
                  ))}

                  {!loading && pumpFeed.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-slate-400"
                      >
                        No pump records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* ===================================== */}
        {/* LOW FUEL + MAINTENANCE + ACTIVITY */}
        {/* ===================================== */}

        <div className="grid grid-cols-3 gap-4">
          {/* Low Fuel Alerts */}

          <Panel title="Low Fuel Alerts">
            <ul className="space-y-2">
              {lowFuelAlerts.map((alert) => (
                <FuelAlertRow
                  key={alert.tank}
                  {...alert}
                />
              ))}

              {!loading && lowFuelAlerts.length === 0 && (
                <li className="rounded-lg bg-emerald-50 px-3 py-4 text-sm text-emerald-700">
                  No tanks are currently at or below minimum stock.
                </li>
              )}
            </ul>
          </Panel>

          {/* Maintenance Schedule */}

          <Panel>
            <h3 className="mb-4 text-xl font-bold text-slate-800">
              Maintenance Schedule
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-700">
                    <th className="pb-2 font-semibold">Equipment/Task</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Scheduled Date</th>
                    <th className="pb-2 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedMaintenance.map((maintenance) => {
                    const status =
                      maintenanceStatusLabel(maintenance.status);

                    const dot =
                      maintenance.status === "completed"
                        ? "bg-emerald-500"
                        : maintenance.status === "cancelled"
                          ? "bg-slate-400"
                          : maintenance.status === "in_progress"
                            ? "bg-rose-500"
                            : "bg-amber-500";

                    return (
                      <tr
                        key={maintenance.maintenance_id}
                        className="border-t border-slate-100"
                      >
                        <td className="py-3 pr-2">
                          <div className="font-medium capitalize text-slate-700">
                            {getEquipmentLabel(maintenance)}
                          </div>

                          <div className="text-slate-400">
                            {maintenance.description ||
                              maintenance.maintenance_type ||
                              "Maintenance"}
                          </div>
                        </td>

                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className={`h-2 w-2 rounded-full ${dot}`} />
                            {status}
                          </div>
                        </td>

                        <td className="py-3 pr-2 text-slate-500">
                          {formatDate(maintenance.scheduled_date)}
                        </td>

                        <td className="py-3">
                          <button
                            onClick={() =>
                              openMaintenanceDetail(maintenance)
                            }
                            className="rounded-full bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-700"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && maintenanceRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-slate-400"
                      >
                        No maintenance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

<Pagination
  currentPage={maintenancePage}
  totalItems={maintenanceRows.length}
  pageSize={pageSize}
  onPageChange={setMaintenancePage}
/>

          </Panel>

          {/* Recent Activity */}

          <Panel>
            <h3 className="mb-4 text-xl font-bold text-slate-800">
              My Recent Activity
            </h3>

            <div className="overflow-x-auto rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-sky-100 text-slate-700">
                    <th className="px-3 py-2 font-semibold">Action</th>
                    <th className="px-3 py-2 font-semibold">Entity</th>
                    <th className="px-3 py-2 font-semibold">User</th>
                    <th className="px-3 py-2 font-semibold">Time</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedActivity.map((activity, index) => (
                    <tr
                      key={activity.log_id ?? index}
                      className={
                        ((activityPage - 1) * pageSize + index) % 2 === 0
  ? "bg-white"
  : "bg-sky-50"
                      }
                    >
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {activity.action || "—"}
                      </td>

                      <td className="px-3 py-2 text-slate-600">
                        {activity.entity_type || "—"}
                      </td>

                      <td className="px-3 py-2 text-slate-600">
                        {activity.user?.full_name ||
                          activity.user?.username ||
                          "System"}
                      </td>

                      <td className="px-3 py-2 text-slate-400">
                        {formatTime(activity.created_at)}
                      </td>
                    </tr>
                  ))}

                  {!loading && recentActivity.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-slate-400"
                      >
                        No activity records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

<Pagination
  currentPage={activityPage}
  totalItems={recentActivity.length}
  pageSize={pageSize}
  onPageChange={setActivityPage}
/>

            </div>
          </Panel>
        </div>
      </div>

      {/* ====================================================== */}
      {/* ADJUST PRICE MODAL */}
      {/* ====================================================== */}

      {modal === "Adjust Price" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Adjust Fuel Price
                </h2>

                <p className="text-xs text-slate-500">
                  Update the current fuel price
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={submitting}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAdjustPrice}
              className="space-y-4 p-6"
            >
              <StatusMessage
                error={formError}
                success={formSuccess}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Fuel Type
                </label>

                <select
                  required
                  value={priceData.fuelId}
                  onChange={(event) => {
                    const fuelId = event.target.value;

                    const selectedFuel = fuelTypes.find(
                      (fuel) =>
                        String(fuel.fuel_id) === String(fuelId)
                    );

                    setPriceData({
                      fuelId,
                      price:
                        selectedFuel?.selling_price != null
                          ? String(selectedFuel.selling_price)
                          : "",
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option value="">Select Fuel Type</option>

                  {fuelTypes.map((fuel) => (
                    <option
                      key={fuel.fuel_id}
                      value={fuel.fuel_id}
                    >
                      {fuel.fuel_name} — Current:{" "}
                      {formatNumber(fuel.selling_price)} KHR/L
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New Price (KHR/L)
                </label>

                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={priceData.price}
                  onChange={(event) =>
                    setPriceData({
                      ...priceData,
                      price: event.target.value,
                    })
                  }
                  placeholder="Enter new price"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || fuelTypes.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* ISSUE PURCHASE ORDER MODAL */}
      {/* ====================================================== */}

      {modal === "Issue PO" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Issue Purchase Order
                </h2>

                <p className="text-xs text-slate-500">
                  Create a new purchase order
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={submitting}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreatePO}
              className="space-y-4 p-6"
            >
              <StatusMessage
                error={formError}
                success={formSuccess}
              />

              {/* Supplier */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Supplier
                </label>

                <select
                  required
                  value={poData.supplierId}
                  onChange={(event) =>
                    setPoData({
                      ...poData,
                      supplierId: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option value="">Select Supplier</option>

                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.supplier_id}
                      value={supplier.supplier_id}
                    >
                      {supplier.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fuel Type */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Fuel Type
                </label>

                <select
                  required
                  value={poData.fuelId}
                  onChange={(event) => {
                    const fuelId = event.target.value;

                    const selectedFuel = fuelTypes.find(
                      (fuel) =>
                        String(fuel.fuel_id) === String(fuelId)
                    );

                    setPoData({
                      ...poData,
                      fuelId,
                      unitPrice:
                        selectedFuel?.purchase_price != null
                          ? String(selectedFuel.purchase_price)
                          : "",
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option value="">Select Fuel Type</option>

                  {fuelTypes.map((fuel) => (
                    <option
                      key={fuel.fuel_id}
                      value={fuel.fuel_id}
                    >
                      {fuel.fuel_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Quantity (Liter)
                </label>

                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  value={poData.quantity}
                  onChange={(event) =>
                    setPoData({
                      ...poData,
                      quantity: event.target.value,
                    })
                  }
                  placeholder="Enter quantity"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Purchase price */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Purchase Price (KHR/L)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={poData.unitPrice}
                  onChange={(event) =>
                    setPoData({
                      ...poData,
                      unitPrice: event.target.value,
                    })
                  }
                  placeholder="Enter unit purchase price"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Order date */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Order Date
                </label>

                <input
                  type="date"
                  required
                  value={poData.orderDate}
                  onChange={(event) =>
                    setPoData({
                      ...poData,
                      orderDate: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Optional notes */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes (Optional)
                </label>

                <textarea
                  rows={2}
                  value={poData.notes}
                  onChange={(event) =>
                    setPoData({
                      ...poData,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Enter additional notes"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Estimated total */}

              <div className="rounded-lg bg-sky-50 p-3">
                <div className="text-xs text-slate-500">
                  Estimated Total Amount
                </div>

                <div className="mt-1 text-lg font-bold text-slate-800">
                  {formatKHR(
                    Number(poData.quantity || 0) *
                      Number(poData.unitPrice || 0)
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    suppliers.length === 0 ||
                    fuelTypes.length === 0
                  }
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileText size={16} />
                  )}
                  Create PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* SYSTEM BACKUP MODAL */}
      {/* ====================================================== */}

      {modal === "System Backup" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  System Backup
                </h2>

                <p className="text-xs text-slate-500">
                  Backup your system data
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {backupStatus === "idle" && (
                <>
                  <div className="mb-5 rounded-lg bg-sky-50 p-4">
                    <div className="flex gap-3">
                      <DatabaseBackup className="shrink-0 text-cyan-500" />

                      <div>
                        <h3 className="font-semibold text-slate-800">
                          Backup System Data
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          A real backup requires a secure server-side
                          endpoint. The current backend code supplied for
                          this Dashboard does not include one.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={closeModal}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
                    >
                      Close
                    </button>

                    <button
                      onClick={handleBackup}
                      className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                    >
                      <DatabaseBackup size={16} />
                      Check Backup Availability
                    </button>
                  </div>
                </>
              )}

              {backupStatus === "unavailable" && (
                <div className="py-6 text-center">
                  <TriangleAlert
                    size={44}
                    className="mx-auto text-amber-500"
                  />

                  <h3 className="mt-4 text-lg font-bold text-slate-800">
                    Backup Endpoint Not Configured
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    No backup was created. A Laravel endpoint and a secure
                    database backup process must be implemented before this
                    feature can report success.
                  </p>

                  <button
                    onClick={closeModal}
                    className="mt-5 rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* MAINTENANCE DETAIL MODAL */}
      {/* ====================================================== */}

      {modal === "maintenance" && maintenanceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Maintenance Detail
                </h2>

                <p className="text-xs text-slate-500">
                  Equipment maintenance information
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={submitting}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <StatusMessage
                error={formError}
                success={formSuccess}
              />

              {/* Equipment */}

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Equipment / Task
                </p>

                <p className="mt-1 font-semibold capitalize text-slate-800">
                  {getEquipmentLabel(maintenanceData)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {maintenanceData.description ||
                    maintenanceData.maintenance_type ||
                    "Maintenance"}
                </p>

                {maintenanceData.notes && (
                  <p className="mt-2 text-xs text-slate-500">
                    Notes: {maintenanceData.notes}
                  </p>
                )}
              </div>

              {/* Status + Date */}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Current Status
                  </p>

                  <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    {maintenanceStatusLabel(maintenanceData.status)}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Scheduled Date
                  </p>

                  <p className="mt-2 font-semibold text-slate-700">
                    {formatDate(maintenanceData.scheduled_date)}
                  </p>

                  <p className="text-xs text-slate-500">
                    {maintenanceData.performed_date
                      ? `Performed: ${formatDate(maintenanceData.performed_date)}`
                      : "Not performed yet"}
                  </p>
                </div>
              </div>

              {/* Update Status */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Update Status
                </label>

                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  value={maintenanceData.status}
                  onChange={(event) => {
                    setMaintenanceData({
                      ...maintenanceData,
                      status: event.target.value,
                    });

                    setFormError("");
                    setFormSuccess("");
                  }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>

                <button
                  onClick={handleUpdateMaintenance}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : formSuccess ? (
                    <CheckCircle size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}