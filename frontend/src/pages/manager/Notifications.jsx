import { useEffect, useMemo, useState } from "react";
import { Bell, Mail, MailOpen, Clock, Eye, Filter, RotateCcw, Search, X } from "lucide-react";

const TYPES = {
  fuel_low_stock: { label: "Low Stock", cls: "bg-amber-100 text-amber-700" },
  price_update: { label: "Price Update", cls: "bg-sky-100 text-sky-700" },
  delivery_reminder: { label: "Delivery", cls: "bg-violet-100 text-violet-700" },
  maintenance_reminder: { label: "Maintenance", cls: "bg-orange-100 text-orange-700" },
  promotion: { label: "Promotion", cls: "bg-pink-100 text-pink-700" },
  system_alert: { label: "System Alert", cls: "bg-slate-200 text-slate-700" },
};
const STATUS_CLS = { Unread: "bg-red-100 text-red-600", Read: "bg-emerald-100 text-emerald-700", Expired: "bg-slate-200 text-slate-500" };
// reference prefix -> sidebar page key (null = nothing to open)
const TARGETS = { TANK: ["fuel-and-tank-monitoring", "Fuel & Tank Monitoring"], PRICE: ["fuel-and-tank-monitoring", "Fuel & Tank Monitoring"], PUMP: ["pumps-status", "Pumps & Status"],
  DEL: ["fuel-purchases", "Fuel Purchases"], GEN: ["equipment-maintenance", "Equipment Maintenance"] };
const PAGE_SIZE = 8;

const NOW = Date.now();
const mk = (id, type, title, message, ref, read, minAgo, expDays) => ({ id, type, title, message, ref, read,
  created: new Date(NOW - minAgo * 60000), expires: expDays == null ? null : new Date(NOW + expDays * 86400000) });
const SEED = [
  mk(1, "fuel_low_stock", "Premium Fuel Low Stock", "Premium fuel is below 40%. Please refill soon.", "TANK-003", false, 5, 30),
  mk(2, "price_update", "New Fuel Price Update", "Fuel prices have been updated effective from today.", "PRICE-015", true, 120, null),
  mk(3, "delivery_reminder", "Upcoming Fuel Delivery", "Diesel fuel delivery is scheduled for tomorrow at 10:00 AM.", "DEL-007", true, 300, 7),
  mk(4, "maintenance_reminder", "Pump Maintenance Due", "Pump #2 maintenance is due this month.", "PUMP-002", true, 1440, 14),
  mk(5, "promotion", "Weekend Special Promotion", "Get 5% off on all fuel purchases this weekend!", "PROMO-003", false, 1500, 3),
  mk(6, "system_alert", "System Maintenance", "The system will be under maintenance from 12:00 AM to 2:22 AM.", "SYS-001", false, 2900, 20),
  mk(7, "fuel_low_stock", "Diesel Fuel Low Stock", "Diesel fuel is running low. Current stock is 3,000 liters.", "TANK-002", true, 4400, 30),
  mk(8, "delivery_reminder", "Gasoline Delivery Reminder", "Gasoline delivery is scheduled at 9:00 AM.", "DEL-006", true, 5800, 10),
  mk(9, "promotion", "Loyalty Points Double Day", "Customers earn double points this Friday.", "PROMO-004", true, 8700, -1),
  mk(10, "system_alert", "Backup Completed", "Daily database backup completed successfully.", "SYS-002", true, 10000, -2),
  mk(11, "price_update", "LPG Price Update", "LPG price changed to $0.60 per liter.", "PRICE-014", false, 11500, null),
  mk(12, "maintenance_reminder", "Generator Service Due", "Generator #1 service is due this week.", "GEN-001", false, 13000, 5),
  mk(13, "delivery_reminder", "Delivery Delayed", "PO-002 delivery has been moved to 07/10/2026.", "DEL-008", true, 17000, 7),
  mk(14, "system_alert", "New Login Detected", "A new login was detected for the Cashier account.", "SYS-003", false, 21000, 30),
];
const EMPTY_F = { q: "", type: "All Type", status: "All Status", from: "", to: "" };

const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDT = (d) => (d ? `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "-");
const statusOf = (n) => (n.expires && n.expires.getTime() < Date.now() ? "Expired" : n.read ? "Read" : "Unread");
const target = (ref) => TARGETS[ref.split("-")[0]];

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
const Btn = ({ children, v = "gold", className = "", ...p }) => {
  const c = { gold: "bg-[#b8860b] text-white hover:bg-[#9a7009]", ghost: "border bg-white text-slate-700 hover:bg-slate-50", red: "bg-red-500 text-white hover:bg-red-600", green: "bg-emerald-500 text-white hover:bg-emerald-600" }[v];
  return <button {...p} className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${c} ${className}`}>{children}</button>;
};
const Pill = ({ cls, children }) => <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
const Sel = ({ label, options, ...p }) => <label className="block text-sm text-slate-600">{label}<select {...p} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select></label>;
const DateIn = ({ label, ...p }) => <label className="block text-sm text-slate-600">{label}<input type="date" {...p} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>;

export default function Notifications({ onNavigate = () => {} }) {
  const [items, setItems] = useState(SEED);
  const [draft, setDraft] = useState(EMPTY_F);
  const [applied, setApplied] = useState(EMPTY_F);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const month = isoDay(new Date()).slice(0, 7);
  const count = (s) => items.filter((n) => statusOf(n) === s).length;
  const unread = count("Unread");

  const filtered = useMemo(() => {
    const s = applied.q.trim().toLowerCase();
    return items.filter((n) => (!s || [n.title, n.message, n.ref, n.type, TYPES[n.type].label].some((v) => v.toLowerCase().includes(s))) &&
      (applied.type === "All Type" || n.type === applied.type) && (applied.status === "All Status" || statusOf(n) === applied.status) &&
      (!applied.from || isoDay(n.created) >= applied.from) && (!applied.to || isoDay(n.created) <= applied.to));
  }, [items, applied]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const sel = items.find((n) => n.id === openId);
  const tgt = sel && target(sel.ref);

  const setRead = (id, read) => setItems((all) => all.map((n) => (n.id === id ? { ...n, read } : n)));
  const open = (n) => { setRead(n.id, true); setConfirmDel(false); setOpenId(n.id); };
  const close = () => { setOpenId(null); setConfirmDel(false); };
  const markAll = () => { setItems((all) => all.map((n) => (statusOf(n) === "Unread" ? { ...n, read: true } : n))); setToast(`${unread} notification${unread === 1 ? "" : "s"} marked as read`); };
  const del = () => { setItems((all) => all.filter((n) => n.id !== openId)); setToast("Notification deleted"); close(); };
  const applyFilter = () => { setApplied(draft); setPage(1); };
  const resetFilter = () => { setDraft(EMPTY_F); setApplied(EMPTY_F); setPage(1); };

  const Stat = ({ icon: Icon, tone, label, value, note }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={24} /></span>
      <div><p className="text-sm text-slate-600">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p><p className="text-sm text-slate-500">{note}</p></div>
    </div>
  );

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#b8860b] text-white"><Bell size={28} /></span>
          <div><h2 className="text-2xl font-bold text-slate-900">Notification</h2><p className="text-sm text-slate-600">View and manage all system notifications</p></div></div>
        <Btn disabled={!unread} onClick={markAll} className="flex items-center gap-2 !px-5 !py-3"><Mail size={18} />Mark all as read</Btn>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat icon={Bell} tone="bg-sky-100 text-sky-500" label="Total Notifications" value={items.filter((n) => isoDay(n.created).startsWith(month)).length} note="This Month" />
        <Stat icon={Mail} tone="bg-emerald-100 text-emerald-600" label="Unread" value={unread} note="Unread" />
        <Stat icon={MailOpen} tone="bg-pink-100 text-pink-500" label="Read" value={count("Read")} note="Read" />
        <Stat icon={Clock} tone="bg-red-100 text-red-500" label="Expired" value={count("Expired")} note="Expired" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1 text-sm text-slate-600">Search
          <span className="relative mt-1 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} onKeyDown={(e) => e.key === "Enter" && applyFilter()} placeholder="Search by notification" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 outline-none focus:border-sky-400" /></span></label>
        <Sel label="Type" options={[["All Type", "All Type"], ...Object.entries(TYPES).map(([k, t]) => [k, t.label])]} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
        <Sel label="Status" options={["All Status", "Unread", "Read", "Expired"]} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} />
        <DateIn label="From" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <DateIn label="To" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <Btn onClick={applyFilter} className="flex items-center gap-2"><Filter size={15} />Filter</Btn>
        <Btn v="ghost" onClick={resetFilter} className="flex items-center gap-2"><RotateCcw size={15} />Reset</Btn>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-sky-400 text-left text-white">{["ID", "Type", "Title", "Message", "Reference", "Status", "Date", "Expires At", "Action"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-3 text-sm font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((n, i) => { const s = statusOf(n); return (
                <tr key={n.id} className={`border-b border-slate-100 last:border-0 ${i % 2 ? "bg-sky-50" : ""}`}>
                  <td className="px-3 py-3">{String(n.id).padStart(3, "0")}</td>
                  <td className="px-3 py-3"><Pill cls={TYPES[n.type].cls}>{TYPES[n.type].label}</Pill></td>
                  <td className={`px-3 py-3 ${s === "Unread" ? "font-bold" : "font-medium"}`}>{n.title}</td>
                  <td className="max-w-[260px] px-3 py-3 text-slate-600">{n.message}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium">{n.ref}</td>
                  <td className="px-3 py-3"><Pill cls={STATUS_CLS[s]}>{s}</Pill></td>
                  <td className="whitespace-nowrap px-3 py-3">{fmtDT(n.created)}</td><td className="whitespace-nowrap px-3 py-3">{fmtDT(n.expires)}</td>
                  <td className="px-3 py-3"><button aria-label="View notification" title="View" onClick={() => open(n)} className="rounded-lg bg-slate-200 p-2 text-slate-600 hover:bg-slate-300"><Eye size={16} /></button></td>
                </tr>); })}
              {!rows.length && <tr><td colSpan={9} className="py-10 text-center text-slate-400">No notifications match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-1 py-3">
          <button disabled={cur === 1} onClick={() => setPage(cur - 1)} className="rounded border px-2.5 py-1 text-sm disabled:opacity-40">‹</button>
          {Array.from({ length: pages }, (_, k) => k + 1).map((k) => <button key={k} onClick={() => setPage(k)} className={`rounded border px-3 py-1 text-sm ${k === cur ? "border-sky-500 bg-sky-500 text-white" : "hover:bg-slate-50"}`}>{k}</button>)}
          <button disabled={cur === pages} onClick={() => setPage(cur + 1)} className="rounded border px-2.5 py-1 text-sm disabled:opacity-40">»</button>
        </div>
      </div>

      {sel && (
        <Modal title={sel.title} onClose={close}>
          <div className="mb-3 flex items-center gap-2"><Pill cls={TYPES[sel.type].cls}>{TYPES[sel.type].label}</Pill><Pill cls={STATUS_CLS[statusOf(sel)]}>{statusOf(sel)}</Pill></div>
          <p className="mb-4 text-sm text-slate-700">{sel.message}</p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm"><dt className="text-slate-500">Reference</dt><dd>{sel.ref}</dd><dt className="text-slate-500">Date</dt><dd>{fmtDT(sel.created)}</dd><dt className="text-slate-500">Expires at</dt><dd>{fmtDT(sel.expires)}</dd></dl>
          {confirmDel ? (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm"><p className="mb-2 text-red-600">Delete this notification permanently?</p>
              <div className="flex justify-end gap-2"><Btn v="ghost" onClick={() => setConfirmDel(false)}>Keep</Btn><Btn v="red" onClick={del}>Delete</Btn></div></div>
          ) : (
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {tgt && <Btn v="green" onClick={() => { close(); onNavigate(tgt[0]); }}>Open {tgt[1]}</Btn>}
              <Btn v="ghost" onClick={() => { setRead(sel.id, !sel.read); setToast(sel.read ? "Marked as unread" : "Marked as read"); }}>{sel.read ? "Mark as unread" : "Mark as read"}</Btn>
              <Btn v="ghost" className="!text-red-500" onClick={() => setConfirmDel(true)}>Delete</Btn></div>
          )}
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
