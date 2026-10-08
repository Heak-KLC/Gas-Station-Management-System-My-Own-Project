import React, { useState } from "react";
import {
  UserPlus,
  CalendarPlus,
  Settings2,
  Search,
  Eye,
  Pencil,
  X,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { Panel, StatusBadge, StatCard } from "../components/ui";

const initialEmployees = [
  { id: "EMP001", name: "Sok Piseth", role: "Pump Attendant", shift: "Morning: 06:00 AM - 02:00 PM", in: "06:03 AM", out: "02:00 PM", status: "Present", date: "Today" },
  { id: "EMP002", name: "Keo Sophea", role: "Cashier / POS", shift: "Afternoon: 02:00 PM - 10:00 PM", in: "02:12 PM", out: "—", status: "Pending", date: "Today" },
  { id: "EMP003", name: "Chan Leakena", role: "Store Keeper", shift: "Morning: 06:00 AM - 02:00 PM", in: "—", out: "—", status: "On Leave", date: "Today" },
  { id: "EMP004", name: "Nhem Heng", role: "Security Guard", shift: "Night Shift: 10:00 PM - 06:00 AM", in: "10:00 PM", out: "06:00 AM", status: "Present", date: "Today" },
  { id: "EMP005", name: "Sok Piseth", role: "Pump Attendant", shift: "Morning: 06:00 AM - 02:00 PM", in: "06:00 AM", out: "02:00 PM", status: "Present", date: "Today" },
  { id: "EMP006", name: "Keo Sophea", role: "Cashier / POS", shift: "Morning: 02:00 AM - 10:00 AM", in: "02:00 AM", out: "10:00 AM", status: "Late", date: "Today" },
  { id: "EMP007", name: "Chan Leakena", role: "Store Keeper", shift: "Morning: 06:00 AM - 02:00 PM", in: "06:12 AM", out: "—", status: "Pending", date: "Today" },
  { id: "EMP008", name: "Chan Leakena", role: "Store Keeper", shift: "Afternoon: 02:00 PM - 10:00 PM", in: "—", out: "—", status: "On Leave", date: "Today" },
  { id: "EMP009", name: "Nhem Heng", role: "Security Guard", shift: "Night Shift: 10:00 PM - 06:00 AM", in: "10:00 PM", out: "06:00 AM", status: "Present", date: "Today" },
  { id: "EMP010", name: "Sok Piseth", role: "Pump Attendant", shift: "Morning: 06:00 AM - 02:00 PM", in: "06:12 PM", out: "—", status: "Late", date: "Today" },
  { id: "EMP011", name: "Vann Sophat", role: "Pump Attendant", shift: "Morning: 06:00 AM - 02:00 PM", in: "06:01 AM", out: "02:00 PM", status: "Present", date: "Today" },
  { id: "EMP012", name: "Kheng Sophoan", role: "Cashier / POS", shift: "Afternoon: 02:00 PM - 10:00 PM", in: "02:05 PM", out: "—", status: "Present", date: "Today" },
];

export default function EmployeeAttendance() {
  const [employeeList, setEmployeeList] = useState(initialEmployees);
  
  // States for Search, Filter & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("Today");
  const [visibleCount, setVisibleCount] = useState(10);

  // States for Modals
  const [modalType, setModalType] = useState(null); // 'add', 'schedule', 'settings', 'view', 'edit'
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Form States
  const [newEmp, setNewEmp] = useState({ name: "", role: "Pump Attendant", shift: "Morning: 06:00 AM - 02:00 PM" });
  const [newSchedule, setNewSchedule] = useState({ empId: "", shiftName: "Morning Shift", timeRange: "06:00 AM - 02:00 PM" });
  const [settings, setSettings] = useState({ lateBuffer: "15", otRate: "1.5" });

  // Handle Add Employee
  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newEmp.name) return;

    const nextId = `EMP${String(employeeList.length + 1).padStart(3, "0")}`;
    const added = {
      id: nextId,
      name: newEmp.name,
      role: newEmp.role,
      shift: newEmp.shift,
      in: "—",
      out: "—",
      status: "Pending",
      date: "Today",
    };

    setEmployeeList([added, ...employeeList]);
    setNewEmp({ name: "", role: "Pump Attendant", shift: "Morning: 06:00 AM - 02:00 PM" });
    setModalType(null);
  };

  // Handle Create Schedule
  const handleCreateSchedule = (e) => {
    e.preventDefault();
    if (!newSchedule.empId) return;

    setEmployeeList(
      employeeList.map((emp) =>
        emp.id === newSchedule.empId
          ? { ...emp, shift: `${newSchedule.shiftName}: ${newSchedule.timeRange}` }
          : emp
      )
    );
    setModalType(null);
  };

  // Handle Edit Attendance
  const handleUpdateAttendance = (e) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setEmployeeList(
      employeeList.map((emp) =>
        emp.id === selectedEmp.id ? selectedEmp : emp
      )
    );
    setModalType(null);
  };

  // Filter Logic
  const filteredEmployees = employeeList.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = dateFilter === "All" || emp.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-5 p-6 bg-gray-300 min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Employee &amp; Attendance Management</h2>
          <p className="text-sm text-black">Track staff presence, schedules, and daily shift check-ins</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalType("add")}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-base font-semibold text-white shadow-sm hover:bg-cyan-600 transition"
          >
            <UserPlus size={25} /> Add New Employee
          </button>
          <button
            onClick={() => setModalType("schedule")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-base font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >
            <CalendarPlus size={25} /> Create Schedule
          </button>
          <button
            onClick={() => setModalType("settings")}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-base font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >
            <Settings2 size={25} /> Settings
          </button>
        </div>
      </div>

      {/* Dynamic StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={employeeList.length.toString()} delta={`${employeeList.length} Active`} deltaTone="neutral" />
        <StatCard label="On Duty Today" value={employeeList.filter(e => e.status === "Present" || e.status === "Late").length.toString()} delta="Working" deltaTone="neutral" />
        <StatCard label="Late Arrival" value={employeeList.filter(e => e.status === "Late").length.toString()} delta="Needs Review" deltaTone="down" />
        <StatCard label="On Leave / Absent" value={employeeList.filter(e => e.status === "On Leave").length.toString()} delta="Staff On Leave" deltaTone="neutral" />
      </div>

      {/* Attendance Table Panel */}
      <Panel title="">
        <h2 className="text-base font-semibold text-black">Attendance Tracking</h2>
        
        {/* Controls Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button 
            onClick={() => { setSearchQuery(""); setDateFilter("Today"); }}
            className="rounded-xl bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 border border-cyan-100 hover:bg-cyan-200 transition"
          >
            Advanced Filter
          </button>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Name, Role, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-400 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Date Filter Dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-400 px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:border-cyan-500"
          >
            <option value="Today">Today</option>
            <option value="All">All Dates</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-400 bg-slate-50/70 text-black text-base font-bold">
                <th className="px-3.5 py-2.5 font-semibold">EMP ID</th>
                <th className="px-3.5 py-2.5 font-semibold">Full Name</th>
                <th className="px-3.5 py-2.5 font-semibold">Role / Position</th>
                <th className="px-3.5 py-2.5 font-semibold">Shift Assigned</th>
                <th className="px-3.5 py-2.5 font-semibold">Check In</th>
                <th className="px-3.5 py-2.5 font-semibold">Check Out</th>
                <th className="px-3.5 py-2.5 font-semibold">Status</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEmployees.slice(0, visibleCount).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition text-sm">
                  <td className="px-3.5 py-2.5 text-slate-500 font-mono font-medium">{e.id}</td>
                  <td className="px-3.5 py-2.5 font-semibold text-slate-800">{e.name}</td>
                  <td className="px-3.5 py-2.5 text-slate-800">{e.role}</td>
                  <td className="px-3.5 py-2.5 text-slate-800 font-semibold">{e.shift}</td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">{e.in}</td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">{e.out}</td>
                  <td className="px-3.5 py-2.5">
                    <StatusBadge
                      status={
                        e.status === "Present"
                          ? "Active"
                          : e.status === "On Leave"
                          ? "Check Status"
                          : e.status
                      }
                    />
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="flex justify-end gap-2 text-slate-800">
                      <button
                        onClick={() => { setSelectedEmp(e); setModalType("view"); }}
                        className="p-1 hover:text-cyan-600 rounded-md transition"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => { setSelectedEmp(e); setModalType("edit"); }}
                        className="p-1 hover:text-amber-500 rounded-md transition"
                        title="Edit Attendance"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400">No matching employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination / Show More */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-base text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-600">{Math.min(visibleCount, filteredEmployees.length)}</span> of{" "}
            <span className="font-semibold text-slate-600">{filteredEmployees.length}</span> staff members
          </div>
          {visibleCount < filteredEmployees.length ? (
            <button
              onClick={() => setVisibleCount((prev) => prev + 5)}
              className="font-semibold text-cyan-600 hover:underline transition"
            >
              Show More ↓
            </button>
          ) : visibleCount > 10 ? (
            <button
              onClick={() => setVisibleCount(10)}
              className="font-semibold text-slate-500 hover:underline transition"
            >
              Show Less ↑
            </button>
          ) : null}
        </div>
      </Panel>

      {/* ==================== MODALS ==================== */}

      {/* Modal 1: Add New Employee */}
      {modalType === "add" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Add New Employee</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keo Vanna"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Role / Position</label>
                <select
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="Pump Attendant">Pump Attendant</option>
                  <option value="Cashier / POS">Cashier / POS</option>
                  <option value="Store Keeper">Store Keeper</option>
                  <option value="Security Guard">Security Guard</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Shift Assignment</label>
                <select
                  value={newEmp.shift}
                  onChange={(e) => setNewEmp({ ...newEmp, shift: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="Morning: 06:00 AM - 02:00 PM">Morning: 06:00 AM - 02:00 PM</option>
                  <option value="Afternoon: 02:00 PM - 10:00 PM">Afternoon: 02:00 PM - 10:00 PM</option>
                  <option value="Night Shift: 10:00 PM - 06:00 AM">Night Shift: 10:00 PM - 06:00 AM</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border rounded-xl text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600">Save Employee</button>
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
              <h3 className="font-bold text-slate-800 text-sm">Create / Assign Schedule</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Select Employee *</label>
                <select
                  required
                  value={newSchedule.empId}
                  onChange={(e) => setNewSchedule({ ...newSchedule, empId: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employeeList.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.id} - {emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Shift Name</label>
                <input
                  type="text"
                  value={newSchedule.shiftName}
                  onChange={(e) => setNewSchedule({ ...newSchedule, shiftName: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Time Range</label>
                <input
                  type="text"
                  value={newSchedule.timeRange}
                  onChange={(e) => setNewSchedule({ ...newSchedule, timeRange: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border rounded-xl text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600">Assign Schedule</button>
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
              <h3 className="font-bold text-slate-800 text-sm">Attendance Rules Settings</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Late Buffer Margin (Minutes)</label>
                <input
                  type="number"
                  value={settings.lateBuffer}
                  onChange={(e) => setSettings({ ...settings, lateBuffer: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Overtime (OT) Multiplier Rate</label>
                <input
                  type="text"
                  value={settings.otRate}
                  onChange={(e) => setSettings({ ...settings, otRate: e.target.value })}
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

      {/* Modal 4: View Employee Details */}
      {modalType === "view" && selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Staff Attendance Detail</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between border-b pb-1.5"><span className="text-slate-400">Employee ID:</span><span className="font-bold font-mono text-slate-800">{selectedEmp.id}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-slate-400">Full Name:</span><span className="font-bold text-slate-800">{selectedEmp.name}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-slate-400">Role:</span><span>{selectedEmp.role}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-slate-400">Shift:</span><span>{selectedEmp.shift}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-slate-400">Check In:</span><span className="font-semibold text-slate-700">{selectedEmp.in}</span></div>
              <div className="flex justify-between border-b pb-1.5"><span className="text-slate-400">Check Out:</span><span className="font-semibold text-slate-700">{selectedEmp.out}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Status:</span><StatusBadge status={selectedEmp.status === "Present" ? "Active" : selectedEmp.status} /></div>
            </div>
            <button onClick={() => setModalType(null)} className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-medium">Close</button>
          </div>
        </div>
      )}

      {/* Modal 5: Edit Attendance */}
      {modalType === "edit" && selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Update Check-In / Out</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateAttendance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Check In Time</label>
                <input
                  type="text"
                  value={selectedEmp.in}
                  onChange={(e) => setSelectedEmp({ ...selectedEmp, in: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Check Out Time</label>
                <input
                  type="text"
                  value={selectedEmp.out}
                  onChange={(e) => setSelectedEmp({ ...selectedEmp, out: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Attendance Status</label>
                <select
                  value={selectedEmp.status}
                  onChange={(e) => setSelectedEmp({ ...selectedEmp, status: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Pending">Pending</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border rounded-xl text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600">Update Attendance</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}