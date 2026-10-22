
import { useCallback, useEffect, useMemo, useState } from "react";
import { Fuel, Search, X, RefreshCw, LoaderCircle } from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

const STATUS = {
  "Available Now": {
    dot: "bg-emerald-500",
    ring: "border-l-emerald-500",
    text: "text-emerald-700",
  },
  "In Use": {
    dot: "bg-blue-700",
    ring: "border-l-blue-700",
    text: "text-blue-700",
  },
  "Under Maintenance": {
    dot: "bg-yellow-500",
    ring: "border-l-yellow-500",
    text: "text-yellow-700",
  },
  "Out of Service": {
    dot: "bg-red-500",
    ring: "border-l-red-500",
    text: "text-red-600",
  },
};

const API_STATUS = {
  "Available Now": "available",
  "In Use": "in_use",
  "Under Maintenance": "under_maintenance",
  "Out of Service": "out_of_service",
};

const LABEL_STATUS = {
  available: "Available Now",
  in_use: "In Use",
  under_maintenance: "Under Maintenance",
  out_of_service: "Out of Service",
};

const NEEDS_REASON = ["Under Maintenance", "Out of Service"];

const usd = (value) =>
  Number(value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function normalizeStatus(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return LABEL_STATUS[key] ?? "Unknown Status";
}

function getFuelId(item) {
  return Number(
    item?.fuel_id ??
    item?.fuel_type_id ??
    item?.fuelType?.fuel_id ??
    item?.fuel_type?.fuel_id ??
    0
  );
}

function getFuelName(item) {
  return (
    item?.fuelType?.fuel_name ??
    item?.fuelType?.name ??
    item?.fuel_type?.fuel_name ??
    item?.fuel_type?.name ??
    item?.fuel_name ??
    "Unknown Fuel"
  );
}

function getTankId(item) {
  return item?.tank_id ?? item?.tank?.tank_id ?? null;
}

function getTankNumber(tank) {
  return (
    tank?.tank_number ??
    tank?.tank_code ??
    `Tank ID ${tank?.tank_id ?? tank?.id ?? "?"}`
  );
}

function getEmployeeId(employee) {
  return employee?.employee_id ?? employee?.id ?? null;
}

function getEmployeeName(employee) {
  if (typeof employee === "string") return employee;

  return (
    employee?.full_name ??
    employee?.employee_name ??
    employee?.name ??
    employee?.user?.full_name ??
    employee?.user?.name ??
    "Unassigned"
  );
}

function getApiArray(response, apiName) {
  if (Array.isArray(response)) return response;

  const possibleKeys = [
    "data",
    "employees",
    "fuel_pumps",
    "pumps",
    "fuel_tanks",
    "tanks",
    "fuel_types",
    "fuels",
    "sales",
    "activity_logs",
    "logs",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  console.error(`${apiName} returned unexpected data:`, response);

  throw new Error(
    `${apiName} did not return an array. Check the Laravel API response.`
  );
}

function formatDateForInput(value) {
  if (!value) return "";

  const date = String(value).slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function isActiveEmployee(employee) {
  const activeValue =
    employee?.is_active ??
    employee?.user?.is_active ??
    employee?.active ??
    employee?.status;

  // If no activity field is returned, do not hide the employee
  // solely because the API response omitted it.
  if (activeValue === undefined || activeValue === null) {
    return true;
  }

  return (
    activeValue === true ||
    activeValue === 1 ||
    ["1", "true", "active"].includes(
      String(activeValue).toLowerCase()
    )
  );
}

function isFuelAttendant(employee) {
  const roleValues = [
    employee?.role,
    employee?.user?.role,
    employee?.employee_role,
    employee?.position,
    employee?.user?.position,
  ];

  return roleValues.some((value) => {
    const role = String(value ?? "")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");

    return [
      "fuel_attendant",
      "fuelattendant",
      "attendant",
    ].includes(role);
  });
}

function getEmployeeRelation(item) {
  const relation =
    item?.attendant ??
    item?.employee ??
    item?.assigned_employee ??
    null;

  if (relation && typeof relation === "object") {
    return relation;
  }

  return null;
}

function mapPump(item, tanks, salesByPump) {
  const dbId = item.pump_id ?? item.id;
  const tankId = getTankId(item);

  // Match the real database ID, not the displayed tank number.
  const connectedTank =
    tankId == null
      ? null
      : tanks.find(
          (tank) =>
            String(tank.tank_id ?? tank.id) === String(tankId)
        );

  const capacity = Number(
    connectedTank?.capacity ??
    connectedTank?.tank_capacity ??
    0
  );

  const volume = Number(
    connectedTank?.current_volume ??
    connectedTank?.current_level ??
    connectedTank?.current_volume_liters ??
    0
  );

  const sale = salesByPump[String(dbId)] ?? {};
  const attendant = getEmployeeRelation(item);

  const status = normalizeStatus(item.status);

  return {
    dbId,
    id:
      item.pump_number ??
      item.pump_code ??
      `Pump ${dbId}`,
    fuel: getFuelName(item),
    fuelId: getFuelId(item),

    tank: connectedTank
      ? getTankNumber(connectedTank)
      : tankId != null
        ? `Tank ID ${tankId}`
        : "Not linked",

    tankId,

    tankLevel:
      connectedTank && capacity > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((volume / capacity) * 100))
          )
        : null,

    status,

    // Use the employee relationship when it exists.
    // Do not depend only on employee.full_name.
    attendant:
      getEmployeeName(attendant) !== "Unassigned"
        ? getEmployeeName(attendant)
        : item.employee_name ??
          item.attendant_name ??
          "Unassigned",

    employeeId:
      item.employee_id ??
      item.attendant_id ??
      attendant?.employee_id ??
      attendant?.id ??
      null,

    liters: Number(
      sale.liters_today ??
      sale.liters_sold ??
      sale.liters ??
      0
    ),

    sales: Number(
      sale.sales_today ??
      sale.total_sales ??
      sale.total_amount ??
      sale.amount ??
      0
    ),

    service:
      formatDateForInput(item.last_maintenance_date) || "—",

    raw: item,
  };
}

async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem("gas_station_token");

  const headers = {
    Accept: "application/json",
    ...(options.body != null
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Cannot connect to Laravel API. Please check that the backend is running."
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data = {};

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => "");
    data = { message: text };
  }

  if (!response.ok) {
    const validationMessage = data.errors
      ? Object.values(data.errors).flat().filter(Boolean).join(" ")
      : "";

    if (response.status === 401) {
      throw new Error("Unauthorized. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error(
        "You do not have permission to perform this action."
      );
    }

    throw new Error(
      validationMessage ||
      data.message ||
      `Request failed (${response.status}) at ${endpoint}.`
    );
  }

  return data;
}

function parseJsonValue(value) {
  if (!value) return {};

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mapStatusLog(item) {
  const oldValue = parseJsonValue(item.old_value);
  const newValue = parseJsonValue(item.new_value);

  const oldStatus = normalizeStatus(oldValue.status);
  const newStatus = normalizeStatus(newValue.status);

  // Do not show logs that do not contain an actual status change.
  if (
    oldStatus === "Unknown Status" ||
    newStatus === "Unknown Status" ||
    oldStatus === newStatus
  ) {
    return null;
  }

  const dateValue = item.created_at ?? item.updated_at;
  const date = dateValue ? new Date(dateValue) : null;

  return {
    id: item.log_id ?? item.id,
    pump:
      oldValue.pump_number ??
      newValue.pump_number ??
      oldValue.pump_code ??
      newValue.pump_code ??
      `Pump ${item.entity_id ?? "?"}`,
    pumpId: item.entity_id,
    from: oldStatus,
    to: newStatus,
    reason: newValue.status_reason ?? "",
    user:
      item.user?.full_name ??
      item.user?.username ??
      item.causer?.name ??
      "Unknown user",
    timestamp:
      date && !Number.isNaN(date.getTime())
        ? date.getTime()
        : 0,
    when:
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleString()
        : "Unknown date",
  };
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {title}
          </h3>

          <button
            type="button"
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

const GreenBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
  >
    {children}
  </button>
);

const GhostBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`rounded-full border px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 ${className}`}
  >
    {children}
  </button>
);

const Sel = ({ label, options, ...props }) => (
  <label className="block text-sm">
    {label}

    <select
      {...props}
      className="mt-1 w-full rounded-lg border bg-white px-3 py-2 disabled:bg-slate-100"
    >
      {options.map((option) => {
        const value =
          typeof option === "object" ? option.value : option;

        const labelText =
          typeof option === "object" ? option.label : option;

        return (
          <option
            key={String(value ?? "")}
            value={value ?? ""}
            disabled={
              typeof option === "object"
                ? Boolean(option.disabled)
                : false
            }
          >
            {labelText}
          </option>
        );
      })}
    </select>
  </label>
);

export default function PumpsStatus() {
  const [pumps, setPumps] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [log, setLog] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [fuel, setFuel] = useState("All fuel types");
  const [chip, setChip] = useState("All");
  const [allLog, setAllLog] = useState(false);

  const [modal, setModal] = useState(null);

  const [form, setForm] = useState({
    pumpNumber: "",
    fuelId: "",
    tank: "",
    attendant: "",
    model: "",
    serialNumber: "",
    installationDate: "",
    lastMaintenanceDate: "",
    nextMaintenanceDate: "",
    meterReading: "0",
  });

  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const loadStatusHistory = useCallback(async () => {
    const response = await apiRequest(
      "/activity-logs?entity_type=FuelPump"
    );

    const entries = getApiArray(response, "/activity-logs");

    const history = entries
      .filter((item) => {
        const type = String(item.entity_type ?? "")
          .toLowerCase()
          .replace(/[_\s-]/g, "");

        return (
          !type ||
          type === "fuelpump" ||
          type.endsWith("fuelpump")
        );
      })
      .map(mapStatusLog)
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);

    setLog(history);
  }, []);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    setError("");

    try {
      const [
        pumpResponse,
        tankResponse,
        fuelResponse,
        salesResponse,
        employeeResponse,
      ] = await Promise.all([
        apiRequest("/fuel-pumps"),
        apiRequest("/fuel-tanks"),
        apiRequest("/fuel-types"),
        apiRequest("/fuel-pumps-sales-today"),
        apiRequest("/employees"),
      ]);

      const pumpData = getApiArray(
        pumpResponse,
        "/fuel-pumps"
      );

      const tankData = getApiArray(
        tankResponse,
        "/fuel-tanks"
      );

      const fuelData = getApiArray(
        fuelResponse,
        "/fuel-types"
      );

      const salesData = getApiArray(
        salesResponse,
        "/fuel-pumps-sales-today"
      );

      const employeeData = getApiArray(
        employeeResponse,
        "/employees"
      );

      setTanks(tankData);
      setFuels(fuelData);
      setEmployees(employeeData);

      const salesByPump = {};

      salesData.forEach((item) => {
        const pumpId = item.pump_id ?? item.fuel_pump_id;

        if (pumpId == null) return;

        salesByPump[String(pumpId)] = {
          liters_today: Number(
            item.liters_today ??
            item.liters_sold ??
            item.liters ??
            0
          ),
          sales_today: Number(
            item.sales_today ??
            item.total_sales ??
            item.total_amount ??
            item.amount ??
            0
          ),
        };
      });

      setPumps(
        pumpData.map((item) =>
          mapPump(item, tankData, salesByPump)
        )
      );

      try {
        await loadStatusHistory();
      } catch (historyError) {
        console.error(
          "Failed to load pump status history:",
          historyError
        );
        setLog([]);
      }

      return true;
    } catch (err) {
      console.error("Failed to load pump data:", err);
      setError(err.message || "Failed to load pump data.");
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [loadStatusHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const fuelOptions = useMemo(
    () =>
      fuels.map((item) => ({
        value: String(item.fuel_id ?? item.id),
        label:
          item.fuel_name ??
          item.name ??
          `Fuel ${item.fuel_id ?? item.id}`,
      })),
    [fuels]
  );

  const attendantOptions = useMemo(
    () =>
      employees
        .filter(
          (employee) =>
            isFuelAttendant(employee) &&
            isActiveEmployee(employee)
        )
        .map((employee) => ({
          value: String(getEmployeeId(employee)),
          label: getEmployeeName(employee),
        }))
        .filter((employee) => employee.value !== "null"),
    [employees]
  );

  const currentPump = useMemo(() => {
    if (!modal?.id) return null;

    return pumps.find(
      (pump) => String(pump.dbId) === String(modal.id)
    ) ?? null;
  }, [modal, pumps]);

  const tankOptions = useMemo(() => {
    const currentTankId = currentPump?.tankId;

    return tanks
      .filter((tank) => {
        const sameFuel =
          Number(
            tank.fuel_id ??
            tank.fuel_type_id ??
            tank.fuel_type?.fuel_id
          ) === Number(form.fuelId);

        if (!sameFuel) return false;

        const tankId = tank.tank_id ?? tank.id;

        const status = String(tank.status ?? "")
          .toLowerCase()
          .trim();

        const active = ["active", "available"].includes(status);

        const currentlyConnected =
          currentTankId != null &&
          String(tankId) === String(currentTankId);

        // Keep the currently linked tank visible even if it is
        // under maintenance. Do not allow a new assignment to it.
        return active || currentlyConnected;
      })
      .map((tank) => {
        const tankId = tank.tank_id ?? tank.id;

        const status = String(tank.status ?? "")
          .toLowerCase()
          .trim();

        const active = ["active", "available"].includes(status);

        const currentlyConnected =
          currentPump?.tankId != null &&
          String(tankId) === String(currentPump.tankId);

        return {
          value: String(tankId),
          label: `${getTankNumber(tank)} — ${
            active
              ? "Active"
              : currentlyConnected
                ? `Currently connected (${tank.status})`
                : tank.status ?? "Inactive"
          }`,
          disabled: !active && !currentlyConnected,
        };
      });
  }, [tanks, form.fuelId, currentPump]);

  const count = (status) =>
    pumps.filter((pump) => pump.status === status).length;

  const rows = useMemo(() => {
    const search = q.trim().toLowerCase();

    return pumps.filter(
      (pump) =>
        (chip === "All" || pump.status === chip) &&
        (fuel === "All fuel types" || pump.fuel === fuel) &&
        (!search ||
          [
            pump.id,
            pump.fuel,
            pump.tank,
            pump.attendant,
            pump.status,
          ].some((value) =>
            String(value ?? "").toLowerCase().includes(search)
          ))
    );
  }, [pumps, q, fuel, chip]);

  const sel = currentPump;

  function close() {
    if (saving) return;

    setModal(null);
    setError("");
    setReason("");
  }

  function openAdd() {
    setError("");

    const maxNumber = Math.max(
      0,
      ...pumps.map((pump) => {
        const match = String(pump.id).match(/\d+/);
        return match ? Number(match[0]) : 0;
      })
    );

    setForm({
      pumpNumber: `P${String(maxNumber + 1).padStart(3, "0")}`,
      fuelId: fuels[0]
        ? String(fuels[0].fuel_id ?? fuels[0].id)
        : "",
      tank: "",
      attendant: "",
      model: "",
      serialNumber: "",
      installationDate: "",
      lastMaintenanceDate: "",
      nextMaintenanceDate: "",
      meterReading: "0",
    });

    setModal({ type: "add" });
  }

  function openEdit(pump) {
    const raw = pump.raw;

    setForm({
      pumpNumber:
        raw.pump_number ??
        raw.pump_code ??
        "",
      fuelId: String(getFuelId(raw) || ""),
      tank:
        raw.tank_id != null
          ? String(raw.tank_id)
          : raw.tank?.tank_id != null
            ? String(raw.tank.tank_id)
            : "",
      attendant:
        raw.employee_id != null
          ? String(raw.employee_id)
          : raw.attendant_id != null
            ? String(raw.attendant_id)
            : raw.attendant?.employee_id != null
              ? String(raw.attendant.employee_id)
              : raw.employee?.employee_id != null
                ? String(raw.employee.employee_id)
                : "",
      model: raw.model ?? "",
      serialNumber: raw.serial_number ?? "",
      installationDate: formatDateForInput(
        raw.installation_date
      ),
      lastMaintenanceDate: formatDateForInput(
        raw.last_maintenance_date
      ),
      nextMaintenanceDate: formatDateForInput(
        raw.next_maintenance_date
      ),
      meterReading: String(raw.meter_reading ?? 0),
    });

    setError("");
    setModal({ type: "edit", id: pump.dbId });
  }

  function changeFuel(fuelId) {
    setForm((previous) => ({
      ...previous,
      fuelId,
      tank: "",
    }));
  }

  function getPayload(status) {
    return {
      pump_number: form.pumpNumber.trim(),
      fuel_id: Number(form.fuelId),
      tank_id: form.tank ? Number(form.tank) : null,
      employee_id: form.attendant
        ? Number(form.attendant)
        : null,
      status: API_STATUS[status] ?? status,
      model: form.model.trim() || null,
      serial_number: form.serialNumber.trim() || null,
      installation_date: form.installationDate || null,
      last_maintenance_date:
        form.lastMaintenanceDate || null,
      next_maintenance_date:
        form.nextMaintenanceDate || null,
      meter_reading: Number(form.meterReading || 0),
    };
  }

  function validatePumpForm() {
    if (!form.pumpNumber.trim()) {
      setError("Enter a pump number.");
      return false;
    }

    if (form.pumpNumber.trim().length > 20) {
      setError("Pump number must not exceed 20 characters.");
      return false;
    }

    if (
      !form.fuelId ||
      !Number.isInteger(Number(form.fuelId)) ||
      Number(form.fuelId) <= 0
    ) {
      setError("Select a valid fuel type.");
      return false;
    }

    if (
      form.meterReading === "" ||
      !Number.isFinite(Number(form.meterReading)) ||
      Number(form.meterReading) < 0
    ) {
      setError("Meter reading must be zero or greater.");
      return false;
    }

    // A selected tank must belong to the selected fuel type.
    if (form.tank) {
      const selectedTank = tanks.find(
        (tank) =>
          String(tank.tank_id ?? tank.id) === String(form.tank)
      );

      if (!selectedTank) {
        setError("The selected tank could not be found.");
        return false;
      }

      const selectedTankFuelId = Number(
        selectedTank.fuel_id ??
        selectedTank.fuel_type_id ??
        selectedTank.fuel_type?.fuel_id
      );

      if (selectedTankFuelId !== Number(form.fuelId)) {
        setError(
          "The connected tank must match the selected fuel type."
        );
        return false;
      }

      const status = String(selectedTank.status ?? "")
        .toLowerCase()
        .trim();

      const active = ["active", "available"].includes(status);

      const isCurrentTank =
        currentPump?.tankId != null &&
        String(currentPump.tankId) === String(form.tank);

      if (!active && !isCurrentTank) {
        setError(
          "A new pump can only be connected to an active tank."
        );
        return false;
      }
    }

    const dates = [
      form.installationDate,
      form.lastMaintenanceDate,
      form.nextMaintenanceDate,
    ].filter(Boolean);

    if (dates.some((date) => Number.isNaN(Date.parse(date)))) {
      setError("Please enter valid dates.");
      return false;
    }

    if (
      form.attendant &&
      !attendantOptions.some(
        (employee) => employee.value === String(form.attendant)
      )
    ) {
      // Do not silently discard an existing assignment when the
      // API omitted that employee from the active employees list.
      const alreadyAssigned =
        currentPump?.employeeId != null &&
        String(currentPump.employeeId) === String(form.attendant);

      if (!alreadyAssigned) {
        setError(
          "Select a valid active Fuel Attendant or choose Unassigned."
        );
        return false;
      }
    }

    setError("");
    return true;
  }

  async function submitAdd(event) {
    event.preventDefault();
    setError("");

    if (!validatePumpForm()) return;

    setSaving(true);

    try {
      const result = await apiRequest("/fuel-pumps", {
        method: "POST",
        body: JSON.stringify(getPayload("Available Now")),
      });

      setModal(null);

      const refreshed = await loadData(false);

      setToast(
        refreshed
          ? result.message || "Pump added successfully."
          : "Pump saved. Click Refresh to reload the list."
      );
    } catch (err) {
      setError(err.message || "Failed to add pump.");
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event) {
    event.preventDefault();
    setError("");

    if (!sel) {
      setError("Pump not found. Close and reopen Edit.");
      return;
    }

    if (!validatePumpForm()) return;

    setSaving(true);

    try {
      const result = await apiRequest(
        `/fuel-pumps/${sel.dbId}`,
        {
          method: "PUT",
          body: JSON.stringify(getPayload(sel.status)),
        }
      );

      setModal(null);

      const refreshed = await loadData(false);

      setToast(
        refreshed
          ? result.message || "Pump updated successfully."
          : "Pump updated. Click Refresh to reload the list."
      );
    } catch (err) {
      setError(err.message || "Failed to update pump.");
    } finally {
      setSaving(false);
    }
  }

  async function removePump() {
    if (!sel) return;

    if (sel.status === "In Use") {
      setError(
        "This pump is in use. Change its status before removing it."
      );
      return;
    }

    setError("");
    setSaving(true);

    try {
      const result = await apiRequest(
        `/fuel-pumps/${sel.dbId}`,
        { method: "DELETE" }
      );

      setModal(null);

      const refreshed = await loadData(false);

      setToast(
        refreshed
          ? result.message || "Pump removed successfully."
          : "Pump deleted. Click Refresh to reload data."
      );
    } catch (err) {
      setError(err.message || "Failed to remove pump.");
    } finally {
      setSaving(false);
    }
  }

  function requestStatus(pump, to) {
    if (saving || to === pump.status) return;

    if (!API_STATUS[to]) {
      setError("Please select a valid pump status.");
      return;
    }

    setError("");
    setReason("");

    if (NEEDS_REASON.includes(to)) {
      setModal({
        type: "reason",
        id: pump.dbId,
        status: to,
      });
    } else {
      updateStatus(pump, to);
    }
  }

  async function updateStatus(pump, to, why = "") {
    if (!pump) return;

    setError("");
    setSaving(true);

    try {
      const raw = pump.raw;

      // Preserve database relationships and fields during a status update.
      const payload = {
        pump_number:
          raw.pump_number ??
          raw.pump_code ??
          pump.id,
        fuel_id: getFuelId(raw),
        tank_id:
          raw.tank_id ??
          raw.tank?.tank_id ??
          null,
        employee_id:
          raw.employee_id ??
          raw.attendant_id ??
          raw.attendant?.employee_id ??
          raw.employee?.employee_id ??
          null,
        status: API_STATUS[to],
        model: raw.model ?? null,
        serial_number: raw.serial_number ?? null,
        installation_date: raw.installation_date ?? null,
        last_maintenance_date:
          raw.last_maintenance_date ?? null,
        next_maintenance_date:
          raw.next_maintenance_date ?? null,
        meter_reading: Number(raw.meter_reading ?? 0),
        status_reason: why.trim() || null,
      };

      const result = await apiRequest(
        `/fuel-pumps/${pump.dbId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      setModal(null);
      setReason("");

      const refreshed = await loadData(false);

      setToast(
        refreshed
          ? result.message || `${pump.id}: ${to}`
          : "Status saved. Click Refresh to reload the pump list."
      );
    } catch (err) {
      setError(
        err.message || "Failed to update pump status."
      );
    } finally {
      setSaving(false);
    }
  }

  function submitReason(event) {
    event.preventDefault();

    if (!reason.trim()) {
      setError("Enter a reason so the team knows what happened.");
      return;
    }

    if (sel && modal?.type === "reason") {
      updateStatus(sel, modal.status, reason.trim());
    }
  }

  const Stat = ({ label, value, note, c }) => (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <p className="flex items-center gap-2 text-sm text-slate-500">
        {c && <i className={`h-3 w-3 rounded-full ${c}`} />}
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center bg-gray-300 p-6">
        <div className="flex items-center gap-3 rounded-xl bg-white p-5 shadow">
          <LoaderCircle
            size={22}
            className="animate-spin text-emerald-600"
          />
          <span className="text-sm text-slate-600">
            Loading pumps...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-gray-300 p-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Pumps &amp; Status
          </h2>

          <p className="text-sm text-slate-500">
            Monitor every pump and change its status.
          </p>
        </div>

        <div className="flex gap-2">
          <GhostBtn
            type="button"
            disabled={saving}
            onClick={() => loadData()}
            className="flex items-center gap-1.5 py-2"
          >
            <RefreshCw size={14} />
            Refresh
          </GhostBtn>

          <GreenBtn
            type="button"
            disabled={saving}
            className="py-2 text-sm"
            onClick={openAdd}
          >
            + Add Pump
          </GreenBtn>
        </div>
      </div>

      {error && !modal && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Total Pumps"
          value={pumps.length}
          note="All pumps at this branch"
        />

        <Stat
          label="Available Now"
          value={count("Available Now")}
          note="Ready to dispense"
          c="bg-emerald-500"
        />

        <Stat
          label="In Use"
          value={count("In Use")}
          note="Currently dispensing"
          c="bg-blue-700"
        />

        <Stat
          label="Not operating"
          value={
            count("Under Maintenance") +
            count("Out of Service")
          }
          note="Maintenance or out of service"
          c="bg-red-500"
        />
      </div>

      {/* SEARCH AND FILTER */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search pump, fuel, tank, attendant..."
            className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400"
          />
        </div>

        <select
          value={fuel}
          onChange={(event) => setFuel(event.target.value)}
          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {[
            "All fuel types",
            ...new Set(pumps.map((pump) => pump.fuel)),
          ].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2">
          {["All", ...Object.keys(STATUS)].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setChip(status)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                chip === status
                  ? "bg-yellow-300 text-slate-900"
                  : "bg-slate-600 text-white hover:bg-slate-700"
              }`}
            >
              {status}
              {status !== "All"
                ? ` (${count(status)})`
                : ` (${pumps.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* PUMP CARDS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((pump) => {
          const statusStyle =
            STATUS[pump.status] ?? STATUS["Out of Service"];

          return (
            <article
              key={pump.dbId}
              className={`rounded-2xl border-l-4 bg-white p-5 shadow-sm ring-1 ring-slate-100 ${statusStyle.ring}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {pump.id}
                  </h3>

                  <p className="text-sm text-slate-600">
                    {pump.fuel} · {pump.tank}
                  </p>
                </div>

                <Fuel
                  size={30}
                  className={
                    pump.status === "Under Maintenance" ||
                    pump.status === "Out of Service"
                      ? "text-slate-300"
                      : "text-orange-500"
                  }
                />
              </div>

              <p
                className={`mt-2 flex items-center gap-2 text-sm font-semibold ${statusStyle.text}`}
              >
                <i className={`h-3 w-3 rounded-full ${statusStyle.dot}`} />
                {pump.status}
              </p>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Connected tank level</span>

                  <span>
                    {pump.tankLevel == null
                      ? "Not linked / unavailable"
                      : `${pump.tankLevel}%`}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  {pump.tankLevel != null && (
                    <div
                      className={`h-full ${
                        pump.tankLevel < 40
                          ? "bg-yellow-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${pump.tankLevel}%` }}
                    />
                  )}
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
                <dt className="text-slate-500">Meter reading</dt>
                <dd className="text-right font-medium">
                  {Number(
                    pump.raw.meter_reading ?? 0
                  ).toLocaleString()}{" "}
                  L
                </dd>

                <dt className="text-slate-500">Liters today</dt>
                <dd className="text-right font-medium">
                  {Number(pump.liters ?? 0).toLocaleString("en-US", {
                    maximumFractionDigits: 3,
                  })}{" "}
                  L
                </dd>

                <dt className="text-slate-500">Sales today</dt>
                <dd className="text-right font-medium">
                  {usd(pump.sales)}
                </dd>

                <dt className="text-slate-500">Attendant</dt>
                <dd className="break-words text-right font-medium">
                  {pump.attendant}
                </dd>

                <dt className="text-slate-500">Last maintenance</dt>
                <dd className="text-right font-medium">
                  {pump.service}
                </dd>
              </dl>

              <div className="mt-4 flex items-center gap-2">
                <select
                  aria-label={`Status of ${pump.id}`}
                  value={pump.status}
                  disabled={saving}
                  onChange={(event) =>
                    requestStatus(pump, event.target.value)
                  }
                  className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs"
                >
                  {Object.keys(STATUS).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <GreenBtn
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setModal({ type: "details", id: pump.dbId })
                  }
                >
                  Details
                </GreenBtn>

                <GhostBtn
                  type="button"
                  disabled={saving}
                  onClick={() => openEdit(pump)}
                >
                  Edit
                </GhostBtn>
              </div>
            </article>
          );
        })}

        {!rows.length && (
          <p className="col-span-full rounded-2xl bg-white py-10 text-center text-slate-400">
            No pumps match your filters.
          </p>
        )}
      </div>

      {/* STATUS HISTORY */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            Recent status changes
          </h3>

          <GreenBtn
            type="button"
            onClick={() => setAllLog((value) => !value)}
          >
            {allLog ? "Show less" : "View all"}
          </GreenBtn>
        </div>

        {log.length === 0 ? (
          <p className="py-5 text-center text-sm text-slate-400">
            No status changes found.
          </p>
        ) : (
          <ul className="divide-y">
            {(allLog ? log : log.slice(0, 4)).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm"
              >
                <b className="w-20">{item.pump}</b>

                <span className="flex flex-1 flex-wrap items-center gap-2">
                  <i
                    className={`h-2.5 w-2.5 rounded-full ${
                      STATUS[item.from]?.dot ?? "bg-slate-400"
                    }`}
                  />
                  {item.from}

                  <span className="text-slate-400">→</span>

                  <i
                    className={`h-2.5 w-2.5 rounded-full ${
                      STATUS[item.to]?.dot ?? "bg-slate-400"
                    }`}
                  />
                  {item.to}
                </span>

                {item.reason && (
                  <span className="w-full text-xs text-slate-500">
                    Reason: {item.reason}
                  </span>
                )}

                <span className="w-full text-xs text-slate-500">
                  Changed by: {item.user}
                </span>

                <span className="w-full text-xs text-slate-400">
                  {item.when}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* DETAILS MODAL */}
      {modal?.type === "details" && sel && (
        <Modal
          title={`${sel.id} · ${sel.fuel}`}
          onClose={close}
        >
          <p className="mb-2 text-sm text-slate-500">
            Change status
          </p>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {Object.keys(STATUS).map((status) => (
              <button
                key={status}
                type="button"
                disabled={saving}
                onClick={() => requestStatus(sel, status)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  sel.status === status
                    ? "border-emerald-500 bg-emerald-50 font-semibold"
                    : "hover:bg-slate-50"
                }`}
              >
                <i className={`h-3 w-3 rounded-full ${STATUS[status].dot}`} />
                {status}
              </button>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-y-2 border-t pt-3 text-sm">
            <dt className="text-slate-500">Pump ID</dt>
            <dd>{sel.dbId}</dd>

            <dt className="text-slate-500">Tank</dt>
            <dd>
              {sel.tank}
              {sel.tankLevel == null ? "" : ` (${sel.tankLevel}%)`}
            </dd>

            <dt className="text-slate-500">Fuel Type ID</dt>
            <dd>{sel.fuelId}</dd>

            <dt className="text-slate-500">Attendant</dt>
            <dd>{sel.attendant}</dd>

            <dt className="text-slate-500">Meter Reading</dt>
            <dd>
              {Number(sel.raw.meter_reading ?? 0).toLocaleString()} L
            </dd>

            <dt className="text-slate-500">Model</dt>
            <dd>{sel.raw.model || "—"}</dd>

            <dt className="text-slate-500">Serial Number</dt>
            <dd>{sel.raw.serial_number || "—"}</dd>

            <dt className="text-slate-500">Last Maintenance</dt>
            <dd>{sel.service}</dd>
          </dl>

          <div className="mt-4 flex justify-between">
            <GhostBtn
              type="button"
              disabled={saving}
              onClick={() => openEdit(sel)}
            >
              Edit Pump
            </GhostBtn>

            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setError("");
                setModal({ type: "remove", id: sel.dbId });
              }}
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              Remove Pump
            </button>
          </div>
        </Modal>
      )}

      {/* STATUS REASON MODAL */}
      {modal?.type === "reason" && sel && (
        <Modal
          title={`${sel.id} → ${modal.status}`}
          onClose={close}
        >
          <form onSubmit={submitReason} className="space-y-3">
            <label className="block text-sm">
              Reason

              <textarea
                autoFocus
                required
                rows={3}
                value={reason}
                disabled={saving}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Nozzle leaking"
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>

            {error && (
              <p role="alert" className="whitespace-pre-line text-sm text-red-500">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <GhostBtn
                type="button"
                disabled={saving}
                onClick={close}
              >
                Cancel
              </GhostBtn>

              <GreenBtn type="submit" disabled={saving}>
                {saving ? "Saving..." : "Confirm"}
              </GreenBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ADD / EDIT MODAL */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <Modal
          title={
            modal.type === "add"
              ? "Add Pump"
              : `Edit ${sel?.id ?? "Pump"}`
          }
          onClose={close}
        >
          <form
            onSubmit={modal.type === "add" ? submitAdd : submitEdit}
            className="space-y-3"
          >
            <label className="block text-sm">
              Pump Number

              <input
                required
                maxLength={20}
                value={form.pumpNumber}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    pumpNumber: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="e.g. P001"
              />
            </label>

            <Sel
              label="Fuel Type"
              options={[
                { value: "", label: "Select fuel type" },
                ...fuelOptions,
              ]}
              value={form.fuelId}
              disabled={saving || !fuelOptions.length}
              onChange={(event) => changeFuel(event.target.value)}
            />

            <label className="block text-sm">
              Model

              <input
                value={form.model}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    model: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              Serial Number

              <input
                value={form.serialNumber}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    serialNumber: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>

            <Sel
              label="Connected Tank"
              options={[
                { value: "", label: "Unassigned" },
                ...tankOptions,
              ]}
              value={form.tank}
              disabled={saving || !form.fuelId}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  tank: event.target.value,
                }))
              }
            />

            <Sel
              label="Fuel Attendant"
              options={[
                { value: "", label: "Unassigned" },
                ...attendantOptions,
              ]}
              value={form.attendant}
              disabled={saving}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  attendant: event.target.value,
                }))
              }
            />

            {attendantOptions.length === 0 && (
              <p className="text-xs text-amber-700">
                No active Fuel Attendant was returned by the API.
                Check the employee role and active-status fields.
              </p>
            )}

            <label className="block text-sm">
              Installation Date

              <input
                type="date"
                value={form.installationDate}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    installationDate: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              Last Maintenance Date

              <input
                type="date"
                value={form.lastMaintenanceDate}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    lastMaintenanceDate: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              Next Maintenance Date

              <input
                type="date"
                value={form.nextMaintenanceDate}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    nextMaintenanceDate: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              Meter Reading

              <input
                type="number"
                min="0"
                step="any"
                required
                value={form.meterReading}
                disabled={saving}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    meterReading: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>

            {error && (
              <p role="alert" className="whitespace-pre-line text-sm text-red-500">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <GhostBtn
                type="button"
                disabled={saving}
                onClick={close}
              >
                Cancel
              </GhostBtn>

              <GreenBtn
                type="submit"
                disabled={saving || !fuelOptions.length}
              >
                {saving
                  ? "Saving..."
                  : modal.type === "add"
                    ? "Add Pump"
                    : "Save Changes"}
              </GreenBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION */}
      {modal?.type === "remove" && sel && (
        <Modal title="Remove Pump" onClose={close}>
          <p className="text-sm">
            Remove <b>{sel.id}</b> ({sel.fuel}) from the database?
          </p>

          {error && (
            <p role="alert" className="mt-2 text-sm text-red-500">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <GhostBtn
              type="button"
              disabled={saving}
              onClick={close}
            >
              Cancel
            </GhostBtn>

            <button
              type="button"
              disabled={saving}
              onClick={removePump}
              className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-40"
            >
              {saving ? "Removing..." : "Remove"}
            </button>
          </div>
        </Modal>
      )}

      {/* TOAST */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[60] rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
