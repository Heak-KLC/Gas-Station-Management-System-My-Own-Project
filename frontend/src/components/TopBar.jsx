import { Search, Globe, Bell } from "lucide-react";

export default function TopBar({ title, user = { name: "Sovan Dara", role: "Admin" } }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-4">
        {/* <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search invoice"
            className="w-64 rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-600 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
          />
        </div> */}

        <button className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <Globe size={16} />
          Language
        </button>

        <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-brown from-cyan-400 to-blue-600 text-sm font-semibold text-white">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-400">{user.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
