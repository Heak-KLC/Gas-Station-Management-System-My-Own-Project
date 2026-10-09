import React, { useEffect, useState } from "react";
import {
  Wrench,
  CalendarPlus,
  Settings2,
  Search,
  X,
  Eye,     // បន្ថែម Icon សម្រាប់ View
  Trash2,  // បន្ថែម Icon សម្រាប់ Delete
} from "lucide-react";

import { Panel, StatusBadge, StatCard } from "../components/ui";

import {
  getEquipmentMaintenance,
  createEquipmentMaintenance,
  updateEquipmentMaintenance,
  deleteEquipmentMaintenance, // បន្ថែម API សម្រាប់លុប
} from "../api/equipmentMaintenanceApi";

// --------------------------------------------------
// Equipment Maintenance Management
// This component uses records from the Laravel API.
// --------------------------------------------------

const equipmentTypes = [
  { value: "pump", label: "Fuel Pump" },
  { value: "tank", label: "Fuel Tank" },
  { value: "dispenser", label: "Fuel Dispenser" },
  { value: "security_system", label: "Security System" },
  { value: "generator", label: "Generator" },
  { value: "other", label: "Other Equipment" },
];

const maintenanceTypes = [
  { value: "routine", label: "Routine Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "emergency", label: "Emergency" },
];

const statusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Convert database enum values into readable labels.
const getEquipmentTypeLabel = (value) => {
  return equipmentTypes.find((item) => item.value === value)?.label || value;
};

const getMaintenanceTypeLabel = (value) => {
  return maintenanceTypes.find((item) => item.value === value)?.label || value;
};

const getStatusLabel = (value) => {
  return statusOptions.find((item) => item.value === value)?.label || value;
};

// Display dates as DD/MM/YYYY.
const formatDate = (value) => {
  if (!value) return "-";

  // Laravel may return a date string or an ISO date-time.
  const datePart = String(value).slice(0, 10);
  const parts = datePart.split("-");

  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Use the database date format for HTML date inputs.
const toInputDate = (value) => {
  if (!value) return "";

  return String(value).slice(0, 10);
};

// Format the database record into a readable equipment name.
const getEquipmentName = (record) => {
  const type = getEquipmentTypeLabel(record.equipment_type);

  return `${type} #${record.equipment_id}`;
};

// Extract employee information returned by the Laravel relationship.
const getTechnician = (record) => {
  if (!record.performedBy) {
    return record.performed_by
      ? `Employee #${record.performed_by}`
      : "Unassigned";
  }

  return (
    record.performedBy.full_name ||
    record.performedBy.name ||
    `Employee #${record.performed_by}`
  );
};

// Display cost consistently.
const formatCost = (value) => {
  return `$${Number(value || 0).toFixed(2)}`;
};

// Initial values for the Add Maintenance form.
const emptyMaintenanceForm = {
  equipment_type: "pump",
  equipment_id: "",
  maintenance_type: "repair",
  description: "",
  scheduled_date: "",
  performed_date: "",
  performed_by: "",
  cost: "",
  status: "scheduled",
  notes: "",
};

export default function EquipmentMaintenance() {
  // Store actual maintenance records returned by Laravel.
  const [logs, setLogs] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");

  // Modal control: add, schedule, settings, or edit.
  const [modalType, setModalType] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // Form states.
  const [newLog, setNewLog] = useState({ ...emptyMaintenanceForm });

  const [scheduleForm, setScheduleForm] = useState({
    logId: "",
    scheduledDate: "",
  });

  // Settings remain local because there is no settings API
  // in the EquipmentMaintenanceController provided.
  const [settingsForm, setSettingsForm] = useState({
    autoAlertDays: "7",
    budgetLimit: "500.00",
  });

  // Loading, saving, and error messages.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // --------------------------------------------------
  // Load maintenance records from the Laravel API.
  // Runs once when this page is first opened.
  // --------------------------------------------------
  const loadMaintenanceLogs = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getEquipmentMaintenance();

      // Controller returns { success: true, data: [...] }.
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load maintenance records:", error);

      setErrorMessage(
        error.response?.data?.message ||
          "Unable to load maintenance records. Please check the API connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenanceLogs();
  }, []);

  // Read Laravel validation errors, if any.
  const getApiError = (error) => {
    const validationErrors = error.response?.data?.errors;

    if (validationErrors) {
      const firstField = Object.keys(validationErrors)[0];

      if (firstField && validationErrors[firstField]?.[0]) {
        return validationErrors[firstField][0];
      }
    }

    return (
      error.response?.data?.message ||
      "The operation failed. Please try again."
    );
  };

  // --------------------------------------------------
  // ADD: Create a maintenance record in MySQL.
  // --------------------------------------------------
  const handleAddLog = async (e) => {
    e.preventDefault();

    if (!newLog.equipment_id || !newLog.scheduled_date) {
      setErrorMessage("Please enter the Equipment ID and Scheduled Date.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      // Send only fields accepted by the Laravel controller.
      const payload = {
        equipment_type: newLog.equipment_type,
        equipment_id: Number(newLog.equipment_id),
        maintenance_type: newLog.maintenance_type,
        description: newLog.description || null,
        scheduled_date: newLog.scheduled_date,
        performed_date: newLog.performed_date || null,
        performed_by: newLog.performed_by
          ? Number(newLog.performed_by)
          : null,
        cost: newLog.cost === "" ? null : Number(newLog.cost),
        status: newLog.status,
        notes: newLog.notes || null,
      };

      await createEquipmentMaintenance(payload);

      // Reload records so the table displays the database values.
      await loadMaintenanceLogs();

      setNewLog({ ...emptyMaintenanceForm });
      setModalType(null);
      setSuccessMessage("Maintenance record created successfully.");
    } catch (error) {
      console.error("Failed to create maintenance record:", error);
      setErrorMessage(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // SCHEDULE: Update the scheduled date of an existing log.
  // --------------------------------------------------
  const handleCreateSchedule = async (e) => {
    e.preventDefault();

    if (!scheduleForm.logId || !scheduleForm.scheduledDate) {
      setErrorMessage("Please select a maintenance log and date.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const record = logs.find(
        (item) => String(item.maintenance_id) === String(scheduleForm.logId)
      );

      if (!record) {
        setErrorMessage("The selected maintenance record could not be found.");
        return;
      }

      await updateEquipmentMaintenance(record.maintenance_id, {
        scheduled_date: scheduleForm.scheduledDate,
      });

      await loadMaintenanceLogs();

      setScheduleForm({ logId: "", scheduledDate: "" });
      setModalType(null);
      setSuccessMessage("Maintenance schedule updated successfully.");
    } catch (error) {
      console.error("Failed to update schedule:", error);
      setErrorMessage(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // EDIT: Update an existing maintenance record.
  // --------------------------------------------------
  const handleUpdateLog = async (e) => {
    e.preventDefault();

    if (!selectedLog) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      // When a record is marked completed and has no performed date,
      // automatically use today's date.
      const performedDate =
        selectedLog.status === "completed"
          ? selectedLog.performed_date ||
            new Date().toISOString().slice(0, 10)
          : selectedLog.performed_date || null;

      const payload = {
        equipment_type: selectedLog.equipment_type,
        equipment_id: Number(selectedLog.equipment_id),
        maintenance_type: selectedLog.maintenance_type,
        description: selectedLog.description || null,
        scheduled_date: toInputDate(selectedLog.scheduled_date),
        performed_date: performedDate,
        performed_by: selectedLog.performed_by
          ? Number(selectedLog.performed_by)
          : null,
        cost:
          selectedLog.cost === "" || selectedLog.cost == null
            ? null
            : Number(selectedLog.cost),
        status: selectedLog.status,
        notes: selectedLog.notes || null,
      };

      await updateEquipmentMaintenance(
        selectedLog.maintenance_id,
        payload
      );

      await loadMaintenanceLogs();

      setSelectedLog(null);
      setModalType(null);
      setSuccessMessage("Maintenance record updated successfully.");
    } catch (error) {
      console.error("Failed to update maintenance record:", error);
      setErrorMessage(getApiError(error));
    } finally {
      setSaving(false);
    }
  };



  // --------------------------------------------------
  // DELETE: Remove a maintenance record from MySQL.
  // Ask for confirmation before calling the Laravel API.
  // --------------------------------------------------
  const handleDeleteLog = async (record) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Maintenance #${record.maintenance_id}?`
    );

    // Stop if the user cancels the confirmation.
    if (!confirmed) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      // Delete the record through the Laravel API.
      await deleteEquipmentMaintenance(record.maintenance_id);

      // Remove the deleted record from the current table.
      setLogs((previousLogs) =>
        previousLogs.filter(
          (item) => item.maintenance_id !== record.maintenance_id
        )
      );

      // Close the View modal if it displays the deleted record.
      if (
        selectedLog?.maintenance_id === record.maintenance_id
      ) {
        setSelectedLog(null);
        setModalType(null);
      }

      setSuccessMessage(
        `Maintenance #${record.maintenance_id} deleted successfully.`
      );
    } catch (error) {
      console.error("Failed to delete maintenance record:", error);
      setErrorMessage(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // SEARCH: Filter the records displayed in the table.
  // --------------------------------------------------
  const filteredLogs = logs.filter((record) => {
    const query = searchQuery.toLowerCase();

    return (
      String(record.maintenance_id).includes(query) ||
      getEquipmentName(record).toLowerCase().includes(query) ||
      getEquipmentTypeLabel(record.equipment_type)
        .toLowerCase()
        .includes(query) ||
      String(record.description || "").toLowerCase().includes(query) ||
      getTechnician(record).toLowerCase().includes(query) ||
      getStatusLabel(record.status).toLowerCase().includes(query)
    );
  });

  // Calculate dashboard statistics from actual database records.
  const completedCount = logs.filter(
    (record) => record.status === "completed"
  ).length;

  const inProgressCount = logs.filter(
    (record) => record.status === "in_progress"
  ).length;

  const scheduledCount = logs.filter(
    (record) => record.status === "scheduled"
  ).length;

  return (
    <div className="space-y-4 p-6 bg-gray-300 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black">
            Equipment Maintenance Management
          </h2>
          <p className="text-sm text-black">
            Monitor equipment health, repairs, and service logs
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setErrorMessage("");
              setModalType("add");
            }}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-base font-medium text-white hover:bg-cyan-600 shadow-sm transition"
          >
            <Wrench size={15} /> Add New Maintenance
          </button>

          <button
            onClick={() => {
              setErrorMessage("");
              setModalType("schedule");
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition"
          >
            <CalendarPlus size={15} /> Create Schedule
          </button>

          <button
            onClick={() => setModalType("settings")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-base font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition"
          >
            <Settings2 size={15} /> Settings
          </button>
        </div>
      </div>

      {/* API success/error messages */}
      {errorMessage && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
          <button
            onClick={() => setErrorMessage("")}
            className="float-right font-semibold"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
          <button
            onClick={() => setSuccessMessage("")}
            className="float-right font-semibold"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Maintenance Logs"
          value={String(logs.length)}
          delta={`${scheduledCount} Scheduled`}
          deltaTone="neutral"
        />

        <StatCard
          label="Completed Maintenance"
          value={String(completedCount)}
          delta="Completed Records"
          deltaTone="up"
        />

        <StatCard
          label="Maintenance In Progress"
          value={String(inProgressCount)}
          delta="Units In Service"
          deltaTone="down"
        />

        <StatCard
          label="Scheduled for Maintenance"
          value={String(scheduledCount)}
          delta="Scheduled Records"
          deltaTone="neutral"
        />
      </div>

      {/* Table Panel */}
      <Panel>
        <div className="relative mb-3.5 w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
          />

          <input
            type="text"
            placeholder="Search Equipment, ID, Issue, Tech..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-400 py-1.5 pl-8 pr-3 text-base outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-400 bg-slate-50/70 text-black text-base">
                <th className="px-3.5 py-2.5 font-semibold">Log ID</th>
                <th className="px-3.5 py-2.5 font-semibold">
                  Equipment Name/No.
                </th>
                <th className="px-3.5 py-2.5 font-semibold">
                  Equipment Type
                </th>
                <th className="px-3.5 py-2.5 font-semibold">
                  Issue Description
                </th>
                <th className="px-3.5 py-2.5 font-semibold">
                  Reported Date
                </th>
                <th className="px-3.5 py-2.5 font-semibold">
                  Scheduled Date
                </th>
                <th className="px-3.5 py-2.5 font-semibold">
                  Technician/Assigned
                </th>
                <th className="px-3.5 py-2.5 font-semibold">Cost ($)</th>
                <th className="px-3.5 py-2.5 font-semibold">Status</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-6 text-slate-500"
                  >
                    Loading maintenance records...
                  </td>
                </tr>
              ) : (
                filteredLogs.map((record) => (
                  <tr
                    key={record.maintenance_id}
                    className="hover:bg-slate-50/60 transition text-sm"
                  >
                    <td className="px-3.5 py-2.5 font-medium text-slate-700 font-mono">
                      {record.maintenance_id}
                    </td>

                    <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                      {getEquipmentName(record)}
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-800">
                      {getEquipmentTypeLabel(record.equipment_type)}
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-800">
                      {record.description || "-"}
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-800">
                      {formatDate(record.created_at)}
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-800">
                      {formatDate(record.scheduled_date)}
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-600 font-medium">
                      {getTechnician(record)}
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-700 font-semibold">
                      {formatCost(record.cost)}
                    </td>

                    <td className="px-3.5 py-2.5">
                      <StatusBadge
                        status={
                          record.status === "completed"
                            ? "Active"
                            : record.status === "cancelled"
                              ? "Inactive"
                              : "Check Status"
                        }
                      />
                      <span className="sr-only">
                        {getStatusLabel(record.status)}
                      </span>
                    </td>

                    
<td className="px-3.5 py-2.5">
  <div className="flex items-center justify-end gap-3">

    {/* VIEW: Open the details modal */}
    <button
      type="button"
      title="View Details"
      onClick={() => {
        setSelectedLog(record);
        setErrorMessage("");
        setModalType("view");
      }}
      className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition"
    >
      <Eye size={15} />
      
    </button>

    {/* EDIT: Keep the existing edit functionality */}
    <button
      type="button"
      title="Edit Maintenance"
      onClick={() => {
        // Copy the selected database record into the edit form.
        setSelectedLog({
          ...record,
          equipment_id: String(record.equipment_id),
          scheduled_date: toInputDate(record.scheduled_date),
          performed_date: toInputDate(record.performed_date),
          performed_by: record.performed_by
            ? String(record.performed_by)
            : "",
          cost:
            record.cost == null
              ? ""
              : String(record.cost),
        });

        setErrorMessage("");
        setModalType("edit");
      }}
      className="inline-flex items-center gap-1 font-semibold text-cyan-600 hover:text-cyan-700 transition"
    >
      <Settings2 size={15} />
      
    </button>

    {/* DELETE: Delete the selected maintenance record */}
    <button
      type="button"
      title="Delete Maintenance"
      disabled={saving}
      onClick={() => handleDeleteLog(record)}
      className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 transition"
    >
      <Trash2 size={15} />
      
    </button>

  </div>
</td>
                  </tr>
                ))
              )}

              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-6 text-slate-400"
                  >
                    No equipment maintenance logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ================================================
          MODAL 1: ADD NEW MAINTENANCE
      ================================================= */}
      {modalType === "add" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Add New Maintenance Log
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLog} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Equipment Type *
                </label>

                <select
                  required
                  value={newLog.equipment_type}
                  onChange={(e) =>
                    setNewLog({
                      ...newLog,
                      equipment_type: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  {equipmentTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Equipment ID *
                </label>

                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Enter equipment database ID"
                  value={newLog.equipment_id}
                  onChange={(e) =>
                    setNewLog({
                      ...newLog,
                      equipment_id: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />

                <p className="mt-1 text-slate-500">
                  Enter the ID of the selected equipment type.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Maintenance Type *
                </label>

                <select
                  required
                  value={newLog.maintenance_type}
                  onChange={(e) =>
                    setNewLog({
                      ...newLog,
                      maintenance_type: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  {maintenanceTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Scheduled Date *
                </label>

                <input
                  type="date"
                  required
                  value={newLog.scheduled_date}
                  onChange={(e) =>
                    setNewLog({
                      ...newLog,
                      scheduled_date: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Estimated Cost ($)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="120.00"
                    value={newLog.cost}
                    onChange={(e) =>
                      setNewLog({ ...newLog, cost: e.target.value })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Employee ID
                  </label>

                  <input
                    type="number"
                    min="1"
                    placeholder="Optional"
                    value={newLog.performed_by}
                    onChange={(e) =>
                      setNewLog({
                        ...newLog,
                        performed_by: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Issue / Service Description *
                </label>

                <textarea
                  required
                  rows={2}
                  placeholder="Describe the issue or maintenance service..."
                  value={newLog.description}
                  onChange={(e) =>
                    setNewLog({ ...newLog, description: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Notes
                </label>

                <textarea
                  rows={2}
                  value={newLog.notes}
                  onChange={(e) =>
                    setNewLog({ ...newLog, notes: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================
          MODAL 2: CREATE / UPDATE SCHEDULE
      ================================================= */}
      {modalType === "schedule" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Schedule Service / Inspection
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateSchedule}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Select Maintenance Log *
                </label>

                <select
                  required
                  value={scheduleForm.logId}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      logId: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="">-- Select Log --</option>

                  {logs.map((record) => (
                    <option
                      key={record.maintenance_id}
                      value={record.maintenance_id}
                    >
                      #{record.maintenance_id} - {getEquipmentName(record)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Scheduled Date *
                </label>

                <input
                  type="date"
                  required
                  value={scheduleForm.scheduledDate}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      scheduledDate: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================
          MODAL 3: SETTINGS
          These values are still local-only.
      ================================================= */}
      {modalType === "settings" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Maintenance Rules Settings
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Routine Maintenance Alert (Days)
                </label>

                <input
                  type="number"
                  min="1"
                  value={settingsForm.autoAlertDays}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      autoAlertDays: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Cost Approval Limit ($)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settingsForm.budgetLimit}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      budgetLimit: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setModalType(null);
                setSuccessMessage(
                  "Settings updated in this page only. They are not saved to the database yet."
                );
              }}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* ================================================
          MODAL 4: EDIT MAINTENANCE
      ================================================= */}
      {modalType === "edit" && selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Edit Maintenance #{selectedLog.maintenance_id}
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateLog} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Equipment Type *
                </label>

                <select
                  required
                  value={selectedLog.equipment_type}
                  onChange={(e) =>
                    setSelectedLog({
                      ...selectedLog,
                      equipment_type: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  {equipmentTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Equipment ID *
                </label>

                <input
                  type="number"
                  min="1"
                  required
                  value={selectedLog.equipment_id}
                  onChange={(e) =>
                    setSelectedLog({
                      ...selectedLog,
                      equipment_id: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Maintenance Type *
                </label>

                <select
                  required
                  value={selectedLog.maintenance_type}
                  onChange={(e) =>
                    setSelectedLog({
                      ...selectedLog,
                      maintenance_type: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  {maintenanceTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Scheduled Date *
                </label>

                <input
                  type="date"
                  required
                  value={selectedLog.scheduled_date}
                  onChange={(e) =>
                    setSelectedLog({
                      ...selectedLog,
                      scheduled_date: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Performed Date
                </label>

                <input
                  type="date"
                  value={selectedLog.performed_date}
                  onChange={(e) =>
                    setSelectedLog({
                      ...selectedLog,
                      performed_date: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Issue / Service Description *
                </label>

                <textarea
                  required
                  rows={2}
                  value={selectedLog.description || ""}
                  onChange={(e) =>
                    setSelectedLog({
                      ...selectedLog,
                      description: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Employee ID
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={selectedLog.performed_by || ""}
                    onChange={(e) =>
                      setSelectedLog({
                        ...selectedLog,
                        performed_by: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Cost ($)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedLog.cost}
                    onChange={(e) =>
                      setSelectedLog({
                        ...selectedLog,
                        cost: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Status *
                </label>

                <select
                  required
                  value={selectedLog.status}
                  onChange={(e) =>
                    setSelectedLog({
                      ...selectedLog,
                      status: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  {statusOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Notes
                </label>

                <textarea
                  rows={2}
                  value={selectedLog.notes || ""}
                  onChange={(e) =>
                    setSelectedLog({
                      ...selectedLog,
                      notes: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


{/* ================================================
    MODAL: VIEW MAINTENANCE DETAILS
================================================= */}
{modalType === "view" && selectedLog && (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">

      {/* Modal heading */}
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base">
            Maintenance Details
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Record #{selectedLog.maintenance_id}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalType(null);
            setSelectedLog(null);
          }}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Display the selected record's database values */}
      <div className="grid grid-cols-2 gap-4 text-sm">

        <div>
          <p className="text-slate-500 text-xs">Equipment Type</p>
          <p className="font-semibold text-slate-800 mt-1">
            {getEquipmentTypeLabel(selectedLog.equipment_type)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Equipment ID</p>
          <p className="font-semibold text-slate-800 mt-1">
            {selectedLog.equipment_id}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Maintenance Type</p>
          <p className="font-semibold text-slate-800 mt-1">
            {getMaintenanceTypeLabel(selectedLog.maintenance_type)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Status</p>
          <p className="font-semibold text-slate-800 mt-1">
            {getStatusLabel(selectedLog.status)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Reported Date</p>
          <p className="font-semibold text-slate-800 mt-1">
            {formatDate(selectedLog.created_at)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Scheduled Date</p>
          <p className="font-semibold text-slate-800 mt-1">
            {formatDate(selectedLog.scheduled_date)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Performed Date</p>
          <p className="font-semibold text-slate-800 mt-1">
            {formatDate(selectedLog.performed_date)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Technician</p>
          <p className="font-semibold text-slate-800 mt-1">
            {getTechnician(selectedLog)}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-500 text-xs">Cost</p>
          <p className="font-semibold text-slate-800 mt-1">
            {formatCost(selectedLog.cost)}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-500 text-xs">Description</p>
          <p className="text-slate-800 mt-1 whitespace-pre-wrap break-words">
            {selectedLog.description || "-"}
          </p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-500 text-xs">Notes</p>
          <p className="text-slate-800 mt-1 whitespace-pre-wrap break-words">
            {selectedLog.notes || "-"}
          </p>
        </div>
      </div>

      {/* Modal actions */}
      <div className="flex justify-end gap-2 border-t pt-3">
        <button
          type="button"
          onClick={() => {
            setSelectedLog({
              ...selectedLog,
              equipment_id: String(selectedLog.equipment_id),
              scheduled_date: toInputDate(selectedLog.scheduled_date),
              performed_date: toInputDate(selectedLog.performed_date),
              performed_by: selectedLog.performed_by
                ? String(selectedLog.performed_by)
                : "",
              cost:
                selectedLog.cost == null
                  ? ""
                  : String(selectedLog.cost),
            });
            setModalType("edit");
          }}
          className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600"
        >
          Edit Record
        </button>

        <button
          type="button"
          onClick={() => {
            setModalType(null);
            setSelectedLog(null);
          }}
          className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
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