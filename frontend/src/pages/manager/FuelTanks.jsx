import { useEffect, useState } from "react";
import { Fuel, Gauge, AlertTriangle, X } from "lucide-react";

const TANKS = [
  { id: "Tank #01", fuel: "Diesel", capacity: 30000, current: 24600, online: true },
  { id: "Tank #02", fuel: "Regular", capacity: 30000, current: 24600, online: true },
  { id: "Tank #03", fuel: "Premium", capacity: 30000, current: 9600, online: true },
  { id: "Tank #04", fuel: "LPG", capacity: 30000, current: 24600, online: false },
];
const PUMPS = [
  { id: "Pump #01", fuel: "Diesel", status: "Available Now" },
  { id: "Pump #02", fuel: "Regular", status: "In Use" },
  { id: "Pump #03", fuel: "Premium", status: "Available Now" },
  { id: "Pump #04", fuel: "LPG", status: "Under Maintenance" },
];
const REFILLS = [
  { tank: "tank_id 01", fuel: "Diesel", qty: 300, date: "12/02/2026", by: "Linda" },
  { tank: "tank_id 02", fuel: "Premium", qty: 700, date: "09/02/2026", by: "ChhoM" },
  { tank: "tank_id 03", fuel: "LPG", qty: 500, date: "02/05/2026", by: "Heak" },
  { tank: "tank_id 04", fuel: "Regular", qty: 200, date: "07/05/2026", by: "Yu Leng" },
  { tank: "tank_id 02", fuel: "Regular", qty: 650, date: "21/04/2026", by: "Linda" },
  { tank: "tank_id 01", fuel: "Diesel", qty: 400, date: "03/04/2026", by: "Heak" },
];
const PUMP_STATUS = {
  "Available Now": "bg-emerald-500", "In Use": "bg-blue-700", "Under Maintenance": "bg-yellow-600", "Out of Service": "bg-red-500",
};
const L = (n) => `${n.toLocaleString("en-US")} L`;
const pct = (t) => Math.round((t.current / t.capacity) * 100);
const tankState = (t) => {
  if (!t.online) return { label: "Offline", dot: "bg-slate-400", bar: "bg-slate-400" };
  const p = pct(t);
  if (p < 15) return { label: "Critical", dot: "bg-red-500", bar: "bg-red-500" };
  if (p < 40) return { label: "Low", dot: "bg-yellow-500", bar: "bg-yellow-500" };
  return { label: "Normal", dot: "bg-emerald-500", bar: "bg-emerald-500" };
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
const GreenBtn = ({ children, className = "", ...p }) => (
  <button {...p} className={`rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 ${className}`}>{children}</button>
);
const Bar = ({ value, color }) => (
  <div className="flex items-center gap-2">
    <div className="h-3 w-full max-w-[170px] overflow-hidden rounded-sm bg-slate-200"><div className={`h-full ${color}`} style={{ width: `${value}%` }} /></div>
    <span className="text-xs text-slate-600">{value}%</span>
  </div>
);

export default function FuelTanks() {
  const [tanks, setTanks] = useState(TANKS);
  const [pumps, setPumps] = useState(PUMPS);
  const [refills, setRefills] = useState(REFILLS);
  const [showAllRefills, setShowAllRefills] = useState(false);
  const [modal, setModal] = useState(null); // { type, id }
  const [form, setForm] = useState({ tankId: TANKS[0].id, qty: "", by: "" });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const total = tanks.reduce((s, t) => s + t.current, 0);
  const activeTanks = tanks.filter((t) => t.online).length;
  const lowTanks = tanks.filter((t) => t.online && pct(t) < 40);
  const activePumps = pumps.filter((p) => p.status === "Available Now" || p.status === "In Use").length;
  const close = () => { setModal(null); setError(""); };
  const openRefill = (tankId) => { setForm({ tankId: tankId ?? tanks[0].id, qty: "", by: "" }); setError(""); setModal({ type: "refill" }); };

  const submitRefill = (e) => {
    e.preventDefault();
    const t = tanks.find((x) => x.id === form.tankId);
    const qty = Number(form.qty);
    if (!qty || qty <= 0) return setError("Enter a quantity greater than 0.");
    if (!form.by.trim()) return setError("Enter who refilled the tank.");
    if (t.current + qty > t.capacity) return setError(`${t.id} only has ${L(t.capacity - t.current)} of free space.`);
    setTanks((all) => all.map((x) => (x.id === t.id ? { ...x, current: x.current + qty } : x)));
    setRefills((r) => [{ tank: t.id.replace("Tank #", "tank_id "), fuel: t.fuel, qty, date: new Date().toLocaleDateString("en-GB"), by: form.by.trim() }, ...r]);
    setToast(`${L(qty)} added to ${t.id}`);
    close();
  };
  const toggleOnline = (id) => setTanks((all) => all.map((t) => (t.id === id ? { ...t, online: !t.online } : t)));
  const setPumpStatus = (id, status) => setPumps((all) => all.map((p) => (p.id === id ? { ...p, status } : p)));

  const stat = (label, value, note, icon) => (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between"><div><p className="text-lg font-bold text-slate-900">{label}</p><p className="mt-1 text-sm text-slate-700">{value}</p></div>{icon}</div>
      <p className="mt-4 text-xs text-slate-400">{note}</p>
    </div>
  );
  const selTank = modal?.type === "tank" ? tanks.find((t) => t.id === modal.id) : null;
  const selPump = modal?.type === "pump" ? pumps.find((p) => p.id === modal.id) : null;
  const tankRow = (t) => { const s = tankState(t); return (
    <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
      <div className="flex-1"><p className="font-semibold">{t.id} · {t.fuel}</p><p className="text-xs text-slate-500">{L(t.current)} / {L(t.capacity)}</p></div>
      <i className={`h-2.5 w-2.5 rounded-full ${s.dot}`} /><span className="w-14 text-xs">{s.label}</span>
      <GreenBtn onClick={() => setModal({ type: "tank", id: t.id })}>Details</GreenBtn>
    </div>); };

  return (
    <div className="space-y-5 bg-gray-400 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Fuel Tank Monitoring</h2>
        <GreenBtn className="py-2 text-sm" onClick={() => setModal({ type: "tanks" })}>View Details</GreenBtn>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stat("Total Fuel", L(total), "All in Tanks", <Fuel size={36} className="text-red-500" />)}
        {stat("Active Tank", `${activeTanks} / ${tanks.length}`, "Operational", <Gauge size={34} className="rounded-full bg-black p-1.5 text-white" />)}
        {stat("Low Fuel", `${lowTanks.length} Tank${lowTanks.length === 1 ? "" : "s"}`, "Needs to Refill", <AlertTriangle size={34} className="text-red-500" />)}
        {stat("Pump Status", `# ${activePumps} / ${pumps.length} Active`, "Pumps are Running", <Fuel size={36} className="text-red-500" />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center gap-4"><h3 className="text-lg font-bold text-slate-800">Fuel Tank Levels</h3><GreenBtn onClick={() => setModal({ type: "tanks" })}>View Details</GreenBtn></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {tanks.map((t) => { const s = tankState(t); return (
              <div key={t.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <p className="flex items-center gap-2 font-bold"><Gauge size={18} className="rounded-full bg-black p-0.5 text-white" />{t.id}</p>
                <p className="mt-1 text-xs">{t.fuel}</p><p className="text-xs text-slate-600">{L(t.current)} / {L(t.capacity)}</p>
                <div className="mt-1"><Bar value={pct(t)} color={s.bar} /></div>
                <div className="mt-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs"><i className={`h-3 w-3 rounded-full ${s.dot}`} />{s.label}</span>
                  <GreenBtn className="!px-2.5 !py-1 !text-[10px]" onClick={() => setModal({ type: "tank", id: t.id })}>View Details</GreenBtn></div>
              </div>); })}
          </div>
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">Pump Status</h3><GreenBtn onClick={() => setModal({ type: "pumps" })}>View All</GreenBtn></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pumps.map((p) => (
              <button key={p.id} onClick={() => setModal({ type: "pump", id: p.id })} className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
                <p className="text-xl font-bold">{p.id}</p><p className="mb-2">{p.fuel}</p>
                <p className="flex items-center justify-center gap-2 text-sm"><i className={`h-3.5 w-3.5 rounded-full ${PUMP_STATUS[p.status]}`} />{p.status}</p>
              </button>))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">Recently tank Refills</h3>
          <div className="flex gap-2"><GreenBtn onClick={() => openRefill()}>+ Record Refill</GreenBtn><GreenBtn onClick={() => setShowAllRefills((v) => !v)}>{showAllRefills ? "Show Less" : "View All"}</GreenBtn></div></div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs font-semibold text-slate-500">{["TANK_ID", "FUEL_NAME", "QUANTITY", "REFILL_DATE", "REFILL_BY"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{(showAllRefills ? refills : refills.slice(0, 4)).map((r, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0"><td className="px-3 py-2.5">{r.tank}</td><td className="px-3 py-2.5">{r.fuel}</td><td className="px-3 py-2.5">{L(r.qty)}</td><td className="px-3 py-2.5">{r.date}</td><td className="px-3 py-2.5">{r.by}</td></tr>))}</tbody>
        </table></div>
      </section>

      {modal?.type === "tanks" && <Modal title="All Fuel Tanks" onClose={close}><div className="space-y-2">{tanks.map(tankRow)}</div><GreenBtn className="mt-4" onClick={() => openRefill()}>+ Record Refill</GreenBtn></Modal>}

      {selTank && (() => { const s = tankState(selTank); return (
        <Modal title={`${selTank.id} · ${selTank.fuel}`} onClose={close}>
          <Bar value={pct(selTank)} color={s.bar} />
          <dl className="my-4 grid grid-cols-2 gap-y-2 text-sm"><dt className="text-slate-500">Current</dt><dd>{L(selTank.current)}</dd><dt className="text-slate-500">Capacity</dt><dd>{L(selTank.capacity)}</dd>
            <dt className="text-slate-500">Free space</dt><dd>{L(selTank.capacity - selTank.current)}</dd><dt className="text-slate-500">Status</dt><dd className="flex items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />{s.label}</dd></dl>
          <div className="flex gap-2"><GreenBtn onClick={() => openRefill(selTank.id)}>Record Refill</GreenBtn>
            <button onClick={() => toggleOnline(selTank.id)} className="rounded-full border px-4 py-1.5 text-xs font-semibold hover:bg-slate-50">{selTank.online ? "Mark Offline" : "Mark Online"}</button></div>
        </Modal>); })()}

      {modal?.type === "pumps" && <Modal title="All Pumps" onClose={close}><div className="space-y-2">{pumps.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><i className={`h-3 w-3 rounded-full ${PUMP_STATUS[p.status]}`} /><span className="flex-1 font-semibold">{p.id} · {p.fuel}</span>
          <select value={p.status} onChange={(e) => setPumpStatus(p.id, e.target.value)} className="rounded border px-2 py-1 text-xs">{Object.keys(PUMP_STATUS).map((s) => <option key={s}>{s}</option>)}</select></div>))}</div></Modal>}

      {selPump && <Modal title={`${selPump.id} · ${selPump.fuel}`} onClose={close}>
        <p className="mb-2 text-sm text-slate-500">Change pump status</p>
        <div className="grid grid-cols-2 gap-2">{Object.keys(PUMP_STATUS).map((s) => (
          <button key={s} onClick={() => { setPumpStatus(selPump.id, s); setToast(`${selPump.id}: ${s}`); }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${selPump.status === s ? "border-emerald-500 bg-emerald-50 font-semibold" : "hover:bg-slate-50"}`}><i className={`h-3 w-3 rounded-full ${PUMP_STATUS[s]}`} />{s}</button>))}</div></Modal>}

      {modal?.type === "refill" && (
        <Modal title="Record Tank Refill" onClose={close}>
          <form onSubmit={submitRefill} className="space-y-3 text-sm">
            <label className="block">Tank<select value={form.tankId} onChange={(e) => setForm({ ...form, tankId: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2">
              {tanks.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.fuel} ({L(t.capacity - t.current)} free)</option>)}</select></label>
            <label className="block">Quantity (L)<input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="block">Refilled by<input value={form.by} onChange={(e) => setForm({ ...form, by: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-full border px-4 py-1.5 text-xs font-semibold">Cancel</button><GreenBtn type="submit">Save refill</GreenBtn></div>
          </form>
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
