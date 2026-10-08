import { useEffect, useMemo, useState } from "react";
import { Eye, CheckCircle, Download, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";

const EQUIPMENT = ["Pump A", "Pump B", "Pump C", "Pump D", "Tank A", "Tank B", "Forecourt", "Other"];
const ATTENDANTS = ["Sovan Dara", "Mao Ly"];
const OUTCOMES = ["Completed", "Calibrated"];
const GROUPS = [
  { key: "Fuel Pumps", color: "#1d6fb8", match: (e) => e.startsWith("Pump") }, { key: "Tanks", color: "#7fb83a", match: (e) => e.startsWith("Tank") },
  { key: "Forecourt", color: "#f2c744", match: (e) => e === "Forecourt" }, { key: "Other", color: "#b9c4cc", match: () => true },
];
const STATUS_CLS = { Pending: "bg-amber-100 text-amber-700", Complete: "bg-emerald-100 text-emerald-700", Scheduled: "bg-sky-100 text-sky-700" };
const PAGE_SIZE = 5;

const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const fmt = (s) => { const [y, m, d] = s.split("-"); return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]}/${d}/${y}`; };
const usd = (n) => (n == null ? "–" : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }));
const J = (id, date, type, description, equip, by, status, cost, hours, outcome) => ({ id, date, type, description, equip, by, status, cost, hours, outcome });
const SEED = [
  J(1, addDays(-3), "Corrective", "Pump A Nozzle", "Pump A", "Sovan Dara", "Pending", null, null, null),
  J(2, addDays(-4), "Preventive", "Floater Sensor Check", "Tank B", "Mao Ly", "Complete", 30, 1.5, "Completed"),
  J(3, addDays(-6), "Preventive", "Calibrate Meters", "Pump D", "Sovan Dara", "Complete", 22, 2, "Calibrated"),
  J(4, addDays(-6), "Preventive", "Replace nozzle handle", "Pump D", "Sovan Dara", "Complete", 22, 3, "Completed"),
  J(5, addDays(-1), "Corrective", "Floater sensor failure", "Pump C", "Sovan Dara", "Pending", null, null, null),
  J(6, addDays(-2), "Preventive", "Tank A level gauge calibration", "Tank A", "Mao Ly", "Complete", 45, 2.5, "Calibrated"),
  J(7, addDays(-5), "Preventive", "Canopy light replacement", "Forecourt", "Mao Ly", "Complete", 24, 1, "Completed"),
  J(8, addDays(7), "Preventive", "Fuel filter check", "Pump B", "Sovan Dara", "Scheduled", null, null, null),
  J(9, addDays(15), "Preventive", "Tank A inspection", "Tank A", "Mao Ly", "Scheduled", null, null, null),
].map((j) => (j.equip === "Tank A" ? j : j));
const EMPTY_F = { start: "", end: "", type: "All", equip: "All", outcome: "All", q: "" };

const downloadCSV = (filename, rows) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}
const Btn = ({ children, v = "blue", className = "", ...p }) => {
  const c = { blue: "bg-blue-600 text-white hover:bg-blue-700", green: "bg-emerald-500 text-white hover:bg-emerald-600", ghost: "border bg-white text-slate-700 hover:bg-slate-50", red: "bg-red-500 text-white hover:bg-red-600" }[v];
  return <button {...p} className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${c} ${className}`}>{children}</button>;
};
const Field = ({ label, className = "", ...p }) => <label className={`block text-sm text-slate-700 ${className}`}>{label}<input {...p} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-400" /></label>;
const Sel = ({ label, options, className = "", ...p }) => <label className={`block text-sm text-slate-700 ${className}`}>{label}<select {...p} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{options.map((o) => <option key={o}>{o}</option>)}</select></label>;

function PieChart({ data }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="py-8 text-center text-xs text-slate-400">No completed costs yet.</p>;
  let a0 = -Math.PI / 2;
  const R = 62, cx = 80, cy = 80;
  const slices = data.filter((d) => d.value > 0).map((d) => {
    const a1 = a0 + (d.value / total) * 2 * Math.PI, large = a1 - a0 > Math.PI ? 1 : 0;
    const p = [cx + R * Math.cos(a0), cy + R * Math.sin(a0), cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
    const full = d.value === total;
    const path = full ? `M${cx - R},${cy} a${R},${R} 0 1,0 ${2 * R},0 a${R},${R} 0 1,0 ${-2 * R},0` : `M${cx},${cy} L${p[0]},${p[1]} A${R},${R} 0 ${large} 1 ${p[2]},${p[3]} Z`;
    a0 = a1; return { ...d, path };
  });
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 160 160" className="h-36 w-36 shrink-0">{slices.map((s) => (
        <path key={s.key} d={s.path} fill={s.color} stroke="#fff" strokeWidth="2" opacity={hover && hover !== s.key ? 0.5 : 1} onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)} className="cursor-pointer transition-opacity"><title>{`${s.key}: ${usd(s.value)}`}</title></path>))}</svg>
      <ul className="flex-1 space-y-1 text-xs">{data.map((d) => (
        <li key={d.key} onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)} className={`flex items-center gap-2 ${hover === d.key ? "font-semibold" : ""}`}><i className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />{d.key}<span className="ml-auto text-slate-500">{Math.round((d.value / total) * 100)}% · {usd(d.value)}</span></li>))}</ul>
    </div>
  );
}

export default function MaintenanceReport() {
  const [jobs, setJobs] = useState(SEED);
  const [f, setF] = useState(EMPTY_F);
  const [page, setPage] = useState(1);
  const [cal, setCal] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [modal, setModal] = useState(null); // { type, id }
  const [form, setForm] = useState(null);
  const [done, setDone] = useState({ cost: "", hours: "", outcome: "Completed" });
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const today = iso(), month = today.slice(0, 7);
  const monthJobs = jobs.filter((j) => j.date.startsWith(month));
  const monthDone = monthJobs.filter((j) => j.status === "Complete");
  const withHours = jobs.filter((j) => j.status === "Complete" && j.hours != null);
  const avgRepair = withHours.length ? withHours.reduce((s, j) => s + j.hours, 0) / withHours.length : null;

  const rows = useMemo(() => {
    const s = f.q.trim().toLowerCase();
    return jobs.filter((j) => (!f.start || j.date >= f.start) && (!f.end || j.date <= f.end) && (f.type === "All" || j.type === f.type) && (f.equip === "All" || j.equip === f.equip) &&
      (f.outcome === "All" || (j.status === "Complete" && j.outcome === f.outcome)) && (!s || [j.description, j.equip, j.by].some((v) => v.toLowerCase().includes(s)))).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [jobs, f]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)), cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const sel = modal?.id ? jobs.find((j) => j.id === modal.id) : null;
  const filtersOn = JSON.stringify(f) !== JSON.stringify(EMPTY_F);
  const set = (patch) => { setF({ ...f, ...patch }); setPage(1); };
  const close = () => { setModal(null); setError(""); setConfirmDel(false); };

  const breakdown = GROUPS.map((g) => ({ ...g, value: 0 }));
  jobs.filter((j) => j.status === "Complete" && j.cost).forEach((j) => { breakdown.find((g) => g.match(j.equip)).value += j.cost; });

  // calendar
  const first = new Date(cal.y, cal.m, 1), startOffset = first.getDay(), daysIn = new Date(cal.y, cal.m + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(cal.y, cal.m, 1 - startOffset + i); return { d, key: iso(d), inMonth: d.getMonth() === cal.m }; });
  const dots = (key) => { const js = jobs.filter((j) => j.date === key); return [js.some((j) => j.status === "Complete") && "bg-blue-500", js.some((j) => j.type === "Corrective") && "bg-red-500", js.some((j) => j.status === "Scheduled") && "bg-green-500"].filter(Boolean); };
  const pickDay = (key) => { if (f.start === key && f.end === key) set({ start: "", end: "" }); else set({ start: key, end: key }); };
  const moveCal = (n) => setCal(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const openAdd = () => { setForm({ date: today, type: "Preventive", equip: EQUIPMENT[0], description: "", cost: "", by: ATTENDANTS[0] }); setError(""); setModal({ type: "add" }); };
  const submitAdd = (e) => {
    e.preventDefault();
    if (!form.description.trim()) return setError("Enter a description.");
    if (form.cost !== "" && !(Number(form.cost) >= 0)) return setError("Cost must be 0 or more.");
    setJobs((all) => [...all, { id: Math.max(0, ...all.map((j) => j.id)) + 1, date: form.date, type: form.type, description: form.description.trim(), equip: form.equip, by: form.by,
      status: form.date > today ? "Scheduled" : "Pending", cost: form.cost === "" ? null : Number(form.cost), hours: null, outcome: null }]);
    setToast("Job added"); close();
  };
  const openComplete = (j) => { setDone({ cost: j.cost ?? "", hours: "", outcome: "Completed" }); setError(""); setModal({ type: "complete", id: j.id }); };
  const submitComplete = (e) => {
    e.preventDefault();
    if (done.cost !== "" && !(Number(done.cost) >= 0)) return setError("Cost must be 0 or more.");
    if (!(Number(done.hours) > 0)) return setError("Enter the repair time in hours.");
    setJobs((all) => all.map((j) => (j.id === sel.id ? { ...j, status: "Complete", cost: done.cost === "" ? j.cost : Number(done.cost), hours: Number(done.hours), outcome: done.outcome } : j)));
    setToast(`${sel.equip} job completed`); close();
  };
  const removeJob = () => { setJobs((all) => all.filter((j) => j.id !== sel.id)); setToast("Job deleted"); close(); };
  const generate = () => {
    downloadCSV(`maintenance_report_${today}.csv`, [["Date", "Type", "Description", "Equipment", "Attendant", "Status", "Outcome", "Repair hours", "Cost (USD)"], ...rows.map((j) => [fmt(j.date), j.type, j.description, j.equip, j.by, j.status, j.outcome, j.hours, j.cost])]);
    setToast("Report downloaded"); close();
  };

  const stat = (label, value, sub) => <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><p className="text-sm font-semibold text-slate-700">{label}{sub && <span className="ml-1 float-right text-xs font-normal text-slate-500">{sub}</span>}</p><p className="mt-1 text-3xl font-bold text-slate-900">{value}</p></div>;

  return (
    <div className="space-y-4 bg-slate-200 p-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-bold text-slate-900">Maintenance Report</h2><p className="text-sm text-slate-600">Active Shift: #09 (05:00 AM - 02:00 PM)</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Start Date" type="date" value={f.start} onChange={(e) => set({ start: e.target.value })} />
          <Field label="End Date" type="date" value={f.end} min={f.start} onChange={(e) => set({ end: e.target.value })} />
          <Sel label="Maintenance Type" options={["All", "Preventive", "Corrective"]} value={f.type} onChange={(e) => set({ type: e.target.value })} />
          <Sel label="Pump/Tank By" options={["All", ...EQUIPMENT]} value={f.equip} onChange={(e) => set({ equip: e.target.value })} />
          <Sel label="Completed Jobs" options={["All", "Calibrated", "Completed"]} value={f.outcome} onChange={(e) => set({ outcome: e.target.value })} />
          <Field label="Description" placeholder="Search" value={f.q} onChange={(e) => set({ q: e.target.value })} />
        </div>
        {filtersOn && <button onClick={() => { setF(EMPTY_F); setPage(1); }} className="mt-3 text-xs font-semibold text-blue-600 hover:underline">Clear filters</button>}
      </section>

      <div className="grid gap-4 md:grid-cols-[repeat(4,1fr)_auto]">
        {stat("Total Maintenance jobs", monthJobs.length, "(Month)")}{stat("Open Jobs", monthJobs.filter((j) => j.status !== "Complete").length)}{stat("Completed Jobs", monthDone.length)}
        {stat("Average Repair Time", avgRepair == null ? "–" : `${avgRepair.toFixed(1)} Hours`)}
        <div className="flex flex-col justify-center gap-2"><Btn v="ghost" onClick={() => setModal({ type: "report" })}>Generate Report</Btn><Btn v="green" onClick={openAdd} className="flex items-center justify-center gap-1.5"><Plus size={16} />Add New Job</Btn></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="mb-3 text-xl font-bold text-slate-900">Maintenance Log Table</h3>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-sky-400 text-left text-white">{["Date", "Type", "Description", "Equipment ID", "Attendant", "Status", "Cost (USD)", "Action"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{shown.map((j, i) => (
              <tr key={j.id} className={`border-b border-slate-100 last:border-0 ${i % 2 ? "bg-sky-50" : ""}`}>
                <td className="whitespace-nowrap px-3 py-3">{fmt(j.date)}</td><td className="px-3 py-3">{j.type}</td><td className="max-w-[200px] px-3 py-3">{j.description}</td><td className="px-3 py-3">{j.equip}</td><td className="whitespace-nowrap px-3 py-3">{j.by}</td>
                <td className="px-3 py-3"><span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_CLS[j.status]}`}>{j.status}</span></td><td className="px-3 py-3">{usd(j.cost)}</td>
                <td className="px-3 py-3"><div className="flex gap-1.5">
                  <button aria-label="View job" title="View" onClick={() => { setConfirmDel(false); setModal({ type: "view", id: j.id }); }} className="rounded-lg border p-1.5 hover:bg-slate-100"><Eye size={15} /></button>
                  {j.status !== "Complete" && <button aria-label="Complete job" title="Mark complete" onClick={() => openComplete(j)} className="rounded-lg border border-emerald-300 p-1.5 text-emerald-600 hover:bg-emerald-50"><CheckCircle size={15} /></button>}</div></td></tr>))}
              {!shown.length && <tr><td colSpan={8} className="py-10 text-center text-slate-400">No maintenance jobs match your filters.</td></tr>}</tbody></table></div>
          <div className="flex items-center justify-center gap-1 pt-3">
            <button disabled={cur === 1} onClick={() => setPage(cur - 1)} className="rounded border px-2.5 py-1 text-sm disabled:opacity-40">‹</button>
            {Array.from({ length: pages }, (_, k) => k + 1).map((k) => <button key={k} onClick={() => setPage(k)} className={`rounded border px-3 py-1 text-sm ${k === cur ? "border-sky-500 bg-sky-500 text-white" : "hover:bg-slate-50"}`}>{k}</button>)}
            <button disabled={cur === pages} onClick={() => setPage(cur + 1)} className="rounded border px-2.5 py-1 text-sm disabled:opacity-40">»</button></div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold">Maintenance Calendar View</h3>
              <div className="flex items-center gap-1"><button aria-label="Previous month" onClick={() => moveCal(-1)} className="rounded p-1 hover:bg-slate-100"><ChevronLeft size={16} /></button>
                <span className="w-24 text-center text-xs font-semibold">{first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                <button aria-label="Next month" onClick={() => moveCal(1)} className="rounded p-1 hover:bg-slate-100"><ChevronRight size={16} /></button></div></div>
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-500">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">{cells.map((c) => { const d = dots(c.key), active = f.start === c.key && f.end === c.key; return (
              <button key={c.key} onClick={() => pickDay(c.key)} title={d.length ? "Click to filter the log by this day" : ""} className={`flex h-9 flex-col items-center justify-center rounded-md ${active ? "bg-blue-600 text-white" : c.key === today ? "ring-1 ring-blue-400" : "hover:bg-slate-100"} ${c.inMonth ? "" : "text-slate-300"}`}>
                {c.d.getDate()}<span className="flex h-1.5 gap-0.5">{d.map((cl, i) => <i key={i} className={`h-1.5 w-1.5 rounded-full ${cl}`} />)}</span></button>); })}</div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />Completed jobs</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />Corrective</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />Scheduled maintenance</span></div>
          </section>
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><h3 className="mb-3 text-sm font-bold">Maintenance Cost Breakdown</h3><PieChart data={breakdown} /></section>
        </div>
      </div>

      {modal?.type === "add" && form && (
        <Modal title="Add new job" onClose={close}>
          <form onSubmit={submitAdd} className="grid grid-cols-2 gap-3">
            <Field label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Sel label="Type" options={["Preventive", "Corrective"]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            <Sel label="Equipment" options={EQUIPMENT} value={form.equip} onChange={(e) => setForm({ ...form, equip: e.target.value })} />
            <Sel label="Attendant" options={ATTENDANTS} value={form.by} onChange={(e) => setForm({ ...form, by: e.target.value })} />
            <Field label="Description" className="col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Field label="Cost (USD, optional)" type="number" min="0" step="0.01" className="col-span-2" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            <p className="col-span-2 text-xs text-slate-500">{form.date > today ? "Future date: the job will be saved as Scheduled." : "The job will be saved as Pending."}</p>
            {error && <p className="col-span-2 text-sm text-red-500">{error}</p>}
            <div className="col-span-2 flex justify-end gap-2"><Btn type="button" v="ghost" onClick={close}>Cancel</Btn><Btn type="submit">Add job</Btn></div>
          </form>
        </Modal>)}

      {modal?.type === "complete" && sel && (
        <Modal title={`Complete: ${sel.description}`} onClose={close}>
          <form onSubmit={submitComplete} className="space-y-3">
            <p className="text-sm text-slate-500">{sel.equip} · {sel.type} · {fmt(sel.date)}</p>
            <Sel label="Result" options={OUTCOMES} value={done.outcome} onChange={(e) => setDone({ ...done, outcome: e.target.value })} />
            <Field label="Repair time (hours)" type="number" min="0" step="0.1" value={done.hours} onChange={(e) => setDone({ ...done, hours: e.target.value })} />
            <Field label="Cost (USD)" type="number" min="0" step="0.01" value={done.cost} onChange={(e) => setDone({ ...done, cost: e.target.value })} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><Btn type="button" v="ghost" onClick={close}>Cancel</Btn><Btn v="green" type="submit">Mark complete</Btn></div>
          </form>
        </Modal>)}

      {modal?.type === "view" && sel && (
        <Modal title={sel.description} onClose={close}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt><dd><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[sel.status]}`}>{sel.status}</span></dd>
            <dt className="text-slate-500">Equipment</dt><dd>{sel.equip}</dd><dt className="text-slate-500">Type</dt><dd>{sel.type}</dd><dt className="text-slate-500">Date</dt><dd>{fmt(sel.date)}</dd>
            <dt className="text-slate-500">Attendant</dt><dd>{sel.by}</dd><dt className="text-slate-500">Cost</dt><dd>{usd(sel.cost)}</dd>
            <dt className="text-slate-500">Repair time</dt><dd>{sel.hours != null ? `${sel.hours} h` : "–"}</dd><dt className="text-slate-500">Result</dt><dd>{sel.outcome ?? "–"}</dd></dl>
          {sel.status !== "Complete" && (confirmDel ? (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm"><p className="mb-2 text-red-600">Delete this job?</p><div className="flex justify-end gap-2"><Btn v="ghost" onClick={() => setConfirmDel(false)}>Keep</Btn><Btn v="red" onClick={removeJob}>Delete</Btn></div></div>
          ) : <div className="mt-5 flex justify-end gap-2"><Btn v="ghost" className="!text-red-500" onClick={() => setConfirmDel(true)}>Delete</Btn><Btn v="green" onClick={() => openComplete(sel)}>Mark complete</Btn></div>)}
          {sel.status === "Complete" && <div className="mt-5 flex justify-end"><Btn v="ghost" onClick={close}>Close</Btn></div>}
        </Modal>)}

      {modal?.type === "report" && (
        <Modal title="Generate report" onClose={close}>
          <p className="mb-3 text-sm text-slate-500">{filtersOn ? "Using your current filters." : "All jobs (no filters)."}</p>
          <dl className="space-y-1.5 text-sm">{[["Jobs in report", rows.length], ["Completed", rows.filter((j) => j.status === "Complete").length], ["Open", rows.filter((j) => j.status !== "Complete").length], ["Total cost", usd(rows.reduce((s, j) => s + (j.cost ?? 0), 0))]].map(([k, v]) => (
            <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>))}</dl>
          <div className="mt-5 flex justify-end gap-2"><Btn v="ghost" onClick={close}>Close</Btn><Btn onClick={generate} disabled={!rows.length} className="flex items-center gap-2"><Download size={15} />Download CSV</Btn></div>
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
