import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Fuel,
  FileText,
  AlertTriangle,
  Droplets,
  Banknote,
  Gauge,
  RefreshCw,
  LoaderCircle,
  X,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";
const TOKEN_KEY = "gas_station_token";

// =====================================================
// Helper functions
// =====================================================

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatNumber = (value, decimals = 2) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  return number.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

const formatUSD = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const extractList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;

  return [];
};

const getUserId = (user) =>
  user?.user_id ?? user?.id ?? null;

const getUserName = (user) =>
  user?.username ||
  user?.name ||
  user?.full_name ||
  user?.employee?.employee_name ||
  user?.employee?.name ||
  "Fuel Attendant";

const getFuelName = (fuel) => {
  if (!fuel) return "Unknown Fuel";

  if (typeof fuel === "string") return fuel;

  return (
    fuel.fuel_name ||
    fuel.name ||
    fuel.type_name ||
    (typeof fuel.fuel_type === "string"
      ? fuel.fuel_type
      : null) ||
    fuel.fuelType?.fuel_name ||
    fuel.fuelType?.name ||
    (fuel.fuel_id != null
      ? `Fuel #${fuel.fuel_id}`
      : "Unknown Fuel")
  );
};


const getPumpName = (pump) => {
  if (!pump) return "Unknown Pump";

  return (
    pump.pump_number ||
    (pump.pump_id != null
      ? `Pump ${pump.pump_id}`
      : "Unknown Pump")
  );
};


const getSaleDate = (sale) =>
  sale?.sale_date || sale?.created_at || "";

const getSaleTime = (sale) => {
  const value = getSaleDate(sale);

  if (!value) return "—";

  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSaleId = (sale) =>
  sale?.receipt_number ||
  sale?.sale_number ||
  `Sale #${sale?.sale_id ?? "—"}`;

const isPumpAvailable = (pump) =>
  ["available", "in_use"].includes(
    String(pump?.status || "").toLowerCase()
  );

const getPumpStatusLabel = (status) => {
  const labels = {
    available: "Available",
    in_use: "In Use",
    under_maintenance: "Maintenance",
    out_of_service: "Out of Service",
  };

  return labels[String(status || "").toLowerCase()] || status || "Unknown";
};

const isFuelAvailable = (fuel) =>
  String(fuel?.status || "").toLowerCase() === "available";

// =====================================================
// API request helper
// =====================================================

async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";

  let result = null;

  if (contentType.includes("application/json")) {
    result = await response.json();
  } else {
    const text = await response.text();
    result = text ? { message: text } : null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Session expired or token invalid. Please log in again."
      );
    }

    if (response.status === 403) {
      throw new Error("You do not have permission to use this feature.");
    }

    if (response.status === 404) {
      throw new Error(`Not found API: ${path}`);
    }

    if (response.status === 422) {
      const validationMessages = Object.values(
        result?.errors || {}
      ).flat();

      throw new Error(
        validationMessages.join(" ") ||
          result?.message ||
          "The data transmitted is incorrect."
      );
    }

    throw new Error(
      result?.message ||
        `API request failed (${response.status})`
    );
  }

  return result;
}

// =====================================================
// Main Dashboard
// =====================================================

export default function Dashboard({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [pumps, setPumps] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [sales, setSales] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  const [activeModal, setActiveModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState({
    message: "",
    type: "success",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    pump_id: "",
    quantity: "",
    payment_method: "cash",
  });

  const [issueForm, setIssueForm] = useState({
    pump_id: "",
    description: "",
  });

  const [formError, setFormError] = useState("");

  const triggerToast = useCallback((message, type = "success") => {
    setToast({ message, type });

    window.setTimeout(() => {
      setToast({ message: "", type: "success" });
    }, 3500);
  }, []);

  // ---------------------------------------------------
  // Load dashboard data
  // ---------------------------------------------------

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setPageError("");

    try {
      const currentUser = await apiRequest("/user");
      setUser(currentUser);

      const [pumpResult, fuelResult] = await Promise.allSettled([
        apiRequest("/fuel-pumps"),
        apiRequest("/fuel-types"),
      ]);

      if (pumpResult.status === "rejected") {
        throw pumpResult.reason;
      }

      if (fuelResult.status === "rejected") {
        throw fuelResult.reason;
      }

      const pumpList = extractList(pumpResult.value);
      const fuelList = extractList(fuelResult.value);

      setPumps(pumpList);
      setFuelTypes(fuelList);

      
      // Fetch today's sales for the logged-in user.
      // The backend filters by the database column `sold_by`.
      const userId = getUserId(currentUser);

      if (userId == null) {
        setSales([]);
        throw new Error(
          "Unable to identify the logged-in user. Please log in again."
        );
      }

      const query =
        `?date=${encodeURIComponent(getToday())}` +
        `&sold_by=${encodeURIComponent(userId)}`;

      const firstPage = await apiRequest(`/fuel-sales${query}`);

      let allSales = extractList(firstPage);

      const lastPage = Math.max(
        1,
        Number(firstPage?.last_page || 1)
      );

      // Fetch every page so the KPI includes all today's sales.
      for (let page = 2; page <= lastPage; page += 1) {
        const pageResult = await apiRequest(
          `/fuel-sales${query}&page=${page}`
        );

        allSales = allSales.concat(extractList(pageResult));
      }

      // The backend already filtered by date and seller.
      // Do not filter again using sale.sold_by because the
      // serialized relationship may change its JSON structure.
      setSales(allSales);



      setInvoiceForm((previous) => ({
        ...previous,
        pump_id:
          previous.pump_id ||
          String(
            pumpList.find((pump) => {
              const fuel = fuelList.find(
                (item) =>
                  Number(item.fuel_id) === Number(pump.fuel_id)
              );

              return (
                isPumpAvailable(pump) &&
                fuel &&
                isFuelAvailable(fuel)
              );
            })?.pump_id || ""
          ),
      }));

      setIssueForm((previous) => ({
        ...previous,
        pump_id:
          previous.pump_id ||
          String(pumpList[0]?.pump_id || ""),
      }));
    } catch (error) {
      console.error("Dashboard loading error:", error);
      setPageError(error.message || "Unable to retrieve data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);



  // ---------------------------------------------------
  // Shift Tracking API
  // ---------------------------------------------------

  const loadCurrentShift = useCallback(async () => {
    setShiftLoading(true);

    try {
      const result = await apiRequest("/shifts/current");
      setCurrentShift(result?.data ?? null);
    } catch (error) {
      console.error("Load current shift error:", error);
      triggerToast(
        error.message || "Unable to retrieve Current Shift.",
        "error"
      );
    } finally {
      setShiftLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    loadCurrentShift();
  }, [loadCurrentShift]);

  // Start Shift
  const handleStartShift = async () => {
    if (shiftLoading) return;

    setShiftLoading(true);

    try {
      const result = await apiRequest("/shifts/start", {
        method: "POST",
      });

      setCurrentShift(result?.data ?? null);

      triggerToast(
        result?.message || "Successfully started the work shift."
      );
    } catch (error) {
      console.error("Start shift error:", error);

      triggerToast(
        error.message || "Cannot start the work shift.",
        "error"
      );

      // Load again in case a shift already exists.
      try {
        const result = await apiRequest("/shifts/current");
        setCurrentShift(result?.data ?? null);
      } catch (reloadError) {
        console.error("Reload shift error:", reloadError);
      }
    } finally {
      setShiftLoading(false);
    }
  };

  // End Shift
  const handleEndShift = async () => {
    if (shiftLoading || !currentShift) return;

    const confirmed = window.confirm(
      "Are you sure, Do you want to end shift?"
    );

    if (!confirmed) return;

    setShiftLoading(true);

    try {
      const result = await apiRequest("/shifts/end", {
        method: "POST",
      });

      setCurrentShift(null);

      triggerToast(
        result?.message || "Successfully completed the work shift."
      );
    } catch (error) {
      console.error("End shift error:", error);

      triggerToast(
        error.message || "Cannot end the work shift.",
        "error"
      );

      try {
        const latest = await apiRequest("/shifts/current");
        setCurrentShift(latest?.data ?? null);
      } catch (reloadError) {
        console.error("Reload shift error:", reloadError);
      }
    } finally {
      setShiftLoading(false);
    }
  };


  // ---------------------------------------------------
  // Resolve pump's fuel type
  // ---------------------------------------------------

  const getFuelForPump = useCallback(
  (pump) => {
    if (!pump) return null;

    return (
      fuelTypes.find(
        (fuel) =>
          Number(fuel.fuel_id) === Number(pump.fuel_id)
      ) ||
      (typeof pump.fuel_type === "object"
        ? pump.fuel_type
        : null) ||
      (typeof pump.fuelType === "object"
        ? pump.fuelType
        : null) ||
      null
    );
  },
  [fuelTypes]
);

  const availablePumps = useMemo(
    () =>
      pumps.filter((pump) => {
        const fuel = getFuelForPump(pump);

        return (
          isPumpAvailable(pump) &&
          fuel &&
          isFuelAvailable(fuel)
        );
      }),
    [pumps, getFuelForPump]
  );

  const selectedPump = useMemo(
    () =>
      pumps.find(
        (pump) =>
          Number(pump.pump_id) === Number(invoiceForm.pump_id)
      ) || null,
    [pumps, invoiceForm.pump_id]
  );

  const selectedFuel = getFuelForPump(selectedPump);

  const quantity = Number(invoiceForm.quantity || 0);
  const unitPrice = Number(selectedFuel?.selling_price || 0);
  const estimatedTotal = quantity * unitPrice;

  const activePumpCount = pumps.filter(isPumpAvailable).length;
  const maintenancePumpCount = pumps.filter((pump) =>
    ["under_maintenance", "out_of_service"].includes(
      String(pump.status || "").toLowerCase()
    )
  ).length;

  const totalLiters = sales.reduce(
    (sum, sale) => sum + Number(sale.quantity || 0),
    0
  );

  const totalRevenue = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.total_amount || 0),
    0
  );

  const displayedSales = [...sales]
    .sort(
      (a, b) =>
        new Date(getSaleDate(b)).getTime() -
        new Date(getSaleDate(a)).getTime()
    )
    .slice(0, 10);

  // ---------------------------------------------------
  // Create Invoice
  // ---------------------------------------------------

  const handleInvoiceSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!invoiceForm.pump_id) {
      setFormError("Please select a pump.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError("The number of liters must be greater than 0.");
      return;
    }

    if (!selectedPump || !selectedFuel) {
      setFormError("Could not find the selected pump or oil type.");
      return;
    }

    if (!isPumpAvailable(selectedPump)) {
      setFormError("This pump cannot be used for sales.");
      return;
    }

    if (!isFuelAvailable(selectedFuel)) {
      setFormError("This type of oil cannot be sold.");
      return;
    }

    if (
      quantity >
      Number(selectedFuel.available_quantity ?? 0)
    ) {
      setFormError(
        `Insufficient oil stock. Current stock: ${formatNumber(
          selectedFuel.available_quantity,
          3
        )} L`
      );
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiRequest("/fuel-sales", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              fuel_id: Number(selectedFuel.fuel_id),
              pump_id: Number(selectedPump.pump_id),
              quantity,
            },
          ],
          payment_method: invoiceForm.payment_method,
        }),
      });

      setActiveModal(null);
      setInvoiceForm({
        pump_id: "",
        quantity: "",
        payment_method: "cash",
      });

      triggerToast(
        result?.message || "Invoice created successfully!"
      );

      await loadDashboard(true);
    } catch (error) {
      console.error("Create invoice error:", error);
      setFormError(error.message || "Unable to create an invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------
  // Report Maintenance Issue
  // ---------------------------------------------------

  
const handleReportSubmit = async (event) => {
  event.preventDefault();
  setFormError("");

  if (!issueForm.pump_id) {
    setFormError("Please select a pump.");
    return;
  }

  if (!issueForm.description.trim()) {
    setFormError("Please enter a description of the issue.");
    return;
  }

  setSubmitting(true);

  try {
    const result = await apiRequest("/equipment-maintenance", {
      method: "POST",
      body: JSON.stringify({
        equipment_type: "pump",
        equipment_id: Number(issueForm.pump_id),
        scheduled_date: getToday(),
        maintenance_type: "repair",
        description: issueForm.description.trim(),
        status: "scheduled",
        notes: `Reported by ${getUserName(user)}`,
      }),
    });

    // Close the form and reset its values.
    setActiveModal(null);
    setIssueForm({
      pump_id: "",
      description: "",
    });

    triggerToast(
      result?.message ||
        "Issue reported successfully!"
    );

    // Reload pump status and other dashboard data.
    await loadDashboard(true);
  } catch (error) {
    console.error("Report issue error:", error);

    setFormError(
      error.message || "Unable to send Report Issue."
    );
  } finally {
    setSubmitting(false);
  }
};

  const openModal = (modal) => {
    setFormError("");
    setActiveModal(modal);
  };

  const closeModal = () => {
    if (submitting) return;

    setActiveModal(null);
    setFormError("");
  };

  // ---------------------------------------------------
  // Loading
  // ---------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center bg-slate-200 p-6">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <LoaderCircle className="h-10 w-10 animate-spin text-blue-600" />
          <p className="font-bold">Loading Fuel Attendant Dashboard...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------
  // Dashboard UI
  // ---------------------------------------------------

  return (
    <div className="space-y-4 bg-slate-200 p-6 font-sans text-slate-800">
      {/* Toast */}
      {toast.message && (
        <div
          role="status"
          className={`fixed right-5 top-5 z-[70] flex max-w-md items-start gap-3 rounded-2xl border px-5 py-4 font-bold text-white shadow-2xl ${
            toast.type === "error"
              ? "border-rose-700 bg-rose-600"
              : "border-emerald-700 bg-slate-900"
          }`}
        >
          {toast.type === "error" ? (
            <CircleAlert className="h-5 w-5 shrink-0" />
          ) : (
            <CircleCheck className="h-5 w-5 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast({ message: "", type: "success" })}
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header and Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Fuel Attendant Dashboard
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Welcome, {getUserName(user)}
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
  await Promise.all([
    loadDashboard(true),
    loadCurrentShift(),
  ]);
}}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* API Error */}
      {pageError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Unable to fully load the dashboard.</p>
            <p className="mt-1">{pageError}</p>
          </div>
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            className="font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Section: Shift and Statistics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        
{/* Shift Card - Connected to Laravel API and MySQL */}
<div className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div>
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-base font-bold text-slate-800">
        Current Shift
      </h3>

      <span
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
          shiftLoading
            ? "bg-amber-100 text-amber-700"
            : currentShift
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            shiftLoading
              ? "bg-amber-500"
              : currentShift
                ? "bg-emerald-500"
                : "bg-slate-400"
          }`}
        />

        {shiftLoading
          ? "Loading..."
          : currentShift
            ? "Active"
            : "No Active Shift"}
      </span>
    </div>

    <p className="my-3 text-2xl font-black text-slate-900">
      Shift Tracking
    </p>

    <p className="text-sm font-semibold text-slate-600">
      Attendant: {getUserName(user)}
    </p>

    {currentShift ? (
      <div className="mt-4 space-y-3 rounded-xl bg-emerald-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">
            Shift ID
          </span>

          <span className="font-bold text-slate-900">
            #{currentShift.shift_id}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <span className="text-sm text-slate-600">
            Start Time
          </span>

          <span className="text-right text-sm font-bold text-slate-900">
            {currentShift.start_time
              ? new Date(
                  String(currentShift.start_time).replace(" ", "T")
                ).toLocaleString()
              : "—"}
          </span>
        </div>

        
      </div>
    ) : (
      <p className="mt-3 text-sm leading-6 text-slate-500">
        {shiftLoading
          ? "Downloading Shift data..."
          : "No work shift is currently in progress. Click Start Shift to begin."}
      </p>
    )}
  </div>

  <div className="mt-5 flex justify-end">
    {currentShift ? (
      <button
        type="button"
        onClick={handleEndShift}
        disabled={shiftLoading}
        className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {shiftLoading && (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        )}

        {shiftLoading ? "Processing..." : "End Shift"}
      </button>
    ) : (
      <button
        type="button"
        onClick={handleStartShift}
        disabled={shiftLoading}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {shiftLoading && (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        )}

        {shiftLoading ? "Processing..." : "Start Shift"}
      </button>
    )}
  </div>
</div>


        {/* Liters Sold Today */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-5 w-2.5 rounded-sm bg-blue-600" />
              <h3 className="text-base font-bold text-slate-800">
                Total Liters Sold (Today)
              </h3>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-4xl font-black text-slate-900">
                {formatNumber(totalLiters, 3)} L
              </p>
              <Droplets className="h-10 w-10 shrink-0 text-blue-500 opacity-80" />
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-500">
            From today's sales returned for this attendant.
          </p>
        </div>

        {/* Revenue Today */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-5 w-2.5 rounded-sm bg-blue-600" />
              <h3 className="text-base font-bold text-slate-800">
                Total Revenue (Today)
              </h3>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="break-words text-2xl font-black text-slate-900">
                {formatUSD(totalRevenue)}
              </p>
              <Banknote className="h-10 w-10 shrink-0 text-emerald-500 opacity-80" />
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Based on today's sale records.
          </p>
        </div>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Pump Status */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-5 w-2.5 rounded-sm bg-emerald-500" />
            <h3 className="text-base font-bold text-slate-800">
              Pump Operational Status
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-5 py-2">
            <div>
              <p className="text-3xl font-black text-emerald-600">
                Active {activePumpCount}/{pumps.length}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Maintenance / Out of Service: {maintenancePumpCount}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {pumps.map((pump) => {
                const active = isPumpAvailable(pump);

                return (
                  <div
                    key={pump.pump_id}
                    className="flex flex-col items-center"
                    title={`${getPumpName(pump)}: ${getPumpStatusLabel(pump.status)}`}
                  >
                    <Fuel
                      className={`h-8 w-8 ${
                        active ? "text-emerald-500" : "text-rose-500"
                      }`}
                    />
                    <span className="mt-1 text-xs font-bold text-slate-700">
                      {pump.pump_number ?? pump.pump_id}
                    </span>
                  </div>
                );
              })}

              {pumps.length === 0 && (
                <p className="text-sm text-slate-500">
                  No pumps found.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-5 w-2.5 rounded-sm bg-emerald-500" />
            <h3 className="text-base font-bold text-slate-800">
              Quick Actions
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                onNavigate?.("fuel-dispense-and-meter-input")
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-lime-200 px-3 py-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-lime-300"
            >
              <Gauge className="h-4 w-4" />
              <span>+ Add Meter</span>
            </button>

            <button
              type="button"
              onClick={() => openModal("invoice")}
              disabled={availablePumps.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-200 px-3 py-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4 text-amber-900" />
              <span>Create Invoice</span>
            </button>

            <button
              type="button"
              onClick={() => openModal("issue")}
              disabled={pumps.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-rose-200 px-3 py-4 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4 text-rose-800" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assigned Pumps */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="border-b pb-3 text-lg font-bold text-slate-800">
            A. Assigned Pumps - Detailed
          </h3>

          <div className="divide-y divide-slate-100 text-sm font-semibold">
            {pumps.map((pump) => {
              const active = isPumpAvailable(pump);
              const fuel = getFuelForPump(pump);

              return (
                <div
                  key={pump.pump_id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {getPumpName(pump)} ({getFuelName(fuel)})
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Fuel: {getFuelName(fuel)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        active ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span
                      className={`font-bold ${
                        active ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {getPumpStatusLabel(pump.status)}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-semibold text-slate-600">
                      Meter:{" "}
                      {pump.meter_reading != null
                        ? `${formatNumber(pump.meter_reading, 3)} L`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              );
            })}

            {pumps.length === 0 && (
              <p className="py-5 text-sm text-slate-500">
                No pump data available.
              </p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="border-b pb-3 text-lg font-bold text-slate-800">
            B. My Recent Activity
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-blue-600 text-sm font-bold text-white">
                  <th className="rounded-l-xl p-3">Transaction ID</th>
                  <th className="p-3">Pump</th>
                  <th className="p-3">Fuel Type</th>
                  <th className="p-3">Liters</th>
                  <th className="p-3">Amount (USD)</th>
                  <th className="rounded-r-xl p-3">Time</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {displayedSales.map((sale) => {
                  const pump =
                    pumps.find(
                      (item) =>
                        Number(item.pump_id) === Number(sale.pump_id)
                    ) || sale.pump;

                  const fuel =
                    fuelTypes.find(
                      (item) =>
                        Number(item.fuel_id) === Number(sale.fuel_id)
                    ) || sale.fuel_type || sale.fuelType;

                  return (
                    <tr
                      key={sale.sale_id ?? getSaleId(sale)}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="p-3 font-bold text-slate-900">
                        {getSaleId(sale)}
                      </td>
                      <td className="p-3">{getPumpName(pump)}</td>
                      <td className="p-3">{getFuelName(fuel)}</td>
                      <td className="p-3 font-bold text-blue-600">
                        {formatNumber(sale.quantity, 3)} L
                      </td>
                      <td className="p-3 font-black text-slate-900">
                        {formatNumber(sale.total_amount, 0)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-slate-500">
                        {getSaleTime(sale)}
                      </td>
                    </tr>
                  );
                })}

                {displayedSales.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-6 text-center font-medium text-slate-500"
                    >
                      No sales found for today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            Showing up to 10 latest sales from today's records.
          </p>
        </div>
      </div>

      {/* =================================================
          Create Invoice Modal
      ================================================= */}
      {activeModal === "invoice" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleInvoiceSubmit}
            className="my-4 w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <FileText className="h-5 w-5 text-amber-500" />
                Create Invoice
              </h3>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close invoice modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Select Pump
                </label>

                <select
                  required
                  value={invoiceForm.pump_id}
                  onChange={(event) => {
                    setInvoiceForm((previous) => ({
                      ...previous,
                      pump_id: event.target.value,
                    }));
                    setFormError("");
                  }}
                  className="w-full rounded-xl border bg-slate-50 p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Pump --</option>

                  {availablePumps.map((pump) => {
                    const fuel = getFuelForPump(pump);

                    return (
                      <option
                        key={pump.pump_id}
                        value={pump.pump_id}
                      >
                        {getPumpName(pump)} — {getFuelName(fuel)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Fuel Type
                </label>

                <input
                  readOnly
                  value={selectedFuel ? getFuelName(selectedFuel) : ""}
                  placeholder="Select a pump first"
                  className="w-full rounded-xl border bg-slate-100 p-3 font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Liters
                </label>

                <input
                  type="number"
                  min="0.001"
                  max="999999999"
                  step="0.001"
                  required
                  value={invoiceForm.quantity}
                  onChange={(event) => {
                    setInvoiceForm((previous) => ({
                      ...previous,
                      quantity: event.target.value,
                    }));
                    setFormError("");
                  }}
                  placeholder="50.000"
                  className="w-full rounded-xl border p-3 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {selectedFuel && (
                  <p className="mt-1 text-xs text-slate-500">
                    Available stock:{" "}
                    {formatNumber(
                      selectedFuel.available_quantity,
                      3
                    )}{" "}
                    L
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Unit Price (USD/L)
                </label>

                <input
                  readOnly
                  value={formatNumber(unitPrice, 2)}
                  className="w-full rounded-xl border bg-slate-100 p-3 font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Total Amount (USD)
                </label>

                <input
                  readOnly
                  value={formatNumber(estimatedTotal, 0)}
                  className="w-full rounded-xl border bg-slate-100 p-3 text-base font-black text-slate-900"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Estimated total. The Backend calculates the final amount.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Payment Method
                </label>

                <select
                  required
                  value={invoiceForm.payment_method}
                  onChange={(event) =>
                    setInvoiceForm((previous) => ({
                      ...previous,
                      payment_method: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border bg-slate-50 p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="qr_payment">QR Payment</option>
                </select>
              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || availablePumps.length === 0}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================
          Report Issue Modal
      ================================================= */}
      {activeModal === "issue" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleReportSubmit}
            className="my-4 w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Report Issue
              </h3>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close report modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Equipment / Pump
                </label>

                <select
                  required
                  value={issueForm.pump_id}
                  onChange={(event) => {
                    setIssueForm((previous) => ({
                      ...previous,
                      pump_id: event.target.value,
                    }));
                    setFormError("");
                  }}
                  className="w-full rounded-xl border bg-slate-50 p-3 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Pump --</option>

                  {pumps.map((pump) => (
                    <option
                      key={pump.pump_id}
                      value={pump.pump_id}
                    >
                      {getPumpName(pump)} —{" "}
                      {getPumpStatusLabel(pump.status)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">
                  Issue Description
                </label>

                <textarea
                  rows={4}
                  required
                  minLength={3}
                  value={issueForm.description}
                  onChange={(event) => {
                    setIssueForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }));
                    setFormError("");
                  }}
                  placeholder="Describe the maintenance issue..."
                  className="w-full resize-none rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || pumps.length === 0}
                className="flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
