import React, { useState } from "react";
import { Wrench, CalendarPlus, Settings2, Search, X, Eye, Pencil } from "lucide-react";
import { Panel, StatusBadge, StatCard } from "../components/ui";

const initialLogs = [
  { id: "LGT-2101", name: "Pump #02 (Super)", type: "Fuel Dispenser", issue: "Fuel leak detected", reported: "15/07/2021", scheduled: "16/07/2021", tech: "Sok Piseth", cost: "$130.00", status: "In Progress" },
  { id: "LGT-2102", name: "Generator A", type: "Power/Utility", issue: "Periodic service due", reported: "18/07/2021", scheduled: "20/07/2021", tech: "Keo Yanna", cost: "$320.00", status: "Completed" },
  { id: "LGT-2103", name: "POS Terminal #1", type: "Store Equipment", issue: "Printer paper jam", reported: "18/07/2021", scheduled: "18/07/2021", tech: "Tech-Fix Co.", cost: "$45.00", status: "Completed" },
  { id: "LGT-2104", name: "Tank #3", type: "Fuel Tank", issue: "Scheduled inspection", reported: "20/07/2021", scheduled: "22/07/2021", tech: "Nhem Heng", cost: "$410.00", status: "Completed" },
  { id: "LGT-2105", name: "CCTV Cam #01", type: "Store Equipment", issue: "Offline / No Signal", reported: "18/07/2021", scheduled: "18/07/2021", tech: "Chhay Nimol", cost: "$45.00", status: "Completed" },
  { id: "LGT-2106", name: "Generator Filter", type: "Power/Utility", issue: "Replacement required", reported: "10/07/2021", scheduled: "22/07/2021", tech: "Sok Piseth", cost: "$320.00", status: "Completed" },
];

export default function EquipmentMaintenance() {
  const [logs, setLogs] = useState(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Control State ('add', 'schedule', 'settings', 'edit')
  const [modalType, setModalType] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // Forms State
  const [newLog, setNewLog] = useState({
    name: "",
    type: "Fuel Dispenser",
    issue: "",
    tech: "",
    cost: "",
    status: "In Progress",
  });

  const [scheduleForm, setScheduleForm] = useState({
    logId: "",
    scheduledDate: "",
    tech: "",
  });

  const [settingsForm, setSettingsForm] = useState({
    autoAlertDays: "7",
    budgetLimit: "500.00",
  });

  // Handle Add Maintenance Log
  const handleAddLog = (e) => {
    e.preventDefault();
    if (!newLog.name || !newLog.issue) return;

    const newId = `LGT-${2100 + logs.length + 1}`;
    const today = new Date().toLocaleDateString("en-GB");

    const addedItem = {
      id: newId,
      name: newLog.name,
      type: newLog.type,
      issue: newLog.issue,
      reported: today,
      scheduled: today,
      tech: newLog.tech || "Unassigned",
      cost: newLog.cost ? `$${parseFloat(newLog.cost).toFixed(2)}` : "$0.00",
      status: newLog.status,
    };

    setLogs([addedItem, ...logs]);
    setNewLog({ name: "", type: "Fuel Dispenser", issue: "", tech: "", cost: "", status: "In Progress" });
    setModalType(null);
  };

  // Handle Create Schedule
  const handleCreateSchedule = (e) => {
    e.preventDefault();
    if (!scheduleForm.logId || !scheduleForm.scheduledDate) return;

    setLogs(
      logs.map((item) =>
        item.id === scheduleForm.logId
          ? {
              ...item,
              scheduled: scheduleForm.scheduledDate,
              tech: scheduleForm.tech || item.tech,
              status: "In Progress",
            }
          : item
      )
    );
    setModalType(null);
  };

  // Handle Edit Log Update
  const handleUpdateLog = (e) => {
    e.preventDefault();
    if (!selectedLog) return;

    setLogs(logs.map((item) => (item.id === selectedLog.id ? selectedLog : item)));
    setModalType(null);
  };

  // Filtered Logs
  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    return (
      l.id.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      l.type.toLowerCase().includes(q) ||
      l.issue.toLowerCase().includes(q) ||
      l.tech.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 p-6 bg-gray-300 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black">Equipment Maintenance Management</h2>
          <p className="text-sm text-black">Monitor equipment health, repairs, and service logs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalType("add")}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-base font-medium text-white hover:bg-cyan-600 shadow-sm transition"
          >
            <Wrench size={15} /> Add New Maintenance
          </button>
          <button
            onClick={() => setModalType("schedule")}
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

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Maintenance Logs" value={logs.length.toString()} delta={`${logs.length} Active`} deltaTone="neutral" />
        <StatCard label="Equipment Status" value={logs.filter(l => l.status === "Completed").length.toString()} delta="Units Healthy" deltaTone="up" />
        <StatCard label="Maintenance Due" value={logs.filter(l => l.status === "In Progress").length.toString()} delta="Units In Service" deltaTone="down" />
        <StatCard label="Scheduled for Maintenance" value={logs.length.toString()} delta="Scheduled Logs" deltaTone="neutral" />
      </div>

      {/* Table Panel */}
      <Panel>
        <div className="relative mb-3.5 w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
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
                <th className="px-3.5 py-2.5 font-semibold">Equipment Name/No.</th>
                <th className="px-3.5 py-2.5 font-semibold">Equipment Type</th>
                <th className="px-3.5 py-2.5 font-semibold">Issue Description</th>
                <th className="px-3.5 py-2.5 font-semibold">Reported Date</th>
                <th className="px-3.5 py-2.5 font-semibold">Scheduled Date</th>
                <th className="px-3.5 py-2.5 font-semibold">Technician/Assigned</th>
                <th className="px-3.5 py-2.5 font-semibold">Cost ($)</th>
                <th className="px-3.5 py-2.5 font-semibold">Status</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/60 transition text-sm">
                  <td className="px-3.5 py-2.5 font-medium text-slate-700 font-mono">{l.id}</td>
                  <td className="px-3.5 py-2.5 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-3.5 py-2.5 text-slate-800">{l.type}</td>
                  <td className="px-3.5 py-2.5 text-slate-800">{l.issue}</td>
                  <td className="px-3.5 py-2.5 text-slate-800">{l.reported}</td>
                  <td className="px-3.5 py-2.5 text-slate-800">{l.scheduled}</td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">{l.tech}</td>
                  <td className="px-3.5 py-2.5 text-slate-700 font-semibold">{l.cost}</td>
                  <td className="px-3.5 py-2.5">
                    <StatusBadge status={l.status === "Completed" ? "Active" : "Check Status"} />
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <button
                      onClick={() => {
                        setSelectedLog(l);
                        setModalType("edit");
                      }}
                      className="font-semibold text-cyan-600 hover:text-cyan-700 transition"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-slate-400">
                    No equipment maintenance logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ==================== MODALS ==================== */}

      {/* Modal 1: Add New Maintenance */}
      {modalType === "add" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Add New Maintenance Log</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddLog} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Equipment Name / No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pump #03 (Diesel)"
                  value={newLog.name}
                  onChange={(e) => setNewLog({ ...newLog, name: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Equipment Type</label>
                  <select
                    value={newLog.type}
                    onChange={(e) => setNewLog({ ...newLog, type: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  >
                    <option value="Fuel Dispenser">Fuel Dispenser</option>
                    <option value="Fuel Tank">Fuel Tank</option>
                    <option value="Power/Utility">Power/Utility</option>
                    <option value="Store Equipment">Store Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Est. Cost ($)</label>
                  <input
                    type="number"
                    placeholder="120.00"
                    value={newLog.cost}
                    onChange={(e) => setNewLog({ ...newLog, cost: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Issue Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the issue or maintenance service..."
                  value={newLog.issue}
                  onChange={(e) => setNewLog({ ...newLog, issue: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Technician / Assigned</label>
                <input
                  type="text"
                  placeholder="e.g. Sok Piseth / Tech-Fix Co."
                  value={newLog.tech}
                  onChange={(e) => setNewLog({ ...newLog, tech: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border rounded-xl text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600">
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Schedule */}
      {modalType === "schedule" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Schedule Service / Inspection</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Select Maintenance Log *</label>
                <select
                  required
                  value={scheduleForm.logId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, logId: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="">-- Select Log --</option>
                  {logs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id} - {l.name} ({l.issue})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Scheduled Date *</label>
                <input
                  type="date"
                  required
                  value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Assign Technician</label>
                <input
                  type="text"
                  placeholder="Technician or Service Provider Name"
                  value={scheduleForm.tech}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, tech: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border rounded-xl text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600">
                  Update Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Settings */}
      {modalType === "settings" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Maintenance Rules Settings</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Routine Maintenance Alert (Days)</label>
                <input
                  type="number"
                  value={settingsForm.autoAlertDays}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoAlertDays: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Cost Approval Limit ($)</label>
                <input
                  type="text"
                  value={settingsForm.budgetLimit}
                  onChange={(e) => setSettingsForm({ ...settingsForm, budgetLimit: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <button
              onClick={() => setModalType(null)}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Log */}
      {modalType === "edit" && selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Edit Log ({selectedLog.id})</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateLog} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Equipment Name</label>
                <input
                  type="text"
                  value={selectedLog.name}
                  onChange={(e) => setSelectedLog({ ...selectedLog, name: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Issue Description</label>
                <textarea
                  rows={2}
                  value={selectedLog.issue}
                  onChange={(e) => setSelectedLog({ ...selectedLog, issue: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Technician</label>
                  <input
                    type="text"
                    value={selectedLog.tech}
                    onChange={(e) => setSelectedLog({ ...selectedLog, tech: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Cost ($)</label>
                  <input
                    type="text"
                    value={selectedLog.cost}
                    onChange={(e) => setSelectedLog({ ...selectedLog, cost: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Status</label>
                <select
                  value={selectedLog.status}
                  onChange={(e) => setSelectedLog({ ...selectedLog, status: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border rounded-xl text-slate-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600">
                  Update Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}