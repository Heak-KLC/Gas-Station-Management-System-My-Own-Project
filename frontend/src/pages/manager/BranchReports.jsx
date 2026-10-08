import { useEffect, useState } from "react";
import { Building2, DollarSign, Droplet, ShoppingCart, PieChart, Eye, Download, Mail, Filter, RotateCcw, X, FileText } from "lucide-react";

// ---------- mock data (per branch, "This Month") ----------
const BRANCHES = [
  { name: "Main Branch", rev: 18450, fuel: 14250.5, tx: 752, profit: 4820, stock: 61200, low: 4, out: 1, g: 0.12 },
  { name: "Branch 2", rev: 16230, fuel: 12450.5, tx: 892, profit: 3980, stock: 48800, low: 6, out: 2, g: 0.09 },
  { name: "Branch 3", rev: 22560, fuel: 16850.5, tx: 891, profit: 5650, stock: 72400, low: 3, out: 0, g: 0.15 },
  { name: "Branch 4", rev: 14330, fuel: 10850.5, tx: 512, profit: 3250, stock: 39100, low: 7, out: 3, g: 0.05 },
  { name: "Branch 5", rev: 19870, fuel: 10250.5, tx: 715, profit: 4950, stock: 55300, low: 5, out: 1, g: 0.18 },
  { name: "Branch 6", rev: 12480, fuel: 9450.5, tx: 412, profit: 4950, stock: 33900, low: 9, out: 4, g: -0.02 },
  { name: "Branch 7", rev: 8750, fuel: 6450.5, tx: 258, profit: 1750, stock: 21700, low: 8, out: 5, g: 0.07 },
  { name: "Branch 8", rev: 14820, fuel: 12120.5, tx: 534, profit: 3280, stock: 44600, low: 5, out: 2, g: 0.11 },
].map((b) => ({ ...b, status: "Active" }));
const PERIODS = { "This Month": 1, "Last Month": 0.93, "Last 3 Months": 2.85, "This Year": 10.4 };
const COMPARE = ["Previous Month", "Previous Year", "No comparison"];
const REPORT_TYPES = ["Monthly Summary", "Daily Sales", "Fuel Sales", "Inventory", "Profit & Loss"];
const TYPE_TAB = { "Monthly Summary": "overview", "Daily Sales": "sales", "Fuel Sales": "fuel", Inventory: "inventory", "Profit & Loss": "pl" };
const REPORTS0 = [
  { id: 1, name: "May 2025 Branch Report", branch: "All Branches", type: "Monthly Summary", date: "31/05/2025 11:30 AM", by: "Manager User", unread: true },
  { id: 2, name: "Daily Sales Report", branch: "Main Branch", type: "Daily Sales", date: "31/05/2025 08:15 AM", by: "Manager User", unread: true },
  { id: 3, name: "Fuel Inventory Report", branch: "Branch 3", type: "Inventory", date: "30/05/2025 05:45 PM", by: "Manager User", unread: true },
  { id: 4, name: "Profit & Loss - Branch 5", branch: "Branch 5", type: "Profit & Loss", date: "29/05/2025 10:00 AM", by: "System Admin", unread: false },
];

// ---------- formatting ----------
const nf = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const usd0 = (n) => `$${nf(n)}`;
const usd2 = (n) => `$ ${nf(n, 2)}`;
const METRIC = {
  rev: { label: "Revenue", get: (b) => b.rev, f: usd0 }, fuel: { label: "Fuel Sold", get: (b) => b.fuel, f: (n) => nf(n) },
  tx: { label: "Transactions", get: (b) => b.tx, f: (n) => nf(n) }, profit: { label: "Profit", get: (b) => b.profit, f: usd0 },
  stock: { label: "Stock Value", get: (b) => b.stock, f: usd0 },
};
const tot = (bs, k) => bs.reduce((s, b) => s + b[k], 0);
const TABS = {
  overview: { label: "Overview", metrics: ["rev", "fuel", "tx"], cols: [["Branch", (b) => b.name, () => "Total"], ["Revenue", (b) => usd0(b.rev), (bs) => usd0(tot(bs, "rev"))], ["Fuel Sold (L)", (b) => nf(b.fuel, 2), (bs) => nf(tot(bs, "fuel"), 2)], ["Transactions", (b) => nf(b.tx), (bs) => nf(tot(bs, "tx"))], ["Profit", (b) => usd0(b.profit), (bs) => usd0(tot(bs, "profit"))], ["Status", (b) => b.status, () => ""]] },
  sales: { label: "Sales", metrics: ["rev", "tx"], cols: [["Branch", (b) => b.name, () => "Total"], ["Revenue", (b) => usd0(b.rev), (bs) => usd0(tot(bs, "rev"))], ["Transactions", (b) => nf(b.tx), (bs) => nf(tot(bs, "tx"))], ["Avg. sale", (b) => usd2(b.rev / b.tx), (bs) => usd2(tot(bs, "rev") / (tot(bs, "tx") || 1))], ["Status", (b) => b.status, () => ""]] },
  fuel: { label: "Fuel Sales", metrics: ["fuel", "rev"], cols: [["Branch", (b) => b.name, () => "Total"], ["Fuel Sold (L)", (b) => nf(b.fuel, 2), (bs) => nf(tot(bs, "fuel"), 2)], ["Revenue", (b) => usd0(b.rev), (bs) => usd0(tot(bs, "rev"))], ["Revenue / L", (b) => usd2(b.rev / b.fuel), (bs) => usd2(tot(bs, "rev") / (tot(bs, "fuel") || 1))], ["Status", (b) => b.status, () => ""]] },
  inventory: { label: "Inventory", metrics: ["stock"], cols: [["Branch", (b) => b.name, () => "Total"], ["Stock value", (b) => usd0(b.stock), (bs) => usd0(tot(bs, "stock"))], ["Low stock items", (b) => b.low, (bs) => tot(bs, "low")], ["Out of stock", (b) => b.out, (bs) => tot(bs, "out")], ["Status", (b) => b.status, () => ""]] },
  pl: { label: "Profit & Loss", metrics: ["profit", "rev"], cols: [["Branch", (b) => b.name, () => "Total"], ["Revenue", (b) => usd0(b.rev), (bs) => usd0(tot(bs, "rev"))], ["Cost", (b) => usd0(b.rev - b.profit), (bs) => usd0(tot(bs, "rev") - tot(bs, "profit"))], ["Profit", (b) => usd0(b.profit), (bs) => usd0(tot(bs, "profit"))], ["Margin", (b) => `${nf((b.profit / b.rev) * 100, 1)}%`, (bs) => `${nf((tot(bs, "profit") / (tot(bs, "rev") || 1)) * 100, 1)}%`], ["Status", (b) => b.status, () => ""]] },
};
const DEFAULT_F = { period: "This Month", compare: "Previous Month", rtype: "All Reports", branch: "All Branches" };

// scale flow metrics by period; snapshot metrics (stock, low, out) stay the same
const scaled = (b, m) => ({ ...b, rev: b.rev * m, fuel: b.fuel * m, tx: Math.round(b.tx * m), profit: b.profit * m });
const previous = (b, compare) => {
  if (compare === "No comparison") return null;
  const g = compare === "Previous Year" ? b.g * 2.5 + 0.05 : b.g;
  return { rev: b.rev / (1 + g), fuel: b.fuel / (1 + g * 0.7), tx: b.tx / (1 + g * 1.2), profit: b.profit / (1 + g * 0.9) };
};
const rangeText = (period) => {
  const d = new Date(), y = d.getFullYear(), mo = d.getMonth();
  const f = (x) => x.toLocaleDateString("en-GB");
  if (period === "This Month") return `${f(new Date(y, mo, 1))} - ${f(new Date(y, mo + 1, 0))}`;
  if (period === "Last Month") return `${f(new Date(y, mo - 1, 1))} - ${f(new Date(y, mo, 0))}`;
  if (period === "Last 3 Months") return `${f(new Date(y, mo - 2, 1))} - ${f(new Date(y, mo + 1, 0))}`;
  return `${f(new Date(y, 0, 1))} - ${f(new Date(y, 11, 31))}`;
};
const downloadCSV = (filename, header, rows) => {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob([[header, ...rows].map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
};

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${wide ? "max-w-3xl" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}
const Btn = ({ children, v = "gold", className = "", ...p }) => {
  const c = { gold: "bg-[#b8860b] text-white hover:bg-[#9a7009]", ghost: "border bg-white text-slate-700 hover:bg-slate-50" }[v];
  return <button {...p} className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${c} ${className}`}>{children}</button>;
};
const Sel = ({ label, options, ...p }) => <label className="block text-sm text-slate-700">{label}<select {...p} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
const th = "whitespace-nowrap bg-[#0b2545] px-3 py-2 text-left text-xs font-semibold text-white";

function DataTable({ cols, rows, total, onRow }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead><tr>{cols.map((c) => <th key={c[0]} className={th}>{c[0]}</th>)}</tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.name} className="border-b last:border-0 hover:bg-slate-50">
              {cols.map((c, i) => <td key={c[0]} className="whitespace-nowrap px-3 py-2">
                {c[0] === "Status" ? <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">{c[1](b)}</span>
                  : i === 0 && onRow ? <button onClick={() => onRow(b)} className="font-medium text-sky-700 hover:underline">{c[1](b)}</button> : c[1](b)}</td>)}
            </tr>))}
          {total && <tr className="bg-slate-50 font-bold">{cols.map((c) => <td key={c[0]} className="px-3 py-2">{c[2](rows)}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  );
}

function BarChart({ data, metric }) {
  const m = METRIC[metric];
  const max = Math.max(...data.map((d) => d.v), 1);
  const mag = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil((max * 1.08) / mag) * mag;
  const tick = (t) => { const n = top * t; return metric === "rev" || metric === "profit" || metric === "stock" ? (n >= 1000 ? `$${nf(n / 1000)}K` : `$${nf(n)}`) : n >= 1000 ? `${nf(n / 1000)}K` : nf(n); };
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex h-56 flex-col-reverse justify-between text-[10px] text-slate-400">{[0, 0.25, 0.5, 0.75, 1].map((t) => <span key={t}>{tick(t)}</span>)}</div>
        <div className="relative h-56 flex-1 border-b border-l">
          {[0.25, 0.5, 0.75, 1].map((t) => <div key={t} className="absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ bottom: `${t * 100}%` }} />)}
          <div className="absolute inset-0 flex items-end justify-around px-1">
            {data.map((d) => (
              <div key={d.name} title={`${d.name}: ${m.f(d.v)}`} className="flex h-full w-full flex-col items-center justify-end">
                <span className="mb-0.5 text-[10px] font-semibold text-slate-700">{m.f(d.v)}</span>
                <div className="w-3/5 max-w-[34px] rounded-t bg-[#d39a2c] transition-all hover:bg-[#b8860b]" style={{ height: `${(d.v / top) * 100}%` }} />
              </div>))}
          </div>
        </div>
      </div>
      <div className="ml-9 flex justify-around px-1 pt-1">{data.map((d) => <span key={d.name} className="w-full text-center text-[10px] text-slate-500">{d.name}</span>)}</div>
    </div>
  );
}

export default function BranchReports() {
  const [draft, setDraft] = useState(DEFAULT_F);
  const [applied, setApplied] = useState(DEFAULT_F);
  const [tab, setTab] = useState("overview");
  const [metric, setMetric] = useState("rev");
  const [reports, setReports] = useState(REPORTS0);
  const [allReports, setAllReports] = useState(false);
  const [modal, setModal] = useState(null); // { type, data }
  const [gen, setGen] = useState({ type: REPORT_TYPES[0], branch: "All Branches" });
  const [toast, setToast] = useState("");
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 2500); return () => clearTimeout(t); } }, [toast]);

  const mult = PERIODS[applied.period];
  const scope = BRANCHES.filter((b) => applied.branch === "All Branches" || b.name === applied.branch).map((b) => scaled(b, mult));
  const prevScope = scope.map((b) => previous(BRANCHES.find((x) => x.name === b.name), applied.compare)).map((p, i) => p && ({ rev: p.rev * mult, fuel: p.fuel * mult, tx: p.tx * mult, profit: p.profit * mult, i }));
  const cfg = TABS[tab];
  const close = () => setModal(null);
  const changeTab = (t) => { setTab(t); setMetric(TABS[t].metrics[0]); };

  const delta = (k) => {
    if (applied.compare === "No comparison") return null;
    const cur = tot(scope, k), prev = prevScope.reduce((s, p) => s + p[k], 0);
    return prev ? ((cur - prev) / prev) * 100 : null;
  };
  const cmpLabel = applied.compare === "Previous Year" ? "vs last year" : "vs last month";
  const kpis = [
    { label: "Total Branches", value: scope.length, note: "Active branches", icon: Building2, tone: "bg-blue-50", ic: "bg-blue-100 text-blue-600" },
    { label: `Total Revenue (${applied.period})`, value: usd2(tot(scope, "rev")), d: delta("rev"), icon: DollarSign, tone: "bg-emerald-50", ic: "bg-emerald-600 text-white" },
    { label: "Total Fuel Sold", value: `${nf(tot(scope, "fuel"), 2)} L`, d: delta("fuel"), icon: Droplet, tone: "bg-violet-50", ic: "bg-violet-100 text-violet-600" },
    { label: "Total Transactions", value: nf(tot(scope, "tx")), d: delta("tx"), icon: ShoppingCart, tone: "bg-orange-50", ic: "bg-orange-100 text-orange-500" },
    { label: `Gross Profit (${applied.period})`, value: usd2(tot(scope, "profit")), d: delta("profit"), icon: PieChart, tone: "bg-green-50", ic: "bg-green-100 text-green-600" },
  ];
  const best = (k) => scope.reduce((a, b) => (b[k] > a[k] ? b : a), scope[0]);
  const top3 = [["🥇", "Top Revenue", best("rev"), (b) => usd2(b.rev)], ["🥈", "Top Fuel Sold", best("fuel"), (b) => `${nf(b.fuel, 2)} L`], ["🥉", "Top Transactions", best("tx"), (b) => nf(b.tx)]];

  const shownReports = reports.filter((r) => (applied.rtype === "All Reports" || r.type === applied.rtype) && (applied.branch === "All Branches" || r.branch === applied.branch || r.branch === "All Branches"));
  const unread = reports.filter((r) => r.unread).length;

  const exportTable = (name, tabKey, bs) => {
    const c = TABS[tabKey].cols;
    downloadCSV(`${name.replace(/[^\w-]+/g, "_")}.csv`, c.map((x) => x[0]), bs.map((b) => c.map((x) => x[1](b))));
    setToast(`${name} downloaded`);
  };
  const reportScope = (r) => BRANCHES.filter((b) => r.branch === "All Branches" || b.name === r.branch).map((b) => scaled(b, mult));
  const generate = (e) => {
    e.preventDefault();
    const now = new Date();
    const date = `${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    setReports((r) => [{ id: Date.now(), name: `${gen.type} - ${gen.branch}`, branch: gen.branch, type: gen.type, date, by: "Manager User", unread: true }, ...r]);
    setToast("Report generated"); close();
  };

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#b8860b] text-white"><FileText size={28} /></span>
          <div><h2 className="text-2xl font-bold text-slate-900">Branch Report</h2><p className="text-sm text-slate-600">View and analyze performance across all branches.</p></div></div>
        <Btn disabled={!unread} onClick={() => { setReports((r) => r.map((x) => ({ ...x, unread: false }))); setToast("All reports marked as read"); }} className="flex items-center gap-2 !px-5 !py-3"><Mail size={18} />Mark all as read{unread > 0 && <span className="rounded-full bg-white px-2 text-xs text-[#b8860b]">{unread}</span>}</Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className={`flex items-center justify-between rounded-xl p-4 ring-1 ring-slate-100 ${k.tone}`}>
            <div><p className="text-xs text-slate-600">{k.label}</p><p className="mt-1 text-lg font-bold text-slate-900">{k.value}</p>
              {k.note && <p className="text-xs text-slate-600">{k.note}</p>}
              {k.d != null && <p className={`text-xs font-medium ${k.d >= 0 ? "text-emerald-600" : "text-red-500"}`}>{k.d >= 0 ? "↑" : "↓"} {nf(Math.abs(k.d), 1)}% {cmpLabel}</p>}</div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${k.ic}`}><k.icon size={20} /></span>
          </div>))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Sel label="Period" options={Object.keys(PERIODS)} value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })} />
        <Sel label="Compare With" options={COMPARE} value={draft.compare} onChange={(e) => setDraft({ ...draft, compare: e.target.value })} />
        <Sel label="Report Type" options={["All Reports", ...REPORT_TYPES]} value={draft.rtype} onChange={(e) => setDraft({ ...draft, rtype: e.target.value })} />
        <Sel label="Branch" options={["All Branches", ...BRANCHES.map((b) => b.name)]} value={draft.branch} onChange={(e) => setDraft({ ...draft, branch: e.target.value })} />
        <Btn onClick={() => setApplied(draft)} className="flex items-center gap-2"><Filter size={15} />Filter</Btn>
        <Btn v="ghost" onClick={() => { setDraft(DEFAULT_F); setApplied(DEFAULT_F); }} className="flex items-center gap-2"><RotateCcw size={15} />Reset</Btn>
        <p className="pb-2 text-xs text-slate-500">Date range: {rangeText(applied.period)}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex flex-wrap gap-5 border-b text-sm">{Object.entries(TABS).map(([k, t]) => (
              <button key={k} onClick={() => changeTab(k)} className={`-mb-px border-b-2 pb-2 ${tab === k ? "border-[#b8860b] font-semibold text-[#b8860b]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.label}</button>))}</div>
            <h3 className="mb-2 text-sm font-bold text-slate-800">Performance Overview</h3>
            <div className="mb-3 flex gap-2">{cfg.metrics.map((k) => (
              <button key={k} onClick={() => setMetric(k)} className={`rounded px-3 py-1 text-xs font-medium ${metric === k ? "bg-[#0b2545] text-white" : "border text-slate-600 hover:bg-slate-50"}`}>{METRIC[k].label}</button>))}</div>
            <BarChart data={scope.map((b) => ({ name: b.name.replace("Main Branch", "Main"), v: METRIC[metric].get(b) }))} metric={metric} />
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-3 text-sm font-bold text-slate-800">Top Performing Branches</h3>
            <div className="grid gap-3 sm:grid-cols-3">{top3.map(([medal, label, b, f]) => (
              <button key={label} onClick={() => setModal({ type: "branch", data: b })} className="rounded-xl border bg-amber-50/60 p-3 text-center transition hover:shadow-md">
                <div className="text-2xl">{medal}</div><p className="text-sm font-semibold">{b.name}</p><p className="font-bold text-slate-900">{f(b)}</p><p className="text-xs text-slate-500">{label}</p></button>))}</div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">Branch Summary</h3>
              <button onClick={() => setModal({ type: "detail" })} className="rounded border px-3 py-1 text-xs font-medium hover:bg-slate-50">View Detailed Report</button></div>
            <DataTable cols={cfg.cols} rows={scope} onRow={(b) => setModal({ type: "branch", data: b })} />
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">Recent Branch Reports</h3>
              <button onClick={() => setModal({ type: "generate" })} className="rounded border px-3 py-1 text-xs font-medium hover:bg-slate-50">+ Generate Report</button></div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead><tr>{["Report Name", "Branch", "Report Type", "Generated Date", "Generated By", "Action"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(allReports ? shownReports : shownReports.slice(0, 4)).map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2">{r.unread && <i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-red-500" />}<span className={r.unread ? "font-semibold" : ""}>{r.name}</span></td>
                      <td className="px-3 py-2">{r.branch}</td><td className="px-3 py-2">{r.type}</td><td className="whitespace-nowrap px-3 py-2">{r.date}</td><td className="whitespace-nowrap px-3 py-2">{r.by}</td>
                      <td className="px-3 py-2"><div className="flex gap-1.5">
                        <button aria-label="View report" title="View" onClick={() => { setReports((all) => all.map((x) => (x.id === r.id ? { ...x, unread: false } : x))); setModal({ type: "report", data: r }); }} className="rounded p-1 hover:bg-slate-200"><Eye size={15} /></button>
                        <button aria-label="Download report" title="Download CSV" onClick={() => exportTable(r.name, TYPE_TAB[r.type], reportScope(r))} className="rounded p-1 hover:bg-slate-200"><Download size={15} /></button></div></td>
                    </tr>))}
                  {!shownReports.length && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No reports match your filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <button onClick={() => setAllReports((v) => !v)} className="mt-3 text-xs font-medium text-sky-700 hover:underline">{allReports ? "Show less" : "View All Reports →"}</button>
          </section>
        </div>
      </div>

      {modal?.type === "detail" && (
        <Modal wide title={`Detailed report · ${cfg.label} · ${applied.period}`} onClose={close}>
          <DataTable cols={cfg.cols} rows={scope} total />
          <div className="mt-4 flex justify-end gap-2"><Btn v="ghost" onClick={close}>Close</Btn><Btn onClick={() => exportTable(`Detailed ${cfg.label} ${applied.period}`, tab, scope)} className="flex items-center gap-2"><Download size={15} />Download CSV</Btn></div>
        </Modal>)}

      {modal?.type === "report" && (() => { const r = modal.data, key = TYPE_TAB[r.type], bs = reportScope(r); return (
        <Modal wide title={r.name} onClose={close}>
          <p className="mb-3 text-sm text-slate-500">{r.type} · {r.branch} · {r.date} · by {r.by}</p>
          <DataTable cols={TABS[key].cols} rows={bs} total={bs.length > 1} />
          <div className="mt-4 flex justify-end gap-2"><Btn v="ghost" onClick={close}>Close</Btn><Btn onClick={() => exportTable(r.name, key, bs)} className="flex items-center gap-2"><Download size={15} />Download CSV</Btn></div>
        </Modal>); })()}

      {modal?.type === "branch" && (() => { const b = modal.data; const rank = [...scope].sort((x, y) => y.rev - x.rev).findIndex((x) => x.name === b.name) + 1; return (
        <Modal title={b.name} onClose={close}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Revenue</dt><dd>{usd2(b.rev)}</dd><dt className="text-slate-500">Fuel sold</dt><dd>{nf(b.fuel, 2)} L</dd><dt className="text-slate-500">Transactions</dt><dd>{nf(b.tx)}</dd>
            <dt className="text-slate-500">Profit</dt><dd>{usd2(b.profit)} ({nf((b.profit / b.rev) * 100, 1)}%)</dd><dt className="text-slate-500">Revenue rank</dt><dd>#{rank} of {scope.length}</dd>
            <dt className="text-slate-500">Share of revenue</dt><dd>{nf((b.rev / tot(scope, "rev")) * 100, 1)}%</dd><dt className="text-slate-500">Stock value</dt><dd>{usd0(b.stock)}</dd>
            <dt className="text-slate-500">Low / out of stock</dt><dd>{b.low} / {b.out} items</dd></dl>
          <div className="mt-4 flex justify-end"><Btn v="ghost" onClick={close}>Close</Btn></div>
        </Modal>); })()}

      {modal?.type === "generate" && (
        <Modal title="Generate report" onClose={close}>
          <form onSubmit={generate} className="space-y-3">
            <Sel label="Report type" options={REPORT_TYPES} value={gen.type} onChange={(e) => setGen({ ...gen, type: e.target.value })} />
            <Sel label="Branch" options={["All Branches", ...BRANCHES.map((b) => b.name)]} value={gen.branch} onChange={(e) => setGen({ ...gen, branch: e.target.value })} />
            <div className="flex justify-end gap-2"><Btn type="button" v="ghost" onClick={close}>Cancel</Btn><Btn type="submit">Generate</Btn></div>
          </form>
        </Modal>)}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
