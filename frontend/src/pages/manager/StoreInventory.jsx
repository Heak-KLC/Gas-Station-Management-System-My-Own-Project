import { useEffect, useMemo, useRef, useState } from "react";
import { Package, ClipboardList, PackageX, Calculator, Search, MoreVertical, X } from "lucide-react";

const SEED = [
  { id: 1, name: "Coca_Cola", category: "Beverage", stock: 23, price: 1.5, min: 10 },
  { id: 2, name: "Pepsi", category: "Beverage", stock: 0, price: 1.5, min: 20 },
  { id: 3, name: "Water", category: "Beverage", stock: 60, price: 0.5, min: 20 },
  { id: 4, name: "Chips", category: "Snacks", stock: 6, price: 1.25, min: 15 },
  { id: 5, name: "Energy Drink", category: "Beverage", stock: 34, price: 2.5, min: 12 },
  { id: 6, name: "Chocolate Bar", category: "Snacks", stock: 0, price: 1.0, min: 15 },
  { id: 7, name: "Sprite", category: "Beverage", stock: 8, price: 1.5, min: 15 },
  { id: 8, name: "Peanuts", category: "Snacks", stock: 40, price: 1.0, min: 10 },
];
const ACTIVITY = [
  { id: 1, product: "Pepsi", change: 20, kind: "Restock", when: "5 min ago" },
  { id: 2, product: "Water", change: -5, kind: "Sale", when: "20 min ago" },
  { id: 3, product: "Chips", change: -2, kind: "Damage", when: "1 hr ago" },
  { id: 4, product: "Sprite", change: 24, kind: "Restock", when: "2 hr ago" },
  { id: 5, product: "Coca_Cola", change: -3, kind: "Sale", when: "3 hr ago" },
  { id: 6, product: "Energy Drink", change: 12, kind: "Restock", when: "Yesterday" },
  { id: 7, product: "Peanuts", change: -1, kind: "Sale", when: "Yesterday" },
  { id: 8, product: "Chocolate Bar", change: -4, kind: "Damage", when: "Yesterday" },
  { id: 9, product: "Water", change: 48, kind: "Restock", when: "2 days ago" },
  { id: 10, product: "Chips", change: -6, kind: "Sale", when: "2 days ago" },
];
const STATUSES = ["All stock status", "In stock", "Low stock", "Out of stock"];
const STATUS_STYLE = { "In stock": "bg-emerald-100 text-emerald-700", "Low stock": "bg-amber-100 text-amber-700", "Out of stock": "bg-red-100 text-red-600" };
const statusOf = (p) => (p.stock === 0 ? "Out of stock" : p.stock <= p.min ? "Low stock" : "In stock");
const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const ACTIONS = { restock: { label: "Restock", sign: 1, kind: "Restock" }, sale: { label: "Record sale", sign: -1, kind: "Sale" }, damage: { label: "Mark damage", sign: -1, kind: "Damage" } };

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
const Badge = ({ status }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>{status}</span>;
const Field = ({ label, ...p }) => (
  <label className="block text-sm">{label}<input {...p} className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-sky-400" /></label>
);

function StatCard({ label, value, note, icon: Icon, onReview }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between"><div><p className="text-lg font-bold uppercase text-slate-900">{label}</p><p className="mt-1 text-slate-700">{value}</p></div><Icon size={34} className="text-slate-700" /></div>
      <div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">{note}</span><GreenBtn onClick={onReview}>Review</GreenBtn></div>
    </div>
  );
}

export default function StoreInventory() {
  const [products, setProducts] = useState(SEED);
  const [activity, setActivity] = useState(ACTIVITY);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All Categories");
  const [st, setSt] = useState(STATUSES[0]);
  const [menuId, setMenuId] = useState(null);
  const [modal, setModal] = useState(null); // { type: 'add'|'qty'|'remove'|'value', action, id }
  const [qty, setQty] = useState("");
  const [form, setForm] = useState({ name: "", category: "Beverage", stock: "", price: "", min: "" });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [allAlerts, setAllAlerts] = useState(false);
  const [allActivity, setAllActivity] = useState(false);
  const tableRef = useRef(null);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const categories = ["All Categories", ...new Set(products.map((p) => p.category))];
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => (!s || p.name.toLowerCase().includes(s)) && (cat === "All Categories" || p.category === cat) && (st === STATUSES[0] || statusOf(p) === st));
  }, [products, q, cat, st]);
  const lowItems = products.filter((p) => statusOf(p) !== "In stock");
  const outCount = products.filter((p) => p.stock === 0).length;
  const lowCount = products.filter((p) => statusOf(p) === "Low stock").length;
  const value = products.reduce((s, p) => s + p.stock * p.price, 0);
  const sel = modal?.id != null ? products.find((p) => p.id === modal.id) : null;

  const close = () => { setModal(null); setError(""); };
  const jump = (status) => { setQ(""); setCat("All Categories"); setSt(status); tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const openQty = (action, id) => { setMenuId(null); setQty(""); setError(""); setModal({ type: "qty", action, id }); };
  const log = (product, change, kind) => setActivity((a) => [{ id: Date.now(), product, change, kind, when: "Just now" }, ...a]);

  const submitQty = (e) => {
    e.preventDefault();
    const n = Number(qty), a = ACTIONS[modal.action];
    if (!Number.isInteger(n) || n <= 0) return setError("Enter a whole number greater than 0.");
    if (a.sign < 0 && n > sel.stock) return setError(`Only ${sel.stock} in stock.`);
    setProducts((all) => all.map((p) => (p.id === sel.id ? { ...p, stock: p.stock + a.sign * n } : p)));
    log(sel.name, a.sign * n, a.kind);
    setToast(`${a.label}: ${sel.name} ${a.sign > 0 ? "+" : "-"}${n}`);
    close();
  };
  const submitAdd = (e) => {
    e.preventDefault();
    const stock = Number(form.stock), price = Number(form.price), min = Number(form.min || 0);
    if (!form.name.trim()) return setError("Enter a product name.");
    if (products.some((p) => p.name.toLowerCase() === form.name.trim().toLowerCase())) return setError("This product already exists.");
    if (!Number.isInteger(stock) || stock < 0) return setError("Stock must be 0 or more.");
    if (!(price > 0)) return setError("Price must be greater than 0.");
    setProducts((all) => [...all, { id: Date.now(), name: form.name.trim(), category: form.category, stock, price, min }]);
    if (stock > 0) log(form.name.trim(), stock, "Restock");
    setToast(`${form.name.trim()} added`);
    setForm({ name: "", category: "Beverage", stock: "", price: "", min: "" });
    close();
  };
  const removeProduct = () => { setProducts((all) => all.filter((p) => p.id !== sel.id)); setToast(`${sel.name} removed`); close(); };

  const statusByName = (name) => { const p = products.find((x) => x.name === name); return p ? statusOf(p) : null; };

  return (
    <div className="space-y-6 bg-gray-400 p-6">
      <h2 className="text-xl font-bold text-slate-800">Product and Inventory</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={`${products.length} Items`} note="Active Items" icon={Package} onReview={() => jump(STATUSES[0])} />
        <StatCard label="Low stock items" value={`${lowCount} Items`} note="Need to Reorder" icon={ClipboardList} onReview={() => jump("Low stock")} />
        <StatCard label="Out of stock" value={`${outCount} Items`} note="Unavailable Items" icon={PackageX} onReview={() => jump("Out of stock")} />
        <StatCard label="Inventory value" value={usd(value)} note="Currently Stock" icon={Calculator} onReview={() => setModal({ type: "value" })} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <section ref={tableRef} className="scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold text-slate-800">Inventory Overview</h3><GreenBtn onClick={() => { setError(""); setModal({ type: "add" }); }}>+ Add Product</GreenBtn></div>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search products..." className="w-full rounded-xl border border-slate-300 bg-rose-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400" /></div>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-slate-300 bg-rose-50 px-3 py-2 text-sm">{categories.map((c) => <option key={c}>{c}</option>)}</select>
              <select value={st} onChange={(e) => setSt(e.target.value)} className="rounded-xl border border-slate-300 bg-rose-50 px-3 py-2 text-sm">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-300 text-left text-xs font-semibold text-slate-600">{["PRODUCT", "CATEGORY", "STOCK", "PRICE", "STATUS", "ACTION"].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-2 py-2.5 font-medium">{p.name}</td><td className="px-2 py-2.5">{p.category}</td><td className="px-2 py-2.5">{p.stock}</td>
                    <td className="px-2 py-2.5">{usd(p.price)}</td><td className="px-2 py-2.5"><Badge status={statusOf(p)} /></td>
                    <td className="relative px-2 py-2.5">
                      <button aria-label={`Actions for ${p.name}`} onClick={() => setMenuId(menuId === p.id ? null : p.id)} className="rounded p-1 hover:bg-slate-200"><MoreVertical size={16} /></button>
                      {menuId === p.id && (<>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                        <div className="absolute right-2 top-9 z-20 w-40 overflow-hidden rounded-lg border bg-white py-1 text-sm shadow-lg">
                          <button className="block w-full px-3 py-1.5 text-left hover:bg-rose-50" onClick={() => openQty("restock", p.id)}>Restock</button>
                          <button className="block w-full px-3 py-1.5 text-left hover:bg-rose-50" onClick={() => openQty("sale", p.id)}>Record sale</button>
                          <button className="block w-full px-3 py-1.5 text-left hover:bg-rose-50" onClick={() => openQty("damage", p.id)}>Mark damage</button>
                          <button className="block w-full px-3 py-1.5 text-left text-red-500 hover:bg-rose-50" onClick={() => { setMenuId(null); setModal({ type: "remove", id: p.id }); }}>Remove product</button>
                        </div></>)}
                    </td>
                  </tr>))}
                {!rows.length && <tr><td colSpan={6} className="py-8 text-center text-slate-400">No products match your filters.</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-bold text-slate-800">Low stock alert</h3><GreenBtn onClick={() => setAllAlerts((v) => !v)}>{allAlerts ? "Show less" : "View all"}</GreenBtn></div>
            {lowItems.length ? (allAlerts ? lowItems : lowItems.slice(0, 3)).map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-rose-100 py-2 last:border-0">
                <div><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.stock} left / min {p.min}</p></div>
                <button onClick={() => openQty("restock", p.id)} className="rounded-md border bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200">Restock</button>
              </div>)) : <p className="py-4 text-center text-sm text-slate-400">All products are well stocked.</p>}
          </section>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold text-slate-800">Recently inventory activity</h3><GreenBtn onClick={() => setAllActivity((v) => !v)}>{allActivity ? "Show less" : "View all"}</GreenBtn></div>
          <ul className="divide-y">
            {(allActivity ? activity : activity.slice(0, 8)).map((a) => {
              const s = statusByName(a.product);
              return (
                <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="flex-1"><span className="font-medium">{a.product}</span><span className="block text-xs text-slate-400">{a.kind}</span></span>
                  {s ? <Badge status={s} /> : <span className="text-xs text-slate-400">Removed</span>}
                  <span className={`w-10 text-right font-semibold ${a.change > 0 ? "text-emerald-600" : "text-red-500"}`}>{a.change > 0 ? "+" : ""}{a.change}</span>
                  <span className="w-28 text-right text-xs text-slate-500">{a.when} · You</span>
                </li>);
            })}
          </ul>
        </section>
      </div>

      {modal?.type === "qty" && sel && (
        <Modal title={`${ACTIONS[modal.action].label}: ${sel.name}`} onClose={close}>
          <form onSubmit={submitQty} className="space-y-3">
            <p className="text-sm text-slate-500">Current stock: {sel.stock}</p>
            <Field label="Quantity" type="number" min="1" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-full border px-4 py-1.5 text-xs font-semibold">Cancel</button><GreenBtn type="submit">Save</GreenBtn></div>
          </form>
        </Modal>)}

      {modal?.type === "add" && (
        <Modal title="Add Product" onClose={close}>
          <form onSubmit={submitAdd} className="space-y-3">
            <Field label="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="block text-sm">Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2">
              {[...new Set(["Beverage", "Snacks", ...products.map((p) => p.category)])].map((c) => <option key={c}>{c}</option>)}</select></label>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              <Field label="Price ($)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Field label="Min stock" type="number" min="0" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={close} className="rounded-full border px-4 py-1.5 text-xs font-semibold">Cancel</button><GreenBtn type="submit">Add product</GreenBtn></div>
          </form>
        </Modal>)}

      {modal?.type === "remove" && sel && (
        <Modal title="Remove product" onClose={close}>
          <p className="text-sm">Remove <b>{sel.name}</b> from the inventory? {sel.stock} items in stock will no longer be counted.</p>
          <div className="mt-4 flex justify-end gap-2"><button onClick={close} className="rounded-full border px-4 py-1.5 text-xs font-semibold">Cancel</button>
            <button onClick={removeProduct} className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600">Remove</button></div>
        </Modal>)}

      {modal?.type === "value" && (
        <Modal title="Inventory value by category" onClose={close}>
          <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-slate-500"><th className="py-2">CATEGORY</th><th>ITEMS</th><th className="text-right">VALUE</th></tr></thead>
            <tbody>{[...new Set(products.map((p) => p.category))].map((c) => { const list = products.filter((p) => p.category === c);
              return <tr key={c} className="border-b last:border-0"><td className="py-2">{c}</td><td>{list.reduce((s, p) => s + p.stock, 0)}</td><td className="text-right">{usd(list.reduce((s, p) => s + p.stock * p.price, 0))}</td></tr>; })}
              <tr className="font-bold"><td className="pt-3">Total</td><td className="pt-3">{products.reduce((s, p) => s + p.stock, 0)}</td><td className="pt-3 text-right">{usd(value)}</td></tr></tbody></table>
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
