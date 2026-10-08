import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";

const SUPPLIERS = ["ABX Fuel", "ACV Energy", "ACS Energy", "WTR Energy", "ABC Energy"];
const FUELS = ["Premium", "Regular", "Diesel", "LPG"];
const PRICE = { Premium: 1.05, Regular: 0.95, Diesel: 0.85, LPG: 0.6 };
const STATUS_STYLE = {
  Received: "bg-emerald-100 text-emerald-700", Delivered: "bg-sky-100 text-sky-700", Pending: "bg-amber-100 text-amber-700", Canceled: "bg-red-100 text-red-600",
};
const DATE_FILTERS = ["All dates", "This month", "Last 30 days", "This year"];
const TANKS0 = [
  { id: "Tank_01", fuel: "Diesel", current: 24600, capacity: 30000 }, { id: "Tank_02", fuel: "Regular", current: 24600, capacity: 30000 },
  { id: "Tank_03", fuel: "Premium", current: 9600, capacity: 30000 }, { id: "Tank_04", fuel: "LPG", current: 24600, capacity: 30000 },
];
const ORDERS0 = [
  { id: "PO-001", supplier: "ABX Fuel", fuel: "Premium", qty: 20000, orderDate: "2026-10-01", deliveryDate: "2026-10-03", receivedDate: "2026-10-03", total: 21000, status: "Received", receivedQty: 20000 },
  { id: "PO-002", supplier: "ACV Energy", fuel: "Regular", qty: 15000, orderDate: "2026-10-03", deliveryDate: "2026-10-07", receivedDate: null, total: 14250, status: "Pending" },
  { id: "PO-003", supplier: "ACS Energy", fuel: "Diesel", qty: 5000, orderDate: "2026-10-02", deliveryDate: "2026-10-04", receivedDate: null, total: 4250, status: "Delivered" },
  { id: "PO-004", supplier: "WTR Energy", fuel: "LPG", qty: 10000, orderDate: "2026-09-20", deliveryDate: "2026-09-25", receivedDate: null, total: 6000, status: "Canceled" },
  { id: "PO-005", supplier: "ABC Energy", fuel: "Diesel", qty: 18000, orderDate: "2026-09-12", deliveryDate: "2026-09-14", receivedDate: "2026-09-14", total: 15300, status: "Received", receivedQty: 18000 },
  { id: "PO-006", supplier: "ABX Fuel", fuel: "Regular", qty: 22000, orderDate: "2026-10-04", deliveryDate: "2026-10-09", receivedDate: null, total: 20900, status: "Pending" },
];
const DELIVERIES0 = [
  { id: "Del_001", order: "PO-001", supplier: "ABX Fuel", fuel: "Premium", qty: 20000, tank: "Tank_03" },
  { id: "Del_002", order: "PO-005", supplier: "ABC Energy", fuel: "Diesel", qty: 18000, tank: "Tank_01" },
];

const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (s) => (s ? s.split("-").reverse().join("/") : "-");
const L = (n) => `${n.toLocaleString("en-US")} L`;
const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = (s) => Number(s.replace(/\D/g, ""));

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
const Badge = ({ s }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[s]}`}>{s}</span>;
const Field = ({ label, ...p }) => <label className="block text-sm">{label}<input {...p} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-sky-400" /></label>;
const Sel = ({ label, options, ...p }) => <label className="block text-sm">{label}<select {...p} className="mt-1 w-full rounded-lg border px-3 py-2">{options.map((o) => <option key={o}>{o}</option>)}</select></label>;

export default function FuelPurchases() {
  const [orders, setOrders] = useState(ORDERS0);
  const [deliveries, setDeliveries] = useState(DELIVERIES0);
  const [tanks, setTanks] = useState(TANKS0);
  const [q, setQ] = useState("");
  const [sup, setSup] = useState("All suppliers");
  const [st, setSt] = useState("All status");
  const [dt, setDt] = useState(DATE_FILTERS[0]);
  const [allDel, setAllDel] = useState(false);
  const [modal, setModal] = useState(null); // { type, id }
  const [form, setForm] = useState({ supplier: SUPPLIERS[0], fuel: "Premium", qty: "", price: PRICE.Premium, expected: iso() });
  const [recv, setRecv] = useState({ tank: "", qty: "" });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const today = iso();
  const month = today.slice(0, 7);
  const inMonth = orders.filter((o) => o.orderDate.startsWith(month));
  const stats = {
    purchases: inMonth.filter((o) => o.status !== "Canceled").length,
    pending: orders.filter((o) => o.status === "Pending").length,
    received: inMonth.filter((o) => o.status === "Received").reduce((s, o) => s + (o.receivedQty ?? o.qty), 0),
    cost: inMonth.filter((o) => o.status !== "Canceled").reduce((s, o) => s + o.total, 0),
  };

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const days = (o) => (new Date(today) - new Date(o.orderDate)) / 86400000;
    return orders.filter((o) => (!s || [o.id, o.supplier, o.fuel].some((v) => v.toLowerCase().includes(s))) &&
      (sup === "All suppliers" || o.supplier === sup) && (st === "All status" || o.status === st) &&
      (dt === "All dates" || (dt === "This month" && o.orderDate.startsWith(month)) || (dt === "Last 30 days" && days(o) <= 30) || (dt === "This year" && o.orderDate.startsWith(today.slice(0, 4)))));
  }, [orders, q, sup, st, dt, today, month]);

  const sel = modal?.id ? orders.find((o) => o.id === modal.id) : null;
  const close = () => { setModal(null); setError(""); };
  const update = (id, patch) => setOrders((all) => all.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const openCreate = () => { setForm({ supplier: SUPPLIERS[0], fuel: "Premium", qty: "", price: PRICE.Premium, expected: today }); setError(""); setModal({ type: "create" }); };
  const submitCreate = (e) => {
    e.preventDefault();
    const qty = Number(form.qty), price = Number(form.price);
    if (!(qty > 0)) return setError("Enter a quantity greater than 0.");
    if (!(price > 0)) return setError("Enter a price per liter greater than 0.");
    if (form.expected < today) return setError("Expected delivery cannot be in the past.");
    const id = `PO-${String(Math.max(0, ...orders.map((o) => num(o.id))) + 1).padStart(3, "0")}`;
    setOrders((all) => [{ id, supplier: form.supplier, fuel: form.fuel, qty, orderDate: today, deliveryDate: form.expected, receivedDate: null, total: Math.round(qty * price), status: "Pending" }, ...all]);
    setToast(`${id} created`); close();
  };
  const markDelivered = (o) => { update(o.id, { status: "Delivered", deliveryDate: today }); setToast(`${o.id} marked as delivered`); };
  const cancelOrder = () => { update(sel.id, { status: "Canceled" }); setToast(`${sel.id} canceled`); close(); };
  const openReceive = (o) => {
    const t = tanks.find((x) => x.fuel === o.fuel);
    setRecv({ tank: t?.id ?? "", qty: String(Math.min(o.qty, t ? t.capacity - t.current : 0)) }); setError(""); setModal({ type: "receive", id: o.id });
  };
  const submitReceive = (e) => {
    e.preventDefault();
    const t = tanks.find((x) => x.id === recv.tank), qty = Number(recv.qty);
    if (!t) return setError(`No ${sel.fuel} tank is available.`);
    if (!(qty > 0)) return setError("Enter a quantity greater than 0.");
    if (qty > sel.qty) return setError(`The order is only ${L(sel.qty)}.`);
    if (qty > t.capacity - t.current) return setError(`${t.id} only has ${L(t.capacity - t.current)} of free space.`);
    setTanks((all) => all.map((x) => (x.id === t.id ? { ...x, current: x.current + qty } : x)));
    update(sel.id, { status: "Received", receivedDate: today, receivedQty: qty });
    const did = `Del_${String(Math.max(0, ...deliveries.map((d) => num(d.id))) + 1).padStart(3, "0")}`;
    setDeliveries((d) => [{ id: did, order: sel.id, supplier: sel.supplier, fuel: sel.fuel, qty, tank: t.id }, ...d]);
    setToast(`${L(qty)} added to ${t.id}`); close();
  };

  const card = (title, value, note) => (
    <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100"><p className="text-lg font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-slate-800">{value}</p><p className="mt-3 text-xs text-slate-500">{note}</p></div>
  );
  const recvTank = tanks.find((x) => x.id === recv.tank);

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      <h2 className="text-xl font-bold text-slate-800">Purchases Summary</h2>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {card("Purchases", stats.purchases, "This month")}
        {card("Pending", `${stats.pending} Pending`, "Awaiting Delivery")}
        {card("Received", L(stats.received), "This month")}
        {card("Cost", usd(stats.cost), "This month")}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold uppercase text-slate-800">Purchase Orders</h3><GreenBtn onClick={openCreate}>+ Create purchase order</GreenBtn></div>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search order" className="w-full rounded-full border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400" /></div>
          {[[sup, setSup, ["All suppliers", ...SUPPLIERS]], [st, setSt, ["All status", "Pending", "Delivered", "Received", "Canceled"]], [dt, setDt, DATE_FILTERS]].map(([v, set, opts], i) => (
            <select key={i} value={v} onChange={(e) => set(e.target.value)} className="rounded-full bg-slate-600 px-4 py-2 text-sm text-white">{opts.map((o) => <option key={o}>{o}</option>)}</select>))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs font-semibold text-slate-500">{["Order", "Supplier", "Fuel", "Quantity", "Order date", "Delivery date", "Received date", "Total amount", "Status", "Action"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-semibold">{o.id}</td><td className="px-3 py-2.5">{o.supplier}</td><td className="px-3 py-2.5">{o.fuel}</td><td className="whitespace-nowrap px-3 py-2.5">{L(o.qty)}</td>
                  <td className="px-3 py-2.5">{fmt(o.orderDate)}</td><td className="px-3 py-2.5">{fmt(o.deliveryDate)}</td><td className="px-3 py-2.5">{fmt(o.receivedDate)}</td>
                  <td className="px-3 py-2.5">{usd(o.total)}</td><td className="px-3 py-2.5"><Badge s={o.status} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5"><div className="flex gap-1.5">
                    {o.status === "Pending" && <><GreenBtn onClick={() => markDelivered(o)}>Mark delivered</GreenBtn><GhostBtn onClick={() => setModal({ type: "cancel", id: o.id })}>Cancel</GhostBtn></>}
                    {o.status === "Delivered" && <GreenBtn onClick={() => openReceive(o)}>Receive into tank</GreenBtn>}
                    <GhostBtn onClick={() => setModal({ type: "details", id: o.id })}>Details</GhostBtn></div></td>
                </tr>))}
              {!rows.length && <tr><td colSpan={10} className="py-8 text-center text-slate-400">No purchase orders match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">Recently Fuel Deliveries</h3><GreenBtn onClick={() => setAllDel((v) => !v)}>{allDel ? "Show less" : "View All"}</GreenBtn></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs font-semibold text-slate-500">{["Delivery_id", "Order", "Suppliers", "Fuel", "Quantity", "Tank"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{(allDel ? deliveries : deliveries.slice(0, 4)).map((d) => (
            <tr key={d.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-2.5 font-semibold">{d.id}</td><td className="px-3 py-2.5">{d.order}</td><td className="px-3 py-2.5">{d.supplier}</td><td className="px-3 py-2.5">{d.fuel}</td><td className="px-3 py-2.5">{L(d.qty)}</td><td className="px-3 py-2.5">{d.tank}</td></tr>))}
            {!deliveries.length && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No deliveries yet.</td></tr>}</tbody>
        </table>
      </section>

      {modal?.type === "create" && (
        <Modal title="Create purchase order" onClose={close}>
          <form onSubmit={submitCreate} className="space-y-3">
            <Sel label="Supplier" options={SUPPLIERS} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            <Sel label="Fuel" options={FUELS} value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value, price: PRICE[e.target.value] })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity (L)" type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              <Field label="Price per liter ($)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <Field label="Expected delivery" type="date" min={today} value={form.expected} onChange={(e) => setForm({ ...form, expected: e.target.value })} />
            <p className="text-sm">Total: <b>{usd(Math.round((Number(form.qty) || 0) * (Number(form.price) || 0)))}</b></p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><GhostBtn type="button" onClick={close}>Cancel</GhostBtn><GreenBtn type="submit">Create order</GreenBtn></div>
          </form>
        </Modal>)}

      {modal?.type === "receive" && sel && (
        <Modal title={`Receive ${sel.id} into tank`} onClose={close}>
          <form onSubmit={submitReceive} className="space-y-3">
            <p className="text-sm text-slate-500">{sel.supplier} · {sel.fuel} · ordered {L(sel.qty)}</p>
            <Sel label="Tank" options={tanks.filter((t) => t.fuel === sel.fuel).map((t) => t.id).concat(tanks.some((t) => t.fuel === sel.fuel) ? [] : ["No tank available"])} value={recv.tank} onChange={(e) => setRecv({ ...recv, tank: e.target.value })} />
            {recvTank && <p className="text-xs text-slate-500">Free space: {L(recvTank.capacity - recvTank.current)}</p>}
            <Field label="Quantity received (L)" type="number" min="1" value={recv.qty} onChange={(e) => setRecv({ ...recv, qty: e.target.value })} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><GhostBtn type="button" onClick={close}>Cancel</GhostBtn><GreenBtn type="submit">Confirm receipt</GreenBtn></div>
          </form>
        </Modal>)}

      {modal?.type === "cancel" && sel && (
        <Modal title="Cancel purchase order" onClose={close}>
          <p className="text-sm">Cancel <b>{sel.id}</b> ({sel.supplier}, {L(sel.qty)} {sel.fuel})? A canceled order cannot be reopened.</p>
          <div className="mt-4 flex justify-end gap-2"><GhostBtn onClick={close}>Keep order</GhostBtn><button onClick={cancelOrder} className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600">Cancel order</button></div>
        </Modal>)}

      {modal?.type === "details" && sel && (
        <Modal title={`${sel.id} · ${sel.supplier}`} onClose={close}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt><dd><Badge s={sel.status} /></dd><dt className="text-slate-500">Fuel</dt><dd>{sel.fuel}</dd>
            <dt className="text-slate-500">Quantity ordered</dt><dd>{L(sel.qty)}</dd><dt className="text-slate-500">Quantity received</dt><dd>{sel.receivedQty ? L(sel.receivedQty) : "-"}</dd>
            <dt className="text-slate-500">Order date</dt><dd>{fmt(sel.orderDate)}</dd><dt className="text-slate-500">Delivery date</dt><dd>{fmt(sel.deliveryDate)}</dd>
            <dt className="text-slate-500">Received date</dt><dd>{fmt(sel.receivedDate)}</dd><dt className="text-slate-500">Total amount</dt><dd className="font-semibold">{usd(sel.total)}</dd></dl>
          <div className="mt-4 flex justify-end gap-2">
            {sel.status === "Pending" && <GreenBtn onClick={() => { markDelivered(sel); close(); }}>Mark delivered</GreenBtn>}
            {sel.status === "Delivered" && <GreenBtn onClick={() => openReceive(sel)}>Receive into tank</GreenBtn>}
            <GhostBtn onClick={close}>Close</GhostBtn></div>
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
