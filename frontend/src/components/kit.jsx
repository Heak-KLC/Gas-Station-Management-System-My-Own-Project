export const statusColor = (s='') => {
  s = String(s).toLowerCase();
  if (/holiday/.test(s)) return 'purple';
  if (/paid|receiv|active|approved|complete|^read|deliver|in stock|normal|available|online|yes|^present|^gold/.test(s)) return 'green';
  if (/pending|low|late|scheduled|progress|half|in use|silver/.test(s)) return 'yellow';
  if (/fail|cancel|absent|inactive|flag|out of|unread|emergency|maint|error/.test(s)) return 'red';
  return 'gray';
};
const tone = { green:'bg-emerald-100 text-emerald-700', red:'bg-red-100 text-red-600', yellow:'bg-yellow-100 text-yellow-700',
  blue:'bg-sky-100 text-sky-700', gray:'bg-slate-100 text-slate-600', purple:'bg-purple-100 text-purple-700', orange:'bg-orange-100 text-orange-600' };
export const Badge = ({ children, c }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tone[c || statusColor(children)]}`}>{children}</span>
);
export const S = (v) => <Badge>{v}</Badge>;
export const Card = ({ title, action, children, className = '' }) => (
  <section className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
    {(title || action) && <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-slate-800">{title}</h3>{action}</div>}
    {children}
  </section>
);
export const Btn = ({ children, v = 'green', className = '', ...p }) => {
  const c = { green:'bg-emerald-500 text-white', gold:'bg-[#b8860b] text-white', red:'bg-red-500 text-white', yellow:'bg-amber-400 text-slate-900',
    ghost:'bg-white border border-slate-300 text-slate-700', cyan:'bg-cyan-500 text-white' }[v];
  return <button {...p} className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 ${c} ${className}`}>{children}</button>;
};
export const Stat = ({ label, value, sub, action, accent = 'text-slate-800' }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-1">
    <p className="text-sm text-slate-500">{label}</p>
    <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    <div className="flex items-center justify-between text-xs text-slate-400"><span>{sub}</span>{action}</div>
  </div>
);
export const StatGrid = ({ children }) => <div className="grid gap-4 mb-4 grid-cols-2 lg:grid-cols-4">{children}</div>;
export const PageHeader = ({ title, sub, action }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg bg-[#b8860b]" />
      <div><h1 className="text-xl font-bold text-slate-800">{title}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>
    </div>{action}
  </div>
);
export const FilterBar = ({ children }) => <div className="flex flex-wrap items-end gap-3 mb-4">{children}</div>;
export const Input = ({ label, className = '', ...p }) => (
  <label className="text-sm text-slate-600 flex flex-col gap-1">{label}
    <input {...p} className={`border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 ${className}`} /></label>
);
export const Select = ({ label, options = [], ...p }) => (
  <label className="text-sm text-slate-600 flex flex-col gap-1">{label}
    <select {...p} className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800">
      {options.map((o) => <option key={o}>{o}</option>)}</select></label>
);
export const Table = ({ head, rows }) => (
  <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
    <table className="w-full text-sm">
      <thead><tr className="bg-sky-400 text-white text-left">{head.map((h) => <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={i} className={i % 2 ? 'bg-sky-50' : ''}>{r.map((c, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{c}</td>)}</tr>))}</tbody>
    </table>
  </div>
);
export const Bar = ({ pct, c = 'bg-emerald-500' }) => (
  <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full ${c}`} style={{ width: `${pct}%` }} /></div>
);
export const Pager = () => (
  <div className="flex justify-center gap-1 py-3">{['1', '2', '»'].map((p, i) =>
    <button key={p} className={`px-3 py-1 rounded border text-sm ${i === 0 ? 'bg-sky-500 text-white border-sky-500' : 'bg-white'}`}>{p}</button>)}</div>
);
export const Actions = () => <span className="flex gap-2"><button title="View">👁</button><button title="Edit">✏️</button><button title="Delete">🗑</button></span>;
