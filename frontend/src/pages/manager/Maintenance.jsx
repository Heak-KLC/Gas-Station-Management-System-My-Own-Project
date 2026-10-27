
import { useEffect, useMemo, useState } from "react";
import {
  Search, X, Eye, Pencil, Trash2, Calendar, Clock, CheckCircle,
  XCircle, DollarSign, Fuel, Database, Droplets, Video, Zap,
  MoreHorizontal, Filter, RotateCcw, Wrench, RefreshCw, LoaderCircle
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

const TYPES = ["Pump", "Tank", "Dispenser", "Security System", "Generator", "Other"];
const M_TYPES = ["Routine", "Inspection", "Repair", "Emergency"];
const STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];
const PAGE_SIZE = 8;

const TYPE_TO_API = {
  Pump: "pump",
  Tank: "tank",
  Dispenser: "dispenser",
  "Security System": "security_system",
  Generator: "generator",
  Other: "other",
};

const API_TO_TYPE = Object.fromEntries(
  Object.entries(TYPE_TO_API).map(([label, value]) => [value, label])
);

const MTYPE_TO_API = {
  Routine: "routine",
  Inspection: "inspection",
  Repair: "repair",
  Emergency: "emergency",
};

const STATUS_TO_API = {
  Scheduled: "scheduled",
  "In Progress": "in_progress",
  Completed: "completed",
  Cancelled: "cancelled",
};

const API_TO_STATUS = Object.fromEntries(
  Object.entries(STATUS_TO_API).map(([label, value]) => [value, label])
);

const API_TO_MTYPE = Object.fromEntries(
  Object.entries(MTYPE_TO_API).map(([label, value]) => [value, label])
);

const T_ICON = {
  Pump: [Fuel, "bg-blue-100 text-blue-600"],
  Tank: [Database, "bg-emerald-100 text-emerald-600"],
  Dispenser: [Droplets, "bg-orange-100 text-orange-500"],
  "Security System": [Video, "bg-violet-100 text-violet-600"],
  Generator: [Zap, "bg-red-100 text-red-500"],
  Other: [MoreHorizontal, "bg-slate-100 text-slate-500"],
};

const M_STYLE = {
  Routine: "bg-sky-100 text-sky-600",
  Inspection: "bg-violet-100 text-violet-600",
  Repair: "bg-orange-100 text-orange-600",
  Emergency: "bg-red-100 text-red-600",
};

const S_STYLE = {
  Scheduled: "bg-sky-100 text-sky-600",
  "In Progress": "bg-amber-100 text-amber-600",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

const EMPTY_F = {
  q: "",
  type: "All Types",
  mtype: "All Types",
  status: "All Status",
  from: "",
  to: "",
};

const iso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmt = (s) => {
  if (!s) return "-";
  const value = String(s).slice(0, 10);
  const parts = value.split("-");
  return parts.length === 3 ? parts.reverse().join("/") : value;
};

const usd = (n) =>
  n == null || n === ""
    ? "-"
    : Number(n).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });

const getEmployeeName = (employee) => {
  if (!employee) return "Not assigned";

  const name = employee.full_name || "Unknown employee";
  const code = employee.employee_code;

  return code ? `${name} (${code})` : name;
};

const normalizeItem = (item) => ({
  id: Number(item.maintenance_id),
  type: API_TO_TYPE[item.equipment_type] || "Other",
  equipmentId: Number(item.equipment_id),
  scheduled: item.scheduled_date?.slice(0, 10) || "",
  performed: item.performed_date?.slice(0, 10) || null,
  mtype: API_TO_MTYPE[item.maintenance_type] || "Routine",
  description: item.description || "",
  cost: item.cost == null ? null : Number(item.cost),
  status: API_TO_STATUS[item.status] || "Scheduled",
  by: item.performed_by == null ? "" : String(item.performed_by),
  employee: item.performedBy || null,
  notes: item.notes || "",
});

const getApiError = (body) => {
  if (body?.errors) {
    return Object.values(body.errors).flat().join(" ");
  }

  return body?.message || "Request failed. Please try again.";
};

async function apiRequest(path = "", options = {}) {
  const token = sessionStorage.getItem("gas_station_token");

  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  const response = await fetch(`${API_URL}/equipment-maintenance${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired or unauthorized. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("You do not have permission to perform this action.");
    }

    throw new Error(getApiError(body));
  }

  return body;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${
          wide ? "max-w-xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
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

const Btn = ({ children, v = "green", className = "", ...p }) => {
  const colors = {
    green: "bg-emerald-500 text-white hover:bg-emerald-600",
    gold: "bg-[#b8860b] text-white hover:bg-[#9a7009]",
    ghost: "border text-slate-700 hover:bg-slate-50",
    red: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button
      {...p}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${colors[v]} ${className}`}
    >
      {children}
    </button>
  );
};

const Pill = ({ cls, children }) => (
  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
    {children}
  </span>
);

const Field = ({ label, ...p }) => (
  <label className="block text-sm">
    {label}
    <input
      {...p}
      className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-sky-400"
    />
  </label>
);

const Sel = ({ label, options, className = "", ...p }) => (
  <label className={`block text-sm ${className}`}>
    {label}
    <select {...p} className="mt-1 w-full rounded-lg border px-3 py-2">
      {options.map((option) =>
        Array.isArray(option) ? (
          <option key={option[0]} value={option[0]}>
            {option[1]}
          </option>
        ) : (
          <option key={option} value={option}>
            {option}
          </option>
        )
      )}
    </select>
  </label>
);

export default function Maintenance() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(EMPTY_F);
  const [applied, setApplied] = useState(EMPTY_F);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = iso();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadItems = async ({ throwOnError = false } = {}) => {
  setLoading(true);
  setError("");

  try {
    const result = await apiRequest();

    if (!Array.isArray(result.data)) {
      throw new Error(
        "Unexpected API response. Expected a data array."
      );
    }

    setItems(result.data.map(normalizeItem));
  } catch (err) {
    const message =
      err.message || "Unable to load maintenance records.";

    setError(message);

    if (throwOnError) {
      throw err;
    }
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadItems();
}, []);

  const thisMonth = items.filter((item) => item.scheduled.startsWith(today.slice(0, 7)));

  const stats = {
    scheduled: thisMonth.filter((item) => item.status === "Scheduled").length,
    progress: items.filter((item) => item.status === "In Progress").length,
    completed: thisMonth.filter((item) => item.status === "Completed").length,
    cancelled: thisMonth.filter((item) => item.status === "Cancelled").length,
    cost: thisMonth
      .filter((item) => item.status !== "Cancelled")
      .reduce((sum, item) => sum + (item.cost ?? 0), 0),
  };

  const filtered = useMemo(() => {
    const query = applied.q.trim().toLowerCase();

    return items.filter((item) => {
      const employeeName = getEmployeeName(item.employee);
      const searchFields = [
        item.description,
        item.equipmentId,
        item.type,
        employeeName,
        item.notes,
      ];

      return (
        (!query || searchFields.some((value) => String(value ?? "").toLowerCase().includes(query))) &&
        (applied.type === "All Types" || item.type === applied.type) &&
        (applied.mtype === "All Types" || item.mtype === applied.mtype) &&
        (applied.status === "All Status" || item.status === applied.status) &&
        (!applied.from || item.scheduled >= applied.from) &&
        (!applied.to || item.scheduled <= applied.to)
      );
    });
  }, [items, applied]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const selected = modal?.id
    ? items.find((item) => item.id === modal.id)
    : null;

  const close = () => {
    setModal(null);
    setError("");
  };

  const applyFilter = () => {
    setApplied({ ...draft });
    setPage(1);
  };

  const resetFilter = () => {
    setDraft({ ...EMPTY_F });
    setApplied({ ...EMPTY_F });
    setPage(1);
  };

  const blank = {
    type: "Pump",
    equipmentId: "",
    scheduled: today,
    performed: "",
    mtype: "Routine",
    description: "",
    cost: "",
    status: "Scheduled",
    by: "",
    notes: "",
  };

  const openAdd = () => {
    setForm({ ...blank });
    setError("");
    setModal({ type: "form" });
  };

  const openEdit = (item) => {
    setForm({
      type: item.type,
      equipmentId: String(item.equipmentId),
      scheduled: item.scheduled,
      performed: item.performed || "",
      mtype: item.mtype,
      description: item.description,
      cost: item.cost ?? "",
      status: item.status,
      by: item.by || "",
      notes: item.notes || "",
    });
    setError("");
    setModal({ type: "form", id: item.id });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.scheduled) {
      setError("Choose a scheduled date.");
      return;
    }

      // Validate scheduled and performed dates
  if (form.scheduled < today && !modal.id) {
    setError("Scheduled date cannot be in the past.");
    return;
  }

  if (form.performed && form.performed > today) {
    setError("Performed date cannot be in the future.");
    return;
  }

  if (
    form.performed &&
    form.performed < form.scheduled
  ) {
    setError(
      "Performed date cannot be before the scheduled date."
    );
    return;
  }

    if (!form.equipmentId || !Number.isInteger(Number(form.equipmentId)) || Number(form.equipmentId) < 1) {
      setError("Enter a valid equipment ID (positive integer).");
      return;
    }

    if (!form.description.trim()) {
      setError("Enter a description.");
      return;
    }

    if (form.cost !== "" && (!Number.isFinite(Number(form.cost)) || Number(form.cost) < 0)) {
      setError("Cost must be 0 or more.");
      return;
    }

    if (form.by && (!Number.isInteger(Number(form.by)) || Number(form.by) < 1)) {
      setError("Performed by must be a valid employee ID.");
      return;
    }

    if (form.status === "Completed" && !form.performed) {
      setError("Choose the performed date for completed maintenance.");
      return;
    }

    const payload = {
      equipment_type: TYPE_TO_API[form.type],
      equipment_id: Number(form.equipmentId),
      scheduled_date: form.scheduled,
      performed_date: form.status === "Completed" ? form.performed : null,
      maintenance_type: MTYPE_TO_API[form.mtype],
      description: form.description.trim(),
      cost: form.cost === "" ? null : Number(form.cost),
      status: STATUS_TO_API[form.status],
      performed_by: form.by ? Number(form.by) : null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (modal.id) {
        await apiRequest(`/${modal.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setToast("Maintenance updated successfully.");
      } else {
        await apiRequest("", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToast("Maintenance added successfully.");
      }

      close();
      await loadItems();
    } catch (err) {
      setError(err.message || "Unable to save maintenance.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (item, status) => {
  setError("");

  if (saving) return;

  if (status === "Completed" && !item.performed && !today) {
    setError("A performed date is required.");
    return;
  }

  setSaving(true);

  try {
    const payload = {
      equipment_type: TYPE_TO_API[item.type],
      equipment_id: item.equipmentId,
      scheduled_date: item.scheduled,
      performed_date:
        status === "Completed"
          ? item.performed || today
          : item.performed || null,
      maintenance_type: MTYPE_TO_API[item.mtype],
      description: item.description || null,
      cost: item.cost,
      status: STATUS_TO_API[status],
      performed_by: item.by ? Number(item.by) : null,
      notes: item.notes || null,
    };

    await apiRequest(`/${item.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    setToast(`#${item.id}: ${status}`);
    close();

    await loadItems();
  } catch (err) {
    setError(err.message || "Unable to update status.");
  } finally {
    setSaving(false);
  }
};

  const remove = async () => {
    if (!selected) return;

    setSaving(true);
    setError("");

    try {
      await apiRequest(`/${selected.id}`, { method: "DELETE" });
      setToast(`#${selected.id} deleted successfully.`);
      close();
      await loadItems();
    } catch (err) {
      setError(err.message || "Unable to delete maintenance.");
    } finally {
      setSaving(false);
    }
  };

  const Stat = ({ icon: Icon, tone, label, value, note, noteCls }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon size={22} />
      </span>
      <div>
        <p className="text-lg font-black text-slate-600">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className={`text-sm ${noteCls}`}>{note}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 bg-slate-300 -m-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#b8860b] text-white">
            <Wrench size={28} />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Equipment Maintenance</h2>
            <p className="text-sm text-slate-600">Schedule and track maintenance of station equipment</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Btn v="ghost" onClick={loadItems} disabled={loading || saving}>
            <RefreshCw size={15} className="mr-1 inline" /> Refresh
          </Btn>
          <Btn v="gold" onClick={openAdd}>+ Add Maintenance</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Stat icon={Calendar} tone="bg-blue-100 text-blue-600" label="Total Scheduled" value={stats.scheduled} note="This Month" noteCls="text-blue-600" />
        <Stat icon={Clock} tone="bg-amber-100 text-amber-600" label="In Progress" value={stats.progress} note="Currently" noteCls="text-amber-500" />
        <Stat icon={CheckCircle} tone="bg-emerald-100 text-emerald-600" label="Completed" value={stats.completed} note="This Month" noteCls="text-emerald-500" />
        <Stat icon={XCircle} tone="bg-red-100 text-red-500" label="Cancelled" value={stats.cancelled} note="This Month" noteCls="text-red-500" />
        <Stat icon={DollarSign} tone="bg-violet-100 text-violet-500" label="Total Cost" value={usd(stats.cost)} note="This Month" noteCls="text-violet-400" />
      </div>

      {error && !modal && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && applyFilter()}
            placeholder="Search equipment, description..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400"
          />
        </div>

        <Sel label="Equipment type" options={["All Types", ...TYPES]} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
        <Sel label="Maintenance type" options={["All Types", ...M_TYPES]} value={draft.mtype} onChange={(e) => setDraft({ ...draft, mtype: e.target.value })} />
        <Sel label="Status" options={["All Status", ...STATUSES]} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} />
        <Field label="From" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <Field label="To" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <Btn v="gold" onClick={applyFilter} className="flex items-center gap-2"><Filter size={15} />Filter</Btn>
        <Btn v="ghost" onClick={resetFilter} className="flex items-center gap-2 bg-white"><RotateCcw size={15} />Reset</Btn>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left font-semibold text-slate-700">
                {["ID", "Equipment Type", "Equipment ID", "Scheduled Date", "Performed Date", "Maintenance Type", "Description", "Cost", "Status", "Performed By", "Actions"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    <LoaderCircle size={20} className="mr-2 inline animate-spin" />Loading maintenance records...
                  </td>
                </tr>
              ) : rows.map((item) => {
                const [Icon, tone] = T_ICON[item.type] || T_ICON.Other;

                return (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3">{item.id}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${tone}`}><Icon size={15} /></span>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-3 py-3"><b>#{item.equipmentId}</b></td>
                    <td className="px-3 py-3">{fmt(item.scheduled)}</td>
                    <td className="px-3 py-3">{fmt(item.performed)}</td>
                    <td className="px-3 py-3"><Pill cls={M_STYLE[item.mtype]}>{item.mtype}</Pill></td>
                    <td className="max-w-[160px] px-3 py-3">{item.description}</td>
                    <td className="px-3 py-3">{usd(item.cost)}</td>
                    <td className="px-3 py-3"><Pill cls={S_STYLE[item.status]}>{item.status}</Pill></td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {item.by ? (
                        <>
                          <span className="block">{getEmployeeName(item.employee)}</span>
                          <span className="text-slate-500">ID: {item.by}</span>
                        </>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <button aria-label="View" title="View" onClick={() => setModal({ type: "view", id: item.id })} className="rounded-lg border p-1.5 hover:bg-slate-100"><Eye size={14} /></button>
                        <button aria-label="Edit" title="Edit" onClick={() => openEdit(item)} className="rounded-lg border p-1.5 text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
                        <button aria-label="Delete" title="Delete" onClick={() => setModal({ type: "delete", id: item.id })} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && !rows.length && (
                <tr><td colSpan={11} className="py-10 text-center text-slate-400">No maintenance records match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-1 py-3">
          <button disabled={cur === 1} onClick={() => setPage(cur - 1)} className="rounded border px-2.5 py-1 text-sm disabled:opacity-40">‹</button>
          {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
            <button key={number} onClick={() => setPage(number)} className={`rounded border px-3 py-1 text-sm ${number === cur ? "border-sky-500 bg-sky-500 text-white" : "hover:bg-slate-50"}`}>{number}</button>
          ))}
          <button disabled={cur === pages} onClick={() => setPage(cur + 1)} className="rounded border px-2.5 py-1 text-sm disabled:opacity-40">»</button>
        </div>
      </div>

      {modal?.type === "form" && form && (
        <Modal wide title={modal.id ? `Edit maintenance #${modal.id}` : "Add maintenance"} onClose={close}>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Sel label="Equipment type" options={TYPES} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />

            <Field
              label="Equipment database ID"
              type="number"
              min="1"
              step="1"
              required
              value={form.equipmentId}
              onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
              placeholder="Example: 1"
            />

            <Field label="Scheduled date" type="date" required value={form.scheduled} onChange={(e) => setForm({ ...form, scheduled: e.target.value })} />
            <Sel label="Maintenance type" options={M_TYPES} value={form.mtype} onChange={(e) => setForm({ ...form, mtype: e.target.value })} />

            <label className="col-span-2 block text-sm">
              Description
              <textarea rows={2} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>

            <Field label="Cost ($)" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />

            <Field
              label="Employee database ID (optional)"
              type="number"
              min="1"
              step="1"
              value={form.by}
              onChange={(e) => setForm({ ...form, by: e.target.value })}
              placeholder="Employee ID"
            />

            <Sel label="Status" options={STATUSES} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />

            {form.status === "Completed" && (
              <Field label="Performed date" type="date" max={today} value={form.performed} onChange={(e) => setForm({ ...form, performed: e.target.value })} />
            )}

            
<label className="col-span-2 block text-sm">
  Manager Response
  <textarea
    rows={3}
    value={form.notes}
    onChange={(e) =>
      setForm({ ...form, notes: e.target.value })
    }
    placeholder="Describe the action taken or response to the reported issue..."
    className="mt-1 w-full rounded-lg border px-3 py-2"
  />
</label>


            {error && <p className="col-span-2 text-sm text-red-500">{error}</p>}

            <div className="col-span-2 flex justify-end gap-2">
              <Btn type="button" v="ghost" onClick={close} disabled={saving}>Cancel</Btn>
              <Btn type="submit" v="gold" disabled={saving}>
                {saving ? "Saving..." : modal.id ? "Save changes" : "Add maintenance"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "view" && selected && (
        <Modal title={`#${selected.id} · ${selected.type} #${selected.equipmentId}`} onClose={close}>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Status</dt><dd><Pill cls={S_STYLE[selected.status]}>{selected.status}</Pill></dd>
            <dt className="text-slate-500">Maintenance type</dt><dd><Pill cls={M_STYLE[selected.mtype]}>{selected.mtype}</Pill></dd>
            <dt className="text-slate-500">Equipment type</dt><dd>{selected.type}</dd>
            <dt className="text-slate-500">Equipment ID</dt><dd>{selected.equipmentId}</dd>
            <dt className="text-slate-500">Description</dt><dd className="break-words">{selected.description || "-"}</dd>
            <dt className="text-slate-500">Scheduled</dt><dd>{fmt(selected.scheduled)}</dd>
            <dt className="text-slate-500">Performed</dt><dd>{fmt(selected.performed)}</dd>
            <dt className="text-slate-500">Cost</dt><dd>{usd(selected.cost)}</dd>
            <dt className="text-slate-500">Performed by</dt><dd>{selected.by ? `${getEmployeeName(selected.employee)} (ID: ${selected.by})` : "-"}</dd>
            <dt className="text-slate-500">Manager Response</dt>
<dd className="break-words whitespace-pre-wrap">
  {selected.notes || "No response yet."}
</dd>
          </dl>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {selected.status === "Scheduled" && <Btn onClick={() => setStatus(selected, "In Progress")} disabled={saving}>Start work</Btn>}
            {selected.status === "In Progress" && <Btn onClick={() => setStatus(selected, "Completed")} disabled={saving}>Mark completed</Btn>}
            {(selected.status === "Scheduled" || selected.status === "In Progress") && <Btn v="ghost" onClick={() => setStatus(selected, "Cancelled")} disabled={saving}>Cancel task</Btn>}
            <Btn v="ghost" onClick={() => openEdit(selected)} disabled={saving}>Edit</Btn>
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </Modal>
      )}

      {modal?.type === "delete" && selected && (
        <Modal title="Delete maintenance record" onClose={close}>
          <p className="text-sm">
            Delete <b>#{selected.id} · {selected.description}</b> (Equipment #{selected.equipmentId})? This cannot be undone.
          </p>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Btn v="ghost" onClick={close} disabled={saving}>Cancel</Btn>
            <Btn v="red" onClick={remove} disabled={saving}>{saving ? "Deleting..." : "Delete"}</Btn>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}