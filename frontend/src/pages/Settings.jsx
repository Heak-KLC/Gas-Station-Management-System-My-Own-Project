import React, { useState, useRef } from "react";
import {
  Upload,
  Key,
  User,
  ScrollText,
  DatabaseBackup,
  UploadCloud,
  CheckCircle2,
  X,
  ShieldCheck,
  Save,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  Camera,
} from "lucide-react";
import { Panel } from "../components/ui";

const TABS = [
  "Station Info",
  "Fuel Pricing & Tax",
  "System Roles & Permission",
  "Backup & Restore",
];

const initialDays = [
  { day: "Mon", open: "06:00", close: "22:00" },
  { day: "Tue", open: "06:00", close: "22:00" },
  { day: "Wed", open: "06:00", close: "22:00" },
  { day: "Thu", open: "06:00", close: "22:00" },
  { day: "Fri", open: "06:00", close: "22:00" },
  { day: "Sat", open: "06:00", close: "22:00" },
  { day: "Sun", open: "06:00", close: "22:00" },
];

const initialFuelPrices = [
  { grade: "Regular", cost: 1.45, sell: 1.5, tone: "bg-slate-50 border-slate-200" },
  { grade: "Premium", cost: 1.5, sell: 1.58, tone: "bg-amber-50/60 border-amber-200" },
  { grade: "Diesel", cost: 1.4, sell: 1.48, tone: "bg-cyan-50/60 border-cyan-200" },
  { grade: "LPG", cost: 1.25, sell: 1.35, tone: "bg-rose-50/60 border-rose-200" },
];

const initialRoles = [
  { id: 1, role: "Admin", users: 2, fuelMgmt: true, salesPos: true, reports: true, settings: true },
  { id: 2, role: "Manager", users: 4, fuelMgmt: true, salesPos: true, reports: true, settings: false },
  { id: 3, role: "Cashier", users: 12, fuelMgmt: false, salesPos: true, reports: false, settings: false },
  { id: 4, role: "Stock Keeper", users: 3, fuelMgmt: true, salesPos: false, reports: true, settings: false },
];

export default function Settings() {
  const [tab, setTab] = useState(TABS[0]);
  const [toast, setToast] = useState("");

  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: "Sovan Dara",
    role: "Admin",
    email: "sovan.dara@v-sychl.com",
    phone: "012 345 678",
    initials: "SD",
    avatar: null, // Holds profile image URL/base64
  });

  // Temporary state for profile modal editing
  const [profileForm, setProfileForm] = useState({ ...userProfile });

  // Refs for file inputs
  const profileImageInputRef = useRef(null);
  const stationLogoInputRef = useRef(null);

  // Station Info State
  const [stationInfo, setStationInfo] = useState({
    name: "V-SYCHL Gas Station - Main Branch",
    id: "#ST-001",
    phone: "0100 155-7899",
    email: "email@v-sychl.com",
    address: "National Road 6, Phnom Penh, Cambodia",
  });
  const [logoPreview, setLogoPreview] = useState(null);

  // Business Hours State
  const [businessHours, setBusinessHours] = useState(initialDays);

  // Fuel Prices State
  const [fuelPrices, setFuelPrices] = useState(initialFuelPrices);

  // Tax State
  const [taxSettings, setTaxSettings] = useState({
    vat: "10",
    otherTax: "2",
    envTax: "1",
    calculateOnPOS: true,
  });

  // Permissions Matrix State
  const [roles, setRoles] = useState(initialRoles);

  // Modals State
  const [activeModal, setActiveModal] = useState(null); // 'password' | 'profile' | 'logs'
  const [restoreFile, setRestoreFile] = useState(null);

  // Toast Helper
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // Handlers
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
      showToast("Station logo updated!");
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAll = () => {
    showToast("All Settings saved successfully!");
  };

  const handlePriceChange = (index, field, value) => {
    const updated = [...fuelPrices];
    updated[index][field] = parseFloat(value) || 0;
    setFuelPrices(updated);
  };

  const handleTogglePermission = (roleId, field) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, [field]: !r[field] } : r))
    );
  };

  const handleBackupNow = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ stationInfo, fuelPrices, taxSettings }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `VSYCHL_Backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Database backup downloaded successfully!");
  };

  const handleRestoreDatabase = () => {
    if (!restoreFile) return;
    showToast(`Database restored successfully from ${restoreFile.name}`);
    setRestoreFile(null);
  };

  const handleUpdateProfileSubmit = (e) => {
    e.preventDefault();
    const nameParts = profileForm.name.trim().split(" ");
    const initials =
      nameParts.length > 1
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0].slice(0, 2).toUpperCase();

    setUserProfile({ ...profileForm, initials });
    setActiveModal(null);
    showToast("User profile updated successfully!");
  };

  return (
    <div className="space-y-4 p-6 bg-gray-300 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-800 text-white px-4 py-3 shadow-xl text-xs font-medium animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-base font-semibold whitespace-nowrap transition-all border-b-2 ${
                tab === t
                  ? "border-cyan-500 text-cyan-600 bg-cyan-100/50 rounded-t-lg"
                  : "border-transparent text-slate-800 hover:text-slate-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-600 shadow-sm transition"
          >
            <Save size={24} /> Save Changes
          </button>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-base font-semibold text-slate-600 hover:bg-slate-50 transition">
            Cancel
          </button>
        </div>
      </div>

      {/* TAB 1: Station Info */}
      {tab === "Station Info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Station Profile">
            <div className="mb-4 flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-200 text-xs text-slate-500 font-bold overflow-hidden border border-slate-300">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  "Logo"
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={stationLogoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => stationLogoInputRef.current.click()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition"
                >
                  <Upload size={13} /> Upload Logo
                </button>
                <div className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 2MB</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-slate-600">Station Name</label>
                <input
                  type="text"
                  value={stationInfo.name}
                  onChange={(e) => setStationInfo({ ...stationInfo, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-500 bg-slate-50/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-600">Station ID</label>
                  <input
                    type="text"
                    value={stationInfo.id}
                    onChange={(e) => setStationInfo({ ...stationInfo, id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-500 bg-slate-50/50 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-600">Phone Number</label>
                  <input
                    type="text"
                    value={stationInfo.phone}
                    onChange={(e) => setStationInfo({ ...stationInfo, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-500 bg-slate-50/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-600">Email Address</label>
                <input
                  type="email"
                  value={stationInfo.email}
                  onChange={(e) => setStationInfo({ ...stationInfo, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-500 bg-slate-50/50"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-600">Location / Address</label>
                <textarea
                  rows={2}
                  value={stationInfo.address}
                  onChange={(e) => setStationInfo({ ...stationInfo, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-cyan-500 bg-slate-50/50"
                />
              </div>
            </div>
          </Panel>

          <Panel title="Business Hours" className="col-span-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="pb-2 font-semibold">Day</th>
                    <th className="pb-2 font-semibold">Opening</th>
                    <th className="pb-2 font-semibold">Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {businessHours.map((d, index) => (
                    <tr key={d.day}>
                      <td className="py-2.5 font-bold text-slate-700">{d.day}</td>
                      <td className="py-2.5">
                        <input
                          type="time"
                          value={d.open}
                          onChange={(e) => {
                            const updated = [...businessHours];
                            updated[index].open = e.target.value;
                            setBusinessHours(updated);
                          }}
                          className="border rounded-lg px-2 py-1 text-slate-600 bg-slate-50"
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="time"
                          value={d.close}
                          onChange={(e) => {
                            const updated = [...businessHours];
                            updated[index].close = e.target.value;
                            setBusinessHours(updated);
                          }}
                          className="border rounded-lg px-2 py-1 text-slate-600 bg-slate-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel title="User Account">
              <div className="mb-3 flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {userProfile.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt="Profile"
                    className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-white shadow-sm">
                    {userProfile.initials}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">{userProfile.name}</div>
                  <div className="text-[11px] font-semibold text-cyan-600">{userProfile.role}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setActiveModal("password")}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  <Key size={13} /> Change Password
                </button>
                <button
                  onClick={() => {
                    setProfileForm({ ...userProfile });
                    setActiveModal("profile");
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  <User size={13} /> Update Profile
                </button>
                <button
                  onClick={() => setActiveModal("logs")}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  <ScrollText size={13} /> View Activity Logs
                </button>
              </div>
            </Panel>

            <Panel title="Data Management">
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleBackupNow}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 py-2 text-xs font-bold text-white hover:bg-cyan-600 shadow-sm transition"
                >
                  <DatabaseBackup size={14} /> Backup Database Now
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 text-center">
                Last Auto-Backup: <span className="font-semibold text-slate-600">12-Aug-2026</span>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* TAB 2: Fuel Pricing & Tax */}
      {tab === "Fuel Pricing & Tax" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Fuel Pricing & Cost Margin">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fuelPrices.map((f, i) => {
                const margin = (((f.sell - f.cost) / f.cost) * 100).toFixed(1);
                return (
                  <div key={f.grade} className={`rounded-2xl p-3.5 border ${f.tone} space-y-2`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">{f.grade}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-600 border border-emerald-100">
                        +{margin}% Margin
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Cost ($/L)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={f.cost}
                          onChange={(e) => handlePriceChange(i, "cost", e.target.value)}
                          className="w-full border rounded-lg p-1.5 bg-white font-semibold text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">Selling ($/L)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={f.sell}
                          onChange={(e) => handlePriceChange(i, "sell", e.target.value)}
                          className="w-full border rounded-lg p-1.5 bg-white font-bold text-cyan-600"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Tax & Invoice Settings">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Value Added Tax (VAT %)</label>
                <input
                  type="number"
                  value={taxSettings.vat}
                  onChange={(e) => setTaxSettings({ ...taxSettings, vat: e.target.value })}
                  className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500 font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Other Applicable Tax (%)</label>
                  <input
                    type="number"
                    value={taxSettings.otherTax}
                    onChange={(e) => setTaxSettings({ ...taxSettings, otherTax: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Environmental Tax (%)</label>
                  <input
                    type="number"
                    value={taxSettings.envTax}
                    onChange={(e) => setTaxSettings({ ...taxSettings, envTax: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxSettings.calculateOnPOS}
                    onChange={(e) => setTaxSettings({ ...taxSettings, calculateOnPOS: e.target.checked })}
                    className="rounded text-cyan-500 focus:ring-cyan-400"
                  />
                  Automatically Calculate Tax on POS Customer Receipts
                </label>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 3: System Roles & Permission */}
      {tab === "System Roles & Permission" && (
        <Panel title="User Roles & Access Permissions Matrix">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                  <th className="p-3 font-semibold">User Role</th>
                  <th className="p-3 font-semibold">Active Users</th>
                  <th className="p-3 font-semibold text-center">Fuel Management</th>
                  <th className="p-3 font-semibold text-center">POS & Sales</th>
                  <th className="p-3 font-semibold text-center">Master Reports</th>
                  <th className="p-3 font-semibold text-center">System Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                      <ShieldCheck size={15} className="text-cyan-500" />
                      {r.role}
                    </td>
                    <td className="p-3 text-slate-500">{r.users} users assigned</td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.fuelMgmt}
                        onChange={() => handleTogglePermission(r.id, "fuelMgmt")}
                        className="rounded text-cyan-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.salesPos}
                        onChange={() => handleTogglePermission(r.id, "salesPos")}
                        className="rounded text-cyan-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.reports}
                        onChange={() => handleTogglePermission(r.id, "reports")}
                        className="rounded text-cyan-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.settings}
                        onChange={() => handleTogglePermission(r.id, "settings")}
                        className="rounded text-cyan-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* TAB 4: Backup & Restore */}
      {tab === "Backup & Restore" && (
        <Panel title="Database Backup & Restoration Center">
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <UploadCloud size={32} className="text-cyan-500" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">Drag & Drop SQL / JSON Backup File Here</p>
              <p className="text-[11px] text-slate-400">Supported formats: .sql, .json (Max 50MB)</p>
            </div>

            <input
              type="file"
              id="restoreFile"
              onChange={(e) => setRestoreFile(e.target.files[0])}
              className="hidden"
            />
            <label
              htmlFor="restoreFile"
              className="cursor-pointer rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-600 transition shadow-sm"
            >
              Select Backup File
            </label>

            {restoreFile && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-200 text-xs mt-2 font-medium">
                <FileCheck size={16} /> Selected: {restoreFile.name}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 mt-2">
              <AlertTriangle size={14} /> Warning: Restoring database will overwrite current station configurations and data.
            </div>

            {restoreFile && (
              <button
                onClick={handleRestoreDatabase}
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-rose-500 px-5 py-2 text-xs font-bold text-white hover:bg-rose-600 transition shadow-md"
              >
                <RefreshCw size={14} /> Restore Database Now
              </button>
            )}
          </div>
        </Panel>
      )}

      {/* MODALS */}

      {/* 1. Update Profile Modal (Includes Avatar Upload) */}
      {activeModal === "profile" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <User size={15} className="text-cyan-500" /> Update User Profile
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 text-xs">
              {/* Profile Image Picker */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="relative group cursor-pointer" onClick={() => profileImageInputRef.current.click()}>
                  {profileForm.avatar ? (
                    <img
                      src={profileForm.avatar}
                      alt="Avatar Preview"
                      className="h-20 w-20 rounded-full object-cover border-2 border-cyan-500 shadow-md"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-bold text-white shadow-md">
                      {profileForm.initials || "SD"}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>

                <input
                  type="file"
                  ref={profileImageInputRef}
                  onChange={handleProfileImageChange}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => profileImageInputRef.current.click()}
                  className="text-[11px] font-semibold text-cyan-600 hover:underline"
                >
                  Change Profile Photo
                </button>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Role / Position</label>
                  <select
                    value={profileForm.role}
                    onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-1.5 border rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Change Password Modal */}
      {activeModal === "password" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Key size={15} className="text-cyan-500" /> Change Password
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveModal(null);
                showToast("Password updated successfully!");
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-600 mb-1">Current Password</label>
                <input type="password" required className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">New Password</label>
                <input type="password" required className="w-full border rounded-xl p-2 bg-slate-50 outline-none focus:border-cyan-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border rounded-xl text-slate-600 font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Activity Logs Modal */}
      {activeModal === "logs" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <ScrollText size={15} className="text-cyan-500" /> User Activity Logs
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 text-[11px] max-h-60 overflow-y-auto">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-700">Updated Profile Info & Avatar</span> — <span className="text-slate-400">Just now</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-700">Updated Regular Fuel Price</span> to $1.50 — <span className="text-slate-400">Today, 8:15 PM</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-700">Triggered Manual Backup</span> — <span className="text-slate-400">Yesterday, 4:00 PM</span>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 bg-slate-800 text-white rounded-xl font-bold text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}