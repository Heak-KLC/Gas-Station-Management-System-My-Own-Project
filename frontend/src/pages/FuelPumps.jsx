import { useEffect, useState } from "react";
import {
  Plus,
  SlidersHorizontal,
  FileText,
  X,
  CheckCircle2,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";

import { Panel } from "../components/ui";

import {
  getFuelPumps,
  createFuelPump,
  updateFuelPump,
  deleteFuelPump,
} from "../api/fuelPumpApi";

import { getFuelTypes } from "../api/fuelTypeApi";

// =========================================================
// STATIC LOG DATA
// =========================================================
// Maintenance / Calibration detailed log API is not implemented yet.
//
// Therefore, this section remains static for now.
// Later, when Equipment Maintenance / Pump Maintenance
// backend is implemented, this section can be connected
// to the real API.
// =========================================================
const PUMP_LOGS = {
  "PUMP 1": [
    {
      date: "2026-06-15",
      type: "Calibration",
      note: "Routine calibration passed",
      by: "Sok Piseth",
    },
    {
      date: "2026-05-02",
      type: "Maintenance",
      note: "Nozzle 1 seal replaced",
      by: "Tech-Fix Co.",
    },
    {
      date: "2026-03-18",
      type: "Inspection",
      note: "Meter accuracy verified",
      by: "Keo Vannet",
    },
  ],

  "PUMP 2": [
    {
      date: "2026-06-15",
      type: "Calibration",
      note: "Routine calibration passed",
      by: "Sok Piseth",
    },
    {
      date: "2026-04-22",
      type: "Inspection",
      note: "No issues found",
      by: "Keo Vannet",
    },
  ],

  "PUMP 3": [
    {
      date: "2026-06-15",
      type: "Calibration",
      note: "Calibration incomplete — taken offline",
      by: "Sok Piseth",
    },
    {
      date: "2026-06-14",
      type: "Maintenance",
      note: "Fuel leak detected at nozzle",
      by: "Tech-Fix Co.",
    },
    {
      date: "2026-05-30",
      type: "Inspection",
      note: "Flow rate below spec",
      by: "Chhay Nimol",
    },
  ],

  "PUMP 4": [
    {
      date: "2026-06-15",
      type: "Calibration",
      note: "Routine calibration passed",
      by: "Sok Piseth",
    },
    {
      date: "2026-04-10",
      type: "Maintenance",
      note: "Display module replaced",
      by: "Tech-Fix Co.",
    },
  ],
};

// =========================================================
// STATIC LOG TYPE STYLES
// =========================================================
const LOG_TYPE_STYLES = {
  Calibration: "bg-cyan-50 text-cyan-600",
  Maintenance: "bg-amber-50 text-amber-600",
  Inspection: "bg-emerald-50 text-emerald-600",
};

// =========================================================
// PUMP STATUS STYLES
// =========================================================
const PUMP_STATUS_STYLES = {
  Online: "bg-emerald-400 text-white",
  Maintenance: "bg-rose-400 text-white",
  Offline: "bg-slate-400 text-white",
};

// =========================================================
// Convert backend status into UI status.
// =========================================================
const getDisplayStatus = (status) => {
  if (status === "under_maintenance") {
    return "Maintenance";
  }

  if (status === "out_of_service") {
    return "Offline";
  }

  if (status === "in_use") {
    return "Online";
  }

  return "Online";
};

// =========================================================
// Convert backend fuel type into UI fuel name.
//
// Database currently returns:
//
// Diesel
// Petrol92
// Petrol95
// LPG
//
// We keep the actual database name instead of changing
// Petrol92 / Petrol95 into Regular / Premium.
// =========================================================
const getFuelGrade = (fuelType) => {
  if (!fuelType) {
    return "Unknown";
  }

  const name =
    fuelType.fuel_name ||
    fuelType.name ||
    "";

  return name || "Unknown";
};

// =========================================================
// Convert Laravel Fuel Pump object into the structure
// expected by the existing UI.
// =========================================================
const mapApiPumpToUi = (pump) => {
  const status = getDisplayStatus(pump.status);

  return {
    // Display ID
    id: pump.pump_number,

    // Real database primary key
    pumpId: pump.pump_id,

    // Fuel type information
    grade: getFuelGrade(pump.fuel_type),

    // UI status
    status,

    // Backend status
    backendStatus: pump.status,

    // -----------------------------------------------------
    // These values are not currently stored in fuel_pumps.
    // Keep them as display values until the related backend
    // functionality is implemented.
    // -----------------------------------------------------
    flowRate:
      status === "Maintenance" ? null : "45",

    txnVol: "0.0",

    price: "$0.00",

    // -----------------------------------------------------
    // Maintenance date
    // -----------------------------------------------------
    lastCal:
      pump.last_maintenance_date
        ? String(pump.last_maintenance_date).slice(0, 10)
        : "-",

    // -----------------------------------------------------
    // Meter
    // -----------------------------------------------------
    meter: pump.meter_reading ?? "0",

    meterLabel: "Mechanical Meter Reading (L)",

    // -----------------------------------------------------
    // Pump information
    // -----------------------------------------------------
    model: pump.model || "",

    serialNumber: pump.serial_number || "",

    installationDate:
      pump.installation_date
        ? String(pump.installation_date).slice(0, 10)
        : "",

    lastMaintenanceDate:
      pump.last_maintenance_date
        ? String(pump.last_maintenance_date).slice(0, 10)
        : "",

    nextMaintenanceDate:
      pump.next_maintenance_date
        ? String(pump.next_maintenance_date).slice(0, 10)
        : "",

    // Fuel ID is needed when editing
    fuelId: pump.fuel_id,
  };
};

// =========================================================
// MODAL COMPONENT
// =========================================================
function Modal({
  title,
  onClose,
  children,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full ${
          wide ? "max-w-2xl" : "max-w-md"
        } max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl`}
      >
        {/* Modal Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

// =========================================================
// EMPTY PUMP FORM
// =========================================================
const EMPTY_PUMP_FORM = {
  pumpNumber: "",
  fuelId: "",
  status: "available",
  model: "",
  serialNumber: "",
  installationDate: "",
  lastMaintenanceDate: "",
  nextMaintenanceDate: "",
  meterReading: "",
};

// =========================================================
// MAIN FUEL PUMPS COMPONENT
// =========================================================
export default function FuelPumps() {
  // =========================================================
  // PUMP DATA
  // =========================================================
  const [pumps, setPumps] = useState([]);

  // Loading state for initial pump loading.
  const [loading, setLoading] = useState(true);

  // General error message.
  const [error, setError] = useState("");

  // =========================================================
  // FUEL TYPES
  // =========================================================
  // These values come from /api/fuel-types.
  // Used by Add/Edit Pump Fuel Type dropdown.
  // =========================================================
  const [fuelTypes, setFuelTypes] = useState([]);

  // =========================================================
  // ADD / EDIT PUMP FORM
  // =========================================================
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Selected pump for editing.
  const [editPump, setEditPump] = useState(null);

  // Shared form for Add and Edit.
  const [pumpForm, setPumpForm] = useState(
    EMPTY_PUMP_FORM
  );

  // Saving state for Add Pump.
  const [saving, setSaving] = useState(false);

  // =========================================================
  // VIEW PUMP
  // =========================================================
  const [viewPump, setViewPump] = useState(null);

  // =========================================================
  // DELETE PUMP
  // =========================================================
  const [deletePump, setDeletePump] = useState(null);

  // Loading state for Delete / Update actions.
  const [actionLoading, setActionLoading] =
    useState(false);

  // =========================================================
  // CALIBRATION MODAL
  // =========================================================
  const [isCalibrateOpen, setIsCalibrateOpen] =
    useState(false);

  const [selectedForCal, setSelectedForCal] =
    useState([]);

  const [calDone, setCalDone] = useState(false);

  // =========================================================
  // LOG MODAL
  // =========================================================
  const [logPump, setLogPump] = useState(null);

  // =========================================================
  // LOAD FUEL PUMPS
  // =========================================================
  const loadPumps = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getFuelPumps();

      // Make sure the API returned an array.
      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid fuel pump data received from API."
        );
      }

      // Convert backend objects into existing UI structure.
      const mappedPumps = data.map(
        mapApiPumpToUi
      );

      setPumps(mappedPumps);
    } catch (err) {
      console.error(
        "Failed to load fuel pumps:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load fuel pumps."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD FUEL TYPES
  // =========================================================
  const loadFuelTypes = async () => {
    try {
      const data = await getFuelTypes();

      // Make sure API returned an array.
      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid fuel type data received from API."
        );
      }

      setFuelTypes(data);
    } catch (err) {
      console.error(
        "Failed to load fuel types:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load fuel types."
      );
    }
  };

  // =========================================================
  // LOAD ALL REQUIRED DATA WHEN COMPONENT MOUNTS
  // =========================================================
  useEffect(() => {
    loadPumps();
    loadFuelTypes();
  }, []);

  // =========================================================
  // OPEN ADD PUMP MODAL
  // =========================================================
  function openAddPump() {
    setError("");

    setEditPump(null);

    setPumpForm(EMPTY_PUMP_FORM);

    setIsAddOpen(true);
  }

  // =========================================================
  // OPEN EDIT PUMP
  // =========================================================
  function openEditPump(pump) {
    setError("");

    setIsAddOpen(false);

    setEditPump(pump);

    // Fill the same form with existing pump data.
    setPumpForm({
      pumpNumber: pump.id || "",

      fuelId:
        pump.fuelId !== undefined &&
        pump.fuelId !== null
          ? String(pump.fuelId)
          : "",

      status:
        pump.backendStatus || "available",

      model: pump.model || "",

      serialNumber:
        pump.serialNumber || "",

      installationDate:
        pump.installationDate || "",

      lastMaintenanceDate:
        pump.lastMaintenanceDate || "",

      nextMaintenanceDate:
        pump.nextMaintenanceDate || "",

      meterReading:
        pump.meter !== undefined &&
        pump.meter !== null
          ? String(pump.meter)
          : "",
    });

    setIsAddOpen(true);
  }

  // =========================================================
  // CLOSE ADD / EDIT MODAL
  // =========================================================
  function closePumpForm() {
    setIsAddOpen(false);

    setEditPump(null);

    setPumpForm(EMPTY_PUMP_FORM);
  }

  // =========================================================
  // CREATE NEW FUEL PUMP
  // =========================================================
  async function handleAddPump(e) {
    e.preventDefault();

    if (!pumpForm.pumpNumber.trim()) {
      setError("Pump Number is required.");
      return;
    }

    if (!pumpForm.fuelId) {
      setError("Please select a Fuel Type.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // -----------------------------------------------------
      // Prepare data for Laravel API.
      // -----------------------------------------------------
      const payload = {
        pump_number:
          pumpForm.pumpNumber.trim(),

        fuel_id:
          Number(pumpForm.fuelId),

        status:
          pumpForm.status,

        model:
          pumpForm.model.trim() || null,

        serial_number:
          pumpForm.serialNumber.trim() || null,

        installation_date:
          pumpForm.installationDate || null,

        last_maintenance_date:
          pumpForm.lastMaintenanceDate || null,

        next_maintenance_date:
          pumpForm.nextMaintenanceDate || null,

        meter_reading:
          pumpForm.meterReading !== ""
            ? Number(pumpForm.meterReading)
            : 0,
      };

      // -----------------------------------------------------
      // Send POST request to Laravel.
      // -----------------------------------------------------
      await createFuelPump(payload);

      // -----------------------------------------------------
      // Reload database data after successful creation.
      // -----------------------------------------------------
      await loadPumps();

      // Close modal and reset form.
      closePumpForm();
    } catch (err) {
      console.error(
        "Failed to create fuel pump:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to create fuel pump."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // UPDATE EXISTING FUEL PUMP
  // =========================================================
  async function handleUpdatePump(e) {
    e.preventDefault();

    if (!editPump) {
      return;
    }

    if (!pumpForm.pumpNumber.trim()) {
      setError("Pump Number is required.");
      return;
    }

    if (!pumpForm.fuelId) {
      setError("Please select a Fuel Type.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      // -----------------------------------------------------
      // Prepare updated pump data.
      // -----------------------------------------------------
      const payload = {
        pump_number:
          pumpForm.pumpNumber.trim(),

        fuel_id:
          Number(pumpForm.fuelId),

        status:
          pumpForm.status,

        model:
          pumpForm.model.trim() || null,

        serial_number:
          pumpForm.serialNumber.trim() || null,

        installation_date:
          pumpForm.installationDate || null,

        last_maintenance_date:
          pumpForm.lastMaintenanceDate || null,

        next_maintenance_date:
          pumpForm.nextMaintenanceDate || null,

        meter_reading:
          pumpForm.meterReading !== ""
            ? Number(pumpForm.meterReading)
            : 0,
      };

      // -----------------------------------------------------
      // Send PUT request to Laravel.
      // -----------------------------------------------------
      await updateFuelPump(
        editPump.pumpId,
        payload
      );

      // -----------------------------------------------------
      // Reload latest database data.
      // -----------------------------------------------------
      await loadPumps();

      // Close modal.
      closePumpForm();
    } catch (err) {
      console.error(
        "Failed to update fuel pump:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to update fuel pump."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // =========================================================
  // DELETE FUEL PUMP
  // =========================================================
  async function handleDeletePump() {
    if (!deletePump) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      // -----------------------------------------------------
      // Delete selected pump from Laravel.
      // -----------------------------------------------------
      await deleteFuelPump(
        deletePump.pumpId
      );

      // -----------------------------------------------------
      // Reload pump list after deletion.
      // -----------------------------------------------------
      await loadPumps();

      // Close confirmation modal.
      setDeletePump(null);
    } catch (err) {
      console.error(
        "Failed to delete fuel pump:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to delete fuel pump."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // =========================================================
  // OPEN CALIBRATION MODAL
  // =========================================================
  function openCalibrate() {
    setSelectedForCal([]);

    setCalDone(false);

    setIsCalibrateOpen(true);
  }

  // =========================================================
  // SELECT / UNSELECT PUMP FOR CALIBRATION
  // =========================================================
  function toggleCalSelection(id) {
    setSelectedForCal((selected) =>
      selected.includes(id)
        ? selected.filter(
            (item) => item !== id
          )
        : [...selected, id]
    );
  }

  // =========================================================
  // CALIBRATION
  // =========================================================
  // IMPORTANT:
  // Calibration backend has not been implemented yet.
  //
  // Therefore this function only keeps the current UI
  // behavior and does NOT send fake data to Laravel.
  // =========================================================
  function handleRunCalibration() {
    if (selectedForCal.length === 0) {
      return;
    }

    setCalDone(true);
  }

  return (
    <div className="space-y-4 bg-gray-300 p-6">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="flex items-center justify-between">

        <h2 className="text-xl font-bold text-slate-700">
          Complete Fuel Management &amp; Inventory Dashboard
        </h2>

        <div className="flex gap-2">

          {/* Refresh */}
          <button
            type="button"
            onClick={loadPumps}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          {/* Add Pump */}
          <button
            type="button"
            onClick={openAddPump}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            <Plus size={15} />

            Add Pump
          </button>

          {/* Calibrate */}
          <button
            type="button"
            onClick={openCalibrate}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <SlidersHorizontal size={15} />

            Calibrate Pumps
          </button>

        </div>
      </div>

      {/* =====================================================
          ERROR MESSAGE
      ====================================================== */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-rose-600"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* =====================================================
          LOADING
      ====================================================== */}
      {loading ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">
          Loading fuel pumps...
        </div>
      ) : pumps.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">
          No fuel pumps found.
        </div>
      ) : (
        /* ===================================================
           PUMP CARDS
        ==================================================== */
        <div className="grid grid-cols-2 gap-4">

          {pumps.map((p) => (
            <Panel
              key={p.pumpId}
              className="!p-0 overflow-hidden"
            >

              {/* =================================================
                  COLORED HEADER
              ================================================== */}
              <div className="flex items-center justify-between bg-sky-200 px-4 py-3">

                <h3 className="text-xl font-extrabold text-slate-900">
                  {p.id} : {p.grade}
                </h3>

                <span
                  className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                    PUMP_STATUS_STYLES[p.status] ||
                    "bg-slate-400 text-white"
                  }`}
                >
                  {p.status}
                </span>

              </div>

              <div className="p-4">

                {/* =================================================
                    TOP ROW
                ================================================== */}
                <div
                  className={`grid gap-x-4 gap-y-1 text-xs ${
                    p.flowRate
                      ? "grid-cols-3"
                      : "grid-cols-2"
                  }`}
                >

                  {p.flowRate && (
                    <div>

                      <div className="text-black">
                        Status
                      </div>

                      <div className="font-medium text-black">
                        Flow Rate (L/min)
                      </div>

                      <div className="mt-1 text-2xl font-bold text-slate-900">
                        {p.flowRate}
                      </div>

                    </div>
                  )}

                  <div>

                    <div className="text-black">
                      Current
                    </div>

                    <div className="font-medium text-black">
                      Transaction Volume (L)
                    </div>

                    <div className="mt-1 text-2xl font-bold text-slate-900">
                      {p.txnVol}
                    </div>

                  </div>

                  <div>

                    <div className="font-medium text-black">
                      Current Price ($/L)
                    </div>

                    <div className="mt-1 text-2xl font-bold text-slate-900">
                      {p.price}
                    </div>

                  </div>

                </div>

                {/* =================================================
                    BOTTOM ROW
                ================================================== */}
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">

                  <div>

                    <div className="text-black">
                      Last Maintenance Date
                    </div>

                    <div className="mt-1 text-lg font-semibold text-slate-700">
                      {p.lastCal}
                    </div>

                  </div>

                  <div>

                    <div className="text-black">
                      {p.meterLabel}
                    </div>

                    <div className="mt-1 text-2xl font-bold text-slate-900">
                      {p.meter}
                    </div>

                  </div>

                </div>

                {/* =================================================
                    DETAILED LOG BUTTON
                ================================================== */}
                <button
                  type="button"
                  onClick={() =>
                    setLogPump(p)
                  }
                  className="mt-4 flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:underline"
                >
                  <FileText size={13} />

                  View Detailed
                  Logs/Maintenance
                </button>

                {/* =================================================
                    PUMP ACTIONS
                ================================================== */}
                <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3">

                  {/* View */}
                  <button
                    type="button"
                    onClick={() =>
                      setViewPump(p)
                    }
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-cyan-600"
                  >
                    <Eye size={14} />

                    View
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() =>
                      openEditPump(p)
                    }
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-amber-500"
                  >
                    <Pencil size={14} />

                    Edit
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() =>
                      setDeletePump(p)
                    }
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-500"
                  >
                    <Trash2 size={14} />

                    Delete
                  </button>

                </div>

              </div>
            </Panel>
          ))}

        </div>
      )}

      {/* =====================================================
          ADD / EDIT PUMP MODAL
      ====================================================== */}
      {isAddOpen && (
        <Modal
          title={
            editPump
              ? "Edit Pump"
              : "Add Pump"
          }
          onClose={closePumpForm}
          wide
        >
          <form
            onSubmit={
              editPump
                ? handleUpdatePump
                : handleAddPump
            }
            className="space-y-3 text-sm"
          >

            {/* =================================================
                PUMP NUMBER
            ================================================== */}
            <div>

              <label className="mb-1 block text-xs font-medium text-slate-500">
                Pump Number
              </label>

              <input
                required
                value={pumpForm.pumpNumber}
                onChange={(e) =>
                  setPumpForm({
                    ...pumpForm,
                    pumpNumber:
                      e.target.value,
                  })
                }
                placeholder="PUMP 5"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />

            </div>

            {/* =================================================
                FUEL TYPE
            ================================================== */}
            <div>

              <label className="mb-1 block text-xs font-medium text-slate-500">
                Fuel Type
              </label>

              <select
                required
                value={pumpForm.fuelId}
                onChange={(e) =>
                  setPumpForm({
                    ...pumpForm,
                    fuelId:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              >

                <option value="">
                  Select Fuel Type
                </option>

                {fuelTypes.map(
                  (fuel) => (
                    <option
                      key={
                        fuel.fuel_id
                      }
                      value={
                        fuel.fuel_id
                      }
                    >
                      {
                        fuel.fuel_name
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            {/* =================================================
                STATUS
            ================================================== */}
            <div>

              <label className="mb-1 block text-xs font-medium text-slate-500">
                Status
              </label>

              <select
                value={pumpForm.status}
                onChange={(e) =>
                  setPumpForm({
                    ...pumpForm,
                    status:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              >

                <option value="available">
                  Available
                </option>

                <option value="in_use">
                  In Use
                </option>

                <option value="under_maintenance">
                  Under Maintenance
                </option>

                <option value="out_of_service">
                  Out of Service
                </option>

              </select>

            </div>

            {/* =================================================
                MODEL
            ================================================== */}
            <div>

              <label className="mb-1 block text-xs font-medium text-slate-500">
                Model
              </label>

              <input
                value={pumpForm.model}
                onChange={(e) =>
                  setPumpForm({
                    ...pumpForm,
                    model:
                      e.target.value,
                  })
                }
                placeholder="Gilbarco"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />

            </div>

            {/* =================================================
                SERIAL NUMBER
            ================================================== */}
            <div>

              <label className="mb-1 block text-xs font-medium text-slate-500">
                Serial Number
              </label>

              <input
                value={
                  pumpForm.serialNumber
                }
                onChange={(e) =>
                  setPumpForm({
                    ...pumpForm,
                    serialNumber:
                      e.target.value,
                  })
                }
                placeholder="GP-2026-001"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />

            </div>

            {/* =================================================
                DATES
            ================================================== */}
            <div className="grid grid-cols-2 gap-2">

              {/* Installation */}
              <div>

                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Installation Date
                </label>

                <input
                  type="date"
                  value={
                    pumpForm.installationDate
                  }
                  onChange={(e) =>
                    setPumpForm({
                      ...pumpForm,
                      installationDate:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />

              </div>

              {/* Last Maintenance */}
              <div>

                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Last Maintenance
                </label>

                <input
                  type="date"
                  value={
                    pumpForm.lastMaintenanceDate
                  }
                  onChange={(e) =>
                    setPumpForm({
                      ...pumpForm,
                      lastMaintenanceDate:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />

              </div>

            </div>

            {/* =================================================
                NEXT MAINTENANCE
            ================================================== */}
            <div>

              <label className="mb-1 block text-xs font-medium text-slate-500">
                Next Maintenance
              </label>

              <input
                type="date"
                value={
                  pumpForm.nextMaintenanceDate
                }
                onChange={(e) =>
                  setPumpForm({
                    ...pumpForm,
                    nextMaintenanceDate:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />

            </div>

            {/* =================================================
                METER READING
            ================================================== */}
            <div>

              <label className="mb-1 block text-xs font-medium text-slate-500">
                Initial Meter Reading (L)
              </label>

              <input
                type="number"
                min="0"
                step="0.001"
                value={
                  pumpForm.meterReading
                }
                onChange={(e) =>
                  setPumpForm({
                    ...pumpForm,
                    meterReading:
                      e.target.value,
                  })
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />

            </div>

            {/* =================================================
                FORM BUTTONS
            ================================================== */}
            <div className="flex justify-end gap-2 pt-2">

              {/* Cancel */}
              <button
                type="button"
                onClick={
                  closePumpForm
                }
                disabled={
                  saving ||
                  actionLoading
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              {/* Save */}
              <button
                type="submit"
                disabled={
                  saving ||
                  actionLoading
                }
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ||
                actionLoading
                  ? "Saving..."
                  : editPump
                  ? "Save Changes"
                  : "Add Pump"}
              </button>

            </div>

          </form>
        </Modal>
      )}

      {/* =====================================================
          VIEW PUMP DETAILS MODAL
      ====================================================== */}
      {viewPump && (
        <Modal
          wide
          title={`${viewPump.id} — Pump Details`}
          onClose={() =>
            setViewPump(null)
          }
        >

          <div className="grid grid-cols-2 gap-4 text-sm">

            {/* Pump Number */}
            <div>
              <div className="text-xs text-slate-400">
                Pump Number
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.id}
              </div>
            </div>

            {/* Fuel Type */}
            <div>
              <div className="text-xs text-slate-400">
                Fuel Type
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.grade}
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="text-xs text-slate-400">
                Status
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.status}
              </div>
            </div>

            {/* Backend Status */}
            <div>
              <div className="text-xs text-slate-400">
                Database Status
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.backendStatus}
              </div>
            </div>

            {/* Model */}
            <div>
              <div className="text-xs text-slate-400">
                Model
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.model ||
                  "—"}
              </div>
            </div>

            {/* Serial */}
            <div>
              <div className="text-xs text-slate-400">
                Serial Number
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.serialNumber ||
                  "—"}
              </div>
            </div>

            {/* Meter */}
            <div>
              <div className="text-xs text-slate-400">
                Meter Reading
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.meter} L
              </div>
            </div>

            {/* Installation */}
            <div>
              <div className="text-xs text-slate-400">
                Installation Date
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.installationDate ||
                  "—"}
              </div>
            </div>

            {/* Last Maintenance */}
            <div>
              <div className="text-xs text-slate-400">
                Last Maintenance
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.lastMaintenanceDate ||
                  "—"}
              </div>
            </div>

            {/* Next Maintenance */}
            <div>
              <div className="text-xs text-slate-400">
                Next Maintenance
              </div>

              <div className="font-semibold text-slate-700">
                {viewPump.nextMaintenanceDate ||
                  "—"}
              </div>
            </div>

          </div>

          {/* Close */}
          <div className="mt-5 flex justify-end">

            <button
              type="button"
              onClick={() =>
                setViewPump(null)
              }
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Close
            </button>

          </div>

        </Modal>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ====================================================== */}
      {deletePump && (
        <Modal
          title="Delete Pump"
          onClose={() =>
            setDeletePump(null)
          }
        >

          <div className="text-sm text-slate-600">

            <p>
              Are you sure you want to delete
              <span className="font-bold text-slate-800">
                {" "}
                {deletePump.id}
              </span>
              ?
            </p>

            <p className="mt-2 text-xs text-rose-500">
              This action cannot be undone.
            </p>

          </div>

          <div className="mt-5 flex justify-end gap-2">

            {/* Cancel */}
            <button
              type="button"
              onClick={() =>
                setDeletePump(null)
              }
              disabled={actionLoading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={
                handleDeletePump
              }
              disabled={actionLoading}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {actionLoading
                ? "Deleting..."
                : "Delete"}
            </button>

          </div>

        </Modal>
      )}

      {/* =====================================================
          CALIBRATE PUMPS MODAL
      ====================================================== */}
      {isCalibrateOpen && (
        <Modal
          title="Calibrate Pumps"
          onClose={() =>
            setIsCalibrateOpen(false)
          }
        >

          {calDone ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">

              <CheckCircle2
                size={36}
                className="text-emerald-500"
              />

              <p className="text-sm font-medium text-slate-700">
                Selected{" "}
                {selectedForCal.length}{" "}
                pump
                {selectedForCal.length === 1
                  ? ""
                  : "s"}
                .
              </p>

              <p className="text-xs text-slate-400">
                Calibration API will be
                connected when the
                calibration backend is
                implemented.
              </p>

              <button
                type="button"
                onClick={() =>
                  setIsCalibrateOpen(
                    false
                  )
                }
                className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Close
              </button>

            </div>
          ) : (
            <div>

              <p className="mb-3 text-sm text-slate-600">
                Select the pumps to
                calibrate.
              </p>

              <div className="space-y-2">

                {pumps.map((p) => (
                  <label
                    key={p.pumpId}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      selectedForCal.includes(
                        p.pumpId
                      )
                        ? "border-cyan-400 bg-cyan-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >

                    <span className="flex items-center gap-2">

                      <input
                        type="checkbox"
                        checked={selectedForCal.includes(
                          p.pumpId
                        )}
                        onChange={() =>
                          toggleCalSelection(
                            p.pumpId
                          )
                        }
                      />

                      <span className="font-medium text-slate-700">
                        {p.id} :{" "}
                        {p.grade}
                      </span>

                    </span>

                    <span className="text-xs text-slate-400">
                      Last:{" "}
                      {p.lastCal}
                    </span>

                  </label>
                ))}

              </div>

              <div className="mt-4 flex justify-end gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setIsCalibrateOpen(
                      false
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleRunCalibration
                  }
                  disabled={
                    selectedForCal.length ===
                    0
                  }
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Run Calibration
                </button>

              </div>

            </div>
          )}

        </Modal>
      )}

      {/* =====================================================
          DETAILED LOGS MODAL
      ====================================================== */}
      {logPump && (
        <Modal
          wide
          title={`${logPump.id} — Logs & Maintenance`}
          onClose={() =>
            setLogPump(null)
          }
        >

          {/* Pump Summary */}
          <div className="mb-3 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-xs">

            <div>
              <div className="text-slate-400">
                Grade
              </div>

              <div className="font-semibold text-slate-700">
                {logPump.grade}
              </div>
            </div>

            <div>
              <div className="text-slate-400">
                Status
              </div>

              <div className="font-semibold text-slate-700">
                {logPump.status}
              </div>
            </div>

            <div>
              <div className="text-slate-400">
                Last Maintenance
              </div>

              <div className="font-semibold text-slate-700">
                {logPump.lastCal}
              </div>
            </div>

          </div>

          {/* Logs Table */}
          <div className="overflow-hidden rounded-lg border border-slate-100">

            <table className="w-full text-left text-xs">

              <thead>

                <tr className="bg-sky-100 text-slate-700">

                  <th className="px-3 py-2 font-semibold">
                    Date
                  </th>

                  <th className="px-3 py-2 font-semibold">
                    Type
                  </th>

                  <th className="px-3 py-2 font-semibold">
                    Note
                  </th>

                  <th className="px-3 py-2 font-semibold">
                    Performed By
                  </th>

                </tr>

              </thead>

              <tbody>

                {(PUMP_LOGS[
                  logPump.id
                ] ?? []).map(
                  (log, i) => (
                    <tr
                      key={i}
                      className={
                        i % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50"
                      }
                    >

                      <td className="px-3 py-2 text-slate-500">
                        {log.date}
                      </td>

                      <td className="px-3 py-2">

                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            LOG_TYPE_STYLES[
                              log.type
                            ] ??
                            "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {log.type}
                        </span>

                      </td>

                      <td className="px-3 py-2 text-slate-600">
                        {log.note}
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {log.by}
                      </td>

                    </tr>
                  )
                )}

                {(PUMP_LOGS[
                  logPump.id
                ] ?? []).length ===
                  0 && (
                  <tr>

                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-slate-400"
                    >
                      No log entries for
                      this pump yet.
                    </td>

                  </tr>
                )}

              </tbody>

            </table>

          </div>

          {/* Close */}
          <div className="mt-4 flex justify-end">

            <button
              type="button"
              onClick={() =>
                setLogPump(null)
              }
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Close
            </button>

          </div>

        </Modal>
      )}

    </div>
  );
}