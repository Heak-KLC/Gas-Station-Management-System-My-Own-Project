import { Outlet } from 'react-router-dom';

function Topbar({ title, user }) {
  return (
    <header className="bg-white rounded-xl shadow-sm mx-5 mt-4 px-4 py-3 flex items-center gap-4">
      <h2 className="text-xl font-bold text-slate-800">☰ {title}</h2>
      <span className="text-xs bg-slate-200 rounded px-2 py-1">📍 សាខា ចម្ការមន</span>
      <input placeholder="Search invoice" className="flex-1 max-w-md border border-slate-400 rounded-full px-4 py-1.5 text-sm" />
      <div className="ml-auto flex items-center gap-4">
        <button className="relative">🔔<span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full px-1">1</span></button>
        <select className="text-sm bg-slate-200 rounded px-2 py-1"><option>Language</option><option>ខ្មែរ</option><option>English</option></select>
        <div className="text-right leading-tight"><p className="font-semibold text-sm">{user.name}</p><p className="text-xs text-emerald-500">{user.role}</p></div>
      </div>
    </header>
  );
}

// Sidebar = your existing sidebar for that role, passed in as a prop
export default function RoleLayout({ Sidebar, title, user }) {
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={title} user={user} />
        <main className="flex-1 overflow-auto p-5"><Outlet /></main>
      </div>
    </div>
  );
}
