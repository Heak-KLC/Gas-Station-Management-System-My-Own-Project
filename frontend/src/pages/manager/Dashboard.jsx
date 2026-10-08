import { useMemo, useState } from "react";
import { Banknote, Fuel, ShoppingCart, BellRing, Search, Wrench, Truck, UserCheck, Tag, X, Fuel as PumpIcon } from "lucide-react";

const PAY_FILTERS = ["ALL", "Cash", "QR Payment", "Credit Card", "Debit Card", "Bank Transfer"];

const SALES = [
  { time: "09:10", pump: "PUMP01", fuel: "Premium Diesel", amount: 91, cashier: "Jhon Doe", payment: "Credit Card", status: "Paid" },
  { time: "09:17", pump: "PUMP02", fuel: "Premium Diesel", amount: 91, cashier: "Jhon Doe", payment: "Cash", status: "Paid" },
  { time: "09:50", pump: "PUMP03", fuel: "Premium Diesel", amount: 91, cashier: "Jhon Doe", payment: "Credit Card", status: "Paid" },
  { time: "10:00", pump: "PUMP01", fuel: "Premium Diesel", amount: 91, cashier: "Jhon Doe", payment: "Cash", status: "Paid" },
  { time: "11:10", pump: "PUMP03", fuel: "Premium Diesel", amount: 91, cashier: "Jhon Doe", payment: "Debit Card", status: "Pending" },
  { time: "01:19", pump: "PUMP02", fuel: "Premium Diesel", amount: 91, cashier: "Jhon Doe", payment: "Bank Transfer", status: "Failed" },
  { time: "09:50", pump: "PUMP01", fuel: "Premium Diesel", amount: 91, cashier: "Jhon Doe", payment: "QR Payment", status: "Paid" },
];

const STATUS_STYLE = { Paid: "text-emerald-600", Pending: "text-amber-500", Failed: "text-red-500" };

const ATTENDANCE = [
  { label: "Present", count: 12, dot: "bg-emerald-500" },
  { label: "Absent", count: 2, dot: "bg-red-500" },
  { label: "Late", count: 3, dot: "bg-yellow-400" },
  { label: "Holiday", count: 4, dot: "bg-violet-500" },
  { label: "Half day", count: 1, dot: "bg-orange-400" },
];

const NOTIFS = [
  { id: 1, icon: Wrench, text: "Pump #03 under Maintenance", time: "10 minutes ago" },
  { id: 2, icon: Truck, text: "Fuel delivery completed", time: "20 minutes ago" },
  { id: 3, icon: UserCheck, text: "Employees checked in", time: "5 minutes ago" },
  { id: 4, icon: Tag, text: "Fuel prices updated", time: "50 minutes ago" },
];

const PUMP_STATES = [
  { key: "active", short: "Active", full: "Active", on: "bg-emerald-500 text-white" },
  { key: "ofs", short: "OFS", full: "Out of Service", on: "bg-red-500 text-white" },
  { key: "umtn", short: "UMTN", full: "Under Maintenance", on: "bg-amber-500 text-white" },
];

const money = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function StatCard({ label, value, note, icon: Icon, tone, onReview }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={22} /></span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">{note}</span>
        <button onClick={onReview} className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600">Review</button>
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate = () => {} }) {
  const [pay, setPay] = useState("ALL");
  const [query, setQuery] = useState("");
  const [notifs, setNotifs] = useState(NOTIFS.map((n) => ({ ...n, read: false })));
  const [pumps, setPumps] = useState([
    { id: "Pump01", fuel: "Diesel", status: "active" },
    { id: "Pump02", fuel: "Regular", status: "ofs" },
    { id: "Pump03", fuel: "Premium", status: "active" },
    { id: "Pump04", fuel: "LPG", status: "umtn" },
  ]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SALES.filter((s) => (pay === "ALL" || s.payment === pay) &&
      (!q || [s.time, s.pump, s.fuel, s.cashier, s.payment, s.status].some((v) => v.toLowerCase().includes(q))));
  }, [pay, query]);

  const totalEmployees = ATTENDANCE.reduce((s, a) => s + a.count, 0);
  const unread = notifs.filter((n) => !n.read).length;
  const setPumpStatus = (id, status) => setPumps((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-800">Main Dashboard</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Today's Revenues" value="$145,564.00" note="Total Revenue Today" icon={Banknote} tone="bg-amber-100 text-amber-600" onReview={() => onNavigate("branch-reports")} />
          <StatCard label="Fuel Volume Sold" value="145,564 L" note="Total Fuel Volume Sold Today" icon={Fuel} tone="bg-sky-100 text-sky-600" onReview={() => onNavigate("fuel-and-tank-monitoring")} />
          <StatCard label="Store Sales" value="$145,564.00" note="Total Store Sale Today" icon={ShoppingCart} tone="bg-violet-100 text-violet-600" onReview={() => onNavigate("store-inventory")} />
          <StatCard label="Low Stock Alert" value="# 3 Tank / Items" note="Notification suggestion" icon={BellRing} tone="bg-red-100 text-red-500" onReview={() => onNavigate("store-inventory")} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Recently Fuel Sale</h2>
            <div className="relative mb-3">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search, cashier, pumps......"
                className="w-full rounded-full border border-slate-300 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {PAY_FILTERS.map((f) => (
                <button key={f} onClick={() => setPay(f)}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${pay === f ? "bg-yellow-300 text-slate-900" : "bg-slate-600 text-white hover:bg-slate-700"}`}>{f}</button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                    {["TIME", "PUMP", "FUEL", "AMOUNT", "CASHIER", "PAYMENT", "STATUS"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-2.5">{s.time}</td><td className="px-3 py-2.5">{s.pump}</td><td className="px-3 py-2.5">{s.fuel}</td>
                      <td className="px-3 py-2.5">{money(s.amount)}</td><td className="px-3 py-2.5">{s.cashier}</td><td className="px-3 py-2.5">{s.payment}</td>
                      <td className={`px-3 py-2.5 font-semibold ${STATUS_STYLE[s.status]}`}>{s.status}</td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No sales match your search.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><PumpIcon className="text-orange-500" />Pumps Status</h2>
              <button onClick={() => onNavigate("pumps-status")} className="text-sm font-semibold text-sky-600 hover:underline">View all</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {pumps.map((p) => {
                const cur = PUMP_STATES.find((s) => s.key === p.status);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PumpIcon size={22} className="text-orange-500" />
                      <div className="leading-tight"><p className="text-sm font-semibold">{p.id} · {p.fuel}</p><p className="text-[11px] text-slate-500">{cur.full}</p></div>
                    </div>
                    <div className="flex gap-1.5">
                      {PUMP_STATES.map((s) => (
                        <button key={s.key} title={s.full} onClick={() => setPumpStatus(p.id, s.key)}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${p.status === s.key ? s.on : "bg-white text-slate-400 ring-1 ring-slate-200 hover:text-slate-600"}`}>{s.short}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Employees Attendance</h2>
              <button onClick={() => onNavigate("employees-and-attendance")} className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white hover:bg-emerald-600">View</button>
            </div>
            <p className="mb-3 inline-block rounded-md bg-slate-600 px-3 py-1 text-xs text-white">Today's Attendance</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {ATTENDANCE.map((a) => (
                <li key={a.label}><button onClick={() => onNavigate("employees-and-attendance")} className="flex items-center gap-2 text-left hover:text-sky-600">
                  <i className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.dot}`} />{a.label} {a.count} {a.count === 1 ? "employee" : "employees"}</button></li>
              ))}
            </ul>
            <p className="mt-4 border-t pt-3 text-center font-semibold text-slate-700">Total Employees: {totalEmployees}</p>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Recently Notification {unread > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs text-white">{unread}</span>}</h2>
              <button disabled={!unread} onClick={() => setNotifs((n) => n.map((x) => ({ ...x, read: true })))} className="text-sm font-semibold text-yellow-600 hover:underline disabled:text-slate-300 disabled:no-underline">Mark all read</button>
            </div>
            <ul className="divide-y">
              {notifs.map(({ id, icon: Icon, text, time, read }) => (
                <li key={id} className="flex items-center gap-3 py-2.5">
                  <button onClick={() => { setNotifs((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x))); onNavigate("notifications"); }} className="flex flex-1 items-center gap-3 text-left">
                    <Icon size={22} className={read ? "text-slate-300" : "text-slate-700"} />
                    <span><span className={`block text-sm ${read ? "text-slate-400" : "font-medium text-slate-800"}`}>{text}</span><span className="text-xs text-slate-400">{time}</span></span>
                  </button>
                  <button aria-label="Dismiss" onClick={() => setNotifs((n) => n.filter((x) => x.id !== id))} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
                </li>
              ))}
              {!notifs.length && <li className="py-6 text-center text-sm text-slate-400">No new notifications.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
