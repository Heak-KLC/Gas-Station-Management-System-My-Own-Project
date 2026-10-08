import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Panel, StatusBadge } from "../components/ui";
import { X, Save, Eye } from "lucide-react";
import pumpA from "../image/pump.png";
import pumpB from "../image/pump.png";
import pumpC from "../image/pump.png";
import pumpD from "../image/pump.png";

const initialPumps = [
  { id: "A", status: "Ready/Active", vol: "0,000L", image: pumpA },
  { id: "B", status: "Ready/Active", vol: "5,000L", image: pumpB },
  { id: "C", status: "Ready/Active", vol: "0,000L", image: pumpC },
  { id: "D", status: "Ready/Active", vol: "0,000L", image: pumpD },
];

const stockByTank = [
  { tank: "Tank A", fuel: "Regular", current: 15000, capacity: 20000, dark: "#2563eb", light: "#93c5fd" },
  { tank: "Tank B", fuel: "Premium", current: 8000, capacity: 12000, dark: "#f59e0b", light: "#fcd34d" },
  { tank: "Tank C", fuel: "Diesel", current: 12000, capacity: 12000, dark: "#475569", light: "#94a3b8" },
];

const priceHistory = [
  { month: "Jan", cost: 1.15, sell: 1.3, profit: 0.6 },
  { month: "Feb", cost: 1.2, sell: 1.45, profit: 0.65 },
  { month: "Mar", cost: 1.25, sell: 1.5, profit: 0.6 },
  { month: "Apr", cost: 1.3, sell: 1.55, profit: 0.65 },
  { month: "May", cost: 1.45, sell: 1.6, profit: 0.75 },
  { month: "Jun", cost: 1.5, sell: 1.62, profit: 0.7 },
  { month: "Jul", cost: 1.68, sell: 1.72, profit: 0.85 },
  { month: "Aug", cost: 1.55, sell: 1.68, profit: 0.75 },
  { month: "Sep", cost: 1.6, sell: 1.7, profit: 0.78 },
];

const initialInventoryRows = [
  { id: 1, tank: "Tank A", fuel: "Regular", source: "PTT-R1", lastAudit: "14800", meter: "5500200", nozzle: "A1,A2", cost: "1.20", price: "1.50", status: "Sufficient" },
  { id: 2, tank: "Tank A", fuel: "Premium", source: "PTT-R1", lastAudit: "14800", meter: "5500200", nozzle: "A1,A2", cost: "1.30", price: "1.60", status: "Sufficient" },
  { id: 3, tank: "Tank B", fuel: "Premium", source: "PTT-R1", lastAudit: "15000", meter: "5500200", nozzle: "A1,A2", cost: "1.50", price: "1.52", status: "Critical Low" },
  { id: 4, tank: "Tank B", fuel: "Diesel", source: "PTT-R1", lastAudit: "15000", meter: "5500200", nozzle: "A1,A2", cost: "1.50", price: "1.99", status: "Sufficient" },
  { id: 5, tank: "Tank C", fuel: "LPG", source: "PTT-R1", lastAudit: "10000", meter: "5500200", nozzle: "A1,A2", cost: "1.50", price: "1.99", status: "Critical Low" },
  { id: 6, tank: "Tank D", fuel: "LPG", source: "PTT-R1", lastAudit: "14800", meter: "5500200", nozzle: "A1,A2", cost: "1.50", price: "1.99", status: "Check Status" },
];

const recentActions = [
  { label: "Refill: Tank A, 5,000L Super" },
  { label: "Price Update: Regular 1.50 → 1.52" },
  { label: "Pump A1 Calibrated" },
  { label: "Stock Adjustment: Tank C -50L (Evap)" },
  { label: "Tank B Low Stock Alert" },
];

const dailySalesByType = [
  { name: "Diesel", value: 45, color: "#0ea5e9" },
  { name: "Regular", value: 55, color: "#f59e0b" },
];

function DotLegend({ items }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function litersLabel(value) {
  return `${value.toLocaleString()}L`;
}

export default function FuelManagement() {
  const [inventoryRows, setInventoryRows] = useState(initialInventoryRows);
  const [modal, setModal] = useState(null); // "edit" | "view" | null
  const [selectedFuel, setSelectedFuel] = useState(null);

  const [editFuel, setEditFuel] = useState({
    tankFuel: "",
    source: "",
    lastAudit: "",
    meterReading: "",
    costPrice: "",
    sellingPrice: "",
    status: "Sufficient",
  });

  const handleOpenEdit = (row) => {
    setSelectedFuel(row);
    setEditFuel({
      tankFuel: `${row.tank} · ${row.fuel}`,
      source: row.source,
      lastAudit: row.lastAudit,
      meterReading: row.meter,
      costPrice: row.cost,
      sellingPrice: row.price,
      status: row.status,
    });
    setModal("edit");
  };

  const handleOpenView = (row) => {
    setSelectedFuel(row);
    setModal("view");
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const [tank, fuel] = editFuel.tankFuel.split("·").map((s) => s.trim());

    setInventoryRows(
      inventoryRows.map((r) =>
        r.id === selectedFuel.id
          ? {
              ...r,
              tank: tank || r.tank,
              fuel: fuel || r.fuel,
              source: editFuel.source,
              lastAudit: editFuel.lastAudit,
              meter: editFuel.meterReading,
              cost: editFuel.costPrice,
              price: editFuel.sellingPrice,
              status: editFuel.status,
            }
          : r
      )
    );

    alert(`Successfully updated information for ${editFuel.tankFuel}!`);
    setModal(null);
  };

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      <div className="grid grid-cols-3 gap-4">
        {/* Active pumps */}
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">Active Pumps (Liters Dispensed)</h3>
          <div className="grid grid-cols-2 gap-3">
            {initialPumps.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-200 p-3">
                <div className="relative shrink-0">
                  <img src={p.image} alt={`Pump ${p.id}`} className="h-15 w-11 object-contain" />
                  <span className="absolute -bottom-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white">
                    {p.id}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">{p.id}</div>
                  <div className="text-xs font-semibold text-emerald-600">{p.status}</div>
                  <div className="text-sm font-medium text-slate-600">{p.vol}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Live stock volumes by tank */}
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">Live Stock Volumes (By Tank)</h3>
          <DotLegend items={stockByTank.map((t) => ({ label: t.fuel, color: t.dark }))} />
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stockByTank} margin={{ top: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="tank" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => litersLabel(value)} />
              <Bar dataKey="current" radius={[3, 3, 0, 0]} barSize={22}>
                {stockByTank.map((t) => (
                  <Cell key={`current-${t.tank}`} fill={t.dark} />
                ))}
                <LabelList dataKey="current" position="top" formatter={litersLabel} style={{ fontSize: 10, fill: "#475569" }} />
              </Bar>
              <Bar dataKey="capacity" radius={[3, 3, 0, 0]} barSize={22}>
                {stockByTank.map((t) => (
                  <Cell key={`capacity-${t.tank}`} fill={t.light} />
                ))}
                <LabelList dataKey="capacity" position="top" formatter={litersLabel} style={{ fontSize: 10, fill: "#475569" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Fuel price performance */}
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">Fuel Price Performance</h3>
          <p className="mb-2 text-xs text-slate-400">(expanded price section)</p>
          <DotLegend
            items={[
              { label: "Avg. Cost Price", color: "#2563eb" },
              { label: "Selling Price", color: "#f59e0b" },
              { label: "Profit Margin", color: "#64748b" },
            ]}
          />
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="cost" name="Avg. Cost Price" stroke="#2563eb" fill="#2563eb20" strokeWidth={2} />
              <Area type="monotone" dataKey="sell" name="Selling Price" stroke="#f59e0b" fill="#f59e0b20" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" name="Profit Margin" stroke="#64748b" fill="#64748b15" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Inventory table */}
        <Panel title="" className="col-span-2">
          <h3 className="mb-4 text-xl font-bold text-slate-800">Inventory Management Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="text-black text-lg">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Tank / Fuel</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Last Audit (L)</th>
                  <th className="pb-2 font-medium">Meter Reading</th>
                  <th className="pb-2 font-medium">Cost/Price</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200">
                    <td className="py-2 text-slate-500">{r.id}</td>
                    <td className="py-2 font-medium text-black">
                      {r.tank} · {r.fuel}
                    </td>
                    <td className="py-2 text-black">{r.source}</td>
                    <td className="py-2 text-black">{r.lastAudit}</td>
                    <td className="py-2 text-black">
                      {r.meter} <span className="text-black">({r.nozzle})</span>
                    </td>
                    <td className="py-2 text-black">
                      ${r.cost} / ${r.price}
                    </td>
                    <td className="py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2">
                      <button onClick={() => handleOpenView(r)} className="mr-2 text-cyan-600 hover:underline">
                        View
                      </button>
                      <button onClick={() => handleOpenEdit(r)} className="text-fuchsia-500 hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-4">
          {/* Recent actions */}
          <Panel>
            <h3 className="mb-4 text-xl font-bold text-slate-800">Recent Actions & Reconciliation</h3>
            <ul className="space-y-2">
              {recentActions.map((a, i) => (
                <li key={i} className="rounded-lg bg-slate-200 p-2 text-xs text-black">
                  {a.label}
                </li>
              ))}
            </ul>
          </Panel>

          {/* Total daily sales */}
          <Panel>
            <h3 className="mb-4 text-xl font-bold text-slate-800">Total Daily Sales</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col gap-1 text-xs text-slate-500">
                {dailySalesByType.map((s) => (
                  <span key={s.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name} ({s.value}%)
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* Edit Modal */}
      {modal === "edit" && selectedFuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Edit Fuel Information</h2>
                <p className="text-sm text-slate-500">Update fuel management information</p>
              </div>
              <button onClick={() => setModal(null)} className="rounded-full p-2 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tank / Fuel</label>
                  <input
                    type="text"
                    value={editFuel.tankFuel}
                    onChange={(e) => setEditFuel({ ...editFuel, tankFuel: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Source</label>
                  <input
                    type="text"
                    value={editFuel.source}
                    onChange={(e) => setEditFuel({ ...editFuel, source: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Last Audit (L)</label>
                  <input
                    type="text"
                    value={editFuel.lastAudit}
                    onChange={(e) => setEditFuel({ ...editFuel, lastAudit: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Meter Reading</label>
                  <input
                    type="text"
                    value={editFuel.meterReading}
                    onChange={(e) => setEditFuel({ ...editFuel, meterReading: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFuel.costPrice}
                    onChange={(e) => setEditFuel({ ...editFuel, costPrice: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFuel.sellingPrice}
                    onChange={(e) => setEditFuel({ ...editFuel, sellingPrice: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editFuel.status}
                  onChange={(e) => setEditFuel({ ...editFuel, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
                >
                  <option value="Sufficient">Sufficient</option>
                  <option value="Critical Low">Critical Low</option>
                  <option value="Check Status">Check Status</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-lg border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                >
                  <Save size={15} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === "view" && selectedFuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">View Fuel Details</h2>
                <p className="text-sm text-slate-500">Information for ID: {selectedFuel.id}</p>
              </div>
              <button onClick={() => setModal(null)} className="rounded-full p-2 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6 text-sm text-slate-700">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">Tank / Fuel:</span>
                <span>{selectedFuel.tank} - {selectedFuel.fuel}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">Source:</span>
                <span>{selectedFuel.source}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">Last Audit (L):</span>
                <span>{selectedFuel.lastAudit} L</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">Meter Reading:</span>
                <span>{selectedFuel.meter} ({selectedFuel.nozzle})</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">Cost / Selling Price:</span>
                <span>${selectedFuel.cost} / ${selectedFuel.price}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="font-semibold">Status:</span>
                <StatusBadge status={selectedFuel.status} />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-lg bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}