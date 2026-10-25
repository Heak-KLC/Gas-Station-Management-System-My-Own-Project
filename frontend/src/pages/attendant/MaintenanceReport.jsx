import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  CheckCircle,
  Download,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";
const PAGE_SIZE = 5;

const EQUIPMENT_TYPES = [
  { value: "pump", label: "Fuel Pump" },
  { value: "tank", label: "Fuel Tank" },
  { value: "dispenser", label: "Dispenser" },
  { value: "security_system", label: "Security System" },
  { value: "generator", label: "Generator" },
  { value: "other", label: "Other" },
];

const MAINTENANCE_TYPES = [
  { value: "routine", label: "Routine / Preventive" },
  { value: "repair", label: "Repair / Corrective" },
  { value: "inspection", label: "Inspection" },
  { value: "emergency", label: "Emergency" },
];

const STATUSES = {
  scheduled: {
    label: "Scheduled",
    className: "bg-sky-100 text-sky-700",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-700",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700",
  },
};

const iso = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = String(value).slice(0, 10);
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return value;
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]}/${d}/${y}`;
};

const formatMoney = (value) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const equipmentLabel = (type, id) => {
  const item = EQUIPMENT_TYPES.find((e) => e.value === type);
  return `${item?.label ?? type ?? "Equipment"} #${id ?? "—"}`;
};

const maintenanceTypeLabel = (type) =>
  MAINTENANCE_TYPES.find((item) => item.value === type)?.label ?? type ?? "—";


const getAttendantName = (record) => {
  const employee =
    record.performedBy ??
    record.performed_by;

  if (employee && typeof employee === "object") {
    return (
      employee.full_name ||
      employee.name ||
      "Employee name unavailable"
    );
  }

  if (record.status === "completed") {
    return "Employee not recorded";
  }

  return "Not completed";
};


const mapRecord = (record) => ({
  id: record.maintenance_id,
  date: String(record.scheduled_date ?? "").slice(0, 10),
  performedDate: record.performed_date
    ? String(record.performed_date).slice(0, 10)
    : "",
  type: record.maintenance_type,
  equipmentType: record.equipment_type,
  equipmentId: record.equipment_id,
  equip: equipmentLabel(record.equipment_type, record.equipment_id),
  description: record.description ?? "",
  by: getAttendantName(record),
  performedById: record.performed_by ?? "",
  status: record.status ?? "scheduled",
  cost: record.cost == null ? null : Number(record.cost),
  notes: record.notes ?? "",
});

const EMPTY_FILTERS = {
  start: "",
  end: "",
  type: "All",
  equip: "All",
  status: "All",
  q: "",
};

const EMPTY_FORM = {
  date: iso(),
  type: "routine",
  equipmentType: "pump",
  equipmentId: "1",
  description: "",
  cost: "",
  notes: "",
};

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
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

function Button({
  children,
  variant = "blue",
  className = "",
  ...props
}) {
  const variants = {
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    green: "bg-emerald-500 text-white hover:bg-emerald-600",
    ghost: "border bg-white text-slate-700 hover:bg-slate-50",
    red: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, className = "", ...props }) {
  return (
    <label className={`block text-sm text-slate-700 ${className}`}>
      {label}
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-400"
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  className = "",
  ...props
}) {
  return (
    <label className={`block text-sm text-slate-700 ${className}`}>
      {label}
      <select
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="text-sm font-semibold text-slate-700">
        {label}
        {sub && (
          <span className="float-right ml-1 text-xs font-normal text-slate-500">
            {sub}
          </span>
        )}
      </p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function downloadCSV(filename, rows) {
  const escapeCell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = rows
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function MaintenanceReport() {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [calendar, setCalendar] = useState(() => {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() };
  });

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [completion, setCompletion] = useState({
    cost: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const today = iso();

  const request = useCallback(async (path, options = {}) => {
    const token = sessionStorage.getItem("gas_station_token");

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const validationErrors = result.errors
        ? Object.values(result.errors).flat().join(" ")
        : "";

      throw new Error(
        validationErrors ||
          result.message ||
          `Request failed (${response.status}).`
      );
    }

    return result;
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await request("/equipment-maintenance");
      const records = Array.isArray(result.data) ? result.data : [];

      setJobs(records.map(mapRecord));
    } catch (err) {
      setError(err.message || "Unable to load maintenance records.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredJobs = useMemo(() => {
    const search = filters.q.trim().toLowerCase();

    return jobs
      .filter((job) => {
        const dateMatches =
          (!filters.start || job.date >= filters.start) &&
          (!filters.end || job.date <= filters.end);

        const typeMatches =
          filters.type === "All" || job.type === filters.type;

        const equipmentMatches =
          filters.equip === "All" ||
          job.equipmentType === filters.equip;

        const statusMatches =
          filters.status === "All" || job.status === filters.status;

        const searchMatches =
          !search ||
          [
            job.description,
            job.equip,
            job.notes,
            job.by,
            job.id,
          ].some((value) =>
            String(value ?? "").toLowerCase().includes(search)
          );

        return (
          dateMatches &&
          typeMatches &&
          equipmentMatches &&
          statusMatches &&
          searchMatches
        );
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)
      );
  }, [jobs, filters]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredJobs.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, pageCount);

  const visibleJobs = filteredJobs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const selectedJob = modal?.id
    ? jobs.find((job) => String(job.id) === String(modal.id))
    : null;

  const monthKey = today.slice(0, 7);

  const monthJobs = jobs.filter((job) => job.date.startsWith(monthKey));

  const completedThisMonth = monthJobs.filter(
    (job) => job.status === "completed"
  );

  const openThisMonth = monthJobs.filter((job) =>
    ["scheduled", "in_progress"].includes(job.status)
  );

  const totalCost = jobs
    .filter((job) => job.status === "completed")
    .reduce((sum, job) => sum + (job.cost ?? 0), 0);

  const breakdown = EQUIPMENT_TYPES.map((equipment) => ({
    ...equipment,
    total: jobs
      .filter(
        (job) =>
          job.status === "completed" &&
          job.equipmentType === equipment.value
      )
      .reduce((sum, job) => sum + (job.cost ?? 0), 0),
  }));

  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setError("");
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, date: today });
    setError("");
    setModal({ type: "add" });
  };

  const submitAdd = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.description.trim()) {
      setError("Enter a maintenance description.");
      return;
    }

    const equipmentId = Number(form.equipmentId);

    if (!Number.isInteger(equipmentId) || equipmentId < 1) {
      setError("Equipment ID must be a positive integer.");
      return;
    }

    if (form.cost !== "" && (!Number.isFinite(Number(form.cost)) || Number(form.cost) < 0)) {
      setError("Cost must be zero or greater.");
      return;
    }

    setSaving(true);

    try {
      await request("/equipment-maintenance", {
        method: "POST",
        body: JSON.stringify({
          equipment_type: form.equipmentType,
          equipment_id: equipmentId,
          scheduled_date: form.date,
          maintenance_type: form.type,
          description: form.description.trim(),
          cost: form.cost === "" ? null : Number(form.cost),
          status: form.date > today ? "scheduled" : "in_progress",
          notes: form.notes.trim() || null,
        }),
      });

      await loadJobs();
      setModal(null);
      setToast("Maintenance record created successfully.");
    } catch (err) {
      setError(err.message || "Unable to create maintenance record.");
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (job) => {
    setCompletion({
      cost: job.cost == null ? "" : String(job.cost),
      notes: job.notes ?? "",
    });

    setError("");
    setModal({ type: "complete", id: job.id });
  };

  const submitComplete = async (event) => {
    event.preventDefault();

    if (!selectedJob) return;

    if (
      completion.cost !== "" &&
      (!Number.isFinite(Number(completion.cost)) ||
        Number(completion.cost) < 0)
    ) {
      setError("Cost must be zero or greater.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await request(`/equipment-maintenance/${selectedJob.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "completed",
          performed_date: today,
          cost:
            completion.cost === "" ? null : Number(completion.cost),
          notes: completion.notes.trim() || null,
        }),
      });

      await loadJobs();
      setModal(null);
      setToast("Maintenance job marked as completed.");
    } catch (err) {
      setError(err.message || "Unable to complete maintenance job.");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async () => {
    if (!selectedJob) return;

    setSaving(true);
    setError("");

    try {
      await request(`/equipment-maintenance/${selectedJob.id}`, {
        method: "DELETE",
      });

      await loadJobs();
      setModal(null);
      setToast("Maintenance record deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete maintenance record.");
    } finally {
      setSaving(false);
    }
  };

  const generateReport = () => {
    const rows = [
      [
        "Maintenance ID",
        "Scheduled Date",
        "Performed Date",
        "Maintenance Type",
        "Equipment Type",
        "Equipment ID",
        "Description",
        "Attendant",
        "Status",
        "Cost USD",
        "Notes",
      ],
      ...filteredJobs.map((job) => [
        job.id,
        job.date,
        job.performedDate,
        job.type,
        job.equipmentType,
        job.equipmentId,
        job.description,
        job.by,
        job.status,
        job.cost,
        job.notes,
      ]),
    ];

    downloadCSV(`maintenance_report_${today}.csv`, rows);
    setToast("Maintenance report downloaded.");
    setModal(null);
  };

  const firstDay = new Date(calendar.year, calendar.month, 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(
    calendar.year,
    calendar.month + 1,
    0
  ).getDate();

  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      calendar.year,
      calendar.month,
      index - offset + 1
    );

    return {
      date,
      key: iso(date),
      inMonth: date.getMonth() === calendar.month,
    };
  });

  const moveCalendar = (amount) => {
    setCalendar((current) => {
      const date = new Date(
        current.year,
        current.month + amount,
        1
      );

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  };

  const selectCalendarDay = (date) => {
    updateFilters({
      start: filters.start === date && filters.end === date ? "" : date,
      end: filters.start === date && filters.end === date ? "" : date,
    });
  };

  const statusBadge = (status) => {
    const config = STATUSES[status] ?? {
      label: status ?? "Unknown",
      className: "bg-slate-100 text-slate-700",
    };

    return (
      <span
        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 bg-slate-300 p-6 -m-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">
            Maintenance Report
          </h2>

          <Button variant="ghost" onClick={loadJobs} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field
            label="Start Date"
            type="date"
            value={filters.start}
            onChange={(e) => updateFilters({ start: e.target.value })}
          />

          <Field
            label="End Date"
            type="date"
            min={filters.start || undefined}
            value={filters.end}
            onChange={(e) => updateFilters({ end: e.target.value })}
          />

          <SelectField
            label="Maintenance Type"
            value={filters.type}
            onChange={(e) => updateFilters({ type: e.target.value })}
            options={[
              { value: "All", label: "All Types" },
              ...MAINTENANCE_TYPES,
            ]}
          />

          <SelectField
            label="Equipment"
            value={filters.equip}
            onChange={(e) => updateFilters({ equip: e.target.value })}
            options={[
              { value: "All", label: "All Equipment" },
              ...EQUIPMENT_TYPES,
            ]}
          />

          <SelectField
            label="Status"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            options={[
              { value: "All", label: "All Statuses" },
              ...Object.entries(STATUSES).map(([value, config]) => ({
                value,
                label: config.label,
              })),
            ]}
          />

          <Field
            label="Search"
            placeholder="Description or ID"
            value={filters.q}
            onChange={(e) => updateFilters({ q: e.target.value })}
          />
        </div>

        {JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) && (
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
            className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </section>

      {error && !modal && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-2 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total Maintenance Jobs" value={monthJobs.length} sub="This month" />
        <Stat label="Open Jobs" value={openThisMonth.length} />
        <Stat label="Completed Jobs" value={completedThisMonth.length} />
        <Stat label="Completed Cost" value={formatMoney(totalCost)} />
        <div className="flex flex-col justify-center gap-2">
          <Button variant="ghost" onClick={() => setModal({ type: "report" })}>
            <Download size={16} />
            Generate Report
          </Button>
          <Button variant="green" onClick={openAdd}>
            <Plus size={16} />
            Add New Job
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="mb-3 text-xl font-bold text-slate-900">
            Maintenance Log Table
          </h3>

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Loading maintenance records...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-400 text-left text-white">
                    {[
                      "Date",
                      "Type",
                      "Description",
                      "Equipment",
                      "Attendant",
                      "Status",
                      "Cost (USD)",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-3 py-2.5 font-semibold"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleJobs.map((job, index) => (
                    <tr
                      key={job.id}
                      className={`border-b border-slate-100 last:border-0 ${
                        index % 2 ? "bg-sky-50" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatDate(job.date)}
                      </td>
                      <td className="px-3 py-3">
                        {maintenanceTypeLabel(job.type)}
                      </td>
                      <td className="max-w-[220px] px-3 py-3">
                        {job.description || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {job.equip}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {job.by}
                      </td>
                      <td className="px-3 py-3">
                        {statusBadge(job.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatMoney(job.cost)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            title="View"
                            aria-label="View maintenance job"
                            onClick={() => {
                              setError("");
                              setModal({ type: "view", id: job.id });
                            }}
                            className="rounded-lg border p-1.5 hover:bg-slate-100"
                          >
                            <Eye size={15} />
                          </button>

                          {["scheduled", "in_progress"].includes(job.status) && (
                            <button
                              type="button"
                              title="Mark complete"
                              aria-label="Complete maintenance job"
                              onClick={() => openComplete(job)}
                              className="rounded-lg border border-emerald-300 p-1.5 text-emerald-600 hover:bg-emerald-50"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!visibleJobs.length && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No maintenance records match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-1 pt-3">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (number) => (
                <button
                  type="button"
                  key={number}
                  onClick={() => setPage(number)}
                  className={`rounded border px-3 py-1 text-sm ${
                    number === currentPage
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {number}
                </button>
              )
            )}

            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold">Maintenance Calendar View</h3>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => moveCalendar(-1)}
                  className="rounded p-1 hover:bg-slate-100"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="w-28 text-center text-xs font-semibold">
                  {firstDay.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>

                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => moveCalendar(1)}
                  className="rounded p-1 hover:bg-slate-100"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-500">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <span key={`${day}-${index}`} className="py-1">
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {calendarCells.map((cell) => {
                const dayJobs = jobs.filter((job) => job.date === cell.key);
                const active =
                  filters.start === cell.key && filters.end === cell.key;

                return (
                  <button
                    type="button"
                    key={cell.key}
                    onClick={() => selectCalendarDay(cell.key)}
                    title={`${dayJobs.length} maintenance job(s)`}
                    className={`flex h-9 flex-col items-center justify-center rounded-md ${
                      active
                        ? "bg-blue-600 text-white"
                        : cell.key === today
                        ? "ring-1 ring-blue-400"
                        : "hover:bg-slate-100"
                    } ${cell.inMonth ? "" : "text-slate-300"}`}
                  >
                    {cell.date.getDate()}
                    <span className="flex h-1.5 gap-0.5">
                      {dayJobs.slice(0, 3).map((job) => (
                        <i
                          key={job.id}
                          className={`h-1.5 w-1.5 rounded-full ${
                            job.status === "completed"
                              ? "bg-blue-500"
                              : job.status === "cancelled"
                              ? "bg-red-500"
                              : "bg-green-500"
                          }`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600">
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />
                Completed
              </span>
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
                Open / Scheduled
              </span>
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                Cancelled
              </span>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-3 text-sm font-bold">
              Maintenance Cost Breakdown
            </h3>

            {totalCost === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No completed maintenance costs yet.
              </p>
            ) : (
              <div className="space-y-3">
                {breakdown
                  .filter((item) => item.total > 0)
                  .map((item) => (
                    <div key={item.value}>
                      <div className="mb-1 flex justify-between gap-2 text-xs">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-semibold">
                          {formatMoney(item.total)}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{
                            width: `${Math.min(
                              100,
                              (item.total / totalCost) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                <div className="border-t pt-2 text-sm font-bold">
                  Total: {formatMoney(totalCost)}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {modal?.type === "add" && (
        <Modal title="Add New Maintenance Job" onClose={closeModal}>
          <form onSubmit={submitAdd} className="grid grid-cols-2 gap-3">
            <Field
              label="Scheduled Date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <SelectField
              label="Maintenance Type"
              options={MAINTENANCE_TYPES}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />

            <SelectField
              label="Equipment Type"
              options={EQUIPMENT_TYPES}
              value={form.equipmentType}
              onChange={(e) =>
                setForm({ ...form, equipmentType: e.target.value })
              }
            />

            <Field
              label="Equipment ID"
              type="number"
              min="1"
              step="1"
              required
              value={form.equipmentId}
              onChange={(e) =>
                setForm({ ...form, equipmentId: e.target.value })
              }
            />

            <Field
              label="Description"
              required
              className="col-span-2"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <Field
              label="Estimated Cost (USD)"
              type="number"
              min="0"
              step="0.01"
              className="col-span-2"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />

            <label className="col-span-2 block text-sm text-slate-700">
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-400"
              />
            </label>

            <p className="col-span-2 text-xs text-slate-500">
              The record will be saved to the maintenance database.
            </p>

            {error && (
              <p className="col-span-2 text-sm text-red-600">{error}</p>
            )}

            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Job"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "complete" && selectedJob && (
        <Modal title="Complete Maintenance Job" onClose={closeModal}>
          <form onSubmit={submitComplete} className="space-y-3">
            <p className="text-sm text-slate-500">
              {selectedJob.equip} · {maintenanceTypeLabel(selectedJob.type)}
            </p>

            <p className="text-sm text-slate-700">
              {selectedJob.description}
            </p>

            <Field
              label="Actual Cost (USD)"
              type="number"
              min="0"
              step="0.01"
              value={completion.cost}
              onChange={(e) =>
                setCompletion({ ...completion, cost: e.target.value })
              }
            />

            <label className="block text-sm text-slate-700">
              Completion Notes
              <textarea
                rows={3}
                value={completion.notes}
                onChange={(e) =>
                  setCompletion({ ...completion, notes: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-400"
              />
            </label>

            <p className="text-xs text-slate-500">
              Completion will save the status as completed and the performed
              date as today.
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" variant="green" disabled={saving}>
                {saving ? "Saving..." : "Confirm Completion"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "view" && selectedJob && (
        <Modal title="Maintenance Details" onClose={closeModal}>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Maintenance ID</dt>
            <dd>{selectedJob.id}</dd>

            <dt className="text-slate-500">Status</dt>
            <dd>{statusBadge(selectedJob.status)}</dd>

            <dt className="text-slate-500">Equipment</dt>
            <dd>{selectedJob.equip}</dd>

            <dt className="text-slate-500">Type</dt>
            <dd>{maintenanceTypeLabel(selectedJob.type)}</dd>

            <dt className="text-slate-500">Scheduled Date</dt>
            <dd>{formatDate(selectedJob.date)}</dd>

            <dt className="text-slate-500">Performed Date</dt>
            <dd>{formatDate(selectedJob.performedDate)}</dd>

            <dt className="text-slate-500">Attendant</dt>
            <dd>{selectedJob.by}</dd>

            <dt className="text-slate-500">Cost</dt>
            <dd>{formatMoney(selectedJob.cost)}</dd>

            <dt className="text-slate-500">Description</dt>
            <dd className="break-words">{selectedJob.description || "—"}</dd>

            <dt className="text-slate-500">Notes</dt>
            <dd className="break-words">{selectedJob.notes || "—"}</dd>
          </dl>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {["scheduled", "in_progress"].includes(selectedJob.status) && (
              <>
                <Button
                  type="button"
                  variant="red"
                  disabled={saving}
                  onClick={deleteJob}
                >
                  <Trash2 size={15} />
                  Delete
                </Button>

                <Button
                  type="button"
                  variant="green"
                  onClick={() => openComplete(selectedJob)}
                >
                  <CheckCircle size={15} />
                  Mark Complete
                </Button>
              </>
            )}

            <Button type="button" variant="ghost" onClick={closeModal}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {modal?.type === "report" && (
        <Modal title="Generate Maintenance Report" onClose={closeModal}>
          <p className="mb-3 text-sm text-slate-500">
            The report will include records matching your current filters.
          </p>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Jobs in report</dt>
              <dd className="font-medium">{filteredJobs.length}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-slate-500">Completed</dt>
              <dd className="font-medium">
                {filteredJobs.filter((job) => job.status === "completed").length}
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-slate-500">Open</dt>
              <dd className="font-medium">
                {
                  filteredJobs.filter((job) =>
                    ["scheduled", "in_progress"].includes(job.status)
                  ).length
                }
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-slate-500">Total listed cost</dt>
              <dd className="font-medium">
                {formatMoney(
                  filteredJobs.reduce((sum, job) => sum + (job.cost ?? 0), 0)
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={generateReport}
              disabled={!filteredJobs.length}
            >
              <Download size={15} />
              Download CSV
            </Button>
          </div>
        </Modal>
      )}

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
