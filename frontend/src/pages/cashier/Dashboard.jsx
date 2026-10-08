import { useEffect, useState } from "react";
import { Fuel, ShoppingCart, Banknote, ClipboardList, Bell, AlertCircle, AlertTriangle, CheckCircle, FileBarChart, ShoppingBasket, Undo2, X, Download } from "lucide-react";

// ---------- mock data (today) ----------
const FUEL_BUCKETS = [20, 35, 80, 150, 220, 210, 170, 140, 110, 60, 30, 20.5];   // $ per 2 hours, sums to 1245.50
const STORE_BUCKETS = [5, 8, 12, 22, 35, 40, 30, 25, 30, 18, 12, 8.75];          // sums to 245.75
const X_LABELS = { 0: "12AM", 2: "4AM", 4: "8AM", 6: "12PM", 8: "4PM", 10: "8PM" };
const PAYMENTS = [
  { name: "Cash", value: 845, color: "#3b82f6" }, { name: "Credit Card", value: 320, color: "#34b37a" },
  { name: "QR Payment", value: 186.25, color: "#f5a623" }, { name: "Other", value: 140, color: "#8b5cf6" },
];
const FUEL_TX = 32, STORE_TX = 18, DISCOUNTS = 25, TAXES = 20.25;
const SALES = [
  { no: "FS-250522-0050", time: "10:25 AM", pump: "Pump 03", fuel: "Regular 92", qty: 12.5, total: 48.75, pay: "Cash", status: "Paid" },
  { no: "FS-250522-0049", time: "10:15 AM", pump: "Pump 01", fuel: "Premium 95", qty: 20, total: 82.0, pay: "QR Payment", status: "Paid" },
  { no: "FS-250522-0048", time: "10:05 AM", pump: "Pump 02", fuel: "Diesel", qty: 15, total: 60.75, pay: "Credit Card", status: "Paid" },
  { no: "FS-250522-0047", time: "09:55 AM", pump: "Pump 03", fuel: "Regular 92", qty: 10, total: 39.0, pay: "Cash", status: "Paid" },
  { no: "FS-250522-0046", time: "9:45 AM", pump: "Pump 01", fuel: "Premium 95", qty: 25, total: 102.5, pay: "QR Payment", status: "Paid" },
];
const PUMPS = [
  { id: "Pump 01", fuel: "Premium 95", status: "Available" }, { id: "Pump 02", fuel: "Premium 95", status: "Available" },
  { id: "Pump 03", fuel: "Premium 95", status: "In Use" }, { id: "Pump 04", fuel: "Premium 95", status: "Maintenance" },
];
const PUMP_CLS = { Available: "bg-emerald-50 text-emerald-600", "In Use": "bg-orange-50 text-orange-500", Maintenance: "bg-red-100 text-red-500" };
const PUMP_ICON = { Available: "text-emerald-500", "In Use": "text-orange-400", Maintenance: "text-red-500" };
const BEST = [{ name: "Premium 95", liters: 160, color: "#3b82f6" }, { name: "Regular 92", liters: 95, color: "#34b37a" }, { name: "Diesel", liters: 61, color: "#f5a623" }];
const REMINDERS0 = [
  { id: 1, icon: AlertCircle, tone: "text-red-500", title: "Check fuel tank level", text: "Tank 2 is below 20%", done: false },
  { id: 2, icon: AlertTriangle, tone: "text-blue-600", title: "Daily shift summary", text: "Don't forget to close your shift", done: false, go: "shift-handover" },
  { id: 3, icon: CheckCircle, tone: "text-emerald-600", title: "Check cash drawer balance", text: "Balance: $150.00", done: false },
];

const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const sum = (a) => a.reduce((s, x) => s + x, 0);
const FUEL_SALES = sum(FUEL_BUCKETS), STORE_SALES = sum(STORE_BUCKETS), TOTAL_SALES = FUEL_SALES + STORE_SALES, TOTAL_TX = FUEL_TX + STORE_TX;
const PAY_TOTAL = sum(PAYMENTS.map((p) => p.value));

const downloadCSV = (filename, rows) => {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
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
  const c = { blue: "bg-blue-600 text-white hover:bg-blue-700", ghost: "border bg-white text-slate-700 hover:bg-slate-50" }[v];
  return <button {...p} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${c} ${className}`}>{children}</button>;
};
const Card = ({ title, action, children, className = "" }) => (
  <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 ${className}`}>
    {(title || action) && <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">{title}</h3>{action}</div>}
    {children}
  </section>
);
const Stat = ({ icon: Icon, label, value, note, tone, text }) => (
  <div className={`rounded-2xl p-4 ring-1 ring-slate-100 ${tone}`}>
    <div className="flex items-start gap-3"><Icon size={34} className={text} />
      <div><p className={`text-sm font-semibold ${text}`}>{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p><p className="text-xs text-slate-500">{note}</p></div></div>
  </div>
);

// ---------- charts ----------
function LineChart({ show }) {
  const [hover, setHover] = useState(null);
  const W = 520, H = 220, L = 38, R = 10, T = 12, B = 26, MAX = 250, n = FUEL_BUCKETS.length;
  const x = (i) => L + (i / (n - 1)) * (W - L - R), y = (v) => T + (1 - v / MAX) * (H - T - B);
  const path = (vals) => vals.map((v, i) => { const p = [x(i), y(v)]; if (!i) return `M${p[0]},${p[1]}`; const q = [x(i - 1), y(vals[i - 1])], cx = (q[0] + p[0]) / 2; return `C${cx},${q[1]} ${cx},${p[1]} ${p[0]},${p[1]}`; }).join(" ");
  const onMove = (e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))))); };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {[0, 50, 100, 150, 200, 250].map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 3" /><text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">${t}</text></g>)}
      {Object.entries(X_LABELS).map(([i, l]) => <text key={i} x={x(+i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{l}</text>)}
      {show.store && <path d={path(STORE_BUCKETS)} fill="none" stroke="#22a65a" strokeWidth="2.2" />}
      {show.fuel && <path d={path(FUEL_BUCKETS)} fill="none" stroke="#2563eb" strokeWidth="2.2" />}
      {hover != null && (<g>
        <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#94a3b8" />
        {show.fuel && <circle cx={x(hover)} cy={y(FUEL_BUCKETS[hover])} r="3.5" fill="#2563eb" />}{show.store && <circle cx={x(hover)} cy={y(STORE_BUCKETS[hover])} r="3.5" fill="#22a65a" />}
        <g transform={`translate(${Math.min(x(hover) + 8, W - 120)},${T})`}><rect width="112" height="46" rx="6" fill="#0f172a" opacity="0.92" />
          <text x="8" y="14" fontSize="9" fill="#cbd5e1">{`${String(hover * 2).padStart(2, "0")}:00 - ${String(hover * 2 + 2).padStart(2, "0")}:00`}</text>
          <text x="8" y="28" fontSize="10" fill="#93c5fd">Fuel: {usd(FUEL_BUCKETS[hover])}</text><text x="8" y="40" fontSize="10" fill="#86efac">Store: {usd(STORE_BUCKETS[hover])}</text></g></g>)}
    </svg>
  );
}

function Donut() {
  const [hover, setHover] = useState(null);
  const R = 62, C = 2 * Math.PI * R;
  let acc = 0;
  const h = hover != null ? PAYMENTS[hover] : null;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-44 w-44 shrink-0 -rotate-90">
        {PAYMENTS.map((p, i) => { const len = (p.value / PAY_TOTAL) * C, off = -acc; acc += len; return (
          <circle key={p.name} cx="80" cy="80" r={R} fill="none" stroke={p.color} strokeWidth={hover === i ? 30 : 26} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={off}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-pointer transition-all" />); })}
        <g className="rotate-90" style={{ transformOrigin: "80px 80px" }}><text x="80" y="76" textAnchor="middle" fontSize="10" fill="#475569">{h ? h.name : "Total"}</text>
          <text x="80" y="94" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">{usd(h ? h.value : PAY_TOTAL)}</text></g>
      </svg>
      <ul className="min-w-[200px] flex-1 divide-y text-sm">{PAYMENTS.map((p, i) => (
        <li key={p.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={`flex items-center gap-2 py-2.5 ${hover === i ? "bg-slate-50" : ""}`}>
          <i className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} /><span className="flex-1">{p.name}</span>
          <span className="text-slate-600">{usd(p.value)} ({((p.value / PAY_TOTAL) * 100).toFixed(1)}%)</span></li>))}</ul>
    </div>
  );
}

export default function Dashboard({ onNavigate = () => {} }) {
  const [show, setShow] = useState({ fuel: true, store: true });
  const [reminders, setReminders] = useState(REMINDERS0);
  const [modal, setModal] = useState(null); // { type: 'sale'|'report', sale? }
  const [toast, setToast] = useState("");
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);
  const maxBest = Math.max(...BEST.map((b) => b.liters));
  const pending = reminders.filter((r) => !r.done).length;

  const exportReport = () => {
    downloadCSV("sales_report_today.csv", [["Sale No", "Time", "Pump", "Fuel Type", "Quantity (L)", "Total Amount", "Payment"], ...SALES.map((s) => [s.no, s.time, s.pump, s.fuel, s.qty, s.total, s.pay])]);
    setToast("Sales report downloaded");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px] bg-gray-400 p-6">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat icon={Fuel} label="Today's Fuel Sales" value={usd(FUEL_SALES)} note={`${FUEL_TX} Transactions`} tone="bg-blue-50" text="text-blue-600" />
          <Stat icon={ShoppingCart} label="Today's Store Sales" value={usd(STORE_SALES)} note={`${STORE_TX} Transactions`} tone="bg-emerald-50" text="text-emerald-600" />
          <Stat icon={Banknote} label="Total Sales (Today)" value={usd(TOTAL_SALES)} note={`${TOTAL_TX} Transactions`} tone="bg-orange-50" text="text-orange-500" />
          <Stat icon={ClipboardList} label="Avg. Fuel Sale" value={usd(FUEL_SALES / FUEL_TX)} note="Per Transaction" tone="bg-violet-50" text="text-violet-600" />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Sale Overview (Today)">
            <div className="mb-1 flex gap-4 text-xs">{[["fuel", "Fuel Sales ($)", "#2563eb"], ["store", "Store Sales ($)", "#22a65a"]].map(([k, l, c]) => (
              <button key={k} onClick={() => setShow({ ...show, [k]: !show[k] })} className={`flex items-center gap-1.5 ${show[k] ? "" : "opacity-40 line-through"}`}><i className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</button>))}
              <span className="ml-auto text-slate-400">per 2 hours</span></div>
            <LineChart show={show} />
          </Card>
          <Card title="Payment Method Breakdown"><Donut /></Card>
        </div>

        <Card title="Recent Fuel Sales" action={<button onClick={() => onNavigate("daily-sales-and-refunds")} className="text-xs font-semibold text-blue-600 hover:underline">View all</button>}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="border-b text-left text-slate-600">{["Sale No", "Time", "Pump", "Fuel Type", "Quantity (L)", "Total Amount", "Payment", "Status"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 text-sm font-medium">{h}</th>)}</tr></thead>
            <tbody>{SALES.map((s) => (
              <tr key={s.no} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-3 py-3"><button onClick={() => setModal({ type: "sale", sale: s })} className="font-medium text-blue-700 hover:underline">{s.no}</button></td>
                <td className="px-3 py-3">{s.time}</td><td className="px-3 py-3">{s.pump}</td><td className="px-3 py-3">{s.fuel}</td><td className="px-3 py-3">{s.qty.toFixed(3)}</td><td className="px-3 py-3">{usd(s.total)}</td><td className="px-3 py-3">{s.pay}</td>
                <td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">{s.status}</span></td></tr>))}</tbody>
          </table></div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card title="Best Selling Fuel (Today)">
            <div className="space-y-3">{BEST.map((b) => (
              <div key={b.name} title={`${b.name}: ${b.liters} L`}><div className="mb-1 flex justify-between text-xs"><b>{b.name}</b><span className="text-slate-500">{b.liters.toLocaleString()} L</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(b.liters / maxBest) * 100}%`, background: b.color }} /></div></div>))}</div>
          </Card>
          <Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
              [Fuel, "New Fuel Sale", "bg-blue-50 text-blue-600", () => onNavigate("pos-terminal")],
              [ShoppingBasket, "New Store Sale", "bg-emerald-50 text-emerald-600", () => onNavigate("pos-terminal")],
              [Undo2, "Refund/Void Sale", "bg-violet-50 text-violet-600", () => onNavigate("daily-sales-and-refunds")],
              [FileBarChart, "Sales Report", "bg-orange-50 text-orange-500", () => setModal({ type: "report" })],
            ].map(([Icon, label, cls, go]) => (
              <button key={label} onClick={go} className={`flex flex-col items-center gap-2 rounded-xl p-4 text-xs font-semibold transition hover:shadow-md ${cls}`}><Icon size={26} />{label}</button>))}</div>
          </Card>
        </div>
      </div>

      <div className="space-y-5">
        <Card title="Sale Summary">
          <dl className="space-y-2 text-sm">
            {[["Total Transaction", TOTAL_TX], ["Fuel Sales", usd(FUEL_SALES)], ["Store Sales", usd(STORE_SALES)], ["Discounts", `-${usd(DISCOUNTS)}`], ["Taxes (included)", usd(TAXES)]].map(([k, v]) => (
              <div key={k} className="flex justify-between"><dt className="text-slate-600">{k}</dt><dd className="font-medium">{v}</dd></div>))}
            <div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Net Total</dt><dd className="text-emerald-600">{usd(TOTAL_SALES)}</dd></div></dl>
        </Card>
        <Card title="Pump Status">
          <ul className="divide-y">{PUMPS.map((p) => { const ok = p.status === "Available"; return (
            <li key={p.id}><button disabled={!ok} onClick={() => onNavigate("pos-terminal")} title={ok ? "Open POS Terminal" : `${p.id} is ${p.status}`} className="flex w-full items-center gap-3 py-3 text-left enabled:hover:bg-slate-50 disabled:cursor-default">
              <Fuel size={26} className={PUMP_ICON[p.status]} /><span className="flex-1 text-sm"><b className="block font-medium">{p.id}</b><span className="text-xs text-slate-500">{p.fuel}</span></span>
              <span className={`rounded px-2.5 py-1 text-xs font-medium ${PUMP_CLS[p.status]}`}>{p.status}</span></button></li>); })}</ul>
        </Card>
        <Card title={`Reminders${pending ? ` (${pending})` : ""}`} action={<Bell size={16} className="text-slate-400" />}>
          <div className="space-y-2.5">{reminders.map((r) => (
            <div key={r.id} className={`flex items-start gap-3 rounded-lg border p-3 ${r.done ? "bg-slate-50 opacity-60" : "bg-white"}`}>
              <button aria-label="Toggle done" onClick={() => setReminders((all) => all.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)))}><r.icon size={20} className={r.done ? "text-emerald-500" : r.tone} /></button>
              <div className="flex-1 text-xs"><p className={`font-semibold ${r.done ? "line-through" : ""}`}>{r.title}</p><p className="text-slate-500">{r.text}</p>
                {r.go && !r.done && <button onClick={() => onNavigate(r.go)} className="mt-1 font-semibold text-blue-600 hover:underline">Open shift handover →</button>}</div>
              <button aria-label="Dismiss" onClick={() => setReminders((all) => all.filter((x) => x.id !== r.id))} className="text-slate-300 hover:text-red-500"><X size={14} /></button></div>))}
            {!reminders.length && <p className="py-4 text-center text-xs text-slate-400">No reminders.</p>}</div>
        </Card>
      </div>

      {modal?.type === "sale" && (
        <Modal title={modal.sale.no} onClose={() => setModal(null)}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Time</dt><dd>{modal.sale.time}</dd><dt className="text-slate-500">Pump</dt><dd>{modal.sale.pump}</dd><dt className="text-slate-500">Fuel type</dt><dd>{modal.sale.fuel}</dd>
            <dt className="text-slate-500">Quantity</dt><dd>{modal.sale.qty.toFixed(3)} L</dd><dt className="text-slate-500">Unit price</dt><dd>{usd(modal.sale.total / modal.sale.qty)} / L</dd>
            <dt className="text-slate-500">Total</dt><dd className="font-semibold">{usd(modal.sale.total)}</dd><dt className="text-slate-500">Payment</dt><dd>{modal.sale.pay}</dd><dt className="text-slate-500">Status</dt><dd>{modal.sale.status}</dd></dl>
          <div className="mt-5 flex justify-end gap-2"><Btn v="ghost" onClick={() => setModal(null)}>Close</Btn><Btn onClick={() => { setModal(null); onNavigate("daily-sales-and-refunds"); }}>Refund / Void</Btn></div>
        </Modal>)}

      {modal?.type === "report" && (
        <Modal title="Sales Report · Today" onClose={() => setModal(null)}>
          <dl className="space-y-1.5 text-sm">{[["Transactions", TOTAL_TX], ["Fuel sales", usd(FUEL_SALES)], ["Store sales", usd(STORE_SALES)], ["Discounts", `-${usd(DISCOUNTS)}`], ["Taxes (included)", usd(TAXES)], ["Net total", usd(TOTAL_SALES)]].map(([k, v]) => (
            <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>))}</dl>
          <p className="mb-1 mt-4 text-xs font-semibold text-slate-500">By payment method</p>
          {PAYMENTS.map((p) => <div key={p.name} className="flex justify-between text-sm"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span><span>{usd(p.value)}</span></div>)}
          <div className="mt-5 flex justify-end gap-2"><Btn v="ghost" onClick={() => setModal(null)}>Close</Btn><Btn onClick={exportReport} className="flex items-center gap-2"><Download size={15} />Download CSV</Btn></div>
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
