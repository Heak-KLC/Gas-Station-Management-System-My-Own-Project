import { useEffect, useMemo, useState } from "react";
import { Fuel, Search, X } from "lucide-react";

const STATUS = {
  "Available Now": { dot: "bg-emerald-500", ring: "border-l-emerald-500", text: "text-emerald-700" },
  "In Use": { dot: "bg-blue-700", ring: "border-l-blue-700", text: "text-blue-700" },
  "Under Maintenance": { dot: "bg-yellow-500", ring: "border-l-yellow-500", text: "text-yellow-700" },
  "Out of Service": { dot: "bg-red-500", ring: "border-l-red-500", text: "text-red-600" },
};
const NEEDS_REASON = ["Under Maintenance", "Out of Service"];
const TANKS = { "Tank #01": { fuel: "Diesel", level: 82 }, "Tank #02": { fuel: "Regular", level: 82 }, "Tank #03": { fuel: "Premium", level: 32 }, "Tank #04": { fuel: "LPG", level: 82 } };
const FUELS = ["Diesel", "Regular", "Premium", "LPG"];
const ATTENDANTS = ["Unassigned", "Sovan Dara", "Mao Ly", "Rin Linda", "Leng Sang"];
const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const tanksFor = (fuel) => Object.keys(TANKS).filter((t) => TANKS[t].fuel === fuel);

const SEED = [
  { id: "Pump #01", fuel: "Diesel", tank: "Tank #01", status: "Available Now", attendant: "Sovan Dara", liters: 1250, sales: 4375, service: "05/08/2026" },
  { id: "Pump #02", fuel: "Regular", tank: "Tank #02", status: "In Use", attendant: "Mao Ly", liters: 980, sales: 4116, service: "28/07/2026" },
  { id: "Pump #03", fuel: "Premium", tank: "Tank #03", status: "Available Now", attendant: "Rin Linda", liters: 760, sales: 3192, service: "30/07/2026" },
  { id: "Pump #04", fuel: "LPG", tank: "Tank #04", status: "Under Maintenance", attendant: "Leng Sang", liters: 0, sales: 0, service: "02/08/2026" },
];
const SEED_LOG = [
  { id: 1, pump: "Pump #04", from: "Available Now", to: "Under Maintenance", reason: "Floater sensor failure", when: "Today 11:25 AM" },
  { id: 2, pump: "Pump #02", from: "Available Now", to: "In Use", reason: "", when: "Today 09:40 AM" },
  { id: 3, pump: "Pump #01", from: "Under Maintenance", to: "Available Now", reason: "Nozzle replaced", when: "Yesterday" },
  { id: 4, pump: "Pump #03", from: "Out of Service", to: "Available Now", reason: "Power restored", when: "2 days ago" },
];

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
const GreenBtn = ({ children, className = "", ...p }) => (
  <button {...p} className={`rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40 ${className}`}>{children}</button>
);
const GhostBtn = ({ children, className = "", ...p }) => (
  <button {...p} className={`rounded-full border px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 ${className}`}>{children}</button>
);
const Sel = ({ label, options, ...p }) => (
  <label className="block text-sm">{label}<select {...p} className="mt-1 w-full rounded-lg border px-3 py-2">{options.map((o) => <option key={o}>{o}</option>)}</select></label>
);

export default function PumpsStatus() {
  const [pumps, setPumps] = useState(SEED);
  const [log, setLog] = useState(SEED_LOG);
  const [q, setQ] = useState("");
  const [fuel, setFuel] = useState("All fuel types");
  const [chip, setChip] = useState("All");
  const [allLog, setAllLog] = useState(false);
  const [modal, setModal] = useState(null); // { type, id, status }
  const [form, setForm] = useState({ fuel: "Diesel", tank: "Tank #01", attendant: "Unassigned" });
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const count = (s) => pumps.filter((p) => p.status === s).length;
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return pumps.filter((p) => (chip === "All" || p.status === chip) && (fuel === "All fuel types" || p.fuel === fuel) &&
      (!s || [p.id, p.fuel, p.tank, p.attendant].some((v) => v.toLowerCase().includes(s))));
  }, [pumps, q, fuel, chip]);
  const sel = modal?.id ? pumps.find((p) => p.id === modal.id) : null;
  const close = () => { setModal(null); setError(""); setReason(""); };

  const applyStatus = (pump, to, why = "") => {
    setPumps((all) => all.map((p) => (p.id === pump.id ? { ...p, status: to, service: NEEDS_REASON.includes(to) ? new Date().toLocaleDateString("en-GB") : p.service } : p)));
    setLog((l) => [{ id: Date.now(), pump: pump.id, from: pump.status, to, reason: why, when: "Just now" }, ...l]);
    setToast(`${pump.id}: ${to}`);
  };
  const requestStatus = (pump, to) => {
    if (to === pump.status) return;
    if (NEEDS_REASON.includes(to)) { setReason(""); setError(""); setModal({ type: "reason", id: pump.id, status: to }); } else applyStatus(pump, to);
  };
  const submitReason = (e) => {
    e.preventDefault();
    if (!reason.trim()) return setError("Enter a reason so the team knows what happened.");
    applyStatus(sel, modal.status, reason.trim());
    close();
  };

  const openAdd = () => { setForm({ fuel: "Diesel", tank: tanksFor("Diesel")[0], attendant: "Unassigned" }); setError(""); setModal({ type: "add" }); };
  const openEdit = (p) => { setForm({ fuel: p.fuel, tank: p.tank, attendant: p.attendant }); setError(""); setModal({ type: "edit", id: p.id }); };
  const changeFuel = (f) => setForm({ ...form, fuel: f, tank: tanksFor(f)[0] });
  const submitAdd = (e) => {
    e.preventDefault();
    if (!form.tank) return setError("No tank is available for this fuel type.");
    const next = Math.max(0, ...pumps.map((p) => Number(p.id.replace(/\D/g, "")))) + 1;
    const id = `Pump #${String(next).padStart(2, "0")}`;
    setPumps((all) => [...all, { id, ...form, status: "Available Now", liters: 0, sales: 0, service: new Date().toLocaleDateString("en-GB") }]);
    setToast(`${id} added`); close();
  };
  const submitEdit = (e) => {
    e.preventDefault();
    if (!form.tank) return setError("No tank is available for this fuel type.");
    setPumps((all) => all.map((p) => (p.id === sel.id ? { ...p, ...form } : p)));
    setToast(`${sel.id} updated`); close();
  };
  const removePump = () => {
    if (sel.status === "In Use") return setError("This pump is in use. Change its status before removing it.");
    setPumps((all) => all.filter((p) => p.id !== sel.id)); setToast(`${sel.id} removed`); close();
  };

  const Stat = ({ label, value, note, c }) => (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><p className="flex items-center gap-2 text-sm text-slate-500">{c && <i className={`h-3 w-3 rounded-full ${c}`} />}{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></div>
  );

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-slate-800">Pumps & Status</h2><p className="text-sm text-slate-500">Monitor every pump and change its status</p></div>
        <GreenBtn className="py-2 text-sm" onClick={openAdd}>+ Add Pump</GreenBtn>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total Pumps" value={pumps.length} note="All pumps at this branch" />
        <Stat label="Available Now" value={count("Available Now")} note="Ready to dispense" c="bg-emerald-500" />
        <Stat label="In Use" value={count("In Use")} note="Currently dispensing" c="bg-blue-700" />
        <Stat label="Not operating" value={count("Under Maintenance") + count("Out of Service")} note="Maintenance or out of service" c="bg-red-500" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pump, fuel, tank, attendant..." className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400" /></div>
        <select value={fuel} onChange={(e) => setFuel(e.target.value)} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm">{["All fuel types", ...FUELS].map((f) => <option key={f}>{f}</option>)}</select>
        <div className="flex flex-wrap gap-2">{["All", ...Object.keys(STATUS)].map((s) => (
          <button key={s} onClick={() => setChip(s)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${chip === s ? "bg-yellow-300 text-slate-900" : "bg-slate-600 text-white hover:bg-slate-700"}`}>
            {s}{s !== "All" ? ` (${count(s)})` : ` (${pumps.length})`}</button>))}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => { const st = STATUS[p.status], tk = TANKS[p.tank]; return (
          <article key={p.id} className={`rounded-2xl border-l-4 bg-white p-5 shadow-sm ring-1 ring-slate-100 ${st.ring}`}>
            <div className="flex items-start justify-between">
              <div><h3 className="text-xl font-bold text-slate-900">{p.id}</h3><p className="text-sm text-slate-600">{p.fuel} · {p.tank}</p></div>
              <Fuel size={30} className={p.status === "Under Maintenance" || p.status === "Out of Service" ? "text-slate-300" : "text-orange-500"} />
            </div>
            <p className={`mt-2 flex items-center gap-2 text-sm font-semibold ${st.text}`}><i className={`h-3 w-3 rounded-full ${st.dot}`} />{p.status}</p>
            <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-slate-500"><span>Tank level</span><span>{tk ? `${tk.level}%` : "-"}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full ${tk && tk.level < 40 ? "bg-yellow-500" : "bg-emerald-500"}`} style={{ width: `${tk?.level ?? 0}%` }} /></div></div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs"><dt className="text-slate-500">Dispensed today</dt><dd className="text-right font-medium">{p.liters.toLocaleString()} L</dd>
              <dt className="text-slate-500">Sales today</dt><dd className="text-right font-medium">{usd(p.sales)}</dd><dt className="text-slate-500">Attendant</dt><dd className="text-right font-medium">{p.attendant}</dd></dl>
            <div className="mt-4 flex items-center gap-2">
              <select aria-label={`Status of ${p.id}`} value={p.status} onChange={(e) => requestStatus(p, e.target.value)} className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs">{Object.keys(STATUS).map((s) => <option key={s}>{s}</option>)}</select>
              <GreenBtn onClick={() => setModal({ type: "details", id: p.id })}>Details</GreenBtn>
              <GhostBtn onClick={() => openEdit(p)}>Edit</GhostBtn>
            </div>
          </article>); })}
        {!rows.length && <p className="col-span-full rounded-2xl bg-white py-10 text-center text-slate-400">No pumps match your filters.</p>}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">Recent status changes</h3><GreenBtn onClick={() => setAllLog((v) => !v)}>{allLog ? "Show less" : "View all"}</GreenBtn></div>
        <ul className="divide-y">{(allLog ? log : log.slice(0, 4)).map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
            <b className="w-20">{l.pump}</b>
            <span className="flex flex-1 items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${STATUS[l.from].dot}`} />{l.from}<span className="text-slate-400">→</span><i className={`h-2.5 w-2.5 rounded-full ${STATUS[l.to].dot}`} />{l.to}</span>
            {l.reason && <span className="text-xs text-slate-500">“{l.reason}”</span>}
            <span className="w-32 text-right text-xs text-slate-400">{l.when}{l.when === "Just now" ? " · You" : ""}</span>
          </li>))}</ul>
      </section>

      {modal?.type === "details" && sel && (
        <Modal title={`${sel.id} · ${sel.fuel}`} onClose={close}>
          <p className="mb-2 text-sm text-slate-500">Change status</p>
          <div className="mb-4 grid grid-cols-2 gap-2">{Object.keys(STATUS).map((s) => (
            <button key={s} onClick={() => { if (s === sel.status) return; if (NEEDS_REASON.includes(s)) requestStatus(sel, s); else { applyStatus(sel, s); close(); } }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${sel.status === s ? "border-emerald-500 bg-emerald-50 font-semibold" : "hover:bg-slate-50"}`}><i className={`h-3 w-3 rounded-full ${STATUS[s].dot}`} />{s}</button>))}</div>
          <dl className="grid grid-cols-2 gap-y-2 border-t pt-3 text-sm"><dt className="text-slate-500">Tank</dt><dd>{sel.tank} ({TANKS[sel.tank]?.level ?? "-"}%)</dd><dt className="text-slate-500">Attendant</dt><dd>{sel.attendant}</dd>
            <dt className="text-slate-500">Dispensed today</dt><dd>{sel.liters.toLocaleString()} L</dd><dt className="text-slate-500">Sales today</dt><dd>{usd(sel.sales)}</dd><dt className="text-slate-500">Last service</dt><dd>{sel.service}</dd></dl>
          <div className="mt-4 flex justify-between"><GhostBtn onClick={() => openEdit(sel)}>Edit pump</GhostBtn>
            <button onClick={() => { setError(""); setModal({ type: "remove", id: sel.id }); }} className="rounded-full px-4 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Remove pump</button></div>
        </Modal>)}

      {modal?.type === "reason" && sel && (
        <Modal title={`${sel.id} → ${modal.status}`} onClose={close}>
          <form onSubmit={submitReason} className="space-y-3">
            <label className="block text-sm">Reason<textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Nozzle leaking" className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><GhostBtn type="button" onClick={close}>Cancel</GhostBtn><GreenBtn type="submit">Confirm</GreenBtn></div>
          </form>
        </Modal>)}

      {(modal?.type === "add" || modal?.type === "edit") && (
        <Modal title={modal.type === "add" ? "Add Pump" : `Edit ${sel?.id}`} onClose={close}>
          <form onSubmit={modal.type === "add" ? submitAdd : submitEdit} className="space-y-3">
            <Sel label="Fuel type" options={FUELS} value={form.fuel} onChange={(e) => changeFuel(e.target.value)} />
            <Sel label="Connected tank" options={tanksFor(form.fuel).length ? tanksFor(form.fuel) : ["No tank for this fuel"]} value={form.tank} onChange={(e) => setForm({ ...form, tank: e.target.value })} />
            <Sel label="Attendant" options={ATTENDANTS} value={form.attendant} onChange={(e) => setForm({ ...form, attendant: e.target.value })} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><GhostBtn type="button" onClick={close}>Cancel</GhostBtn><GreenBtn type="submit">{modal.type === "add" ? "Add pump" : "Save changes"}</GreenBtn></div>
          </form>
        </Modal>)}

      {modal?.type === "remove" && sel && (
        <Modal title="Remove pump" onClose={close}>
          <p className="text-sm">Remove <b>{sel.id}</b> ({sel.fuel}) from this branch?</p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-4 flex justify-end gap-2"><GhostBtn onClick={close}>Cancel</GhostBtn><button onClick={removePump} className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600">Remove</button></div>
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
