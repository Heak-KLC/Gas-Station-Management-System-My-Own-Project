import { useState } from "react";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import {
  TrendingUp,
  Gauge,
  Users2,
  DollarSign,
  FileText,
  DatabaseBackup,
  TriangleAlert,
  Fuel,
  X,
  Save,
  CheckCircle,
  Loader2,
} from "lucide-react";

import { Panel, StatusBadge, StatCard } from "../components/ui";
import pumpImage from "../image/pump.jpg";

// =========================
// Daily Revenue
// =========================
const dailyRevenue = [
  { day: "Sun", value: 620 },
  { day: "Mon", value: 540 },
  { day: "Tue", value: 780 },
  { day: "Wed", value: 700 },
  { day: "Thu", value: 900 },
  { day: "Fri", value: 640 },
  { day: "Sat", value: 860 },
];

// =========================
// Fuel Tanks
// =========================
const tankLevels = [
  { pump: "PumpA", pct: 78, status: "High" },
  { pump: "PumpB", pct: 25, status: "Low Stock" },
  { pump: "PumpC", pct: 60, status: "High" },
  { pump: "PumpD", pct: 20, status: "Low Stock" },
];

// =========================
// Fuel Sales
// =========================
const salesByType = [
  { name: "Super", value: 38, color: "#0ea5e9" },
  { name: "Normal", value: 24, color: "#22c55e" },
  { name: "LPG", value: 16, color: "#f59e0b" },
  { name: "Diesel", value: 22, color: "#6366f1" },
];

// =========================
// Low Fuel Alerts
// =========================
const lowFuelAlerts = [
  {
    tank: "Tank A - Super 95",
    note: "Only 10% remaining (Low)",
    status: "Critical Stock",
  },
  {
    tank: "Tank B - Diesel",
    note: "Only 25% remaining (Low)",
    status: "Low Stock",
  },
  {
    tank: "Tank D - Normal 92",
    note: "Only 28% remaining (Low)",
    status: "Low Stock",
  },
  {
    tank: "Tank C - LPG",
    note: "Status: Good (80%)",
    status: "In Stock",
  },
];

// =========================
// Maintenance Schedule
// =========================
const maintenanceRows = [
  {
    equipment: "Pump A1 Nozzle",
    task: "Nozzle inspection",
    scheduled: "2026-08-15",
    time: "09:00 AM",
    status: "Scheduled",
    dot: "bg-amber-500",
  },
  {
    equipment: "Tank B Sensor",
    task: "Sensor inspection",
    scheduled: "2026-08-18",
    time: "10:30 AM",
    status: "Completed",
    dot: "bg-emerald-500",
  },
  {
    equipment: "Pump C2 Meter",
    task: "Meter maintenance",
    scheduled: "2026-08-20",
    time: "02:00 PM",
    status: "Maintenance (offline)",
    dot: "bg-rose-500",
  },
];

// =========================
// Recent Activity
// =========================
const recentActivity = [
  {
    txn: "372122086",
    pump: "Pump A",
    fuel: "Super",
    amount: "2,555,100 KHR",
    time: "10:15 AM",
  },
  {
    txn: "372122085",
    pump: "Pump D",
    fuel: "Diesel",
    amount: "1,802,300 KHR",
    time: "10:12 AM",
  },
  {
    txn: "372122084",
    pump: "Pump B",
    fuel: "Diesel",
    amount: "1,280,200 KHR",
    time: "09:58 AM",
  },
];

// =========================
// Pump Activity
// =========================
const pumpFeed = [
  {
    pump: "Pump A",
    fuelType: "Nozzle 1 Active",
    amount: "25.5 L, 114,750 KHR",
    note: "(Dynamic counting up effect)",
    active: true,
  },
  {
    pump: "Pump B",
    fuelType: "Nozzle 1 Active",
    amount: "100.2 L, 450,900 KHR",
    note: "(Dynamic counting up effect)",
    active: true,
  },
  {
    pump: "Pump C",
    fuelType: "Regular 92 Idle",
    amount: "Last Tx: 52,000 KHR",
    note: "",
    active: false,
  },
  {
    pump: "Pump D",
    fuelType: "Diesel",
    amount: "Maintenance (offline)",
    note: "",
    active: false,
  },
];

// =========================
// Quick Actions
// =========================
const quickActions = [
  {
    label: "Adjust Price",
    icon: DollarSign,
    primary: true,
  },
  {
    label: "Issue PO",
    icon: FileText,
    primary: false,
  },
  {
    label: "System Backup",
    icon: DatabaseBackup,
    primary: false,
  },
];

// =========================
// Pie Chart Label
// =========================
function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
}) {
  const RADIAN = Math.PI / 180;

  const radius =
    innerRadius + (outerRadius - innerRadius) / 2;

  const x =
    cx + radius * Math.cos(-midAngle * RADIAN);

  const y =
    cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={15}
      fontWeight={600}
    >
      {`${value}%`}
    </text>
  );
}

// =========================
// Alert Theme
// =========================
const ALERT_THEME = {
  "Critical Stock": {
    row: "bg-rose-50",
    icon: "text-rose-500",
    badge: "bg-rose-500 text-white",
    Icon: TriangleAlert,
  },

  "Low Stock": {
    row: "bg-amber-50",
    icon: "text-amber-500",
    badge: "bg-amber-500 text-white",
    Icon: TriangleAlert,
  },

  "In Stock": {
    row: "bg-emerald-50",
    icon: "text-emerald-500",
    badge: "bg-emerald-500 text-white",
    Icon: Fuel,
  },
};

// =========================
// Fuel Alert Row
// =========================
function FuelAlertRow({ tank, note, status }) {
  const theme =
    ALERT_THEME[status] ??
    ALERT_THEME["Low Stock"];

  const Icon = theme.Icon;

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${theme.row}`}
    >
      <div className="flex items-start gap-2">
        <Icon
          size={16}
          className={`mt-0.5 shrink-0 ${theme.icon}`}
        />

        <div>
          <div className="text-sm font-semibold text-slate-700">
            {tank}
          </div>

          <div className="text-xs text-slate-500">
            {note}
          </div>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}
      >
        {status}
      </span>
    </li>
  );
}

// =========================
// Dashboard
// =========================
export default function Dashboard() {
  // =========================
  // Modal State
  // =========================
  const [modal, setModal] = useState(null);

  // =========================
  // Adjust Price
  // =========================
  const [priceData, setPriceData] = useState({
    fuelType: "Super 95",
    price: "",
  });

  // =========================
  // Purchase Order
  // =========================
  const [poData, setPoData] = useState({
    supplier: "",
    fuelType: "Diesel",
    quantity: "",
  });

  // =========================
  // Backup
  // =========================
  const [backupStatus, setBackupStatus] =
    useState("idle");

  // =========================
  // Maintenance
  // =========================
  const [maintenanceData, setMaintenanceData] =
    useState(null);

  // =========================
  // Open Modal
  // =========================
  const openModal = (type) => {
    setModal(type);
  };

  // =========================
  // Close Modal
  // =========================
  const closeModal = () => {
    setModal(null);
    setBackupStatus("idle");
    setMaintenanceData(null);
  };

  // =========================
  // Adjust Price Process
  // =========================
  const handleAdjustPrice = (e) => {
    e.preventDefault();

    console.log(
      "Price Updated:",
      priceData
    );

    alert(
      `${priceData.fuelType} price has been updated to ${priceData.price} KHR/L`
    );

    closeModal();
  };

  // =========================
  // Create PO Process
  // =========================
  const handleCreatePO = (e) => {
    e.preventDefault();

    console.log(
      "Purchase Order:",
      poData
    );

    alert(
      `Purchase Order created successfully for ${poData.quantity} L of ${poData.fuelType}`
    );

    closeModal();
  };

  // =========================
  // Backup Process
  // =========================
  const handleBackup = () => {
    setBackupStatus("processing");

    setTimeout(() => {
      setBackupStatus("completed");
    }, 2000);
  };

  // =========================
  // Maintenance Detail
  // =========================
  const openMaintenanceDetail = (maintenance) => {
    setMaintenanceData(maintenance);
    setModal("maintenance");
  };

  return (
    <>
      <div className="space-y-4 bg-gray-400 p-6">

        {/* ===================================== */}
        {/* STAT CARDS */}
        {/* ===================================== */}

        <div className="grid grid-cols-4 gap-4">

          <StatCard
            icon={
              <img
                src={pumpImage}
                className="h-10 w-10"
                alt="Fuel pump"
              />
            }
            label="Total Fuel Sales Today"
            value="12,450 L"
            delta="Change vs Yesterday: +50 L"
          />

          <StatCard
            icon={
              <TrendingUp
                size={18}
                className="h-10 w-10 text-emerald-500"
              />
            }
            label="Monthly Revenue"
            value="35,450,000 KHR"
            delta="Change vs Yesterday: +80,000 KHR"
          />

          <StatCard
            icon={
              <Gauge
                size={18}
                className="h-10 w-10 text-indigo-500"
              />
            }
            label="Total Pumps"
            value="3/4"
            delta="Total Pumps: 4"
            deltaTone="neutral"
          />

          <StatCard
            icon={
              <Users2
                size={18}
                className="h-10 w-10 text-amber-500"
              />
            }
            label="Employees"
            value="1"
            delta="Employees: 1"
            deltaTone="neutral"
          />

        </div>

        {/* ===================================== */}
        {/* CHARTS */}
        {/* ===================================== */}

        <div className="grid grid-cols-3 gap-4">

          {/* Daily Revenue */}
          <Panel
            title="Daily Revenue"
            className="col-span-1"
          >
            <ResponsiveContainer
              width="100%"
              height={180}
            >
              <LineChart data={dailyRevenue}>
                <CartesianGrid
                  strokeDasharray=""
                  stroke="oklch(70.5% 0.015 286.067)"
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fontSize: 13,
                    fill: "black",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fontSize: 13,
                    fill: "black",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          {/* Fuel Tanks */}
          <Panel
            title="Fuel Tanks"
            className="col-span-1"
          >
            <div className="flex h-[200px] items-center justify-around">
              {tankLevels.map((t) => (
                <TankBattery
                  key={t.pump}
                  {...t}
                />
              ))}
            </div>
          </Panel>

          {/* Fuel Sales Chart */}
          <Panel
            title="Fuel Sales by Type Chart"
            className="col-span-1"
          >
            <ResponsiveContainer
              width="100%"
              height={180}
            >
              <PieChart>
                <Pie
                  data={salesByType}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {salesByType.map(
                    (entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    )
                  )}
                </Pie>

                <Tooltip
                  formatter={(value) =>
                    `${value}%`
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
              {salesByType.map((s) => (
                <span
                  key={s.name}
                  className="flex items-center gap-1"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: s.color,
                    }}
                  />

                  {s.name} ({s.value}%)
                </span>
              ))}
            </div>
          </Panel>

        </div>

        {/* ===================================== */}
        {/* QUICK ACTION + LIVE PUMP */}
        {/* ===================================== */}

        <div className="grid grid-cols-3 gap-4">

          {/* Quick Action */}
          <Panel
            title="Quick Action"
            className="col-span-1"
          >
            <div className="flex flex-col gap-2">

              {quickActions.map(
                ({
                  label,
                  icon: Icon,
                  primary,
                }) => (
                  <button
                    key={label}
                    onClick={() =>
                      openModal(label)
                    }
                    className={`flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
                      primary
                        ? "bg-cyan-500 text-white hover:bg-cyan-600"
                        : "border border-cyan-200 bg-white text-cyan-600 hover:bg-cyan-50"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                )
              )}

            </div>
          </Panel>

          {/* Live Pump Activity */}
          <Panel className="col-span-2">

            <div className="mb-4 flex items-center gap-2">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                <Fuel
                  size={18}
                  className="text-white"
                />
              </div>

              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                LIVE
              </span>

              <h3 className="text-xl font-bold text-slate-800">
                Live Pump Activity Feed
              </h3>

            </div>

            <div className="overflow-hidden rounded-lg">

              <table className="w-full text-left text-xs">

                <thead>
                  <tr className="bg-sky-100 text-slate-700">
                    <th className="px-3 py-2 font-semibold">
                      Pump
                    </th>

                    <th className="px-3 py-2 font-semibold">
                      Fuel Type
                    </th>

                    <th className="px-3 py-2 font-semibold">
                      Current Amount (KHB)
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {pumpFeed.map((p) => (
                    <tr
                      key={p.pump}
                      className={
                        p.active
                          ? "bg-emerald-50"
                          : "bg-sky-50"
                      }
                    >
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {p.pump}
                      </td>

                      <td className="px-3 py-2 text-slate-600">
                        {p.fuelType}
                      </td>

                      <td className="px-3 py-2 text-slate-600">
                        {p.amount}

                        {p.note && (
                          <div className="text-[10px] text-slate-400">
                            {p.note}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>

            </div>
          </Panel>

        </div>

        {/* ===================================== */}
        {/* LOW FUEL + MAINTENANCE + ACTIVITY */}
        {/* ===================================== */}

        <div className="grid grid-cols-3 gap-4">

          {/* Low Fuel Alerts */}
          <Panel title="Low Fuel Alerts">

            <ul className="space-y-2">
              {lowFuelAlerts.map((a) => (
                <FuelAlertRow
                  key={a.tank}
                  {...a}
                />
              ))}
            </ul>

          </Panel>

          {/* Maintenance Schedule */}
          <Panel>

            <h3 className="mb-4 text-xl font-bold text-slate-800">
              Maintenance Schedule
            </h3>

            <table className="w-full text-left text-xs">

              <thead>
                <tr className="text-slate-700">

                  <th className="pb-2 font-semibold">
                    Equipment/Task
                  </th>

                  <th className="pb-2 font-semibold">
                    Status
                  </th>

                  <th className="pb-2 font-semibold">
                    Scheduled Date
                  </th>

                  <th className="pb-2 font-semibold">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody>

                {maintenanceRows.map((m) => (
                  <tr
                    key={m.equipment}
                    className="border-t border-slate-100"
                  >

                    <td className="py-3 pr-2">

                      <div className="font-medium text-slate-700">
                        {m.equipment}
                      </div>

                      <div className="text-slate-400">
                        {m.task}
                      </div>

                    </td>

                    <td className="py-3 pr-2">

                      <div className="flex items-center gap-1.5 text-slate-600">

                        <span
                          className={`h-2 w-2 rounded-full ${m.dot}`}
                        />

                        {m.status}

                      </div>

                    </td>

                    <td className="py-3 pr-2 text-slate-500">

                      <div>
                        {m.scheduled}
                      </div>

                      <div>
                        {m.time}
                      </div>

                    </td>

                    <td className="py-3">

                      <button
                        onClick={() =>
                          openMaintenanceDetail(m)
                        }
                        className="rounded-full bg-slate-800 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-slate-700"
                      >
                        Detail
                      </button>

                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </Panel>

          {/* Recent Activity */}
          <Panel>

            <h3 className="mb-4 text-xl font-bold text-slate-800">
              My Recent Activity
            </h3>

            <div className="overflow-hidden rounded-lg">

              <table className="w-full text-left text-xs">

                <thead>

                  <tr className="bg-sky-100 text-slate-700">

                    <th className="px-3 py-2 font-semibold">
                      Transaction
                    </th>

                    <th className="px-3 py-2 font-semibold">
                      Pump
                    </th>

                    <th className="px-3 py-2 font-semibold">
                      Fuel
                    </th>

                    <th className="px-3 py-2 font-semibold">
                      Amount
                    </th>

                    <th className="px-3 py-2 font-semibold">
                      Time
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {recentActivity.map(
                    (r, i) => (
                      <tr
                        key={r.txn}
                        className={
                          i % 2 === 0
                            ? "bg-white"
                            : "bg-sky-50"
                        }
                      >

                        <td className="px-3 py-2 text-slate-500">
                          {r.txn}
                        </td>

                        <td className="px-3 py-2 font-medium text-slate-700">
                          {r.pump}
                        </td>

                        <td className="px-3 py-2 text-slate-600">
                          {r.fuel}
                        </td>

                        <td className="px-3 py-2 font-medium text-slate-700">
                          {r.amount}
                        </td>

                        <td className="px-3 py-2 text-slate-400">
                          {r.time}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </Panel>

        </div>

      </div>

      {/* ====================================================== */}
      {/* ADJUST PRICE MODAL */}
      {/* ====================================================== */}

      {modal === "Adjust Price" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b px-6 py-4">

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Adjust Fuel Price
                </h2>

                <p className="text-xs text-slate-500">
                  Update the current fuel price
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleAdjustPrice}
              className="space-y-4 p-6"
            >

              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Fuel Type
                </label>

                <select
                  value={priceData.fuelType}
                  onChange={(e) =>
                    setPriceData({
                      ...priceData,
                      fuelType: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option>
                    Super 95
                  </option>

                  <option>
                    Normal 92
                  </option>

                  <option>
                    Diesel
                  </option>

                  <option>
                    LPG
                  </option>
                </select>

              </div>

              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New Price (KHR/L)
                </label>

                <input
                  type="number"
                  required
                  min="1"
                  value={priceData.price}
                  onChange={(e) =>
                    setPriceData({
                      ...priceData,
                      price: e.target.value,
                    })
                  }
                  placeholder="Enter new price"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />

              </div>

              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                >
                  <Save size={16} />
                  Save Price
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* ISSUE PO MODAL */}
      {/* ====================================================== */}

      {modal === "Issue PO" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b px-6 py-4">

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Issue Purchase Order
                </h2>

                <p className="text-xs text-slate-500">
                  Create a new purchase order
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleCreatePO}
              className="space-y-4 p-6"
            >

              {/* Supplier */}
              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Supplier
                </label>

                <select
                  required
                  value={poData.supplier}
                  onChange={(e) =>
                    setPoData({
                      ...poData,
                      supplier: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >

                  <option value="">
                    Select Supplier
                  </option>

                  <option>
                    TotalEnergies Supplier
                  </option>

                  <option>
                    PTT Supplier
                  </option>

                  <option>
                    Caltex Supplier
                  </option>

                  <option>
                    Local Fuel Supplier
                  </option>

                </select>

              </div>

              {/* Fuel Type */}
              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Fuel Type
                </label>

                <select
                  value={poData.fuelType}
                  onChange={(e) =>
                    setPoData({
                      ...poData,
                      fuelType: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >

                  <option>
                    Super 95
                  </option>

                  <option>
                    Normal 92
                  </option>

                  <option>
                    Diesel
                  </option>

                  <option>
                    LPG
                  </option>

                </select>

              </div>

              {/* Quantity */}
              <div>

                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Quantity (Liter)
                </label>

                <input
                  type="number"
                  min="1"
                  required
                  value={poData.quantity}
                  onChange={(e) =>
                    setPoData({
                      ...poData,
                      quantity: e.target.value,
                    })
                  }
                  placeholder="Enter quantity"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                />

              </div>

              <div className="flex justify-end gap-2 pt-2">

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                >
                  <FileText size={16} />
                  Create PO
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* SYSTEM BACKUP MODAL */}
      {/* ====================================================== */}

      {modal === "System Backup" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b px-6 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-800">
                  System Backup
                </h2>

                <p className="text-xs text-slate-500">
                  Backup your system data
                </p>

              </div>

              <button
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>

            </div>

            <div className="p-6">

              {/* IDLE */}
              {backupStatus === "idle" && (
                <>
                  <div className="mb-5 rounded-lg bg-sky-50 p-4">

                    <div className="flex gap-3">

                      <DatabaseBackup
                        className="text-cyan-500"
                      />

                      <div>

                        <h3 className="font-semibold text-slate-800">
                          Backup System Data
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          This will create a backup of your current system data.
                        </p>

                      </div>

                    </div>

                  </div>

                  <div className="flex justify-end gap-2">

                    <button
                      onClick={closeModal}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleBackup}
                      className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                    >
                      <DatabaseBackup size={16} />
                      Start Backup
                    </button>

                  </div>
                </>
              )}

              {/* PROCESSING */}
              {backupStatus === "processing" && (
                <div className="py-8 text-center">

                  <Loader2
                    size={40}
                    className="mx-auto animate-spin text-cyan-500"
                  />

                  <h3 className="mt-4 font-semibold text-slate-800">
                    Backing up system...
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Please wait while your data is being backed up.
                  </p>

                </div>
              )}

              {/* COMPLETED */}
              {backupStatus === "completed" && (
                <div className="py-8 text-center">

                  <CheckCircle
                    size={48}
                    className="mx-auto text-emerald-500"
                  />

                  <h3 className="mt-4 text-lg font-bold text-slate-800">
                    Backup Completed
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Your system data has been backed up successfully.
                  </p>

                  <button
                    onClick={closeModal}
                    className="mt-5 rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Done
                  </button>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* MAINTENANCE DETAIL MODAL */}
      {/* ====================================================== */}

      {modal === "maintenance" &&
        maintenanceData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b px-6 py-4">

                <div>

                  <h2 className="text-lg font-bold text-slate-800">
                    Maintenance Detail
                  </h2>

                  <p className="text-xs text-slate-500">
                    Equipment maintenance information
                  </p>

                </div>

                <button
                  onClick={closeModal}
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>

              </div>

              <div className="space-y-4 p-6">

                {/* Equipment */}
                <div className="rounded-lg bg-slate-50 p-4">

                  <p className="text-xs text-slate-500">
                    Equipment / Task
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {maintenanceData.equipment}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {maintenanceData.task}
                  </p>

                </div>

                {/* Status + Date */}
                <div className="grid grid-cols-2 gap-4">

                  <div className="rounded-lg bg-slate-50 p-4">

                    <p className="text-xs text-slate-500">
                      Current Status
                    </p>

                    <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {maintenanceData.status}
                    </span>

                  </div>

                  <div className="rounded-lg bg-slate-50 p-4">

                    <p className="text-xs text-slate-500">
                      Scheduled Date
                    </p>

                    <p className="mt-2 font-semibold text-slate-700">
                      {maintenanceData.scheduled}
                    </p>

                    <p className="text-xs text-slate-500">
                      {maintenanceData.time}
                    </p>

                  </div>

                </div>

                {/* Update Status */}
                <div>

                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Update Status
                  </label>

                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                    value={maintenanceData.status}
                    onChange={(e) =>
                      setMaintenanceData({
                        ...maintenanceData,
                        status: e.target.value,
                      })
                    }
                  >

                    <option>
                      Scheduled
                    </option>

                    <option>
                      In Progress
                    </option>

                    <option>
                      Completed
                    </option>

                    <option>
                      Maintenance (offline)
                    </option>

                  </select>

                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-2">

                  <button
                    onClick={closeModal}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => {
                      alert(
                        `${maintenanceData.equipment} status updated to ${maintenanceData.status}`
                      );

                      closeModal();
                    }}
                    className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                  >
                    <Save size={16} />
                    Update Status
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

    </>
  );
}

// ======================================================
// Tank Battery
// ======================================================

function TankBattery({
  pump,
  pct,
  status,
}) {
  const isHigh = status === "High";

  const theme = isHigh
    ? {
        pill:
          "bg-emerald-50 text-emerald-600",
        from: "#34d399",
        to: "#059669",
      }
    : {
        pill:
          "bg-rose-50 text-rose-500",
        from: "#fb7185",
        to: "#e11d48",
      };

  return (
    <div className="flex flex-col items-center gap-1.5">

      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${theme.pill}`}
      >
        {status}
      </span>

      {/* Battery Cap */}
      <div className="h-1 w-4 rounded-t-sm bg-slate-300" />

      {/* Battery Body */}
      <div className="relative h-24 w-14 overflow-hidden rounded-md border-2 border-slate-200 bg-slate-50">

        <div
          className="absolute bottom-0 left-0 w-full rounded-b-sm transition-all duration-500"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(180deg, ${theme.from}, ${theme.to})`,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center">

          <span
            className="text-[10px] font-bold drop-shadow-sm"
            style={{
              color:
                pct > 45
                  ? "#ffffff"
                  : "#334155",
            }}
          >
            {pct}%
          </span>

        </div>

      </div>

      <div className="text-[11px] font-medium text-slate-600">
        {pump}
      </div>

    </div>
  );
}