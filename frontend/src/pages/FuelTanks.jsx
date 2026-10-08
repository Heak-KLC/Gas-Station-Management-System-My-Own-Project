import { useEffect, useState } from "react";
import { Plus, RefreshCcw, Eye, Pencil, Trash2, X } from "lucide-react";
import { Panel, StatusBadge } from "../components/ui";

import {
  getFuelTanks,
  createFuelTank,
  updateFuelTank,
  deleteFuelTank,
} from "../api/fuelTankApi";

// API functions for tank refill management.
import {
  getTankRefills,
  createTankRefill,
} from "../api/tankRefillApi";

// --------------------------------------------------
// Fuel type colors
// --------------------------------------------------
const FUEL_COLORS = {
  Diesel: "bg-indigo-50 text-indigo-600",
  Petrol92: "bg-cyan-50 text-cyan-600",
  Petrol95: "bg-emerald-50 text-emerald-600",
  LPG: "bg-orange-50 text-orange-600",
};

// --------------------------------------------------
// Status options
// --------------------------------------------------
const STATUS_OPTIONS = ["Active", "Critical Low", "Check Status"];

// --------------------------------------------------
// Tank Gauge Component
// --------------------------------------------------
function TankGauge({ id, pct }) {
  const tone =
    pct < 30
      ? "#f43f5e"
      : pct < 60
        ? "#f59e0b"
        : "#22c55e";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="mb-1 text-xs font-medium text-black">{id}</div>

      <div className="relative mx-auto h-16 w-10 overflow-hidden rounded-full border border-slate-200 bg-white">
        <div
          className="absolute bottom-0 left-0 w-full transition-all"
          style={{
            height: `${pct}%`,
            background: tone,
          }}
        />
      </div>

      <div className="mt-1 text-sm font-semibold text-slate-700">
        {pct}%
      </div>
    </div>
  );
}

// --------------------------------------------------
// Modal Component
// --------------------------------------------------
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {title}
          </h3>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

// --------------------------------------------------
// Empty Tank Form
// --------------------------------------------------
const EMPTY_TANK_FORM = {
  id: "",
  fuel: "Diesel",
  capacity: "",
  current: "",
  min: "",
  location: "",
};

// --------------------------------------------------
// Empty Refill Form
// --------------------------------------------------
const EMPTY_REFILL_FORM = {
  tankId: "",
  amount: "",
  supplier: "",
};

// =========================================================
// FORMAT TANK DATA
// =========================================================
// Laravel returns database field names such as:
// tank_number, current_volume, min_volume, etc.
//
// This function converts Laravel data into the format
// already used by our existing React UI.
function formatTankData(tank) {
  return {
    id: tank.tank_number,

    fuel: tank.fuel_type?.fuel_name || "Unknown",

    capacity: Number(tank.capacity).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    }),

    current: Number(tank.current_volume).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    }),

    min: Number(tank.min_volume).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    }),

    // Determine display status from the database values.
    status:
      tank.status === "maintenance"
        ? "Maintenance"
        : Number(tank.current_volume) <= Number(tank.min_volume)
          ? "Critical Low"
          : "Active",

    location: tank.location || "—",

    inspected: tank.last_inspection
      ? tank.last_inspection.slice(0, 10)
      : "—",

    // Keep database IDs for API operations.
    tankId: tank.tank_id,
    fuelId: tank.fuel_id,
  };
}

// =========================================================
// FUEL TANKS COMPONENT
// =========================================================
export default function FuelTanks() {
  // --------------------------------------------------
  // Fuel tank states
  // --------------------------------------------------
  const [inventoryRows, setInventoryRows] = useState([]);
  const [tankGauges, setTankGauges] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Fuel price states
  // --------------------------------------------------
  const [priceRows, setPriceRows] = useState([]);
  const [priceDraft, setPriceDraft] = useState([]);

  // --------------------------------------------------
  // Refill states
  // --------------------------------------------------
  // Refill history is loaded from Laravel/MySQL.
  const [refillsLog, setRefillsLog] = useState([]);

  // --------------------------------------------------
  // Add Tank states
  // --------------------------------------------------
  const [isAddTankOpen, setIsAddTankOpen] =
    useState(false);

  const [tankForm, setTankForm] =
    useState(EMPTY_TANK_FORM);

  // --------------------------------------------------
  // Update Price states
  // --------------------------------------------------
  const [isUpdatePriceOpen, setIsUpdatePriceOpen] =
    useState(false);

  // --------------------------------------------------
  // Status states
  // --------------------------------------------------
  const [statusEditRow, setStatusEditRow] =
    useState(null);

  // --------------------------------------------------
  // View / Edit / Delete states
  // --------------------------------------------------
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  // --------------------------------------------------
  // Refill modal states
  // --------------------------------------------------
  const [isRefillOpen, setIsRefillOpen] =
    useState(false);

  const [refillForm, setRefillForm] =
    useState(EMPTY_REFILL_FORM);

  // =========================================================
  // LOAD FUEL TANKS
  // =========================================================
  // Get tank data from Laravel API when this page opens.
  useEffect(() => {
    async function loadFuelTanks() {
      try {
        setLoading(true);
        setError("");

        // Use Axios API function.
        // Axios automatically attaches the Sanctum token.
        const data = await getFuelTanks();

        // Convert Laravel data into the format
        // already used by our existing table.
        const formattedData = data.map(formatTankData);

        setInventoryRows(formattedData);

        // Create data for tank level gauges.
        const gauges = data.map((tank) => ({
          id: tank.tank_number,

          pct:
            Number(tank.capacity) > 0
              ? Math.min(
                  100,
                  Math.round(
                    (Number(tank.current_volume) /
                      Number(tank.capacity)) *
                      100
                  )
                )
              : 0,
        }));

        setTankGauges(gauges);
      } catch (err) {
        console.error(
          "Load Fuel Tanks Error:",
          err
        );

        setError("Unable to load fuel tanks.");
      } finally {
        setLoading(false);
      }
    }

    loadFuelTanks();
  }, []);

  // =========================================================
  // LOAD REFILL HISTORY
  // =========================================================
  // Load saved refill records whenever this page opens.
  useEffect(() => {
    loadTankRefills();
  }, []);

  async function loadTankRefills() {
    try {
      const data = await getTankRefills();

      // Convert Laravel relationships into the existing table format.
      const formattedRefills = data.map((refill) => ({
        id: refill.refill_id,
        date: refill.refill_date
          ? new Date(refill.refill_date).toLocaleString()
          : "—",
        tank: refill.tank?.tank_number || "—",
        amount: `${Number(refill.quantity).toLocaleString()} L`,
        supplier: refill.source || "—",
      }));

      setRefillsLog(formattedRefills);
    } catch (error) {
      console.error("Load Tank Refills Error:", error);
    }
  }

  // =========================================================
  // LOAD FUEL PRICES
  // =========================================================
  useEffect(() => {
    loadFuelPrices();
  }, []);

  async function loadFuelPrices() {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/fuel-types",
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          "Fuel Price Error:",
          data
        );
        return;
      }

      const rows = data.map((item) => ({
        fuelId: item.fuel_id,
        fuel: item.fuel_name,
        price: `$${Number(item.selling_price).toFixed(2)}`,
      }));

      setPriceRows(rows);
      setPriceDraft(rows);
    } catch (error) {
      console.error(
        "Cannot load fuel prices:",
        error
      );
    }
  }

  // =========================================================
  // ADD NEW FUEL TANK
  // =========================================================
  async function handleAddTank(e) {
    e.preventDefault();

    if (!tankForm.id.trim()) {
      return;
    }

    try {
      // Convert Fuel Type name used by UI
      // into fuel_id required by MySQL.
      const fuelIdMap = {
        Diesel: 1,
        Petrol92: 2,
        Petrol95: 3,
        LPG: 4,
      };

      // Send new tank data to Laravel.
      const tank = await createFuelTank({
        tank_number: tankForm.id,

        fuel_id: fuelIdMap[tankForm.fuel],

        capacity:
          Number(
            String(tankForm.capacity).replace(/,/g, "")
          ) || 0,

        current_volume:
          Number(
            String(tankForm.current).replace(/,/g, "")
          ) || 0,

        min_volume:
          Number(
            String(tankForm.min).replace(/,/g, "")
          ) || 0,

        location:
          tankForm.location || "—",
      });

      // Convert Laravel response into existing UI format.
      const newRow = formatTankData(tank);

      // Add new tank to table immediately.
      setInventoryRows((rows) => [
        ...rows,
        newRow,
      ]);

      // Add new tank to gauge section.
      setTankGauges((gauges) => [
        ...gauges,
        {
          id: tank.tank_number,

          pct:
            Number(tank.capacity) > 0
              ? Math.min(
                  100,
                  Math.round(
                    (Number(tank.current_volume) /
                      Number(tank.capacity)) *
                      100
                  )
                )
              : 0,
        },
      ]);

      // Reset form and close modal.
      setTankForm(EMPTY_TANK_FORM);
      setIsAddTankOpen(false);

      alert("Tank added successfully!");
    } catch (error) {
      console.error(
        "Add Tank Error:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Failed to add tank.";

      alert(message);
    }
  }

  // =========================================================
  // OPEN UPDATE PRICE MODAL
  // =========================================================
  function openUpdatePrice() {
    setPriceDraft(priceRows);
    setIsUpdatePriceOpen(true);
  }

  // =========================================================
  // SAVE FUEL PRICES
  // =========================================================
  async function handleSavePrices(e) {
    e.preventDefault();

    try {
      const updatedPrices = await Promise.all(
        priceDraft.map(async (p) => {
          const numericPrice = Number(
            String(p.price)
              .replace("$", "")
              .replace(/,/g, "")
              .trim()
          );

          if (
            isNaN(numericPrice) ||
            numericPrice < 0
          ) {
            throw new Error(
              `Invalid price for ${p.fuel}`
            );
          }

          const response = await fetch(
            `http://127.0.0.1:8000/api/fuel-types/${p.fuelId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                selling_price: numericPrice,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            console.error(
              "Update price error:",
              data
            );

            throw new Error(
              data.message ||
                `Failed to update ${p.fuel}`
            );
          }

          return data;
        })
      );

      console.log(
        "Updated prices:",
        updatedPrices
      );

      // Reload prices from MySQL.
      await loadFuelPrices();

      setIsUpdatePriceOpen(false);

      alert(
        "Fuel prices updated successfully!"
      );
    } catch (error) {
      console.error(
        "Save price error:",
        error
      );

      alert(
        "Failed to save fuel prices. Please check Laravel."
      );
    }
  }

  // =========================================================
  // SAVE TANK STATUS
  // =========================================================
  // This currently changes only the React UI.
  // We will connect status to Laravel later.
  function handleSaveStatus(newStatus) {
    setInventoryRows((rows) =>
      rows.map((r) =>
        r.id === statusEditRow.id
          ? {
              ...r,
              status: newStatus,
            }
          : r
      )
    );

    setStatusEditRow(null);
  }

  // =========================================================
  // OPEN EDIT TANK
  // =========================================================
  function openEdit(row) {
    setEditRow(row);
    setEditDraft({ ...row });
  }

  // =========================================================
  // UPDATE FUEL TANK
  // =========================================================
  async function handleSaveEdit(e) {
    e.preventDefault();

    if (!editRow || !editDraft) {
      return;
    }

    try {
      // Convert fuel name to database fuel_id.
      const fuelIdMap = {
        Diesel: 1,
        Petrol92: 2,
        Petrol95: 3,
        LPG: 4,
      };

      // Send updated data to Laravel.
      const updatedTank = await updateFuelTank(
        editRow.tankId,
        {
          fuel_id:
            fuelIdMap[editDraft.fuel],

          capacity:
            Number(
              String(editDraft.capacity)
                .replace(/,/g, "")
            ) || 0,

          current_volume:
            Number(
              String(editDraft.current)
                .replace(/,/g, "")
            ) || 0,

          min_volume:
            Number(
              String(editDraft.min)
                .replace(/,/g, "")
            ) || 0,

          location: editDraft.location,
        }
      );

      // Convert Laravel response into existing UI format.
      const updatedRow =
        formatTankData(updatedTank);

      // Update table row.
      setInventoryRows((rows) =>
        rows.map((row) =>
          row.tankId === updatedRow.tankId
            ? updatedRow
            : row
        )
      );

      // Update gauge.
      setTankGauges((gauges) =>
        gauges.map((gauge) =>
          gauge.id ===
          updatedTank.tank_number
            ? {
                ...gauge,
                pct:
                  Number(
                    updatedTank.capacity
                  ) > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (Number(
                            updatedTank.current_volume
                          ) /
                            Number(
                              updatedTank.capacity
                            )) *
                            100
                        )
                      )
                    : 0,
              }
            : gauge
        )
      );

      // Close edit modal.
      setEditRow(null);
      setEditDraft(null);

      alert(
        "Tank updated successfully!"
      );
    } catch (error) {
      console.error(
        "Update Tank Error:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Failed to update tank.";

      alert(message);
    }
  }

  // =========================================================
  // DELETE FUEL TANK
  // =========================================================
  async function handleConfirmDelete() {
    if (!deleteRow) {
      return;
    }

    try {
      // Delete tank from Laravel/MySQL.
      await deleteFuelTank(
        deleteRow.tankId
      );

      // Remove tank from React table.
      setInventoryRows((rows) =>
        rows.filter(
          (row) =>
            row.tankId !==
            deleteRow.tankId
        )
      );

      // Remove tank from gauge section.
      setTankGauges((gauges) =>
        gauges.filter(
          (gauge) =>
            gauge.id !== deleteRow.id
        )
      );

      // Close confirmation modal.
      setDeleteRow(null);

      alert(
        "Tank deleted successfully!"
      );
    } catch (error) {
      console.error(
        "Delete Tank Error:",
        error
      );

      const message =
        error.response?.data?.message ||
        "Failed to delete tank.";

      alert(message);
    }
  }

  // =========================================================
  // OPEN REFILL MODAL
  // =========================================================
  function openRefill() {
    setRefillForm({
      tankId:
        inventoryRows[0]?.id ?? "",
      amount: "",
      supplier: "",
    });

    setIsRefillOpen(true);
  }

  // =========================================================
  // SAVE TANK REFILL
  // =========================================================
  async function handleSaveRefill(e) {
    e.preventDefault();

    try {
      // Check that a tank has been selected.
      if (!refillForm.tankId) {
        alert(
          "Please select a tank."
        );
        return;
      }

      // Check that refill quantity has been entered.
      if (
        !refillForm.amount ||
        !Number.isFinite(Number(refillForm.amount)) ||
        Number(refillForm.amount) <= 0
      ) {
        alert(
          "Please enter a valid refill quantity."
        );
        return;
      }

      // Find the selected tank from the current table.
      const selectedTank =
        inventoryRows.find(
          (tank) =>
            tank.id ===
            refillForm.tankId
        );

      if (!selectedTank) {
        alert(
          "Selected tank was not found."
        );
        return;
      }

      // Convert displayed current volume
      // back to a number.
      const currentVolume =
        Number(
          String(
            selectedTank.current
          ).replace(/,/g, "")
        );

      // Convert displayed capacity
      // back to a number.
      const capacity =
        Number(
          String(
            selectedTank.capacity
          ).replace(/,/g, "")
        );

      // Convert refill amount to number.
      const refillAmount =
        Number(refillForm.amount);

      // Check capacity before sending request.
      if (
        currentVolume +
          refillAmount >
        capacity
      ) {
        alert(
          `Refill exceeds tank capacity.\n\n` +
          `Current Volume: ${currentVolume.toLocaleString()} L\n` +
          `Refill: ${refillAmount.toLocaleString()} L\n` +
          `Capacity: ${capacity.toLocaleString()} L`
        );

        return;
      }

      // --------------------------------------------------
      // Send refill data to Laravel.
      // --------------------------------------------------
      // tank_id uses the real database primary key.
      // quantity is the amount of fuel being added.
      // source stores the supplier/source text.
      const response =
        await createTankRefill({
          tank_id:
            selectedTank.tankId,

          quantity:
            refillAmount,

          source:
            refillForm.supplier ||
            null,
        });

      // Laravel returns the updated tank.
      const updatedTank =
        response.tank;

      // Convert Laravel tank data
      // into our existing UI format.
      const updatedRow =
        formatTankData(
          updatedTank
        );

      // --------------------------------------------------
      // Update inventory table.
      // --------------------------------------------------
      setInventoryRows((prev) =>
        prev.map((tank) =>
          tank.tankId ===
          updatedRow.tankId
            ? updatedRow
            : tank
        )
      );

      // --------------------------------------------------
      // Calculate new tank level percentage.
      // --------------------------------------------------
      const percentage =
        Number(
          updatedTank.capacity
        ) > 0
          ? Math.min(
              100,
              (Number(
                updatedTank.current_volume
              ) /
                Number(
                  updatedTank.capacity
                )) *
                100
            )
          : 0;

      // --------------------------------------------------
      // Update tank gauge.
      // --------------------------------------------------
      // TankGauge uses "id" and "pct".
      setTankGauges((prev) =>
        prev.map((gauge) =>
          gauge.id ===
          updatedTank.tank_number
            ? {
                ...gauge,
                pct: Math.round(
                  percentage
                ),
              }
            : gauge
        )
      );

      // --------------------------------------------------
      // Add successful refill to local log.
      // --------------------------------------------------
      setRefillsLog((prev) => [
        {
          id:
            response.refill
              .refill_id,

          tank:
            updatedTank.tank_number,

          amount:
            `${refillAmount.toLocaleString()} L`,

          supplier:
            refillForm.supplier ||
            "—",

          date:
            new Date().toLocaleString(),
        },

        ...prev,
      ]);

      // Close refill modal.
      setIsRefillOpen(false);

      // Reset refill form.
      setRefillForm(
        EMPTY_REFILL_FORM
      );

      alert(
        "Tank refilled successfully."
      );
    } catch (error) {
      console.error(
        "Refill error:",
        error
      );

      // Laravel validation errors.
      if (
        error.response?.status ===
        422
      ) {
        alert(
          error.response?.data
            ?.message ||
            "Refill quantity is invalid."
        );

        return;
      }

      // Authentication error.
      if (
        error.response?.status ===
        401
      ) {
        alert(
          "Your session has expired. Please login again."
        );

        return;
      }

      // Other server/API errors.
      alert(
        "Failed to refill tank."
      );
    }
  }

  return (
    <div className="space-y-4 p-6 bg-gray-300">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-700">
          Complete Fuel Management &amp;
          Inventory Dashboard
        </h2>

        <div className="flex gap-2">

          {/* Add Tank */}
          <button
            onClick={() =>
              setIsAddTankOpen(true)
            }
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            <Plus size={15} />
            Add Tank
          </button>

          {/* Refill */}
          <button
            onClick={openRefill}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={15} />
            Refill
          </button>

        </div>
      </div>

      {/* =====================================================
          TOP THREE PANELS
      ====================================================== */}
      <div className="grid grid-cols-3 gap-4">

        {/* ===================================================
            LIVE FUEL LEVEL GAUGES
        ==================================================== */}
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Tank Levels
          </h3>

          <div className="grid grid-cols-4 gap-2">
            {tankGauges.map((t) => (
              <TankGauge
                key={t.id}
                {...t}
              />
            ))}
          </div>

          <div className="mt-3 text-sm text-slate-500">
            Live Stock: {inventoryRows.length} Tanks, Total Volume {inventoryRows
              .reduce((total, tank) => {
                const volume = Number(
                  String(tank.current).replace(/,/g, "")
                );
                return total + (Number.isFinite(volume) ? volume : 0);
              }, 0)
              .toLocaleString(undefined, { maximumFractionDigits: 2 })} L
          </div>
        </Panel>

        {/* ===================================================
            LIVE FUEL PRICE MANAGEMENT
        ==================================================== */}
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Live Fuel Price Management
          </h3>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-black">
                <th className="pb-2 font-medium">
                  Fuel
                </th>

                <th className="pb-2 font-medium">
                  Price
                </th>
              </tr>
            </thead>

            <tbody>
              {priceRows.map((p) => (
                <tr
                  key={p.fuel}
                  className="border-t border-slate-200"
                >
                  <td className="py-2 text-slate-600">
                    {p.fuel}
                  </td>

                  <td className="py-2 font-medium text-slate-800">
                    {p.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={openUpdatePrice}
            className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Update Price
          </button>
        </Panel>

        {/* ===================================================
            RECENT REFILLS LOG
        ==================================================== */}
        <Panel>
          <h3 className="mb-4 text-xl font-bold text-slate-800">
            Recent Refills Log
          </h3>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-black text-sm">
                <th className="pb-2 font-medium">
                  Date
                </th>

                <th className="pb-2 font-medium">
                  Tank
                </th>

                <th className="pb-2 font-medium">
                  Amount
                </th>

                <th className="pb-2 font-medium">
                  Supplier
                </th>
              </tr>
            </thead>

            <tbody>
              {refillsLog.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="py-4 text-center text-slate-400"
                  >
                    No refill history found.
                  </td>
                </tr>
              ) : (
                refillsLog.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-200"
                  >
                    <td className="py-2 text-black">
                      {r.date}
                    </td>

                    <td className="py-2 text-black">
                      {r.tank}
                    </td>

                    <td className="py-2 text-black">
                      {r.amount}
                    </td>

                    <td className="py-2 text-black">
                      {r.supplier || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* =====================================================
          COMPREHENSIVE INVENTORY TABLE
      ====================================================== */}
      <Panel>
        <h3 className="mb-4 text-xl font-bold text-slate-800">
          Comprehensive Fuel Inventory &amp;
          Pump Data
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">

            <thead>
              <tr className="border-b border-slate-300 bg-slate-200 text-black text-sm">

                <th className="px-3 py-2 font-medium">
                  Tank Number
                </th>

                <th className="px-3 py-2 font-medium">
                  Fuel Type
                </th>

                <th className="px-3 py-2 font-medium">
                  Capacity (L)
                </th>

                <th className="px-3 py-2 font-medium">
                  Current Volume (L)
                </th>

                <th className="px-3 py-2 font-medium">
                  Min Volume (L)
                </th>

                <th className="px-3 py-2 font-medium">
                  Status
                </th>

                <th className="px-3 py-2 font-medium">
                  Location
                </th>

                <th className="px-3 py-2 font-medium">
                  Last Inspection
                </th>

                <th className="px-3 py-2 font-medium">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    Loading fuel tanks...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-3 py-6 text-center text-rose-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : inventoryRows.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No fuel tanks found.
                  </td>
                </tr>
              ) : (
                inventoryRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-200"
                  >

                    {/* Tank Number */}
                    <td className="px-3 py-2 font-medium text-black">
                      {r.id}
                    </td>

                    {/* Fuel Type */}
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          FUEL_COLORS[r.fuel] ??
                          "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.fuel}
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="px-3 py-2 text-black">
                      {r.capacity}
                    </td>

                    {/* Current Volume */}
                    <td className="px-3 py-2 text-black">
                      {r.current}
                    </td>

                    {/* Minimum Volume */}
                    <td className="px-3 py-2 text-black">
                      {r.min}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() =>
                          setStatusEditRow(r)
                        }
                        className="cursor-pointer"
                      >
                        <StatusBadge
                          status={r.status}
                        />
                      </button>
                    </td>

                    {/* Location */}
                    <td className="px-3 py-2 text-black">
                      {r.location}
                    </td>

                    {/* Last Inspection */}
                    <td className="px-3 py-2 text-black">
                      {r.inspected}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="flex gap-2 text-black">

                        {/* View */}
                        <button
                          onClick={() =>
                            setViewRow(r)
                          }
                          className="cursor-pointer hover:text-cyan-600"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() =>
                            openEdit(r)
                          }
                          className="cursor-pointer hover:text-amber-500"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() =>
                            setDeleteRow(r)
                          }
                          className="cursor-pointer hover:text-rose-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI - still static for now */}
        <div className="mt-3 flex justify-center gap-1 text-xs text-slate-400">
          <span className="rounded bg-cyan-500 px-2 py-1 text-white cursor-pointer">
            1
          </span>

          <span className="rounded px-2 py-1 hover:bg-slate-200 cursor-pointer">
            2
          </span>

          <span className="rounded px-2 py-1 hover:bg-slate-200 cursor-pointer">
            3
          </span>
        </div>
      </Panel>

      {/* =====================================================
          ADD TANK MODAL
      ====================================================== */}
      {isAddTankOpen && (
        <Modal
          title="Add Tank"
          onClose={() =>
            setIsAddTankOpen(false)
          }
        >
          <form
            onSubmit={handleAddTank}
            className="space-y-3 text-sm"
          >

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Tank Number
              </label>

              <input
                required
                value={tankForm.id}
                onChange={(e) =>
                  setTankForm({
                    ...tankForm,
                    id: e.target.value,
                  })
                }
                placeholder="TK_009"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Fuel Type
              </label>

              <select
                value={tankForm.fuel}
                onChange={(e) =>
                  setTankForm({
                    ...tankForm,
                    fuel: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              >
                <option>Diesel</option>
                <option>Petrol92</option>
                <option>Petrol95</option>
                <option>LPG</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Capacity (L)
                </label>

                <input
                  value={tankForm.capacity}
                  onChange={(e) =>
                    setTankForm({
                      ...tankForm,
                      capacity:
                        e.target.value,
                    })
                  }
                  placeholder="20,000.00"
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Current (L)
                </label>

                <input
                  value={tankForm.current}
                  onChange={(e) =>
                    setTankForm({
                      ...tankForm,
                      current:
                        e.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Min (L)
                </label>

                <input
                  value={tankForm.min}
                  onChange={(e) =>
                    setTankForm({
                      ...tankForm,
                      min: e.target.value,
                    })
                  }
                  placeholder="2,000.00"
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-cyan-400"
                />
              </div>

            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Location
              </label>

              <input
                value={tankForm.location}
                onChange={(e) =>
                  setTankForm({
                    ...tankForm,
                    location:
                      e.target.value,
                  })
                }
                placeholder="Underground-Area A"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">

              <button
                type="button"
                onClick={() =>
                  setIsAddTankOpen(false)
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
              >
                Add Tank
              </button>

            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          UPDATE PRICE MODAL
      ====================================================== */}
      {isUpdatePriceOpen && (
        <Modal
          title="Update Fuel Prices"
          onClose={() =>
            setIsUpdatePriceOpen(false)
          }
        >
          <form
            onSubmit={handleSavePrices}
            className="space-y-3"
          >

            {priceDraft.map((p, i) => (
              <div
                key={p.fuel}
                className="flex items-center justify-between gap-3"
              >
                <label className="text-sm font-medium text-slate-600">
                  {p.fuel}
                </label>

                <input
                  value={p.price}
                  onChange={(e) => {
                    const next = [
                      ...priceDraft,
                    ];

                    next[i] = {
                      ...next[i],
                      price:
                        e.target.value,
                    };

                    setPriceDraft(next);
                  }}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-right text-sm outline-none focus:border-amber-400"
                />
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-3">

              <button
                type="button"
                onClick={() =>
                  setIsUpdatePriceOpen(false)
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Save Prices
              </button>

            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          CHANGE STATUS MODAL
      ====================================================== */}
      {statusEditRow && (
        <Modal
          title={`Update Status — ${statusEditRow.id}`}
          onClose={() =>
            setStatusEditRow(null)
          }
        >
          <div className="space-y-2">

            {STATUS_OPTIONS.map(
              (option) => (
                <button
                  key={option}
                  onClick={() =>
                    handleSaveStatus(
                      option
                    )
                  }
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    statusEditRow.status ===
                    option
                      ? "border-cyan-400 bg-cyan-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <StatusBadge
                    status={option}
                  />
                </button>
              )
            )}

          </div>
        </Modal>
      )}

      {/* =====================================================
          VIEW TANK MODAL
      ====================================================== */}
      {viewRow && (
        <Modal
          title={`Tank Details — ${viewRow.id}`}
          onClose={() =>
            setViewRow(null)
          }
        >
          <div className="space-y-2 text-sm">

            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-400">
                Fuel Type
              </span>

              <span className="font-medium text-slate-700">
                {viewRow.fuel}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-400">
                Capacity (L)
              </span>

              <span className="font-medium text-slate-700">
                {viewRow.capacity}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-400">
                Current Volume (L)
              </span>

              <span className="font-medium text-slate-700">
                {viewRow.current}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-400">
                Min Volume (L)
              </span>

              <span className="font-medium text-slate-700">
                {viewRow.min}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-400">
                Status
              </span>

              <StatusBadge
                status={viewRow.status}
              />
            </div>

            <div className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-400">
                Location
              </span>

              <span className="font-medium text-slate-700">
                {viewRow.location}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">
                Last Inspection
              </span>

              <span className="font-medium text-slate-700">
                {viewRow.inspected}
              </span>
            </div>

          </div>

          <div className="mt-4 flex justify-end">

            <button
              onClick={() =>
                setViewRow(null)
              }
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Close
            </button>

          </div>
        </Modal>
      )}

      {/* =====================================================
          EDIT TANK MODAL
      ====================================================== */}
      {editRow && editDraft && (
        <Modal
          title={`Edit Tank — ${editRow.id}`}
          onClose={() =>
            setEditRow(null)
          }
        >
          <form
            onSubmit={handleSaveEdit}
            className="space-y-3 text-sm"
          >

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Fuel Type
              </label>

              <select
                value={editDraft.fuel}
                onChange={(e) =>
                  setEditDraft({
                    ...editDraft,
                    fuel:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-amber-400"
              >
                <option>Diesel</option>
                <option>Petrol92</option>
                <option>Petrol95</option>
                <option>LPG</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Capacity (L)
                </label>

                <input
                  value={
                    editDraft.capacity
                  }
                  onChange={(e) =>
                    setEditDraft({
                      ...editDraft,
                      capacity:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Current (L)
                </label>

                <input
                  value={
                    editDraft.current
                  }
                  onChange={(e) =>
                    setEditDraft({
                      ...editDraft,
                      current:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Min (L)
                </label>

                <input
                  value={editDraft.min}
                  onChange={(e) =>
                    setEditDraft({
                      ...editDraft,
                      min:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-amber-400"
                />
              </div>

            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Location
              </label>

              <input
                value={
                  editDraft.location
                }
                onChange={(e) =>
                  setEditDraft({
                    ...editDraft,
                    location:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">

              <button
                type="button"
                onClick={() =>
                  setEditRow(null)
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Save Changes
              </button>

            </div>
          </form>
        </Modal>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ====================================================== */}
      {deleteRow && (
        <Modal
          title="Delete Tank"
          onClose={() =>
            setDeleteRow(null)
          }
        >
          <p className="text-sm text-slate-600">
            Are you sure you want to
            delete{" "}
            <span className="font-semibold">
              {deleteRow.id}
            </span>
            ? This can't be undone.
          </p>

          <div className="mt-4 flex justify-end gap-2">

            <button
              onClick={() =>
                setDeleteRow(null)
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={
                handleConfirmDelete
              }
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
            >
              Delete
            </button>

          </div>
        </Modal>
      )}

      {/* =====================================================
          REFILL MODAL
      ====================================================== */}
      {isRefillOpen && (
        <Modal
          title="Refill Tank"
          onClose={() =>
            setIsRefillOpen(false)
          }
        >
          <form
            onSubmit={
              handleSaveRefill
            }
            className="space-y-3 text-sm"
          >

            {/* Tank */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Tank
              </label>

              <select
                required
                value={
                  refillForm.tankId
                }
                onChange={(e) =>
                  setRefillForm({
                    ...refillForm,
                    tankId:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              >
                {inventoryRows.map(
                  (r) => (
                    <option
                      key={r.id}
                      value={r.id}
                    >
                      {r.id} ({r.fuel})
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Amount (L)
              </label>

              <input
                required
                type="number"
                min="0.001"
                step="0.001"
                value={
                  refillForm.amount
                }
                onChange={(e) =>
                  setRefillForm({
                    ...refillForm,
                    amount:
                      e.target.value,
                  })
                }
                placeholder="5000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Supplier
              </label>

              <input
                value={
                  refillForm.supplier
                }
                onChange={(e) =>
                  setRefillForm({
                    ...refillForm,
                    supplier:
                      e.target.value,
                  })
                }
                placeholder="Caltex"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">

              <button
                type="button"
                onClick={() =>
                  setIsRefillOpen(
                    false
                  )
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
              >
                Confirm Refill
              </button>

            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}