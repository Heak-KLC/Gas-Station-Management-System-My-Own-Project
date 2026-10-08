import { useEffect, useState } from "react";
import { Fuel, ShoppingCart, Undo2, DollarSign, BarChart3, Download, Plus, X } from "lucide-react";

const FUEL_ROWS = [
  { type: "Diesel", qty: 2450.2, amount: 3125.8, tx: 58 }, { type: "Regular 92", qty: 1280.1, amount: 2016.6, tx: 43 },
  { type: "Super 95", qty: 1050.05, amount: 1312.45, tx: 23 }, { type: "Other", qty: 240, amount: 285.5, tx: 4 },
];
const STORE_ROWS = [
  { cat: "Beverage", amount: 512.3, tx: 18 }, { cat: "Snacks", amount: 298.75, tx: 12 }, { cat: "Car Care", amount: 245.5, tx: 8 }, { cat: "Other", amount: 200.25, tx: 7 },
];
const REFUNDS0 = [
  { id: 1, kind: "Fuel Sale", ref: "INV-F000125", amount: 45, reason: "Wrong Fuel", time: "09:15 AM", status: "Approved" },
  { id: 2, kind: "Store Sale", ref: "INV-F000098", amount: 12.5, reason: "Customer Change Mind", time: "09:45 AM", status: "Approved" },
  { id: 3, kind: "Fuel Sale", ref: "INV-F000124", amount: 60, reason: "Over Payment", time: "10:20 AM", status: "Approved" },
  { id: 4, kind: "Fuel Sale", ref: "INV-F000118", amount: 3, reason: "System Error", time: "10:40 AM", status: "Pending" },
  { id: 5, kind: "Store Sale", ref: "INV-F000097", amount: 8.75, reason: "Damaged Product", time: "10:50 AM", status: "Approved" },
];
const REASONS = ["Wrong Fuel", "Over Payment", "Customer Change Mind", "System Error", "Damaged Product", "Other"];
const STATUS_CLS = { Approved: "bg-emerald-50 text-emerald-600", Pending: "bg-orange-50 text-orange-500" };

const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const nf = (n, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const sum = (a, k) => a.reduce((s, x) => s + x[k], 0);

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
  const c = { blue: "bg-blue-600 text-white hover:bg-blue-700", ghost: "border bg-white text-slate-700 hover:bg-slate-50", red: "bg-red-500 text-white hover:bg-red-600" }[v];
  return <button {...p} className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${c} ${className}`}>{children}</button>;
};
const Field = ({ label, ...p }) => <label className="block text-sm text-slate-700">{label}<input {...p} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-sky-400" /></label>;
const Sel = ({ label, options, ...p }) => <label className="block text-sm text-slate-700">{label}<select {...p} className="mt-1 w-full rounded-lg border px-3 py-2">{options.map((o) => <option key={o}>{o}</option>)}</select></label>;

export default function DailySales() {
  const [view, setView] = useState("All");
  const [refunds, setRefunds] = useState(REFUNDS0);
  const [rFilter, setRFilter] = useState("All");
  const [modal, setModal] = useState(null); // { type: 'new'|'detail', id? }
  const [form, setForm] = useState({ kind: "Fuel Sale", ref: "", amount: "", reason: REASONS[0], other: "" });
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const fuelTotal = sum(FUEL_ROWS, "amount"), fuelTx = sum(FUEL_ROWS, "tx"), fuelQty = sum(FUEL_ROWS, "qty");
  const storeTotal = sum(STORE_ROWS, "amount"), storeTx = sum(STORE_ROWS, "tx");
  const refundTotal = sum(refunds, "amount");
  const net = fuelTotal + storeTotal - refundTotal;
  const shown = refunds.filter((r) => rFilter === "All" || r.status === rFilter);
  const sel = modal?.id ? refunds.find((r) => r.id === modal.id) : null;
  const close = () => { setModal(null); setError(""); setConfirmCancel(false); };

  const submit = (e) => {
    e.preventDefault();
    const amount = Number(form.amount), ref = form.ref.trim().toUpperCase();
    if (!ref) return setError("Enter the invoice reference number.");
    if (refunds.some((r) => r.ref === ref)) return setError("This invoice already has a refund.");
    if (!(amount > 0)) return setError("Enter an amount greater than 0.");
    if (amount > (form.kind === "Fuel Sale" ? fuelTotal : storeTotal)) return setError("Refund is larger than today's sales for this type.");
    if (form.reason === "Other" && !form.other.trim()) return setError("Describe the reason.");
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setRefunds((all) => [...all, { id: Date.now(), kind: form.kind, ref, amount, reason: form.reason === "Other" ? form.other.trim() : form.reason, time: now, status: "Pending" }]);
    setToast(`Refund ${ref} submitted for approval`); close();
  };
  const cancelRefund = () => { setRefunds((all) => all.filter((r) => r.id !== sel.id)); setToast(`Refund ${sel.ref} canceled`); close(); };
  const exportCSV = () => {
    downloadCSV("daily_sales_refunds.csv", [
      ["FUEL SALES"], ["Fuel Type", "Quantity (L)", "Amount ($)", "Transactions"], ...FUEL_ROWS.map((r) => [r.type, r.qty, r.amount, r.tx]), ["Total", fuelQty.toFixed(2), fuelTotal.toFixed(2), fuelTx], [],
      ["STORE SALES"], ["Category", "Amount ($)", "Transactions"], ...STORE_ROWS.map((r) => [r.cat, r.amount, r.tx]), ["Total", storeTotal.toFixed(2), storeTx], [],
      ["REFUNDS"], ["Type", "Reference", "Amount ($)", "Reason", "Time", "Status"], ...refunds.map((r) => [r.kind, r.ref, r.amount, r.reason, r.time, r.status]), ["Total", "", refundTotal.toFixed(2)], [],
      ["NET SALES", net.toFixed(2)],
    ]);
    setToast("Daily report downloaded");
  };

  const Stat = ({ icon: Icon, bg, label, value, note, tone }) => (
    <div className={`flex items-center gap-4 rounded-2xl p-5 ring-1 ring-slate-100 ${tone}`}>
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white ${bg}`}><Icon size={26} /></span>
      <div><p className="text-sm font-medium text-slate-700">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p>{note}</div>
    </div>
  );
  const th = "px-3 py-2 text-left text-xs font-medium text-slate-600";

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat icon={Fuel} bg="bg-blue-600" tone="bg-blue-50" label="Fuel Sales (Today)" value={usd(fuelTotal)} note={<p className="text-xs text-slate-500">{fuelTx} Transactions</p>} />
        <Stat icon={ShoppingCart} bg="bg-green-600" tone="bg-green-50" label="Store Sales (Today)" value={usd(storeTotal)} note={<p className="text-xs text-slate-500">{storeTx} Transactions</p>} />
        <Stat icon={Undo2} bg="bg-red-500" tone="bg-red-50" label="Refunds (Today)" value={usd(refundTotal)} note={<p className="text-xs text-slate-500">{refunds.length} Refund Transactions</p>} />
        <Stat icon={DollarSign} bg="bg-amber-400" tone="bg-amber-50" label="Net Sales" value={usd(net)} note={<span className="mt-1 inline-block rounded border border-emerald-300 bg-emerald-50 px-1.5 text-[10px] text-emerald-700">Net sales = Fuel + Store - Refunds</span>} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex items-start justify-between">
            <div><h3 className="flex items-center gap-3 text-xl font-bold text-slate-800"><BarChart3 className="text-blue-600" />Daily Sales</h3>
              <div className="mt-3 flex gap-2">{["All", "Fuel Sales", "Store Sales"].map((v) => (
                <button key={v} onClick={() => setView(v)} className={`rounded px-4 py-1.5 text-sm font-medium transition ${view === v ? "bg-blue-600 text-white" : "border border-emerald-500 text-emerald-600 hover:bg-emerald-50"}`}>{v}</button>))}</div></div>
            <div className="text-right"><p className="text-sm font-semibold">Total Sales</p><p className="text-2xl font-bold text-blue-600">{usd(fuelTotal + storeTotal)}</p>
              <button onClick={exportCSV} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"><Download size={14} />Export CSV</button></div>
          </div>

          {view !== "Store Sales" && (<div className="mt-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Fuel size={18} className="text-blue-600" />Fuel Sales Summary</p>
            <table className="w-full text-xs"><thead><tr className="bg-slate-100">{["Fuel Type", "Quantity (L)", "Amount ($)", "Transactions"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{FUEL_ROWS.map((r) => <tr key={r.type} className="border-b"><td className="px-3 py-2.5">{r.type}</td><td className="px-3 py-2.5">{nf(r.qty)}</td><td className="px-3 py-2.5">{usd(r.amount)}</td><td className="px-3 py-2.5">{r.tx}</td></tr>)}
                <tr className="border border-blue-400 bg-blue-50 font-bold text-blue-700"><td className="px-3 py-2.5">Total Fuel Sales</td><td className="px-3 py-2.5">{nf(fuelQty)}</td><td className="px-3 py-2.5">{usd(fuelTotal)}</td><td className="px-3 py-2.5">{fuelTx}</td></tr></tbody></table></div>)}

          {view !== "Fuel Sales" && (<div className="mt-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShoppingCart size={18} className="text-green-600" />Store Sales Summary</p>
            <table className="w-full text-xs"><thead><tr className="bg-slate-100">{["Category", "Amount ($)", "Transactions"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{STORE_ROWS.map((r) => <tr key={r.cat} className="border-b"><td className="px-3 py-2.5">{r.cat}</td><td className="px-3 py-2.5">{usd(r.amount)}</td><td className="px-3 py-2.5">{r.tx}</td></tr>)}
                <tr className="border border-green-500 bg-green-50 font-bold text-green-700"><td className="px-3 py-2.5">Total Store Sales</td><td className="px-3 py-2.5">{usd(storeTotal)}</td><td className="px-3 py-2.5">{storeTx}</td></tr></tbody></table></div>)}

          {view === "All" && <div className="mt-4 flex items-center justify-between rounded border border-blue-400 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700"><span>Total Sales (Fuel + Store)</span><span>{usd(fuelTotal + storeTotal)}</span><span>{fuelTx + storeTx}</span></div>}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex items-start justify-between">
            <div><h3 className="flex items-center gap-3 text-xl font-bold text-slate-800"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500"><Undo2 size={20} /></span>Daily Refunds</h3>
              <div className="mt-3 flex gap-2">{["All", "Approved", "Pending"].map((s) => (
                <button key={s} onClick={() => setRFilter(s)} className={`rounded-full px-3 py-1 text-xs font-semibold ${rFilter === s ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s} ({s === "All" ? refunds.length : refunds.filter((r) => r.status === s).length})</button>))}</div></div>
            <div className="text-right"><p className="text-sm font-semibold">Total Refunds</p><p className="text-2xl font-bold text-red-500">{usd(refundTotal)}</p><p className="text-xs text-slate-500">{refunds.length} Refunds Transactions</p>
              <Btn onClick={() => { setForm({ kind: "Fuel Sale", ref: "", amount: "", reason: REASONS[0], other: "" }); setError(""); setModal({ type: "new" }); }} className="mt-2 flex items-center gap-1.5 !px-3 !py-1.5 !text-xs"><Plus size={14} />New Refund</Btn></div>
          </div>
          <table className="w-full text-xs"><thead><tr className="border-y bg-slate-50">{["Type", "Reference No.", "Amount ($)", "Reason", "Time", "Status"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-semibold">{h}</th>)}</tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-3 py-3"><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${r.kind === "Fuel Sale" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>{r.kind === "Fuel Sale" ? <Fuel size={22} /> : <ShoppingCart size={22} />}</span></td>
                <td className="px-3 py-3"><button onClick={() => setModal({ type: "detail", id: r.id })} className="text-left hover:underline"><span className="block">{r.kind}</span><span className="font-medium text-blue-700">{r.ref}</span></button></td>
                <td className="px-3 py-3 font-semibold text-red-500">{usd(r.amount)}</td><td className="px-3 py-3">{r.reason}</td><td className="whitespace-nowrap px-3 py-3">{r.time}</td>
                <td className="px-3 py-3"><span className={`rounded px-2 py-0.5 font-semibold ${STATUS_CLS[r.status]}`}>{r.status}</span></td></tr>))}
              {!shown.length && <tr><td colSpan={6} className="py-8 text-center text-slate-400">No refunds.</td></tr>}
              <tr className="font-bold text-red-500"><td colSpan={2} className="px-3 py-3">Total Refunds</td><td className="px-3 py-3">{usd(sum(shown, "amount"))}</td><td colSpan={3} className="px-3 py-3">{shown.length}</td></tr></tbody></table>
        </section>
      </div>

      <section className="flex items-center justify-between rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
        <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white"><DollarSign size={24} /></span>
          <div><p className="text-xl font-bold text-slate-900">Net Sales (Today)</p><p className="text-sm text-slate-600">Net Sales = Fuel Sales + Store - Refunds</p></div></div>
        <div className="rounded border border-emerald-400 bg-emerald-50 px-6 py-2 text-center"><p className="text-2xl font-bold text-emerald-600">{usd(net)}</p><p className="text-sm text-emerald-600">Net Sales</p></div>
      </section>

      {modal?.type === "new" && (
        <Modal title="New refund" onClose={close}>
          <form onSubmit={submit} className="space-y-3">
            <Sel label="Sale type" options={["Fuel Sale", "Store Sale"]} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} />
            <Field label="Invoice / reference no." placeholder="INV-F000130" value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} />
            <Field label="Amount ($)" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Sel label="Reason" options={REASONS} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            {form.reason === "Other" && <Field label="Describe the reason" value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} />}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><Btn type="button" v="ghost" onClick={close}>Cancel</Btn><Btn type="submit">Submit refund</Btn></div>
          </form>
        </Modal>)}

      {modal?.type === "detail" && sel && (
        <Modal title={`Refund ${sel.ref}`} onClose={close}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Type</dt><dd>{sel.kind}</dd><dt className="text-slate-500">Amount</dt><dd className="font-semibold text-red-500">{usd(sel.amount)}</dd>
            <dt className="text-slate-500">Reason</dt><dd>{sel.reason}</dd><dt className="text-slate-500">Time</dt><dd>{sel.time}</dd>
            <dt className="text-slate-500">Status</dt><dd><span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[sel.status]}`}>{sel.status}</span></dd></dl>
          {sel.status === "Pending" && (confirmCancel ? (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm"><p className="mb-2 text-red-600">Cancel this refund request?</p>
              <div className="flex justify-end gap-2"><Btn v="ghost" onClick={() => setConfirmCancel(false)}>Keep</Btn><Btn v="red" onClick={cancelRefund}>Cancel refund</Btn></div></div>
          ) : <div className="mt-5 flex justify-end gap-2"><Btn v="ghost" onClick={close}>Close</Btn><Btn v="red" onClick={() => setConfirmCancel(true)}>Cancel request</Btn></div>)}
          {sel.status !== "Pending" && <div className="mt-5 flex justify-end"><Btn v="ghost" onClick={close}>Close</Btn></div>}
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}