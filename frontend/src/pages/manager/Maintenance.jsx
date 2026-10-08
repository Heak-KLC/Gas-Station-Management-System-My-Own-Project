import { useEffect, useMemo, useState } from "react";
import { Search, X, Eye, Pencil, Trash2, Calendar, Clock, CheckCircle, XCircle, DollarSign, Fuel, Database, Droplets, Video, Zap, MoreHorizontal, Filter, RotateCcw, Wrench } from "lucide-react";

const TYPES = ["Pump", "Tank", "Dispenser", "Security System", "Generator", "Other"];
const M_TYPES = ["Routine", "Inspection", "Repair", "Emergency"];
const STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"];
const EQUIPMENT = {
  Pump: [["PMP-001", "Fuel Pump #1"], ["PMP-002", "Fuel Pump #2"]],
  Tank: [["TANK-001", "Premium Tank"], ["TANK-002", "Diesel Tank #2"]],
  Dispenser: [["DSP-003", "Dispenser #3"]],
  "Security System": [["SEC-001", "CCTV System"]],
  Generator: [["GEN-001", "Generator #1"]],
  Other: [["OTH-001", "Air Compressor"], ["OTH-002", "Air Conditioner"]],
};
const STAFF = [["John Doe", "EMP-001"], ["Mike Johnson", "EMP-003"], ["Sarah Brown", "EMP-004"], ["David Wilson", "EMP-005"], ["Robert Taylor", "EMP-007"]];
const T_ICON = { Pump: [Fuel, "bg-blue-100 text-blue-600"], Tank: [Database, "bg-emerald-100 text-emerald-600"], Dispenser: [Droplets, "bg-orange-100 text-orange-500"],
  "Security System": [Video, "bg-violet-100 text-violet-600"], Generator: [Zap, "bg-red-100 text-red-500"], Other: [MoreHorizontal, "bg-slate-100 text-slate-500"] };
const M_STYLE = { Routine: "bg-sky-100 text-sky-600", Inspection: "bg-violet-100 text-violet-600", Repair: "bg-orange-100 text-orange-600", Emergency: "bg-red-100 text-red-600" };
const S_STYLE = { Scheduled: "bg-sky-100 text-sky-600", "In Progress": "bg-amber-100 text-amber-600", Completed: "bg-emerald-100 text-emerald-700", Cancelled: "bg-slate-100 text-slate-500" };
const PAGE_SIZE = 8;

const seed = (id, type, code, name, scheduled, performed, mtype, description, cost, status, by) => ({ id, type, code, name, scheduled, performed, mtype, description, cost, status, by });
const SEED = [
  seed(1, "Pump", "PMP-001", "Fuel Pump #1", "2026-10-01", "2026-10-01", "Routine", "Monthly routine maintenance", 120, "Completed", "EMP-001"),
  seed(2, "Tank", "TANK-002", "Diesel Tank #2", "2026-10-08", null, "Inspection", "Tank level sensor inspection", null, "Scheduled", "EMP-003"),
  seed(3, "Dispenser", "DSP-003", "Dispenser #3", "2026-10-02", "2026-10-02", "Repair", "Nozzle leaking issue fixed", 85, "Completed", "EMP-005"),
  seed(4, "Security System", "SEC-001", "CCTV System", "2026-10-05", null, "Routine", "CCTV camera check", 60, "In Progress", "EMP-004"),
  seed(5, "Generator", "GEN-001", "Generator #1", "2026-10-04", null, "Emergency", "Generator not starting", 250, "In Progress", "EMP-007"),
  seed(6, "Pump", "PMP-002", "Fuel Pump #2", "2026-10-18", null, "Routine", "Quarterly maintenance", 120, "Scheduled", "EMP-001"),
  seed(7, "Tank", "TANK-001", "Premium Tank", "2026-10-20", null, "Inspection", "Tank calibration check", 75, "Scheduled", "EMP-003"),
  seed(8, "Other", "OTH-001", "Air Compressor", "2026-10-22", null, "Repair", "Air leak in hose", 45, "Cancelled", null),
  seed(9, "Pump", "PMP-001", "Fuel Pump #1", "2026-09-15", "2026-09-15", "Routine", "Nozzle replacement", 95, "Completed", "EMP-001"),
  seed(10, "Dispenser", "DSP-003", "Dispenser #3", "2026-09-28", "2026-09-28", "Inspection", "Display and keypad check", 40, "Completed", "EMP-005"),
];
const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (s) => (s ? s.split("-").reverse().join("/") : "-");
const usd = (n) => (n == null ? "-" : n.toLocaleString("en-US", { style: "currency", currency: "USD" }));
const staffName = (emp) => STAFF.find((s) => s[1] === emp)?.[0] ?? "-";
const EMPTY_F = { q: "", type: "All Types", mtype: "All Types", status: "All Status", from: "", to: "" };

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${wide ? "max-w-xl" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}
const Btn = ({ children, v = "green", className = "", ...p }) => {
  const c = { green: "bg-emerald-500 text-white hover:bg-emerald-600", gold: "bg-[#b8860b] text-white hover:bg-[#9a7009]", ghost: "border text-slate-700 hover:bg-slate-50", red: "bg-red-500 text-white hover:bg-red-600" }[v];
  return <button {...p} className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${c} ${className}`}>{children}</button>;
};
const Pill = ({ cls, children }) => <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
const Field = ({ label, ...p }) => <label className="block text-sm">{label}<input {...p} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-sky-400" /></label>;
const Sel = ({ label, options, className = "", ...p }) => (
  <label className={`block text-sm ${className}`}>{label}<select {...p} className="mt-1 w-full rounded-lg border px-3 py-2">{options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select></label>
);

export default function Maintenance() {
  const [items, setItems] = useState(SEED);
  const [draft, setDraft] = useState(EMPTY_F);
  const [applied, setApplied] = useState(EMPTY_F);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { type: 'form'|'view'|'delete', id? }
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);
  const today = iso();
  const month = today.slice(0, 7);
  const thisMonth = items.filter((i) => i.scheduled.startsWith(month));
  const stats = {
    scheduled: thisMonth.length,
    progress: items.filter((i) => i.status === "In Progress").length,
    completed: thisMonth.filter((i) => i.status === "Completed").length,
    cancelled: thisMonth.filter((i) => i.status === "Cancelled").length,
    cost: thisMonth.filter((i) => i.status !== "Cancelled").reduce((s, i) => s + (i.cost ?? 0), 0),
  };

  const filtered = useMemo(() => {
    const s = applied.q.trim().toLowerCase();
    return items.filter((i) => (!s || [i.description, i.code, i.name, i.type, staffName(i.by)].some((v) => v.toLowerCase().includes(s))) &&
      (applied.type === "All Types" || i.type === applied.type) && (applied.mtype === "All Types" || i.mtype === applied.mtype) &&
      (applied.status === "All Status" || i.status === applied.status) && (!applied.from || i.scheduled >= applied.from) && (!applied.to || i.scheduled <= applied.to));
  }, [items, applied]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const sel = modal?.id ? items.find((i) => i.id === modal.id) : null;
  const close = () => { setModal(null); setError(""); };

  const applyFilter = () => { setApplied(draft); setPage(1); };
  const resetFilter = () => { setDraft(EMPTY_F); setApplied(EMPTY_F); setPage(1); };
  const update = (id, patch) => setItems((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const blank = { type: "Pump", code: "PMP-001", scheduled: today, performed: today, mtype: "Routine", description: "", cost: "", status: "Scheduled", by: STAFF[0][1] };
  const openAdd = () => { setForm(blank); setError(""); setModal({ type: "form" }); };
  const openEdit = (i) => { setForm({ type: i.type, code: i.code, scheduled: i.scheduled, performed: i.performed ?? today, mtype: i.mtype, description: i.description, cost: i.cost ?? "", status: i.status, by: i.by ?? STAFF[0][1] }); setError(""); setModal({ type: "form", id: i.id }); };
  const changeType = (type) => setForm({ ...form, type, code: EQUIPMENT[type][0][0] });

  const submit = (e) => {
    e.preventDefault();
    if (!form.scheduled) return setError("Choose a scheduled date.");
    if (!form.description.trim()) return setError("Enter a description.");
    if (form.cost !== "" && !(Number(form.cost) >= 0)) return setError("Cost must be 0 or more.");
    const eq = EQUIPMENT[form.type].find((x) => x[0] === form.code);
    const data = { type: form.type, code: form.code, name: eq[1], scheduled: form.scheduled, mtype: form.mtype, description: form.description.trim(),
      cost: form.cost === "" ? null : Number(form.cost), status: form.status, by: form.by, performed: form.status === "Completed" ? form.performed || today : null };
    if (modal.id) { update(modal.id, data); setToast("Maintenance updated"); }
    else { setItems((all) => [...all, { id: Math.max(0, ...all.map((i) => i.id)) + 1, ...data }]); setToast("Maintenance added"); }
    close();
  };
  const setStatus = (i, status) => {
    update(i.id, { status, performed: status === "Completed" ? today : i.performed });
    setToast(`#${i.id}: ${status}`); close();
  };
  const remove = () => { setItems((all) => all.filter((i) => i.id !== sel.id)); setToast(`#${sel.id} deleted`); close(); };

  const Stat = ({ icon: Icon, tone, label, value, note, noteCls }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={22} /></span>
      <div><p className="text-sm text-slate-700">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p><p className={`text-sm ${noteCls}`}>{note}</p></div>
    </div>
  );

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#b8860b] text-white"><Wrench size={28} /></span>
          <div><h2 className="text-2xl font-bold text-slate-900">Equipment Maintenance</h2><p className="text-sm text-slate-600">Schedule and track maintenance of station equipment</p></div></div>
        <Btn v="gold" onClick={openAdd}>+ Add Maintenance</Btn>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Stat icon={Calendar} tone="bg-blue-100 text-blue-600" label="Total Scheduled" value={stats.scheduled} note="This Month" noteCls="text-blue-600" />
        <Stat icon={Clock} tone="bg-amber-100 text-amber-600" label="In Progress" value={stats.progress} note="Currently" noteCls="text-amber-500" />
        <Stat icon={CheckCircle} tone="bg-emerald-100 text-emerald-600" label="Completed" value={stats.completed} note="This Month" noteCls="text-emerald-500" />
        <Stat icon={XCircle} tone="bg-red-100 text-red-500" label="Cancelled" value={stats.cancelled} note="This Month" noteCls="text-red-500" />
        <Stat icon={DollarSign} tone="bg-violet-100 text-violet-500" label="Total Cost" value={usd(stats.cost)} note="This Month" noteCls="text-violet-400" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[240px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} onKeyDown={(e) => e.key === "Enter" && applyFilter()} placeholder="Search equipment, description..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400" /></div>
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
            <thead><tr className="border-b text-left font-semibold text-slate-700">{["ID", "Equipment Type", "Equipment ID", "Scheduled Date", "Performed Date", "Maintenance Type", "Description", "Cost", "Status", "Performed By", "Actions"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((i) => { const [Icon, tone] = T_ICON[i.type]; return (
                <tr key={i.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-3">{i.id}</td>
                  <td className="px-3 py-3"><span className="flex items-center gap-2 whitespace-nowrap"><span className={`flex h-7 w-7 items-center justify-center rounded-md ${tone}`}><Icon size={15} /></span>{i.type}</span></td>
                  <td className="px-3 py-3"><b className="block">{i.code}</b><span className="text-slate-500">{i.name}</span></td>
                  <td className="px-3 py-3">{fmt(i.scheduled)}</td><td className="px-3 py-3">{fmt(i.performed)}</td>
                  <td className="px-3 py-3"><Pill cls={M_STYLE[i.mtype]}>{i.mtype}</Pill></td>
                  <td className="max-w-[160px] px-3 py-3">{i.description}</td><td className="px-3 py-3">{usd(i.cost)}</td>
                  <td className="px-3 py-3"><Pill cls={S_STYLE[i.status]}>{i.status}</Pill></td>
                  <td className="whitespace-nowrap px-3 py-3">{i.by ? <><span className="block">{staffName(i.by)}</span><span className="text-slate-500">{i.by}</span></> : "-"}</td>
                  <td className="px-3 py-3"><div className="flex gap-1.5">
                    <button aria-label="View" title="View" onClick={() => setModal({ type: "view", id: i.id })} className="rounded-lg border p-1.5 hover:bg-slate-100"><Eye size={14} /></button>
                    <button aria-label="Edit" title="Edit" onClick={() => openEdit(i)} className="rounded-lg border p-1.5 text-amber-600 hover:bg-amber-50"><Pencil size={14} /></button>
                    <button aria-label="Delete" title="Delete" onClick={() => setModal({ type: "delete", id: i.id })} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button></div></td>
                </tr>); })}
              {!rows.length && <tr><td colSpan={11} className="py-10 text-center text-slate-400">No maintenance records match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-1 py-3">
          <button disabled={cur === 1} onClick={() => setPage(cur - 1)} className="rounded border px-2.5 py-1 text-sm disabled:opacity-40">‹</button>
          {Array.from({ length: pages }, (_, n) => n + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={`rounded border px-3 py-1 text-sm ${n === cur ? "border-sky-500 bg-sky-500 text-white" : "hover:bg-slate-50"}`}>{n}</button>)}
          <button disabled={cur === pages} onClick={() => setPage(cur + 1)} className="rounded border px-2.5 py-1 text-sm disabled:opacity-40">»</button>
        </div>
      </div>

      {modal?.type === "form" && form && (
        <Modal wide title={modal.id ? `Edit maintenance #${modal.id}` : "Add maintenance"} onClose={close}>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Sel label="Equipment type" options={TYPES} value={form.type} onChange={(e) => changeType(e.target.value)} />
            <Sel label="Equipment" options={EQUIPMENT[form.type].map(([c, n]) => [c, `${c} · ${n}`])} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Field label="Scheduled date" type="date" value={form.scheduled} onChange={(e) => setForm({ ...form, scheduled: e.target.value })} />
            <Sel label="Maintenance type" options={M_TYPES} value={form.mtype} onChange={(e) => setForm({ ...form, mtype: e.target.value })} />
            <label className="col-span-2 block text-sm">Description<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <Field label="Cost ($)" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            <Sel label="Performed by" options={STAFF.map(([n, id]) => [id, `${n} (${id})`])} value={form.by} onChange={(e) => setForm({ ...form, by: e.target.value })} />
            <Sel label="Status" options={STATUSES} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            {form.status === "Completed" && <Field label="Performed date" type="date" value={form.performed} max={today} onChange={(e) => setForm({ ...form, performed: e.target.value })} />}
            {error && <p className="col-span-2 text-sm text-red-500">{error}</p>}
            <div className="col-span-2 flex justify-end gap-2"><Btn type="button" v="ghost" onClick={close}>Cancel</Btn><Btn type="submit" v="gold">{modal.id ? "Save changes" : "Add maintenance"}</Btn></div>
          </form>
        </Modal>)}

      {modal?.type === "view" && sel && (
        <Modal title={`#${sel.id} · ${sel.code} ${sel.name}`} onClose={close}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt><dd><Pill cls={S_STYLE[sel.status]}>{sel.status}</Pill></dd>
            <dt className="text-slate-500">Maintenance type</dt><dd><Pill cls={M_STYLE[sel.mtype]}>{sel.mtype}</Pill></dd>
            <dt className="text-slate-500">Equipment type</dt><dd>{sel.type}</dd><dt className="text-slate-500">Description</dt><dd>{sel.description}</dd>
            <dt className="text-slate-500">Scheduled</dt><dd>{fmt(sel.scheduled)}</dd><dt className="text-slate-500">Performed</dt><dd>{fmt(sel.performed)}</dd>
            <dt className="text-slate-500">Cost</dt><dd>{usd(sel.cost)}</dd><dt className="text-slate-500">Performed by</dt><dd>{sel.by ? `${staffName(sel.by)} (${sel.by})` : "-"}</dd></dl>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {sel.status === "Scheduled" && <Btn onClick={() => setStatus(sel, "In Progress")}>Start work</Btn>}
            {sel.status === "In Progress" && <Btn onClick={() => setStatus(sel, "Completed")}>Mark completed</Btn>}
            {(sel.status === "Scheduled" || sel.status === "In Progress") && <Btn v="ghost" onClick={() => setStatus(sel, "Cancelled")}>Cancel task</Btn>}
            <Btn v="ghost" onClick={() => openEdit(sel)}>Edit</Btn></div>
        </Modal>)}

      {modal?.type === "delete" && sel && (
        <Modal title="Delete maintenance record" onClose={close}>
          <p className="text-sm">Delete <b>#{sel.id} · {sel.description}</b> ({sel.code})? This cannot be undone.</p>
          <div className="mt-4 flex justify-end gap-2"><Btn v="ghost" onClick={close}>Cancel</Btn><Btn v="red" onClick={remove}>Delete</Btn></div>
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
