
import React, { useEffect, useMemo, useState } from "react";
import {
  Settings as SettingsIcon,
  Building2,
  Fuel,
  ShieldCheck,
  Database,
  Save,
  RefreshCw,
  Upload,
  Download,
  UserRound,
  LockKeyhole,
  History,
  Clock,
  ImagePlus,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import api from "../api/axios";
import {
  getSystemSettings,
  updateSystemSettings,
  getFuelTypes,
  updateFuelType,
} from "../api/employeeApi";

// តួនាទីដែលប្រព័ន្ធត្រូវគាំទ្រ
const ROLES = ["Admin", "Manager", "Cashier", "Fuel Attendant"];

// ថ្ងៃនៃសប្ដាហ៍សម្រាប់ម៉ោងបើកបិទ
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// ទិន្នន័យលំនាំដើម
const DEFAULT_STATION = {
  name: "",
  id: "",
  phone: "",
  email: "",
  address: "",
};

const DEFAULT_HOURS = DAYS.map((day) => ({
  day,
  open: "06:00",
  close: "22:00",
  closed: false,
}));

const DEFAULT_TAX = {
  vat: 10,
  otherTax: 0,
  envTax: 0,
  calculateOnPOS: true,
};

const DEFAULT_PRICES = [
  {
    fuel_id: null,
    fuel_code: "REG",
    fuel_name: "Regular Gasoline",
    purchase_price: 0,
    selling_price: 0,
  },
  {
    fuel_id: null,
    fuel_code: "PRE",
    fuel_name: "Premium Gasoline",
    purchase_price: 0,
    selling_price: 0,
  },
  {
    fuel_id: null,
    fuel_code: "DSL",
    fuel_name: "Diesel",
    purchase_price: 0,
    selling_price: 0,
  },
  {
    fuel_id: null,
    fuel_code: "LPG",
    fuel_name: "LPG",
    purchase_price: 0,
    selling_price: 0,
  },
];

const DEFAULT_PERMISSIONS = {
  Admin: {
    dashboard: true,
    fuel: true,
    sales: true,
    employees: true,
    reports: true,
    settings: true,
  },
  Manager: {
    dashboard: true,
    fuel: true,
    sales: true,
    employees: true,
    reports: true,
    settings: false,
  },
  Cashier: {
    dashboard: true,
    fuel: false,
    sales: true,
    employees: false,
    reports: false,
    settings: false,
  },
  "Fuel Attendant": {
    dashboard: true,
    fuel: true,
    sales: false,
    employees: false,
    reports: false,
    settings: false,
  },
};

const PERMISSION_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "fuel", label: "Fuel Management" },
  { key: "sales", label: "POS & Sales" },
  { key: "employees", label: "Employee Management" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "System Settings" },
];

const TABS = [
  { id: "station", label: "Station Info", icon: Building2 },
  { id: "pricing", label: "Fuel Pricing & Tax", icon: Fuel },
  { id: "roles", label: "System Roles & Permission", icon: ShieldCheck },
  { id: "backup", label: "Backup & Restore", icon: Database },
];

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function errorMessage(error) {
  if (error?.response?.status === 404) {
    return "Laravel API មិនទាន់មានទេ (404). សូមបង្កើត Backend endpoint នេះជាមុន។";
  }

  if (error?.response?.status === 401) {
    return "Session បានផុតកំណត់។ សូម Login ម្ដងទៀត។";
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  return error?.message || "មានបញ្ហាក្នុងការភ្ជាប់ទៅ Server។";
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Panel({ title, description, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  type = "button",
}) {
  const styles = {
    primary: "bg-blue-700 text-white hover:bg-blue-800",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("station");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const [stationInfo, setStationInfo] = useState(DEFAULT_STATION);
  const [businessHours, setBusinessHours] = useState(DEFAULT_HOURS);
  const [taxSettings, setTaxSettings] = useState(DEFAULT_TAX);
  const [fuelPrices, setFuelPrices] = useState(DEFAULT_PRICES);

  const [profile, setProfile] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    avatar: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const [showPasswords, setShowPasswords] = useState(false);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const [selectedRole, setSelectedRole] = useState("Manager");

  const [activityLogs, setActivityLogs] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");

  const currentUser = useMemo(() => {
    try {
      // យកព័ត៌មានគណនីពី sessionStorage បើ Login API រក្សាទុកនៅទីនោះ
      return JSON.parse(sessionStorage.getItem("gas_station_user") || "{}");
    } catch {
      return {};
    }
  }, []);

  function showNotice(type, message) {
    setNotice({ type, message });
  }

  // ផ្ទុកព័ត៌មានពី Laravel API នៅពេលបើក Settings
  async function loadSettings() {
    setLoading(true);
    setNotice(null);

    const results = await Promise.allSettled([
      getSystemSettings(),
      getFuelTypes(),
    ]);

    const settingsResult = results[0];
    const fuelResult = results[1];

    if (settingsResult.status === "fulfilled") {
      const data = settingsResult.value || {};

      setStationInfo({
        ...DEFAULT_STATION,
        ...(data.stationInfo || {}),
      });

      setBusinessHours(
        Array.isArray(data.businessHours) && data.businessHours.length
          ? data.businessHours
          : DEFAULT_HOURS
      );

      setTaxSettings({
        ...DEFAULT_TAX,
        ...(data.taxSettings || {}),
      });

      
  // ប្រើ Profile API ដើម្បីទទួលបានព័ត៌មានថ្មីពី Database។
  try {
    const response = await api.get("/profile");
    const user = response.data?.data ?? response.data;

    setProfile({
      full_name: user.full_name || "",
      username: user.username || "",
      email: user.email || "",
      phone: "",
      avatar: "",
    });
  } catch (error) {
    // ប្រសិនបើ API បរាជ័យ ប្រើព័ត៌មានពី Login ជាជម្រើសបម្រុង។
    setProfile({
      full_name: currentUser.full_name || "",
      username: currentUser.username || "",
      email: currentUser.email || "",
      phone: "",
      avatar: "",
    });

    showNotice(
      "error",
      `មិនអាចផ្ទុក Profile ពី Database បានទេ៖ ${errorMessage(error)}`
    );
  }


      // Roles/permissions មិនត្រូវយកទិន្នន័យ local មកអះអាងថាជា Database ទេ។
      if (data.permissions) {
        setPermissions(data.permissions);
      }
    } else {
      showNotice(
        "error",
        `មិនអាចផ្ទុក System Settings បានទេ៖ ${errorMessage(settingsResult.reason)}`
      );
    }

    if (fuelResult.status === "fulfilled") {
      const rows = Array.isArray(fuelResult.value)
        ? fuelResult.value
        : [];

      // ផ្គូផ្គងប្រភេទប្រេងពី Database ជាមួយកាតដែលបង្ហាញក្នុង UI
      setFuelPrices(
        DEFAULT_PRICES.map((defaultFuel) => {
          const matched = rows.find((item) => {
            const name = String(
              item.fuel_name || item.fuel_category || item.fuel_code || ""
            ).toLowerCase();

            return (
              name.includes(defaultFuel.fuel_name.split(" ")[0].toLowerCase()) ||
              String(item.fuel_code || "").toLowerCase() ===
                defaultFuel.fuel_code.toLowerCase()
            );
          });

          return matched
            ? {
                ...defaultFuel,
                ...matched,
                fuel_id: matched.fuel_id,
                purchase_price: Number(matched.purchase_price || 0),
                selling_price: Number(matched.selling_price || 0),
              }
            : defaultFuel;
        })
      );
    } else {
      showNotice(
        "error",
        `មិនអាចផ្ទុក Fuel Types បានទេ៖ ${errorMessage(fuelResult.reason)}`
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
    // loadSettings ប្រើតែពេល component ចាប់ផ្ដើម
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // រក្សាទុក Station Info, Business Hours និង Tax Settings
  async function handleSaveStation() {
    setSaving(true);
    setNotice(null);

    try {
      await updateSystemSettings({
        stationInfo,
        businessHours,
        taxSettings,
      });

      showNotice("success", "បានរក្សាទុក System Settings ក្នុង Database។");
    } catch (error) {
      showNotice("error", `រក្សាទុកមិនបានទេ៖ ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  // រក្សាទុកតម្លៃលក់របស់ Fuel Types តាម API ដែលមានស្រាប់
  async function handleSavePrices() {
    setSaving(true);
    setNotice(null);

    try {
      const changedFuels = fuelPrices.filter(
        (fuel) => fuel.fuel_id != null
      );

      if (changedFuels.length === 0) {
        throw new Error(
          "មិនទាន់រកឃើញ Fuel Type IDs ពី Database។ សូមពិនិត្យ GET /api/fuel-types។"
        );
      }

      await Promise.all(
        changedFuels.map((fuel) =>
          updateFuelType(fuel.fuel_id, {
            selling_price: Number(fuel.selling_price),
          })
        )
      );

      showNotice("success", "បានរក្សាទុកតម្លៃលក់ប្រេងដោយជោគជ័យ។");
      await loadSettings();
    } catch (error) {
      showNotice("error", `រក្សាទុកតម្លៃប្រេងមិនបានទេ៖ ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  // កែប្រែព័ត៌មានប្រេងនៅក្នុង state មុនពេល Save
  function updateFuelPrice(index, field, value) {
    setFuelPrices((previous) =>
      previous.map((fuel, i) =>
        i === index ? { ...fuel, [field]: value } : fuel
      )
    );
  }

  function updateStation(field, value) {
    setStationInfo((previous) => ({ ...previous, [field]: value }));
  }

  function updateTax(field, value) {
    setTaxSettings((previous) => ({ ...previous, [field]: value }));
  }

  function updateHours(index, field, value) {
    setBusinessHours((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  // ជ្រើសរើស Logo សម្រាប់ Preview
  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotice("error", "សូមជ្រើសរើសឯកសាររូបភាពប៉ុណ្ណោះ។");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showNotice("error", "រូបភាពត្រូវតែតូចជាង 2 MB។");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setLogoPreview(String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  }

  // Logo នៅទីនេះគ្រាន់តែ Preview; ត្រូវការ API Upload បើចង់រក្សាទុកជាអចិន្ត្រៃយ៍
  async function handleSaveProfile(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await api.put("/profile", {
        full_name: profile.full_name,
        username: profile.username,
        email: profile.email,
        phone: profile.phone,
      });

      showNotice("success", "បានធ្វើបច្ចុប្បន្នភាព Profile។");
      setShowProfileModal(false);
    } catch (error) {
      showNotice(
        "error",
        `ធ្វើបច្ចុប្បន្នភាព Profile មិនបានទេ៖ ${errorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  }

  
  // ប្ដូរពាក្យសម្ងាត់ និងផ្ញើ Field ឱ្យត្រូវនឹង ProfileController។
  async function handleChangePassword(event) {
    event.preventDefault();

    if (
      passwordForm.password !==
      passwordForm.password_confirmation
    ) {
      showNotice(
        "error",
        "ពាក្យសម្ងាត់ថ្មី និងការបញ្ជាក់មិនត្រូវគ្នាទេ។"
      );
      return;
    }

    if (passwordForm.password.length < 8) {
      showNotice(
        "error",
        "ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច 8 តួអក្សរ។"
      );
      return;
    }

    setSaving(true);

    try {
      await api.post("/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.password,
        new_password_confirmation:
          passwordForm.password_confirmation,
      });

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });

      setShowPasswordModal(false);
      showNotice(
        "success",
        "បានប្ដូរពាក្យសម្ងាត់ដោយជោគជ័យ។"
      );
    } catch (error) {
      showNotice(
        "error",
        `ប្ដូរពាក្យសម្ងាត់មិនបានទេ៖ ${errorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  }


  // ទាញយក Activity Logs ពិតប្រាកដពី Laravel API
  async function handleLoadActivityLogs() {
    setShowLogsModal(true);
    setActivityLogs([]);

    try {
      const response = await api.get("/activity-logs");
      const data = unwrap(response);

      setActivityLogs(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      showNotice(
        "error",
        `ទាញយក Activity Logs មិនបានទេ៖ ${errorMessage(error)}`
      );
    }
  }

  // រក្សាទុក Role Permissions តាម API
  async function handleSavePermissions() {
    setSaving(true);

    try {
      await api.put("/role-permissions", { permissions });
      showNotice("success", "បានរក្សាទុក Role Permissions។");
    } catch (error) {
      showNotice(
        "error",
        `រក្សាទុក Permissions មិនបានទេ៖ ${errorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  }

  // Backup ត្រូវបង្កើតនៅ Server ដើម្បីរួមបញ្ចូលទិន្នន័យ Database ពិត
  async function handleBackup() {
    setSaving(true);

    try {
      const response = await api.post(
        "/database-backup",
        {},
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `gas-station-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.sql`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotice("success", "បានទាញយក Backup ពី Server។");
    } catch (error) {
      showNotice(
        "error",
        `Backup មិនបានទេ៖ ${errorMessage(error)}`
      );
    } finally {
      setSaving(false);
    }
  }

  // Restore បញ្ជូនឯកសារទៅ Server; Server ត្រូវ Validate និង Restore វា
  async function handleRestore() {
    if (!restoreFile) {
      showNotice("error", "សូមជ្រើសរើសឯកសារ Backup ជាមុន។");
      return;
    }

    const confirmed = window.confirm(
      "តើអ្នកប្រាកដថាចង់ Restore Database មែនទេ? ទិន្នន័យបច្ចុប្បន្នអាចត្រូវបានជំនួស។"
    );

    if (!confirmed) return;

    setRestoring(true);

    try {
      const formData = new FormData();
      formData.append("backup_file", restoreFile);

      await api.post("/database-restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showNotice("success", "Server បានទទួលសំណើ Restore ជោគជ័យ។");
      setRestoreFile(null);
    } catch (error) {
      showNotice(
        "error",
        `Restore មិនបានទេ៖ ${errorMessage(error)}`
      );
    } finally {
      setRestoring(false);
    }
  }

  // បង្ហាញ Margin ដោយប្រើតម្លៃទិញ និងតម្លៃលក់
  function getMargin(fuel) {
    const purchase = Number(fuel.purchase_price || 0);
    const selling = Number(fuel.selling_price || 0);
    return selling - purchase;
  }

  const cardClass =
    "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

  return (
    <div className="min-h-screen bg-gray-300 p-6 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-800">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                System Settings
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage station information, pricing, permissions and backups.
              </p>
            </div>
          </div>

          <ActionButton variant="secondary" onClick={loadSettings} disabled={loading}>
            {loading ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <RefreshCw size={17} />
            )}
            Refresh
          </ActionButton>
        </div>

        {/* Notice: បង្ហាញសារពី API ជំនួសឱ្យការអះអាងជោគជ័យក្លែងក្លាយ */}
        {notice && (
          <div
            role="alert"
            className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
            )}
            <span>{notice.message}</span>
            <button
              className="ml-auto font-semibold"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex min-w-max gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  activeTab === id
                    ? "bg-blue-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-slate-500">
            <LoaderCircle className="animate-spin" size={22} />
            Loading settings...
          </div>
        ) : (
          <>
            {/* TAB 1: Station Info */}
            {activeTab === "station" && (
              <div className="space-y-6">
                <Panel
                  title="Station Information"
                  description="Basic information about your gas station."
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Station Name"
                      value={stationInfo.name}
                      onChange={(value) => updateStation("name", value)}
                      placeholder="Enter station name"
                    />
                    <Field
                      label="Station ID"
                      value={stationInfo.id}
                      onChange={(value) => updateStation("id", value)}
                      placeholder="e.g. ST-001"
                    />
                    <Field
                      label="Phone Number"
                      value={stationInfo.phone}
                      onChange={(value) => updateStation("phone", value)}
                      placeholder="Enter phone number"
                    />
                    <Field
                      label="Email Address"
                      type="email"
                      value={stationInfo.email}
                      onChange={(value) => updateStation("email", value)}
                      placeholder="station@example.com"
                    />
                    <div className="md:col-span-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Station Address
                        </span>
                        <textarea
                          rows={3}
                          value={stationInfo.address}
                          onChange={(event) =>
                            updateStation("address", event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          placeholder="Enter station address"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">
                      Station Logo
                    </h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Station logo preview"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Building2 className="text-slate-400" size={28} />
                        )}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <ImagePlus size={17} />
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                      </label>
                      <p className="text-xs text-slate-500">
                        Image files only; maximum 2 MB. Preview only until an
                        upload API is implemented.
                      </p>
                    </div>
                  </div>
                </Panel>

                <Panel
                  title="Business Hours"
                  description="Set the opening and closing times for each day."
                >
                  <div className="space-y-3">
                    {businessHours.map((item, index) => (
                      <div
                        key={item.day || index}
                        className="grid items-center gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr]"
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {item.day}
                        </span>

                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={!item.closed}
                            onChange={(event) =>
                              updateHours(index, "closed", !event.target.checked)
                            }
                            className="h-4 w-4 accent-blue-700"
                          />
                          Open
                        </label>

                        <input
                          aria-label={`${item.day} opening time`}
                          type="time"
                          disabled={item.closed}
                          value={item.open || "06:00"}
                          onChange={(event) =>
                            updateHours(index, "open", event.target.value)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                        />

                        <input
                          aria-label={`${item.day} closing time`}
                          type="time"
                          disabled={item.closed}
                          value={item.close || "22:00"}
                          onChange={(event) =>
                            updateHours(index, "close", event.target.value)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                        />
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel
                  title="User Account"
                  description="Manage your account and review account activity."
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-800">
                        <UserRound size={27} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {profile.full_name || currentUser.full_name || "Current User"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {profile.email || currentUser.email || "No email available"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Role: {currentUser.role || "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        variant="secondary"
                        onClick={() => setShowProfileModal(true)}
                      >
                        <UserRound size={16} />
                        Update Profile
                      </ActionButton>
                      <ActionButton
                        variant="secondary"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        <LockKeyhole size={16} />
                        Change Password
                      </ActionButton>
                      <ActionButton
                        variant="secondary"
                        onClick={handleLoadActivityLogs}
                      >
                        <History size={16} />
                        Activity Logs
                      </ActionButton>
                    </div>
                  </div>
                </Panel>

                <div className="flex justify-end">
                  <ActionButton onClick={handleSaveStation} disabled={saving}>
                    {saving ? (
                      <LoaderCircle className="animate-spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    Save Station Settings
                  </ActionButton>
                </div>
              </div>
            )}

            {/* TAB 2: Fuel Pricing & Tax */}
            {activeTab === "pricing" && (
              <div className="space-y-6">
                <Panel
                  title="Fuel Pricing"
                  description="Update selling prices. Purchase prices are read from the database."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {fuelPrices.map((fuel, index) => (
                      <div
                        key={fuel.fuel_id ?? fuel.fuel_code}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                            <Fuel size={22} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">
                              {fuel.fuel_name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Code: {fuel.fuel_code}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="mb-1 block text-xs text-slate-500">
                              Purchase Price
                            </span>
                            <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                              ${money(fuel.purchase_price)}
                            </div>
                          </div>

                          <label>
                            <span className="mb-1 block text-xs text-slate-500">
                              Selling Price
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={fuel.selling_price}
                              onChange={(event) =>
                                updateFuelPrice(
                                  index,
                                  "selling_price",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                            />
                          </label>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                          <span className="text-xs text-emerald-800">
                            Margin per unit
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              getMargin(fuel) < 0
                                ? "text-red-700"
                                : "text-emerald-800"
                            }`}
                          >
                            ${money(getMargin(fuel))}
                          </span>
                        </div>

                        {fuel.fuel_id == null && (
                          <p className="mt-2 text-xs text-amber-700">
                            Fuel Type ID not found; this item cannot be saved
                            until it matches a database record.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <ActionButton onClick={handleSavePrices} disabled={saving}>
                      {saving ? (
                        <LoaderCircle className="animate-spin" size={17} />
                      ) : (
                        <Save size={17} />
                      )}
                      Save Fuel Prices
                    </ActionButton>
                  </div>
                </Panel>

                <Panel
                  title="Tax Settings"
                  description="Configure tax percentages and POS tax calculation."
                >
                  <div className="grid gap-5 md:grid-cols-3">
                    <Field
                      label="VAT (%)"
                      type="number"
                      value={taxSettings.vat}
                      onChange={(value) => updateTax("vat", value)}
                    />
                    <Field
                      label="Other Tax (%)"
                      type="number"
                      value={taxSettings.otherTax}
                      onChange={(value) => updateTax("otherTax", value)}
                    />
                    <Field
                      label="Environmental Tax (%)"
                      type="number"
                      value={taxSettings.envTax}
                      onChange={(value) => updateTax("envTax", value)}
                    />
                  </div>

                  <label className="mt-5 flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={Boolean(taxSettings.calculateOnPOS)}
                      onChange={(event) =>
                        updateTax("calculateOnPOS", event.target.checked)
                      }
                      className="h-4 w-4 accent-blue-700"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">
                        Calculate tax at POS
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Apply configured taxes when calculating POS transactions.
                      </span>
                    </span>
                  </label>

                  <div className="mt-5 flex justify-end">
                    <ActionButton onClick={handleSaveStation} disabled={saving}>
                      <Save size={17} />
                      Save Tax Settings
                    </ActionButton>
                  </div>
                </Panel>
              </div>
            )}

            {/* TAB 3: System Roles & Permission */}
            {activeTab === "roles" && (
              <div className="space-y-6">
                <Panel
                  title="System Roles & Permissions"
                  description="Configure access rights by role. These changes take effect only when the backend supports this endpoint."
                >
                  <div className="mb-5 max-w-sm">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Select Role
                      </span>
                      <select
                        value={selectedRole}
                        onChange={(event) => setSelectedRole(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Permission
                          </th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-700">
                            Access
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_ITEMS.map((item) => {
                          const isAdmin = selectedRole === "Admin";

                          return (
                            <tr
                              key={item.key}
                              className="border-b border-slate-100 last:border-0"
                            >
                              <td className="px-4 py-4 text-slate-700">
                                {item.label}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    permissions[selectedRole]?.[item.key]
                                  )}
                                  disabled={isAdmin}
                                  title={
                                    isAdmin
                                      ? "Admin permissions are fixed in this screen"
                                      : ""
                                  }
                                  onChange={(event) => {
                                    const checked = event.target.checked;

                                    setPermissions((previous) => ({
                                      ...previous,
                                      [selectedRole]: {
                                        ...previous[selectedRole],
                                        [item.key]: checked,
                                      },
                                    }));
                                  }}
                                  className="h-4 w-4 accent-blue-700 disabled:opacity-60"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Important: frontend checkboxes alone do not secure routes.
                    Laravel middleware/policies must enforce these permissions
                    on the server.
                  </p>

                  <div className="mt-5 flex justify-end">
                    <ActionButton
                      onClick={handleSavePermissions}
                      disabled={saving || selectedRole === "Admin"}
                    >
                      <Save size={17} />
                      Save Permissions
                    </ActionButton>
                  </div>
                </Panel>
              </div>
            )}

            {/* TAB 4: Backup & Restore */}
            {activeTab === "backup" && (
              <div className="space-y-6">
                <Panel
                  title="Database Backup"
                  description="Request a database backup from the Laravel server."
                >
                  <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-white p-3 text-blue-800">
                        <Download size={22} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          Backup Database Now
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          The backend must generate a real database backup file.
                          Exporting settings as JSON is not a full database backup.
                        </p>
                      </div>
                    </div>

                    <ActionButton onClick={handleBackup} disabled={saving}>
                      {saving ? (
                        <LoaderCircle className="animate-spin" size={17} />
                      ) : (
                        <Database size={17} />
                      )}
                      Create Backup
                    </ActionButton>
                  </div>
                </Panel>

                <Panel
                  title="Restore Database"
                  description="Upload a backup file to the backend for validation and restoration."
                >
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <Upload size={22} />
                    </div>

                    <h3 className="font-semibold text-slate-800">
                      Select Backup File
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Supported file selection: .sql or .json. The server must
                      validate the contents before performing a restore.
                    </p>

                    <label className="mx-auto mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      <Upload size={16} />
                      Choose File
                      <input
                        type="file"
                        accept=".sql,.json,application/json,application/sql,text/plain"
                        className="hidden"
                        onChange={(event) =>
                          setRestoreFile(event.target.files?.[0] || null)
                        }
                      />
                    </label>

                    {restoreFile && (
                      <div className="mx-auto mt-4 max-w-lg rounded-lg bg-slate-50 p-3 text-left">
                        <p className="break-all text-sm font-medium text-slate-700">
                          {restoreFile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(restoreFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}

                    <div className="mt-5">
                      <ActionButton
                        variant="danger"
                        onClick={handleRestore}
                        disabled={!restoreFile || restoring}
                      >
                        {restoring ? (
                          <LoaderCircle className="animate-spin" size={17} />
                        ) : (
                          <RefreshCw size={17} />
                        )}
                        Restore Database
                      </ActionButton>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertCircle size={19} className="mt-0.5 shrink-0" />
                    <p>
                      Warning: database restoration can overwrite existing data.
                      Implement server-side authorization, file validation,
                      restricted file size, and a safety backup before allowing
                      restoration.
                    </p>
                  </div>
                </Panel>
              </div>
            )}
          </>
        )}

        {/* Profile modal */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Update Profile
                </h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-2xl text-slate-400 hover:text-slate-700"
                  aria-label="Close profile dialog"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <Field
                  label="Full Name"
                  value={profile.full_name}
                  onChange={(value) =>
                    setProfile((p) => ({ ...p, full_name: value }))
                  }
                />
                <Field
                  label="Username"
                  value={profile.username}
                  onChange={(value) =>
                    setProfile((p) => ({ ...p, username: value }))
                  }
                />
                <Field
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={(value) =>
                    setProfile((p) => ({ ...p, email: value }))
                  }
                />
                <Field
                  label="Phone"
                  value={profile.phone}
                  onChange={(value) =>
                    setProfile((p) => ({ ...p, phone: value }))
                  }
                />

                <div className="flex justify-end gap-2 pt-3">
                  <ActionButton
                    variant="secondary"
                    onClick={() => setShowProfileModal(false)}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton type="submit" disabled={saving}>
                    <Save size={16} />
                    Save Profile
                  </ActionButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change password modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Change Password
                </h2>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-2xl text-slate-400 hover:text-slate-700"
                  aria-label="Close password dialog"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="relative">
                  <Field
                    label="Current Password"
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.current_password}
                    onChange={(value) =>
                      setPasswordForm((p) => ({
                        ...p,
                        current_password: value,
                      }))
                    }
                  />
                </div>

                <Field
                  label="New Password"
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.password}
                  onChange={(value) =>
                    setPasswordForm((p) => ({ ...p, password: value }))
                  }
                />

                <Field
                  label="Confirm New Password"
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.password_confirmation}
                  onChange={(value) =>
                    setPasswordForm((p) => ({
                      ...p,
                      password_confirmation: value,
                    }))
                  }
                />

                <button
                  type="button"
                  onClick={() => setShowPasswords((value) => !value)}
                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showPasswords ? "Hide passwords" : "Show passwords"}
                </button>

                <div className="flex justify-end gap-2 pt-3">
                  <ActionButton
                    variant="secondary"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton type="submit" disabled={saving}>
                    <LockKeyhole size={16} />
                    Change Password
                  </ActionButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Activity logs modal */}
        {showLogsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Activity Logs
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Records returned by the Laravel API.
                  </p>
                </div>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="text-2xl text-slate-400 hover:text-slate-700"
                  aria-label="Close activity logs"
                >
                  ×
                </button>
              </div>

              <div className="max-h-[60vh] overflow-auto p-5">
                {activityLogs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    <Clock className="mx-auto mb-3" size={26} />
                    No activity logs returned by the API.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log, index) => (
                      <div
                        key={log.log_id || log.id || index}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">
                            {log.action || log.description || "Activity"}
                          </p>
                          <span className="text-xs text-slate-500">
                            {log.created_at
                              ? new Date(log.created_at).toLocaleString()
                              : ""}
                          </span>
                        </div>
                        {log.username && (
                          <p className="mt-1 text-sm text-slate-600">
                            User: {log.username}
                          </p>
                        )}
                        {log.details && (
                          <p className="mt-1 text-sm text-slate-500">
                            {typeof log.details === "string"
                              ? log.details
                              : JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
