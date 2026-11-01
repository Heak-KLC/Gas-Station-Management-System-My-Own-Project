
import { useState } from "react";
import logoImage from "../image/logo.png";

import {
  LayoutDashboard,
  EvCharger,
  Fuel,
  Wrench,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    items: [
      {
        key: "my-station-and-pumps",
        label: "My station and Pumps",
        icon: EvCharger,
      },
      {
        key: "fuel-dispense-and-meter-input",
        label: "Fuel Dispense & Meter Input",
        icon: Fuel,
      },
      {
        key: "maintenance-report",
        label: "Maintenance Report",
        icon: Wrench,
      },
    ],
  },
];

export default function Sidebar({
  active = "dashboard",
  onNavigate = () => {},
  onLogout = () => {},
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (key) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setMobileOpen(false);
    onLogout();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-lg bg-[#0b2545] text-white shadow-lg transition hover:bg-[#15375f] lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close navigation menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-screen w-60 shrink-0 flex-col
          bg-[#0b2545] text-slate-200
          shadow-xl transition-transform duration-300 ease-in-out

          lg:sticky lg:top-0 lg:z-auto
          lg:h-screen lg:translate-x-0 lg:shadow-none

          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* Brand */}
        <div className="relative flex min-h-[104px] items-center justify-center px-6 py-4">
          <img
            src={logoImage}
            alt="V-SYCHL Logo"
            className="h-20 w-auto max-w-full object-contain"
          />

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 pb-4">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className="space-y-0.5">
              {section.items.map(({ key, label, icon: Icon }) => {
                const isActive = active === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleNavigate(key)}
                    className={`
                      flex w-full items-center gap-3
                      rounded-lg px-3 py-2.5
                      text-left text-sm transition-colors

                      ${
                        isActive
                          ? "bg-white/10 font-medium text-white shadow-inner"
                          : "text-slate-300/80 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    <Icon
                      size={17}
                      className={
                        isActive
                          ? "shrink-0 text-cyan-300"
                          : "shrink-0 text-slate-400"
                      }
                    />

                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 px-3 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-rose-300/90 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
          >
            <LogOut size={17} className="shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
