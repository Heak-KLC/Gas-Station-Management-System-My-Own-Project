import logoImage from "../image/logo.png";
import {
    LayoutDashboard,
    Fuel,
    Database,
    TvMinimal,
    Truck,
    RefreshCcwDot,
    IdCardLanyard,
    Wrench,
    ChartColumnBig,
    Bell,
    LogOut
} from "lucide-react";

const NAV_SECTIONS = [
    {
        items: [
            {
                key: "dashboard",
                label: "Dashboard",
                icon: LayoutDashboard
            }
        ]
    },
    {
        items: [
            {
                key: "fuel-and-tank-monitoring",
                label: "Fuel & Tank Monitoring",
                icon: Fuel
            },
            {
                key: "pumps-status",
                label: "Pumps & Status",
                icon: Database
            },
            {
                key: "store-inventory",
                label: "Store Inventory",
                icon: TvMinimal
            },
            {
                key: "fuel-purchases",
                label: "Fuel Purchases",
                icon: Truck
            },
            {
                key: "shift-handovers",
                label: "Shift Handovers",
                icon: RefreshCcwDot
            },
            {
                key: "employees-and-attendance",
                label: "Employment & Attendance",
                icon: IdCardLanyard
            },
            {
                key: "equipment-maintenance",
                label: "Equipment Maintenance",
                icon: Wrench
            },
            {
                key: "branch-reports",
                label: "Branch Reports",
                icon: ChartColumnBig
            },
            {
                key: "notifications",
                label: "Notifications",
                icon: Bell
            },
        ],
    },
];

export default function Sidebar({
    active = "dashboard",
    onNavigate = () => {},

    // --------------------------------------------------
    // Receive logout function from App.jsx
    // App.jsx sends: onLogout={handleLogout}
    // --------------------------------------------------
    onLogout = () => {},
}) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[#0b2545] text-slate-200">
      {/* Brand */}
      <div className="flex items-center gap-1 px-14 py-4 ">
        <img
          src={logoImage}
          alt="V-SYCHL Logo"
          className="h-30 w-auto object-contain"
        />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {NAV_SECTIONS.map((section, i) => (
          <div key={i} className="space-y-0.5">
            {section.items.map(({ key, label, icon: Icon }) => {
              const isActive = active === key;

              return (
                <button
                  key={key}
                  onClick={() => onNavigate(key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-white/10 font-medium text-white shadow-inner"
                      : "text-slate-300/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    size={17}
                    className={
                      isActive ? "text-cyan-300" : "text-slate-400"
                    }
                  />

                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        {/* --------------------------------------------------
            Logout button
            When clicked, this calls handleLogout() from App.jsx.
            This removes the token and returns to Login page.
        -------------------------------------------------- */}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-rose-300/90 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
  );
}