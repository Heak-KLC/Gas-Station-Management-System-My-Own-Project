
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LabelList, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Panel, StatusBadge } from "../components/ui";
import { X, Save, Eye, RefreshCw } from "lucide-react";
import api from "../api/axios";
import pumpImage from "../image/pump.png";

// ======================================================
// Helper functions
// ======================================================

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: 3,
  });
}

function litersLabel(value) {
  return `${formatNumber(value)} L`;
}

function formatPrice(value) {
  return toNumber(value).toFixed(3);
}

function getFuelName(fuel) {
  return fuel?.fuel_name || "Unknown Fuel";
}

function getResponseRows(response) {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

function getTankStatus(tank) {
  const current = toNumber(tank?.current_volume);
  const minimum = toNumber(tank?.min_volume);
  const capacity = toNumber(tank?.capacity);

  if (tank?.status && tank.status !== "active") {
    return "Check Status";
  }

  if (current <= minimum) return "Critical Low";

  if (capacity > 0 && current / capacity >= 0.9) {
    return "Check Status";
  }

  return "Sufficient";
}

// Get today's date in YYYY-MM-DD format using local time.
function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function DotLegend({ items }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}


function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
      <p className="text-xs text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-700">
          {startItem}-{endItem}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-700">
          {totalItems}
        </span>{" "}
        records
      </p>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {Array.from(
  {
    length: Math.min(3, totalPages),
  },
  (_, index) => {
    const startPage = Math.min(
      Math.max(1, currentPage - 1),
      Math.max(1, totalPages - 2)
    );

    return startPage + index;
  }
).map((page) => (
  <button
    key={page}
    type="button"
    onClick={() => onPageChange(page)}
    aria-current={currentPage === page ? "page" : undefined}
    className={`min-w-8 rounded-lg border px-3 py-1.5 text-xs ${
      currentPage === page
        ? "border-cyan-600 bg-cyan-600 font-semibold text-white"
        : "border-slate-300 text-slate-600 hover:bg-slate-100"
    }`}
  >
    {page}
  </button>
))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ======================================================
// Fuel Management
// ======================================================

export default function FuelManagement() {
  // Main fuel-management data.
  const [fuelTypes, setFuelTypes] = useState([]);
  const [fuelTanks, setFuelTanks] = useState([]);
  const [fuelPumps, setFuelPumps] = useState([]);

  // Sales and activity-log data.
  const [fuelSales, setFuelSales] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  // Pagination settings
const PAGE_SIZE = 4;

const [recentActionsPage, setRecentActionsPage] = useState(1);
const [inventoryPage, setInventoryPage] = useState(1);

  // Loading and error states.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [salesError, setSalesError] = useState("");
  const [actionsError, setActionsError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal and selected record.
  const [modal, setModal] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState(null);
  const [editFuel, setEditFuel] = useState({
    sellingPrice: "",
  });

  // ----------------------------------------------------
  // Fetch all pages of today's sales.
  // FuelSaleController paginates records by 15 by default.
  // This loop prevents the daily total from using only
  // the first 15 sales records.
  // ----------------------------------------------------
  const fetchTodaySales = useCallback(async () => {
    const today = getLocalDateString();
    const allSales = [];
    let page = 1;
    let lastPage = 1;

    do {
      const response = await api.get("/fuel-sales", {
        params: {
          date: today,
          page,
        },
      });

      const payload = response.data;
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : [];

      allSales.push(...rows);

      // Laravel pagination metadata is returned alongside data.
      lastPage = Math.max(
        1,
        toNumber(payload?.last_page) || 1
      );

      page += 1;
    } while (page <= lastPage);

    setFuelSales(allSales);
  }, []);

  // ----------------------------------------------------
  // Fetch the main data and optional dashboard sections.
  // ----------------------------------------------------
  const fetchFuelManagementData = useCallback(async () => {
    setLoading(true);
    setApiError("");
    setSalesError("");
    setActionsError("");

    try {
      const [typesResponse, tanksResponse, pumpsResponse] =
        await Promise.all([
          api.get("/fuel-types"),
          api.get("/fuel-tanks"),
          api.get("/fuel-pumps"),
        ]);

      setFuelTypes(getResponseRows(typesResponse));
      setFuelTanks(getResponseRows(tanksResponse));
      setFuelPumps(getResponseRows(pumpsResponse));
    } catch (error) {
      setApiError(
        error.response?.data?.message ||
        error.message ||
        "Unable to load Fuel Management data."
      );
    } finally {
      setLoading(false);
    }

    // Optional section: a sales failure should not hide
    // the tank, pump, and fuel-type information.
    try {
      await fetchTodaySales();
    } catch (error) {
      setFuelSales([]);
      setSalesError(
        error.response?.data?.message ||
        error.message ||
        "Unable to load today's fuel sales."
      );
    }

    // AuditLogController returns its records in data.
    try {
      const response = await api.get("/activity-logs");
      setRecentActions(getResponseRows(response));
    } catch (error) {
      setRecentActions([]);
      setActionsError(
        error.response?.data?.message ||
        error.message ||
        "Unable to load recent actions."
      );
    }
  }, [fetchTodaySales]);

  useEffect(() => {
    fetchFuelManagementData();
  }, [fetchFuelManagementData]);

  // ----------------------------------------------------
  // Match fuel types to tanks and pumps.
  // ----------------------------------------------------
  const fuelTypeMap = useMemo(
    () =>
      new Map(
        fuelTypes.map((fuel) => [
          String(fuel.fuel_id),
          fuel,
        ])
      ),
    [fuelTypes]
  );

  const stockByTank = useMemo(() => {
    const colors = [
      { dark: "#2563eb", light: "#93c5fd" },
      { dark: "#f59e0b", light: "#fcd34d" },
      { dark: "#475569", light: "#94a3b8" },
      { dark: "#0d9488", light: "#5eead4" },
    ];

    return fuelTanks.map((tank, index) => {
      const fuel = fuelTypeMap.get(String(tank.fuel_id));
      const color = colors[index % colors.length];

      return {
        id: tank.tank_id,
        tank: tank.tank_number || `Tank ${tank.tank_id}`,
        fuel: getFuelName(fuel),
        current: toNumber(tank.current_volume),
        capacity: toNumber(tank.capacity),
        dark: color.dark,
        light: color.light,
      };
    });
  }, [fuelTanks, fuelTypeMap]);

  const inventoryRows = useMemo(
    () =>
      fuelTanks.map((tank) => {
        const fuel = fuelTypeMap.get(String(tank.fuel_id));

        return {
          id: tank.tank_id,
          tankId: tank.tank_id,
          fuelId: tank.fuel_id,
          tank: tank.tank_number || `Tank ${tank.tank_id}`,
          fuel: getFuelName(fuel),
          currentVolume: toNumber(tank.current_volume),
          capacity: toNumber(tank.capacity),
          minimumVolume: toNumber(tank.min_volume),
          tankStatus: tank.status || "unknown",
          cost: fuel?.purchase_price ?? null,
          price: fuel?.selling_price ?? null,
          rawTank: tank,
          rawFuel: fuel || null,
        };
      }),
    [fuelTanks, fuelTypeMap]
  );

  // ----------------------------------------------------
// Inventory table pagination
// ----------------------------------------------------
const inventoryTotalPages = Math.ceil(
  inventoryRows.length / PAGE_SIZE
);

const paginatedInventoryRows = useMemo(() => {
  const startIndex = (inventoryPage - 1) * PAGE_SIZE;

  return inventoryRows.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );
}, [inventoryRows, inventoryPage]);

// ----------------------------------------------------
// Recent Actions pagination
// ----------------------------------------------------
const recentActionsTotalPages = Math.ceil(
  recentActions.length / PAGE_SIZE
);

const paginatedRecentActions = useMemo(() => {
  const startIndex = (recentActionsPage - 1) * PAGE_SIZE;

  return recentActions.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );
}, [recentActions, recentActionsPage]);

// Reset the current page if refreshed data has fewer pages.
useEffect(() => {
  setInventoryPage((page) =>
    Math.min(page, Math.max(1, inventoryTotalPages))
  );
}, [inventoryTotalPages]);

useEffect(() => {
  setRecentActionsPage((page) =>
    Math.min(page, Math.max(1, recentActionsTotalPages))
  );
}, [recentActionsTotalPages]);

  const pumpCards = useMemo(
    () =>
      fuelPumps.map((pump) => {
        const fuel = fuelTypeMap.get(String(pump.fuel_id));

        return {
          id: pump.pump_id,
          number: pump.pump_number || `Pump ${pump.pump_id}`,
          status: pump.status || "unknown",
          meterReading: toNumber(pump.meter_reading),
          fuel: getFuelName(fuel),
          image: pumpImage,
        };
      }),
    [fuelPumps, fuelTypeMap]
  );

  const priceChartData = useMemo(
    () =>
      fuelTypes.map((fuel) => ({
        name: fuel.fuel_name || `Fuel ${fuel.fuel_id}`,
        cost: toNumber(fuel.purchase_price),
        sell: toNumber(fuel.selling_price),
        profit:
          toNumber(fuel.selling_price) -
          toNumber(fuel.purchase_price),
      })),
    [fuelTypes]
  );

  // ----------------------------------------------------
  // Calculate today's sold liters by fuel type.
  // The backend query already filters sales by today's date.
  // Only paid sales are included in this calculation.
  // ----------------------------------------------------
  const dailySalesByType = useMemo(() => {
    const totals = new Map();

    fuelSales.forEach((sale) => {
      if (String(sale.payment_status).toLowerCase() !== "paid") {
        return;
      }

      const fuelId = String(sale.fuel_id);
      const quantity = toNumber(sale.quantity);

      totals.set(
        fuelId,
        (totals.get(fuelId) || 0) + quantity
      );
    });

    return fuelTypes.map((fuel) => ({
      fuelId: fuel.fuel_id,
      name: fuel.fuel_name || `Fuel ${fuel.fuel_id}`,
      liters: totals.get(String(fuel.fuel_id)) || 0,
    }));
  }, [fuelSales, fuelTypes]);

  const totalTodayLiters = dailySalesByType.reduce(
    (sum, item) => sum + item.liters,
    0
  );

  // ----------------------------------------------------
  // Edit selling price.
  // ----------------------------------------------------
  const handleOpenEdit = (row) => {
    if (!row.rawFuel) {
      setApiError(
        "The fuel type for this tank could not be found."
      );
      return;
    }

    setApiError("");
    setSaveError("");
    setSuccessMessage("");
    setSelectedFuel(row);

    setEditFuel({
      sellingPrice: String(row.rawFuel.selling_price ?? ""),
    });

    setModal("edit");
  };

  const handleOpenView = (row) => {
    setSelectedFuel(row);
    setModal("view");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!selectedFuel?.rawFuel?.fuel_id) {
      setSaveError("No valid fuel type was selected.");
      return;
    }

    const sellingPrice = Number(editFuel.sellingPrice);

    if (
      editFuel.sellingPrice.trim() === "" ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      setSaveError(
        "Please enter a valid selling price of 0 or higher."
      );
      return;
    }

    setSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const fuelId = selectedFuel.rawFuel.fuel_id;

      const response = await api.put(`/fuel-types/${fuelId}`, {
        selling_price: sellingPrice,
      });

      const updatedFuel = response.data?.data;

      setFuelTypes((previous) =>
        previous.map((fuel) =>
          String(fuel.fuel_id) === String(fuelId)
            ? {
                ...fuel,
                ...(updatedFuel || {}),
                selling_price:
                  updatedFuel?.selling_price ?? sellingPrice,
              }
            : fuel
        )
      );

      setSuccessMessage(
        "Fuel selling price updated successfully."
      );
      setModal(null);
      setSelectedFuel(null);
    } catch (error) {
      setSaveError(
        error.response?.data?.errors?.selling_price?.[0] ||
        error.response?.data?.message ||
        error.message ||
        "Unable to save the selling price."
      );
    } finally {
      setSaving(false);
    }
  };

  // Summary calculations.
  const totalStock = stockByTank.reduce(
    (sum, tank) => sum + tank.current,
    0
  );

  const totalCapacity = stockByTank.reduce(
    (sum, tank) => sum + tank.capacity,
    0
  );

  const lowStockCount = inventoryRows.filter(
    (row) => getTankStatus(row.rawTank) === "Critical Low"
  ).length;

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
  return (
    <div className="space-y-4 bg-gray-400 p-6">
      {loading && (
        <div className="rounded-lg bg-white p-4 text-slate-600">
          Loading Fuel Management data...
        </div>
      )}

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">Unable to load data</p>
          <p className="mt-1 text-sm">{apiError}</p>
          <button
            type="button"
            onClick={fetchFuelManagementData}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {/* First row: pumps, tank stock, and fuel prices. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Fuel Pumps
          </h3>

          {pumpCards.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">
              No fuel pumps found.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pumpCards.map((pump) => (
                <div
                  key={pump.id}
                  className="flex items-center gap-3 rounded-lg bg-slate-200 p-3"
                >
                  <img
                    src={pump.image}
                    alt={pump.number}
                    className="h-15 w-11 shrink-0 object-contain"
                  />
                  <div className="min-w-0">
                    <div className="break-words text-sm font-bold text-slate-800">
                      {pump.number}
                    </div>
                    <div className="text-xs font-semibold text-slate-600">
                      {pump.status.replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {pump.fuel}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Meter: {formatNumber(pump.meterReading)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Live Stock Volumes (By Tank)
          </h3>

          <DotLegend
            items={[
              { label: "Current Volume", color: "#2563eb" },
              { label: "Tank Capacity", color: "#93c5fd" },
            ]}
          />

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Current Stock</p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {formatNumber(totalStock)} L
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Total Capacity</p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {formatNumber(totalCapacity)} L
              </p>
            </div>
          </div>

          {stockByTank.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={stockByTank}
                margin={{ top: 20, right: 8, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eef2f7"
                  vertical={false}
                />
                <XAxis
                  dataKey="tank"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => litersLabel(value)} />
                <Bar
                  dataKey="current"
                  name="Current Volume"
                  fill="#2563eb"
                  radius={[3, 3, 0, 0]}
                  barSize={18}
                >
                  <LabelList
                    dataKey="current"
                    position="top"
                    formatter={litersLabel}
                    style={{ fontSize: 9, fill: "#475569" }}
                  />
                </Bar>
                <Bar
                  dataKey="capacity"
                  name="Capacity"
                  fill="#93c5fd"
                  radius={[3, 3, 0, 0]}
                  barSize={18}
                >
                  <LabelList
                    dataKey="capacity"
                    position="top"
                    formatter={litersLabel}
                    style={{ fontSize: 9, fill: "#475569" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              No tank data available.
            </p>
          )}
        </Panel>

        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Fuel Price Overview
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Current purchase and selling prices from the database.
          </p>

          <DotLegend
            items={[
              { label: "Purchase Price", color: "#2563eb" },
              { label: "Selling Price", color: "#f59e0b" },
            ]}
          />

          {priceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart
                data={priceChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#eef2f7"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => formatPrice(value)} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Purchase Price"
                  stroke="#2563eb"
                  fill="#2563eb20"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="sell"
                  name="Selling Price"
                  stroke="#f59e0b"
                  fill="#f59e0b20"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              No fuel price data available.
            </p>
          )}

          <p className="mt-2 text-xs text-slate-500">
            These are current prices, not historical prices.
          </p>
        </Panel>
      </div>

      {/* Today's fuel sales. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel>
          <h3 className="mb-1 text-xl font-bold text-slate-800">
            Today's Fuel Sales
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Paid sales for {getLocalDateString()}
          </p>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              Total Liters Sold
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {formatNumber(totalTodayLiters)} L
            </p>
          </div>

          {salesError && (
            <p className="mt-3 text-sm text-red-600">
              {salesError}
            </p>
          )}

          <div className="mt-4 space-y-3">
            {dailySalesByType.map((item) => (
              <div
                key={item.fuelId}
                className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm"
              >
                <span className="text-slate-600">{item.name}</span>
                <span className="font-semibold text-slate-800">
                  {formatNumber(item.liters)} L
                </span>
              </div>
            ))}

            {dailySalesByType.length === 0 && !salesError && (
              <p className="text-sm text-slate-500">
                No fuel types available.
              </p>
            )}
          </div>
          
        </Panel>

        {/* Recent audit actions. */}
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Recent Actions
          </h3>

          {actionsError && (
            <p className="mb-3 text-sm text-red-600">
              {actionsError}
            </p>
          )}

          <div className="space-y-3">
  {paginatedRecentActions.map((log) => (
              <div
                key={log.log_id}
                className="border-b border-slate-100 pb-3"
              >
                <p className="font-semibold text-slate-800">
                  {log.action || "Unknown action"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {log.entity_type || "Unknown entity"}
                  {log.entity_id != null
                    ? ` #${log.entity_id}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  By: {log.user?.full_name || "Unknown user"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {log.created_at
                    ? new Date(log.created_at).toLocaleString()
                    : "No date"}
                </p>
              </div>
            ))}

            {recentActions.length === 0 && !actionsError && (
              <p className="text-sm text-slate-500">
                No recent actions found.
              </p>
            )}
          </div>
          <Pagination
  currentPage={recentActionsPage}
  totalItems={recentActions.length}
  pageSize={PAGE_SIZE}
  onPageChange={(page) => {
    if (page >= 1 && page <= recentActionsTotalPages) {
      setRecentActionsPage(page);
    }
  }}
/>
        </Panel>

        {/* Stock summary. */}
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Stock Summary
          </h3>

          <div className="space-y-3">
            {[
              ["Total Fuel Types", fuelTypes.length],
              ["Total Tanks", fuelTanks.length],
              ["Total Pumps", fuelPumps.length],
              ["Tanks at or below minimum stock", lowStockCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg bg-slate-100 p-3"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Inventory table and tank stock details. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-slate-800">
              Inventory Management Table
            </h3>
            <button
              type="button"
              onClick={fetchFuelManagementData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="text-sm text-slate-800">
                  <th className="pb-3 pr-3">ID</th>
                  <th className="pb-3 pr-3">Tank / Fuel</th>
                  <th className="pb-3 pr-3">Current (L)</th>
                  <th className="pb-3 pr-3">Capacity (L)</th>
                  <th className="pb-3 pr-3">Min. Stock</th>
                  <th className="pb-3 pr-3">Cost / Price</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInventoryRows.map((row) => {
  const status = getTankStatus(row.rawTank);

                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200"
                    >
                      <td className="py-3 pr-3 text-slate-600">
                        {row.id}
                      </td>
                      <td className="py-3 pr-3 font-medium text-slate-800">
                        <div>{row.tank}</div>
                        <div className="mt-1 text-slate-500">
                          {row.fuel}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        {formatNumber(row.currentVolume)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatNumber(row.capacity)}
                      </td>
                      <td className="py-3 pr-3">
                        {formatNumber(row.minimumVolume)}
                      </td>
                      <td className="py-3 pr-3">
                        {row.cost !== null && row.price !== null
                          ? `${formatPrice(row.cost)} / ${formatPrice(row.price)}`
                          : "Not available"}
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenView(row)}
                            title="View details"
                            className="text-cyan-600 hover:underline"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            title="Edit selling price"
                            disabled={!row.rawFuel}
                            className="text-fuchsia-600 hover:underline disabled:opacity-40"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {inventoryRows.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-500"
                    >
                      No inventory records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
  currentPage={inventoryPage}
  totalItems={inventoryRows.length}
  pageSize={PAGE_SIZE}
  onPageChange={(page) => {
    if (page >= 1 && page <= inventoryTotalPages) {
      setInventoryPage(page);
    }
  }}
/>
        </Panel>

        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Tank Stock Details
          </h3>

          {stockByTank.length === 0 ? (
            <p className="text-sm text-slate-500">
              No tank data available.
            </p>
          ) : (
            <div className="space-y-4">
              {stockByTank.map((tank) => {
                const percentage =
                  tank.capacity > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          (tank.current / tank.capacity) * 100
                        )
                      )
                    : 0;

                return (
                  <div key={tank.id}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-700">
                        {tank.tank} · {tank.fuel}
                      </span>
                      <span className="text-slate-500">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: tank.dark,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatNumber(tank.current)} L of{" "}
                      {formatNumber(tank.capacity)} L
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Edit selling-price modal. */}
      {modal === "edit" && selectedFuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Edit Fuel Selling Price
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the selling price stored in the database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setSaveError("");
                }}
                className="rounded-full p-2 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Fuel Type
                </label>
                <input
                  value={selectedFuel.fuel}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Current Purchase Price
                </label>
                <input
                  value={
                    selectedFuel.rawFuel?.purchase_price ??
                    "Not available"
                  }
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Selling Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  required
                  value={editFuel.sellingPrice}
                  onChange={(event) =>
                    setEditFuel({
                      ...editFuel,
                      sellingPrice: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />
              </div>

              {saveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                Only the selling price is editable through the current
                FuelTypeController update endpoint.
              </p>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setSaveError("");
                  }}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-5 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  <Save size={15} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View tank details modal. */}
      {modal === "view" && selectedFuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  View Fuel Details
                </h2>
                <p className="text-sm text-slate-500">
                  Tank ID: {selectedFuel.tankId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full p-2 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6 text-sm text-slate-700">
              {[
                ["Tank Number", selectedFuel.tank],
                ["Fuel Type", selectedFuel.fuel],
                [
                  "Current Volume",
                  `${formatNumber(selectedFuel.currentVolume)} L`,
                ],
                [
                  "Tank Capacity",
                  `${formatNumber(selectedFuel.capacity)} L`,
                ],
                [
                  "Minimum Stock",
                  `${formatNumber(selectedFuel.minimumVolume)} L`,
                ],
                [
                  "Purchase Price",
                  selectedFuel.cost === null
                    ? "Not available"
                    : formatPrice(selectedFuel.cost),
                ],
                [
                  "Selling Price",
                  selectedFuel.price === null
                    ? "Not available"
                    : formatPrice(selectedFuel.price),
                ],
                ["Tank Status", selectedFuel.tankStatus],
                [
                  "Last Inspection",
                  selectedFuel.rawTank?.last_inspection ||
                    "Not recorded",
                ],
                [
                  "Location",
                  selectedFuel.rawTank?.location || "Not recorded",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b pb-2"
                >
                  <span className="font-semibold">{label}:</span>
                  <span className="text-right">{value}</span>
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-lg bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
