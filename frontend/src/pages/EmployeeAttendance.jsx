
import React, { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  CalendarPlus,
  Settings2,
  Search,
  Eye,
  Pencil,
  X,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { Panel, StatusBadge, StatCard } from "../components/ui";

import {
  getEmployees,
  createEmployee,
  getAttendances,
  createAttendance,
  updateAttendance,
  getWorkSchedules,
  createWorkSchedule,
  getSystemSettings,
  updateSystemSettings,
} from "../api/employeeApi";

// =====================================================
// HELPER FUNCTIONS
// Functions ជំនួយសម្រាប់បម្លែងទិន្នន័យ និងម៉ោង
// =====================================================

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// បម្លែងម៉ោងពី Database ទៅជា 12-hour format សម្រាប់បង្ហាញ។
const formatTime = (value) => {
  if (!value) return "—";

  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return "—";

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
};

// បម្លែង 12-hour format ទៅជា 24-hour format។
const convertTo24Hour = (time) => {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    throw new Error("Please use a time range such as 06:00 AM - 02:00 PM.");
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    throw new Error("Invalid time.");
  }

  if (period === "AM") {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

// បម្លែងម៉ោង 24-hour ទៅជានាទី ដើម្បីពិនិត្យ Late។
const timeToMinutes = (value) => {
  if (!value) return null;

  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

// បម្លែងម៉ោងក្នុង Database ទៅជា Local datetime string សម្រាប់ Input។
const formatInputTime = (value) => {
  if (!value) return "";

  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";

  return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
};

// បម្លែង Laravel Error ទៅជាសារដែលអាចបង្ហាញក្នុង UI។
const getApiError = (error, fallback) => {
  const validationErrors = error.response?.data?.errors;

  if (validationErrors) {
    return Object.values(validationErrors).flat()[0] || fallback;
  }

  return error.response?.data?.message || error.message || fallback;
};

// Role ដែល UI បង្ហាញ ត្រូវផ្គូផ្គងនឹង ENUM ក្នុង Database។
const roleToDatabase = {
  "Pump Attendant": "fuel_attendant",
  "Cashier / POS": "cashier",
  "Store Keeper": "store_staff",
  Manager: "manager",
  "Maintenance Technician": "maintenance_tech",
};

const roleToDisplay = {
  fuel_attendant: "Pump Attendant",
  cashier: "Cashier / POS",
  store_staff: "Store Keeper",
  manager: "Manager",
  maintenance_tech: "Maintenance Technician",
};

// បម្លែង Status ពី Database ទៅជា UI label។
const statusToDisplay = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  half_day: "Half Day",
  holiday: "Holiday",
};

// បម្លែង Status ដែលអ្នកប្រើជ្រើសទៅជា Database enum។
const statusToDatabase = {
  Present: "present",
  Late: "late",
  Absent: "absent",
  "Half Day": "half_day",
  Holiday: "holiday",
};

// ទាញយក Array ទោះ API បញ្ជូន Array ផ្ទាល់ ឬ Laravel pagination ក៏ដោយ។
const extractArray = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function EmployeeAttendance() {
  // ---------------------------------------------------
  // Data States
  // ---------------------------------------------------

  const [employeeList, setEmployeeList] = useState([]);
  const [scheduleEmployees, setScheduleEmployees] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);

  // ---------------------------------------------------
  // Search, Filter & Pagination States
  // ---------------------------------------------------

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("Today");
  const [visibleCount, setVisibleCount] = useState(10);

  // ---------------------------------------------------
  // Modal States
  // ---------------------------------------------------

  const [modalType, setModalType] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // ---------------------------------------------------
  // Loading & Message States
  // ---------------------------------------------------

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [apiMessage, setApiMessage] = useState("");
  const [apiMessageType, setApiMessageType] = useState("success");

  // ---------------------------------------------------
  // Form States
  // ---------------------------------------------------

  const [newEmp, setNewEmp] = useState({
    name: "",
    role: "Pump Attendant",
    shift: "Morning: 06:00 AM - 02:00 PM",
  });

  const [newSchedule, setNewSchedule] = useState({
    empId: "",
    shiftName: "Morning Shift",
    timeRange: "06:00 AM - 02:00 PM",
    dayOfWeek: String(new Date().getDay()),
  });

  const [settings, setSettings] = useState({
    lateBuffer: "15",
    otRate: "1.5",
  });

  // ===================================================
  // LOAD EMPLOYEES, ATTENDANCE AND SCHEDULES
  // ===================================================

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const today = getTodayString();
      const dayOfWeek = new Date().getDay();

      const [employeesResult, attendancesResult, schedulesResult] =
        await Promise.all([
          getEmployees(),
          getAttendances({ date: today }),
          getWorkSchedules({ day_of_week: dayOfWeek }),
        ]);

      const employees = extractArray(employeesResult);
      const attendances = extractArray(attendancesResult);
      const schedules = extractArray(schedulesResult);

      setScheduleEmployees(employees);
      setAttendanceList(attendances);
      setScheduleList(schedules);

      // បង្កើត Map ដើម្បីរកវត្តមាន និង Schedule តាម employee_id។
      const attendanceByEmployee = new Map();
      attendances.forEach((attendance) => {
        attendanceByEmployee.set(
          Number(attendance.employee_id),
          attendance
        );
      });

      const schedulesByEmployee = new Map();
      schedules.forEach((schedule) => {
        const employeeId = Number(schedule.employee_id);

        if (!schedulesByEmployee.has(employeeId)) {
          schedulesByEmployee.set(employeeId, schedule);
        }
      });

      // បម្លែងទិន្នន័យពី Laravel ទៅទម្រង់ដែល UI ប្រើ។
      const rows = employees.map((employee) => {
        const employeeId = Number(employee.employee_id);
        const attendance = attendanceByEmployee.get(employeeId);
        const schedule = schedulesByEmployee.get(employeeId);

        const shift = schedule
          ? `${formatTime(schedule.shift_start)} - ${formatTime(schedule.shift_end)}`
          : "Not assigned";

        let status = "Pending";
        let checkIn = "—";
        let checkOut = "—";

        if (attendance) {
          status = statusToDisplay[attendance.status] || "Present";
          checkIn = formatTime(attendance.check_in);
          checkOut = formatTime(attendance.check_out);
        }

        return {
          id: employee.employee_code || `EMP${employeeId}`,
          employeeDbId: employeeId,
          name: employee.full_name || "",
          role: roleToDisplay[employee.role] || employee.role || "—",
          databaseRole: employee.role,
          shift,
          in: checkIn,
          out: checkOut,
          status,
          date: "Today",
          attendanceId: attendance?.attendance_id || null,
          attendanceDate: attendance?.date || today,
          checkInRaw: attendance?.check_in || null,
          checkOutRaw: attendance?.check_out || null,
        };
      });

      setEmployeeList(rows);
    } catch (error) {
      console.error("Failed to load employee attendance:", error);

      setApiMessage(
        getApiError(
          error,
          "Failed to load employees. Please check your Laravel API and login."
        )
      );
      setApiMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ទាញយកទិន្នន័យនៅពេលបើកទំព័រ។
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===================================================
  // ADD EMPLOYEE
  // ===================================================

  const handleAddEmployee = async (e) => {
    e.preventDefault();

    if (!newEmp.name.trim()) {
      setApiMessage("Please enter the employee's full name.");
      setApiMessageType("error");
      return;
    }

    const databaseRole = roleToDatabase[newEmp.role];

    if (!databaseRole) {
      setApiMessage("Please select a valid employee role.");
      setApiMessageType("error");
      return;
    }

    try {
      setIsSavingEmployee(true);
      setApiMessage("");

      // បង្កើតបុគ្គលិកក្នុង Database។
      const result = await createEmployee({
        full_name: newEmp.name.trim(),
        role: databaseRole,
        hire_date: getTodayString(),
        is_active: true,
      });

      const createdEmployee = result?.data;

      // បើ API បញ្ជូន Employee ID ត្រឡប់មកវិញ
      // អាចបង្កើត Schedule ដំបូងសម្រាប់ថ្ងៃនេះបាន។
      if (createdEmployee?.employee_id && newEmp.shift) {
        try {
          const timeParts = newEmp.shift.split(": ");
          const timeRange = timeParts.length > 1
            ? timeParts.slice(1).join(": ")
            : newEmp.shift;

          const rangeParts = timeRange.split("-");

          if (rangeParts.length === 2) {
            await createWorkSchedule({
              employee_id: Number(createdEmployee.employee_id),
              day_of_week: new Date().getDay(),
              shift_start: convertTo24Hour(rangeParts[0]),
              shift_end: convertTo24Hour(rangeParts[1]),
              is_active: true,
            });
          }
        } catch (scheduleError) {
          // បុគ្គលិកអាចបានបង្កើតរួច ទោះ Schedule បរាជ័យក៏ដោយ។
          console.error("Employee created but schedule failed:", scheduleError);

          setApiMessage(
            "Employee created, but the initial schedule could not be saved. You can assign it later."
          );
          setApiMessageType("error");
        }
      }

      await loadData();

      if (!apiMessage) {
        setApiMessage("Employee created successfully.");
        setApiMessageType("success");
      }

      setNewEmp({
        name: "",
        role: "Pump Attendant",
        shift: "Morning: 06:00 AM - 02:00 PM",
      });

      setModalType(null);
    } catch (error) {
      console.error("Failed to create employee:", error);

      setApiMessage(getApiError(error, "Failed to create employee."));
      setApiMessageType("error");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // ===================================================
  // CREATE WORK SCHEDULE
  // ===================================================

  const handleCreateSchedule = async (e) => {
    e.preventDefault();

    if (!newSchedule.empId) {
      setApiMessage("Please select an employee.");
      setApiMessageType("error");
      return;
    }

    const timeParts = newSchedule.timeRange.split("-");

    if (timeParts.length !== 2) {
      setApiMessage(
        "Enter a time range like 06:00 AM - 02:00 PM."
      );
      setApiMessageType("error");
      return;
    }

    try {
      setIsSavingSchedule(true);
      setApiMessage("");

      const scheduleData = {
        employee_id: Number(newSchedule.empId),
        day_of_week: Number(newSchedule.dayOfWeek),
        shift_start: convertTo24Hour(timeParts[0]),
        shift_end: convertTo24Hour(timeParts[1]),
        is_active: true,
      };

      await createWorkSchedule(scheduleData);
      await loadData();

      setApiMessage("Work schedule saved successfully.");
      setApiMessageType("success");
      setModalType(null);

      setNewSchedule({
        empId: "",
        shiftName: "Morning Shift",
        timeRange: "06:00 AM - 02:00 PM",
        dayOfWeek: String(new Date().getDay()),
      });
    } catch (error) {
      console.error("Failed to create work schedule:", error);

      setApiMessage(getApiError(error, "Failed to save work schedule."));
      setApiMessageType("error");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // ===================================================
  // LOAD SYSTEM SETTINGS
  // ===================================================

  const openSettingsModal = async () => {
    setModalType("settings");
    setIsSettingsLoading(true);
    setApiMessage("");

    try {
      const result = await getSystemSettings();

      setSettings({
        lateBuffer: String(result?.lateBuffer ?? 15),
        otRate: String(result?.otRate ?? 1.5),
      });
    } catch (error) {
      console.error("Failed to load system settings:", error);

      setApiMessage(getApiError(error, "Failed to load system settings."));
      setApiMessageType("error");
    } finally {
      setIsSettingsLoading(false);
    }
  };

  // ===================================================
  // SAVE SYSTEM SETTINGS
  // ===================================================

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    const lateBuffer = Number(settings.lateBuffer);
    const otRate = Number(settings.otRate);

    if (
      settings.lateBuffer.trim() === "" ||
      !Number.isInteger(lateBuffer) ||
      lateBuffer < 0 ||
      lateBuffer > 1440
    ) {
      setApiMessage("Late Buffer must be a whole number from 0 to 1440.");
      setApiMessageType("error");
      return;
    }

    if (
      settings.otRate.trim() === "" ||
      !Number.isFinite(otRate) ||
      otRate < 0 ||
      otRate > 100
    ) {
      setApiMessage("OT Multiplier must be a number from 0 to 100.");
      setApiMessageType("error");
      return;
    }

    try {
      setIsSavingSettings(true);
      setApiMessage("");

      const result = await updateSystemSettings({
        lateBuffer,
        otRate,
      });

      const savedSettings = result?.data;

      setSettings({
        lateBuffer: String(savedSettings?.lateBuffer ?? lateBuffer),
        otRate: String(savedSettings?.otRate ?? otRate),
      });

      setApiMessage("Attendance rules saved successfully.");
      setApiMessageType("success");
      setModalType(null);
    } catch (error) {
      console.error("Failed to save system settings:", error);

      setApiMessage(getApiError(error, "Failed to save system settings."));
      setApiMessageType("error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ===================================================
  // UPDATE ATTENDANCE
  // ===================================================

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();

    if (!selectedEmp) return;

    try {
      setIsSavingAttendance(true);
      setApiMessage("");

      const today = getTodayString();
      const selectedStatus = selectedEmp.status;

      // បម្លែងម៉ោងដែលអ្នកប្រើវាយទៅជា HH:mm:ss។
      const convertInputTime = (value) => {
        if (!value || value === "—") return null;

        // Input type="time" ប្រើ HH:mm។
        if (/^\d{2}:\d{2}$/.test(value)) {
          return `${today} ${value}:00`;
        }

        // គាំទ្រទម្រង់ម៉ោងដែលបង្ហាញនៅក្នុង UI ផងដែរ។
        if (/AM|PM/i.test(value)) {
          return `${today} ${convertTo24Hour(value)}:00`;
        }

        throw new Error("Please enter time in HH:mm format.");
      };

      const checkIn = convertInputTime(selectedEmp.in);
      const checkOut = convertInputTime(selectedEmp.out);

      // Database កំណត់ check_in ជា NOT NULL។
      if (!checkIn) {
        setApiMessage("Check In time is required.");
        setApiMessageType("error");
        return;
      }

      if (
        checkOut &&
        new Date(checkOut.replace(" ", "T")) <
          new Date(checkIn.replace(" ", "T"))
      ) {
        setApiMessage("Check Out cannot be earlier than Check In.");
        setApiMessageType("error");
        return;
      }

      const attendanceData = {
        employee_id: Number(selectedEmp.employeeDbId),
        date: today,
        check_in: checkIn,
        check_out: checkOut,
        status: statusToDatabase[selectedStatus] || "present",
      };

      if (selectedEmp.attendanceId) {
        // កែវត្តមានដែលមានស្រាប់។
        await updateAttendance(
          selectedEmp.attendanceId,
          attendanceData
        );
      } else {
        // បង្កើតវត្តមានថ្មី ប្រសិនបើមិនទាន់មាន Record ថ្ងៃនេះ។
        await createAttendance(attendanceData);
      }

      await loadData();

      setApiMessage("Attendance updated successfully.");
      setApiMessageType("success");
      setModalType(null);
      setSelectedEmp(null);
    } catch (error) {
      console.error("Failed to update attendance:", error);

      setApiMessage(getApiError(error, "Failed to update attendance."));
      setApiMessageType("error");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // ===================================================
  // FILTER & STATISTICS
  // ===================================================

  const filteredEmployees = employeeList.filter((emp) => {
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      emp.name.toLowerCase().includes(query) ||
      emp.id.toLowerCase().includes(query) ||
      String(emp.role).toLowerCase().includes(query);

    // បញ្ជីនេះបង្ហាញវត្តមានថ្ងៃនេះ។
    // All មានន័យថាបង្ហាញបុគ្គលិកទាំងអស់ក្នុងបញ្ជី។
    const matchesDate = dateFilter === "All" || emp.date === dateFilter;

    return matchesSearch && matchesDate;
  });

  const presentCount = employeeList.filter(
    (e) => e.status === "Present"
  ).length;

  const lateCount = employeeList.filter(
    (e) => e.status === "Late"
  ).length;

  const absentCount = employeeList.filter(
    (e) => e.status === "Absent" || e.status === "Holiday"
  ).length;

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="space-y-5 p-6 bg-gray-300 min-h-screen">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Employee &amp; Attendance Management
          </h2>
          <p className="text-sm text-black">
            Track staff presence, schedules, and daily shift check-ins
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalType("add")}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-base font-semibold text-white shadow-sm hover:bg-cyan-600 transition"
          >
            <UserPlus size={25} /> Add New Employee
          </button>

          <button
            onClick={() => {
              setApiMessage("");
              setModalType("schedule");
              loadScheduleDataForModal();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-base font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >
            <CalendarPlus size={25} /> Create Schedule
          </button>

          <button
            onClick={openSettingsModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-base font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
          >
            <Settings2 size={25} /> Settings
          </button>
        </div>
      </div>

      {/* API Message */}
      {apiMessage && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            apiMessageType === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {apiMessageType === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}

            <span>{apiMessage}</span>

            <button
              type="button"
              onClick={() => setApiMessage("")}
              className="ml-auto"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={employeeList.length.toString()}
          delta={`${employeeList.length} Staff`}
          deltaTone="neutral"
        />

        <StatCard
          label="On Duty Today"
          value={(presentCount + lateCount).toString()}
          delta="Working"
          deltaTone="neutral"
        />

        <StatCard
          label="Late Arrival"
          value={lateCount.toString()}
          delta="Needs Review"
          deltaTone="down"
        />

        <StatCard
          label="On Leave / Absent"
          value={absentCount.toString()}
          delta="Staff Absent"
          deltaTone="neutral"
        />
      </div>

      {/* Attendance Table Panel */}
      <Panel title="">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold text-black">
            Attendance Tracking
          </h2>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Controls Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setSearchQuery("");
              setDateFilter("Today");
              setVisibleCount(10);
            }}
            className="rounded-xl bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 border border-cyan-100 hover:bg-cyan-200 transition"
          >
            Advanced Filter
          </button>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

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
                <tr
                  key={e.employeeDbId}
                  className="hover:bg-slate-50/60 transition text-sm"
                >
                  <td className="px-3.5 py-2.5 text-slate-500 font-mono font-medium">
                    {e.id}
                  </td>

                  <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                    {e.name}
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-800">
                    {e.role}
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-800 font-semibold">
                    {e.shift}
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">
                    {e.in}
                  </td>

                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">
                    {e.out}
                  </td>

                  <td className="px-3.5 py-2.5">
                    <StatusBadge
                      status={
                        e.status === "Present"
                          ? "Active"
                          : e.status === "Pending"
                          ? "Pending"
                          : e.status
                      }
                    />
                  </td>

                  <td className="px-3.5 py-2.5 text-right">
                    <div className="flex justify-end gap-2 text-slate-800">
                      <button
                        onClick={() => {
                          setSelectedEmp({ ...e });
                          setModalType("view");
                        }}
                        className="p-1 hover:text-cyan-600 rounded-md transition"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedEmp({
                            ...e,
                            in: e.checkInRaw
                              ? formatInputTime(e.checkInRaw)
                              : "",
                            out: e.checkOutRaw
                              ? formatInputTime(e.checkOutRaw)
                              : "",
                            status:
                              e.status === "Pending"
                                ? "Present"
                                : e.status,
                          });

                          setModalType("edit");
                        }}
                        className="p-1 hover:text-amber-500 rounded-md transition"
                        title="Edit Attendance"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {isLoading && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-500">
                    Loading employee attendance...
                  </td>
                </tr>
              )}

              {!isLoading && filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400">
                    No matching employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-base text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-600">
              {Math.min(visibleCount, filteredEmployees.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-600">
              {filteredEmployees.length}
            </span>{" "}
            staff members
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

      {/* =================================================
          MODAL 1: ADD NEW EMPLOYEE
      ================================================= */}

      {modalType === "add" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Add New Employee
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Full Name *
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Keo Vanna"
                  value={newEmp.name}
                  onChange={(e) =>
                    setNewEmp({ ...newEmp, name: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Role / Position
                </label>

                <select
                  value={newEmp.role}
                  onChange={(e) =>
                    setNewEmp({ ...newEmp, role: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="Pump Attendant">Pump Attendant</option>
                  <option value="Cashier / POS">Cashier / POS</option>
                  <option value="Store Keeper">Store Keeper</option>
                  <option value="Manager">Manager</option>
                  <option value="Maintenance Technician">
                    Maintenance Technician
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Initial Shift
                </label>

                <select
                  value={newEmp.shift}
                  onChange={(e) =>
                    setNewEmp({ ...newEmp, shift: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="Morning: 06:00 AM - 02:00 PM">
                    Morning: 06:00 AM - 02:00 PM
                  </option>
                  <option value="Afternoon: 02:00 PM - 10:00 PM">
                    Afternoon: 02:00 PM - 10:00 PM
                  </option>
                  <option value="Night Shift: 10:00 PM - 06:00 AM">
                    Night Shift: 10:00 PM - 06:00 AM
                  </option>
                </select>
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
                  disabled={isSavingEmployee}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 disabled:opacity-60"
                >
                  {isSavingEmployee ? "Saving..." : "Save Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          MODAL 2: CREATE SCHEDULE
      ================================================= */}

      {modalType === "schedule" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Create / Assign Schedule
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Select Employee *
                </label>

                <select
                  required
                  value={newSchedule.empId}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, empId: e.target.value })
                  }
                  disabled={isScheduleLoading || isSavingSchedule}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="">
                    {isScheduleLoading
                      ? "Loading employees..."
                      : "-- Choose Employee --"}
                  </option>

                  {scheduleEmployees.map((emp) => (
                    <option
                      key={emp.employee_id}
                      value={String(emp.employee_id)}
                    >
                      {emp.employee_code} - {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Day of Week *
                </label>

                <select
                  required
                  value={newSchedule.dayOfWeek}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      dayOfWeek: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Shift Name
                </label>

                <select
                  value={newSchedule.shiftName}
                  onChange={(e) => {
                    const shiftName = e.target.value;

                    const shiftTimes = {
                      "Morning Shift": "06:00 AM - 02:00 PM",
                      "Afternoon Shift": "02:00 PM - 10:00 PM",
                      "Night Shift": "10:00 PM - 06:00 AM",
                    };

                    setNewSchedule({
                      ...newSchedule,
                      shiftName,
                      timeRange: shiftTimes[shiftName],
                    });
                  }}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="Morning Shift">Morning Shift</option>
                  <option value="Afternoon Shift">Afternoon Shift</option>
                  <option value="Night Shift">Night Shift</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Time Range
                </label>

                <input
                  type="text"
                  required
                  value={newSchedule.timeRange}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      timeRange: e.target.value,
                    })
                  }
                  placeholder="06:00 AM - 02:00 PM"
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
                  disabled={isSavingSchedule || isScheduleLoading}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 disabled:opacity-60"
                >
                  {isSavingSchedule ? "Saving..." : "Assign Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          MODAL 3: SETTINGS
      ================================================= */}

      {modalType === "settings" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Attendance Rules Settings
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Late Buffer Margin (Minutes)
                </label>

                <input
                  type="number"
                  min="0"
                  max="1440"
                  step="1"
                  required
                  value={settings.lateBuffer}
                  disabled={isSettingsLoading || isSavingSettings}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lateBuffer: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Overtime (OT) Multiplier Rate
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={settings.otRate}
                  disabled={isSettingsLoading || isSavingSettings}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      otRate: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500 disabled:opacity-60"
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
                  disabled={isSettingsLoading || isSavingSettings}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 disabled:opacity-60"
                >
                  {isSettingsLoading
                    ? "Loading..."
                    : isSavingSettings
                    ? "Saving..."
                    : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          MODAL 4: VIEW EMPLOYEE DETAILS
      ================================================= */}

      {modalType === "view" && selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Staff Attendance Detail
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Employee ID:</span>
                <span className="font-bold font-mono text-slate-800">
                  {selectedEmp.id}
                </span>
              </div>

              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Full Name:</span>
                <span className="font-bold text-slate-800">
                  {selectedEmp.name}
                </span>
              </div>

              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Role:</span>
                <span>{selectedEmp.role}</span>
              </div>

              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Shift:</span>
                <span>{selectedEmp.shift}</span>
              </div>

              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Check In:</span>
                <span className="font-semibold text-slate-700">
                  {selectedEmp.in}
                </span>
              </div>

              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Check Out:</span>
                <span className="font-semibold text-slate-700">
                  {selectedEmp.out}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <StatusBadge
                  status={
                    selectedEmp.status === "Present"
                      ? "Active"
                      : selectedEmp.status
                  }
                />
              </div>
            </div>

            <button
              onClick={() => setModalType(null)}
              className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          MODAL 5: EDIT ATTENDANCE
      ================================================= */}

      {modalType === "edit" && selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Update Check-In / Out
              </h3>

              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAttendance} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Check In Time *
                </label>

                <input
                  type="time"
                  required
                  value={selectedEmp.in}
                  onChange={(e) =>
                    setSelectedEmp({
                      ...selectedEmp,
                      in: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Check Out Time
                </label>

                <input
                  type="time"
                  value={selectedEmp.out === "—" ? "" : selectedEmp.out}
                  onChange={(e) =>
                    setSelectedEmp({
                      ...selectedEmp,
                      out: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Attendance Status
                </label>

                <select
                  value={selectedEmp.status}
                  onChange={(e) =>
                    setSelectedEmp({
                      ...selectedEmp,
                      status: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Holiday">Holiday</option>
                </select>
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
                  disabled={isSavingAttendance}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 disabled:opacity-60"
                >
                  {isSavingAttendance ? "Saving..." : "Update Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // ===================================================
  // LOAD SCHEDULE MODAL DATA
  // ===================================================

  async function loadScheduleDataForModal() {
    setIsScheduleLoading(true);

    try {
      const [employeesResult, schedulesResult] = await Promise.all([
        getEmployees(),
        getWorkSchedules(),
      ]);

      setScheduleEmployees(extractArray(employeesResult));
      setScheduleList(extractArray(schedulesResult));
    } catch (error) {
      console.error("Failed to load schedule modal data:", error);

      setApiMessage(
        getApiError(error, "Failed to load employees for scheduling.")
      );
      setApiMessageType("error");
    } finally {
      setIsScheduleLoading(false);
    }
  }
}