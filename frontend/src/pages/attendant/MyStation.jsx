import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Fuel,
  Wrench,
  Database,
  AlertTriangle,
  Search,
  CheckCircle,
  X,
  Clock,
  Gauge,
  FileText,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("gas_station_token");

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = data.errors
      ? Object.values(data.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        data.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
};

const formatNumber = (value, decimals = 2) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "N/A";

  return number.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getFuelName = (pump) => {
  const fuel = pump?.fuelType ?? pump?.fuel_type ?? pump?.fuel;

  if (typeof fuel === "string") return fuel;

  if (fuel && typeof fuel === "object") {
    return (
      fuel.fuel_name ??
      fuel.fuel_type_name ??
      fuel.name ??
      fuel.type_name ??
      `Fuel #${pump?.fuel_id ?? "N/A"}`
    );
  }

  return `Fuel #${pump?.fuel_id ?? "N/A"}`;
};

const getPumpStatus = (status) => {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "in_use") return "In Use";
  if (normalized === "available") return "Available";
  if (normalized === "under_maintenance") return "Maintenance";
  if (normalized === "out_of_service") return "Out of Service";

  return status || "Unknown";
};

const isMaintenanceStatus = (status) =>
  ["under_maintenance", "out_of_service"].includes(
    String(status ?? "").toLowerCase()
  );

const isActiveStatus = (status) =>
  ["available", "in_use"].includes(String(status ?? "").toLowerCase());

const getTankLevel = (tank) => {
  const capacity = Number(tank?.capacity);
  const volume = Number(tank?.current_volume);

  if (!Number.isFinite(capacity) || capacity <= 0) return null;
  if (!Number.isFinite(volume) || volume < 0) return null;

  return Math.min(100, Math.max(0, (volume / capacity) * 100));
};

const getTankName = (tank, index) =>
  tank?.tank_number ??
  tank?.tank_name ??
  `Tank ${index + 1}`;

const getTankFuelName = (tank) => {
  const fuel = tank?.fuelType ?? tank?.fuel_type ?? tank?.fuel;

  if (typeof fuel === "string") return fuel;

  if (fuel && typeof fuel === "object") {
    return (
      fuel.fuel_name ??
      fuel.fuel_type_name ??
      fuel.name ??
      fuel.type_name ??
      `Fuel #${tank?.fuel_id ?? "N/A"}`
    );
  }

  return `Fuel #${tank?.fuel_id ?? "N/A"}`;
};

const getMaintenanceStatus = (record) =>
  String(record?.status ?? "").toLowerCase();

export default function MyStation() {
  const [pumps, setPumps] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState(null);

  const [selectedPump, setSelectedPump] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const [shiftType, setShiftType] = useState("Closing Meter");
  const [newReading, setNewReading] = useState("");

  const [issueDesc, setIssueDesc] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("repair");
  const [scheduledDate, setScheduledDate] = useState(getToday());

  const triggerToast = useCallback((message, type = "success") => {
    setToast({ message, type });
  }, []);

  const loadPumps = useCallback(async () => {
    const result = await apiRequest("/fuel-pumps");

    if (!Array.isArray(result)) {
      throw new Error("The fuel pumps API returned an unexpected response.");
    }

    const mappedPumps = result.map((pump) => ({
      ...pump,
      id: pump.pump_id,
      name: pump.pump_number || `Pump ${pump.pump_id}`,
      fuel: getFuelName(pump),
      status: getPumpStatus(pump.status),
      rawStatus: pump.status,
      rawMeter: Number(pump.meter_reading ?? 0),
      meter:
        pump.meter_reading === null || pump.meter_reading === undefined
          ? "N/A"
          : `${formatNumber(pump.meter_reading, 3)} L`,
      tank: pump.tank
        ? getTankName(pump.tank, 0)
        : "Tank not assigned",
      tankLevel: pump.tank ? getTankLevel(pump.tank) : null,
    }));

    setPumps(mappedPumps);
  }, []);

  const loadTanks = useCallback(async () => {
    const result = await apiRequest("/fuel-tanks");

    if (!Array.isArray(result)) {
      throw new Error("The fuel tanks API returned an unexpected response.");
    }

    setTanks(result);
  }, []);

  const loadMaintenanceRecords = useCallback(async () => {
    const result = await apiRequest(
      "/equipment-maintenance?equipment_type=pump"
    );

    if (!Array.isArray(result.data)) {
      throw new Error(
        "The maintenance API returned an unexpected response."
      );
    }

    setMaintenanceRecords(result.data);
  }, []);

  const loadUser = useCallback(async () => {
    const result = await apiRequest("/user");
    setCurrentUser(result);
  }, []);

  const loadShift = useCallback(async () => {
    const result = await apiRequest("/shifts/current");
    setCurrentShift(result?.data ?? result);
  }, []);

  const loadAllData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);

      setPageError("");

      const results = await Promise.allSettled([
        loadPumps(),
        loadTanks(),
        loadMaintenanceRecords(),
        loadUser(),
        loadShift(),
      ]);

      const labels = [
        "Fuel pumps",
        "Fuel tanks",
        "Maintenance records",
        "User profile",
        "Current shift",
      ];

      const failures = results
        .map((result, index) =>
          result.status === "rejected"
            ? `${labels[index]}: ${result.reason?.message || "Request failed."}`
            : null
        )
        .filter(Boolean);

      if (failures.length > 0) {
        setPageError(failures.join(" "));
      }

      setLoading(false);
      setRefreshing(false);

      return failures;
    },
    [
      loadPumps,
      loadTanks,
      loadMaintenanceRecords,
      loadUser,
      loadShift,
    ]
  );

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const getPumpMaintenance = useCallback(
    (pumpId) =>
      maintenanceRecords
        .filter(
          (record) =>
            Number(record.equipment_id) === Number(pumpId) &&
            record.equipment_type === "pump"
        )
        .sort(
          (a, b) =>
            new Date(b.created_at || b.scheduled_date).getTime() -
            new Date(a.created_at || a.scheduled_date).getTime()
        ),
    [maintenanceRecords]
  );

  const getCurrentIssue = useCallback(
    (pumpId) =>
      getPumpMaintenance(pumpId).find((record) =>
        ["scheduled", "in_progress"].includes(
          getMaintenanceStatus(record)
        )
      ),
    [getPumpMaintenance]
  );

  const pumpCards = useMemo(
    () =>
      pumps.map((pump) => {
        const issue = getCurrentIssue(pump.id);
        const maintenance = isMaintenanceStatus(pump.rawStatus) || Boolean(issue);

        return {
          ...pump,
          issue,
          isMaintenance: maintenance,
          displayStatus: issue && !isMaintenanceStatus(pump.rawStatus)
            ? "Maintenance Reported"
            : pump.status,
        };
      }),
    [pumps, getCurrentIssue]
  );

  const activePumpCount = pumps.filter((pump) =>
    isActiveStatus(pump.rawStatus)
  ).length;

  const maintenancePumpCount = pumpCards.filter(
    (pump) => pump.isMaintenance
  ).length;

  const preferredTanks = useMemo(() => {
    const superTank = tanks.find((tank) =>
      getTankFuelName(tank).toLowerCase().includes("super")
    );

    const dieselTank = tanks.find((tank) =>
      getTankFuelName(tank).toLowerCase().includes("diesel")
    );

    const chosen = [];

    if (superTank) chosen.push(superTank);
    if (dieselTank && dieselTank !== superTank) chosen.push(dieselTank);

    for (const tank of tanks) {
      if (chosen.length >= 2) break;
      if (!chosen.includes(tank)) chosen.push(tank);
    }

    return chosen;
  }, [tanks]);

  const openMeterModal = (pump) => {
    if (pump.isMaintenance || isMaintenanceStatus(pump.rawStatus)) {
      triggerToast(
        "Meter readings are unavailable for pumps under maintenance.",
        "error"
      );
      return;
    }

    setSelectedPump(pump);
    setShiftType("Closing Meter");
    setNewReading("");
    setActiveModal("meter");
  };

  const openReportModal = (pump) => {
    if (!pump.id) {
      triggerToast("The selected pump has no valid database ID.", "error");
      return;
    }

    setSelectedPump(pump);
    setIssueDesc("");
    setMaintenanceType("repair");
    setScheduledDate(getToday());
    setActiveModal("report");
  };

  const openDetailsModal = (pump) => {
    setSelectedPump(pump);
    setActiveModal("details");
  };

  const closeModal = () => {
    if (saving) return;

    setActiveModal(null);
    setSelectedPump(null);
  };

  const handleSaveMeter = async (event) => {
    event.preventDefault();

    if (!selectedPump) return;

    const value = Number(newReading);

    if (newReading.trim() === "" || !Number.isFinite(value) || value < 0) {
      triggerToast("Please enter a valid meter reading.", "error");
      return;
    }

    if (value < selectedPump.rawMeter) {
      triggerToast(
        "The new meter reading cannot be lower than the previous reading.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      await apiRequest(`/fuel-pumps/${selectedPump.id}`, {
        method: "PUT",
        body: JSON.stringify({
          pump_number: selectedPump.pump_number,
          fuel_id: selectedPump.fuel_id,
          status: selectedPump.rawStatus,
          meter_reading: value,
        }),
      });

      await loadPumps();

      setActiveModal(null);
      setSelectedPump(null);

      triggerToast("Meter reading saved successfully.");
    } catch (error) {
      triggerToast(
        error.message || "Failed to save the meter reading.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReport = async (event) => {
    event.preventDefault();

    if (!selectedPump) return;

    if (!issueDesc.trim()) {
      triggerToast("Please enter an issue description.", "error");
      return;
    }

    if (!scheduledDate) {
      triggerToast("Please select a scheduled maintenance date.", "error");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/equipment-maintenance", {
        method: "POST",
        body: JSON.stringify({
          equipment_type: "pump",
          equipment_id: Number(selectedPump.id),
          scheduled_date: scheduledDate,
          maintenance_type: maintenanceType,
          description: issueDesc.trim(),
          status: "scheduled",
          notes: null,
        }),
      });

      await loadMaintenanceRecords();

      setActiveModal(null);
      setSelectedPump(null);

      triggerToast("Maintenance report submitted successfully.");
    } catch (error) {
      triggerToast(
        error.message || "Failed to submit the maintenance report.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData(false);
  };

  const userName =
    currentUser?.name ||
    currentUser?.full_name ||
    currentUser?.username ||
    "Fuel Attendant";

  const userRole =
    currentUser?.role?.name ||
    currentUser?.role ||
    currentUser?.user_role ||
    "Fuel Attendant";

  const shiftNumber =
    currentShift?.shift_number ??
    currentShift?.shift_id ??
    currentShift?.id;

  const shiftStart =
    currentShift?.start_time ??
    currentShift?.started_at ??
    currentShift?.shift_start;

  const shiftEnd =
    currentShift?.end_time ??
    currentShift?.ended_at ??
    currentShift?.shift_end;

  const formatTime = (value) => {
    if (!value) return "N/A";

    if (/^\d{2}:\d{2}(:\d{2})?$/.test(String(value))) {
      const [hourString, minuteString] = String(value).split(":");
      const hour = Number(hourString);
      const minute = Number(minuteString);

      const date = new Date();
      date.setHours(hour, minute, 0, 0);

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return formatDateTime(value);
  };

  return (
    <div className="min-h-screen space-y-5 bg-slate-300 p-6 -m-6 font-sans text-slate-800">
      {toast && (
        <div
          role="status"
          className={`fixed right-5 top-5 z-[70] flex max-w-lg items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-bold text-white shadow-2xl ${
            toast.type === "error"
              ? "border-rose-700 bg-rose-700"
              : "border-slate-700 bg-slate-900"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle className="h-5 w-5 shrink-0" />
          )}

          <span>{toast.message}</span>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {userName} ({userRole})
          </h2>

          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <Clock className="h-4 w-4 text-slate-400" />
            Shift Starts: {formatTime(shiftStart)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">
            Active Shift:{" "}
            <span className="text-blue-600">
              {shiftNumber ? `#${shiftNumber}` : "N/A"}
              {shiftStart
                ? ` (${formatTime(shiftStart)} – ${formatTime(shiftEnd)})`
                : ""}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {pageError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-black">Some data could not be loaded.</p>
            <p className="mt-1 break-words">{pageError}</p>
            <p className="mt-2">
              Check the Laravel API response and authentication token.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600">
          <LoaderCircle className="h-6 w-6 animate-spin text-cyan-600" />
          Loading station data...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-2xl border-2 border-emerald-400/60 bg-emerald-200/80 p-5 shadow-sm">
              <div className="rounded-2xl bg-emerald-400/50 p-3 text-emerald-900">
                <Fuel className="h-8 w-8" />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-950">
                  Available / In Use
                </p>
                <p className="text-3xl font-black text-emerald-950">
                  {activePumpCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border-2 border-rose-400/60 bg-rose-300/80 p-5 shadow-sm">
              <div className="rounded-2xl bg-rose-400/50 p-3 text-rose-950">
                <Wrench className="h-8 w-8" />
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-rose-950">
                  Maintenance
                </p>
                <p className="text-3xl font-black text-rose-950">
                  {maintenancePumpCount}
                </p>
              </div>
            </div>

            {preferredTanks.map((tank, index) => {
              const level = getTankLevel(tank);
              const fuelName = getTankFuelName(tank);
              const isSuper = fuelName.toLowerCase().includes("super");

              return (
                <div
                  key={tank.tank_id ?? tank.id ?? `${fuelName}-${index}`}
                  className={`flex items-center gap-4 rounded-2xl border-2 p-5 shadow-sm ${
                    isSuper
                      ? "border-amber-300/60 bg-amber-100"
                      : "border-purple-300/60 bg-purple-200/80"
                  }`}
                >
                  <div
                    className={`rounded-2xl p-3 ${
                      isSuper
                        ? "bg-amber-300/50 text-amber-950"
                        : "bg-purple-300/50 text-purple-950"
                    }`}
                  >
                    <Database className="h-8 w-8" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      {fuelName} Tank
                    </p>
                    <p
                      className={`text-3xl font-black ${
                        isSuper ? "text-amber-600" : "text-purple-700"
                      }`}
                    >
                      {level === null ? "N/A" : `${level.toFixed(1)}%`}
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      {getTankName(tank, index)}
                    </p>
                  </div>
                </div>
              );
            })}

            {preferredTanks.length === 0 && (
              <>
                <div className="flex items-center gap-4 rounded-2xl border-2 border-amber-300/60 bg-amber-100 p-5">
                  <Database className="h-8 w-8 text-amber-700" />
                  <div>
                    <p className="text-sm font-bold text-amber-950">
                      Fuel Tank Level
                    </p>
                    <p className="text-2xl font-black text-amber-700">N/A</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border-2 border-purple-300/60 bg-purple-100 p-5">
                  <Database className="h-8 w-8 text-purple-700" />
                  <div>
                    <p className="text-sm font-bold text-purple-950">
                      Fuel Tank Level
                    </p>
                    <p className="text-2xl font-black text-purple-700">N/A</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {pumps.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <Fuel className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-lg font-black text-slate-800">
                No fuel pumps found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Add a pump in Fuel Pump Management and refresh this page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {pumpCards.map((pump) => {
                const isMaintenance = pump.isMaintenance;
                const tankLevel = pump.tankLevel;

                return (
                  <div
                    key={pump.id}
                    className="flex flex-col justify-between rounded-2xl border-2 border-emerald-400 bg-white p-6 shadow-sm transition-all"
                  >
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h3 className="text-2xl font-black text-slate-900">
                          {pump.name}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-center text-xs font-bold ${
                            isMaintenance
                              ? "border-rose-300 bg-rose-100 text-rose-600"
                              : isActiveStatus(pump.rawStatus)
                                ? "border-emerald-300 bg-emerald-100 text-emerald-600"
                                : "border-slate-300 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {pump.displayStatus}
                        </span>
                      </div>

                      <p className="mb-4 flex items-center gap-1.5 text-base font-bold text-slate-600">
                        <Fuel className="h-4 w-4 text-slate-500" />
                        {pump.fuel}
                      </p>

                      {isMaintenance ? (
                        <div className="my-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                          <AlertTriangle className="mt-0.5 h-7 w-7 shrink-0 text-rose-500" />

                          <div className="space-y-1 text-sm font-semibold text-slate-700">
                            <p className="font-bold text-rose-600">
                              Reported:{" "}
                              {formatDateTime(
                                pump.issue?.created_at ||
                                  pump.issue?.scheduled_date
                              )}
                            </p>
                            <p className="break-words text-slate-800">
                              Error:{" "}
                              {pump.issue?.description ||
                                (isMaintenanceStatus(pump.rawStatus)
                                  ? "Pump is marked as unavailable for maintenance."
                                  : "A maintenance report is pending.")}
                            </p>
                            {pump.issue?.status && (
                              <p>
                                Maintenance Status:{" "}
                                {pump.issue.status.replaceAll("_", " ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="my-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                          <Fuel className="h-8 w-8 shrink-0 text-emerald-500" />

                          <div className="space-y-0.5 text-sm font-bold text-slate-700">
                            <p>
                              {pump.tank}
                              {tankLevel === null
                                ? " (Level: N/A)"
                                : ` (Level: ${tankLevel.toFixed(1)}%)`}
                            </p>
                            <p className="text-base text-slate-900">
                              Current Meter Reading: {pump.meter}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => openMeterModal(pump)}
                        disabled={
                          isMaintenance ||
                          !isActiveStatus(pump.rawStatus)
                        }
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition-all ${
                          isMaintenance ||
                          !isActiveStatus(pump.rawStatus)
                            ? "cursor-not-allowed bg-slate-200 text-slate-400"
                            : "bg-cyan-500 text-white shadow-md hover:bg-cyan-600 active:scale-95"
                        }`}
                      >
                        <Gauge className="h-4 w-4" />
                        Enter Meter Reading
                      </button>

                      {isMaintenance ? (
                        <button
                          type="button"
                          onClick={() => openDetailsModal(pump)}
                          className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition-all hover:bg-slate-50 active:scale-95"
                        >
                          <Search className="h-4 w-4" />
                          View Details
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openReportModal(pump)}
                          className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition-all hover:bg-slate-50 active:scale-95"
                        >
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Report Issue
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeModal === "meter" && selectedPump && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveMeter}
            className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-slate-900">
                Enter Meter Reading
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close meter reading form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-slate-500">
                Selected Pump
              </p>
              <p className="text-sm font-bold text-slate-900">
                {selectedPump.name} - {selectedPump.fuel}
              </p>
            </div>

            <div className="space-y-1.5 text-xs font-bold text-slate-700">
              <p className="mb-1 text-slate-400">Shift Type</p>

              {["Opening Meter", "Closing Meter"].map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="shiftType"
                    checked={shiftType === type}
                    onChange={() => setShiftType(type)}
                    className="h-4 w-4 accent-cyan-600"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="mb-1 block text-slate-500">
                  Previous Reading
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedPump.meter}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-700">
                  New Reading (Liters)
                </label>
                <input
                  type="number"
                  min={selectedPump.rawMeter}
                  step="0.001"
                  required
                  autoFocus
                  placeholder="Enter new meter reading..."
                  value={newReading}
                  onChange={(event) => setNewReading(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white shadow transition-all hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === "report" && selectedPump && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveReport}
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Report Issue - {selectedPump.name}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close issue report form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="mb-1 block text-slate-700">
                  Maintenance Type
                </label>
                <select
                  value={maintenanceType}
                  onChange={(event) =>
                    setMaintenanceType(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="repair">Repair</option>
                  <option value="inspection">Inspection</option>
                  <option value="emergency">Emergency</option>
                  <option value="routine">Routine</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-slate-700">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  required
                  min={getToday()}
                  value={scheduledDate}
                  onChange={(event) =>
                    setScheduledDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-700">
                  Issue Description
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the maintenance issue..."
                  value={issueDesc}
                  onChange={(event) => setIssueDesc(event.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-300 p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
              Submitting this report creates a maintenance record. The pump
              status itself is not changed by this API.
            </p>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      {activeModal === "details" && selectedPump && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <FileText className="h-5 w-5 text-blue-600" />
                Maintenance Details - {selectedPump.name}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close maintenance details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="space-y-3 rounded-xl border bg-slate-50 p-4 text-xs font-semibold text-slate-700">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Pump Name</dt>
                <dd className="text-right font-bold text-slate-900">
                  {selectedPump.name}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Fuel Type</dt>
                <dd className="text-right font-bold text-slate-900">
                  {selectedPump.fuel}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Pump Status</dt>
                <dd className="text-right font-bold text-slate-900">
                  {selectedPump.status}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Current Meter Reading</dt>
                <dd className="text-right font-bold text-slate-900">
                  {selectedPump.meter}
                </dd>
              </div>
            </dl>

            <div>
              <h4 className="mb-3 text-sm font-black text-slate-900">
                Maintenance History
              </h4>

              {getPumpMaintenance(selectedPump.id).length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No maintenance records were found for this pump.
                </p>
              ) : (
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {getPumpMaintenance(selectedPump.id).map((record) => (
                    <div
                      key={record.maintenance_id}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase text-slate-800">
                          {record.maintenance_type}
                        </span>

                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                          {record.status || "Unknown"}
                        </span>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
                        {record.description || "No description provided."}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Scheduled: {formatDateTime(record.scheduled_date)}
                      </p>

                      {record.performed_date && (
                        <p className="mt-1 text-xs text-slate-500">
                          Performed: {formatDateTime(record.performed_date)}
                        </p>
                      )}

                      {record.notes && (
                        <p className="mt-2 text-xs text-slate-600">
                          Notes: {record.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t pt-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow transition-all hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
