
import { useEffect, useState } from "react";
import {
  Fuel,
  Gauge,
  AlertTriangle,
  X,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

const PUMP_STATUS = {
  "Available Now": "bg-emerald-500",
  "In Use": "bg-blue-700",
  "Under Maintenance": "bg-yellow-600",
  "Out of Service": "bg-red-500",
};

const STATUS_TO_API = {
  "Available Now": "available",
  "In Use": "in_use",
  "Under Maintenance": "under_maintenance",
  "Out of Service": "out_of_service",
};

const API_TO_STATUS = {
  available: "Available Now",
  in_use: "In Use",
  under_maintenance: "Under Maintenance",
  out_of_service: "Out of Service",
};

const L = (value) =>
  `${Number(value || 0).toLocaleString("en-US")} L`;

const pct = (tank) =>
  tank.capacity > 0
    ? Math.round((tank.current / tank.capacity) * 100)
    : 0;

// =====================================================
// API HELPER
// =====================================================
async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem("gas_station_token");

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = data.errors
      ? Object.values(data.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        data.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

// =====================================================
// DATA MAPPING
// =====================================================
function getFuelName(item) {
  return (
    item?.fuelType?.fuel_name ??
    item?.fuelType?.name ??
    item?.fuel_type?.fuel_name ??
    item?.fuel_type?.name ??
    item?.fuel_name ??
    "Unknown Fuel"
  );
}

function mapTank(item) {
  return {
    dbId: item.tank_id,
    id: item.tank_number,
    fuel: getFuelName(item),
    capacity: Number(item.capacity ?? 0),
    current: Number(item.current_volume ?? 0),
    minVolume: Number(item.min_volume ?? 0),
    location: item.location ?? "—",
    online: String(item.status ?? "").toLowerCase() === "active",
    raw: item,
  };
}

function mapPump(item) {
  const rawStatus = String(item.status ?? "").toLowerCase();

  return {
    dbId: item.pump_id,
    id: item.pump_number,
    fuel: getFuelName(item),
    status: API_TO_STATUS[rawStatus] ?? "Out of Service",
    raw: item,
  };
}

function mapRefill(item) {
  const dateValue = item.refill_date
    ? new Date(item.refill_date)
    : null;

  const validDate =
    dateValue && !Number.isNaN(dateValue.getTime());

  const user = item.refilledBy ?? {};

  return {
    id: item.refill_id ?? item.id,
    tank:
      item.tank?.tank_number ??
      (item.tank_id != null
        ? `Tank ID ${item.tank_id}`
        : "—"),
    fuel: getFuelName(item),
    qty: Number(item.quantity ?? 0),
    date: validDate
      ? dateValue.toLocaleDateString("en-GB")
      : "—",
    by:
      user.name ??
      user.full_name ??
      user.username ??
      user.email ??
      "User",
  };
}

function tankState(tank) {
  if (!tank.online) {
    return {
      label: "Offline",
      dot: "bg-slate-400",
      bar: "bg-slate-400",
    };
  }

  const percentage = pct(tank);

  if (percentage < 15) {
    return {
      label: "Critical",
      dot: "bg-red-500",
      bar: "bg-red-500",
    };
  }

  if (percentage < 40) {
    return {
      label: "Low",
      dot: "bg-yellow-500",
      bar: "bg-yellow-500",
    };
  }

  return {
    label: "Normal",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  };
}

// =====================================================
// MODAL
// =====================================================
function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

const GreenBtn = ({
  children,
  className = "",
  ...props
}) => (
  <button
    {...props}
    className={`rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

function Bar({ value, color }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-full max-w-[170px] overflow-hidden rounded-sm bg-slate-200">
        <div
          className={`h-full ${color}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>

      <span className="text-xs text-slate-600">
        {value}%
      </span>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function FuelTanks() {
  const [tanks, setTanks] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [refills, setRefills] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [showAllRefills, setShowAllRefills] = useState(false);
  const [modal, setModal] = useState(null);

  const [form, setForm] = useState({
    tankId: "",
    qty: "",
    notes: "",
  });

  // ---------------------------------------------------
  // LOAD DATA FROM LARAVEL API
  // ---------------------------------------------------
  async function loadData(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    try {
      const [tankData, pumpData, refillData] =
        await Promise.all([
          apiRequest("/fuel-tanks"),
          apiRequest("/fuel-pumps"),
          apiRequest("/tank-refills"),
        ]);

      if (
        !Array.isArray(tankData) ||
        !Array.isArray(pumpData) ||
        !Array.isArray(refillData)
      ) {
        throw new Error(
          "Unexpected API response. Please check Laravel API."
        );
      }

      setTanks(tankData.map(mapTank));
      setPumps(pumpData.map(mapPump));
      setRefills(refillData.map(mapRefill));

      return true;
    } catch (err) {
      setError(
        err.message ||
          "Unable to load fuel monitoring data."
      );

      return false;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadData();

    // Do not create a toast timer or any other background
    // process here. Data loads when the component mounts.
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => {
      setToast("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  // ---------------------------------------------------
  // SUMMARY STATISTICS
  // ---------------------------------------------------
  const total = tanks.reduce(
    (sum, tank) => sum + tank.current,
    0
  );

  const activeTanks = tanks.filter(
    (tank) => tank.online
  ).length;

  const lowTanks = tanks.filter(
    (tank) => tank.online && pct(tank) < 40
  );

  const activePumps = pumps.filter(
    (pump) =>
      pump.status === "Available Now" ||
      pump.status === "In Use"
  ).length;

  // ---------------------------------------------------
  // MODAL HELPERS
  // ---------------------------------------------------
  const close = () => {
    if (saving) return;

    setModal(null);
    setError("");
  };

  const openRefill = (tankDbId = null) => {
    if (tanks.length === 0) {
      setError("No fuel tanks are available.");
      return;
    }

    setError("");

    setForm({
      tankId: String(
        tankDbId ?? tanks[0].dbId
      ),
      qty: "",
      notes: "",
    });

    setModal({ type: "refill" });
  };

  const selTank =
    modal?.type === "tank"
      ? tanks.find(
          (tank) => String(tank.dbId) === String(modal.id)
        )
      : null;

  const selPump =
    modal?.type === "pump"
      ? pumps.find(
          (pump) => String(pump.dbId) === String(modal.id)
        )
      : null;

  // ---------------------------------------------------
  // RECORD REFILL IN MYSQL
  // POST /api/tank-refills
  // ---------------------------------------------------
  async function submitRefill(event) {
    event.preventDefault();
    setError("");

    const tank = tanks.find(
      (item) =>
        String(item.dbId) === String(form.tankId)
    );

    const qty = Number(form.qty);

    if (!tank) {
      setError("Please select a valid fuel tank.");
      return;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }

    if (tank.current + qty > tank.capacity) {
      setError(
        `${tank.id} only has ${L(
          tank.capacity - tank.current
        )} of free space.`
      );
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest(
        "/tank-refills",
        {
          method: "POST",
          body: JSON.stringify({
            tank_id: Number(tank.dbId),
            quantity: qty,
            notes: form.notes.trim() || null,
          }),
        }
      );

      const refreshed = await loadData(false);

      if (!refreshed) {
        // The POST may have succeeded even if refreshing
        // the list failed. Do not submit the refill again.
        setModal(null);
        setToast(
          "Refill saved. Refresh the page to reload data."
        );
        return;
      }

      setModal(null);
      setToast(
        result.message || "Tank refilled successfully."
      );
    } catch (err) {
      setError(
        err.message || "Failed to save tank refill."
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------
  // UPDATE PUMP STATUS IN MYSQL
  // PUT /api/fuel-pumps/{id}
  // ---------------------------------------------------
  async function setPumpStatus(pump, status) {
    if (!pump?.dbId || !STATUS_TO_API[status]) {
      setError("Invalid pump or status.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const raw = pump.raw;

      await apiRequest(
        `/fuel-pumps/${pump.dbId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            pump_number: raw.pump_number,
            fuel_id: raw.fuel_id,
            status: STATUS_TO_API[status],
            model: raw.model ?? null,
            serial_number: raw.serial_number ?? null,
            installation_date:
              raw.installation_date ?? null,
            last_maintenance_date:
              raw.last_maintenance_date ?? null,
            next_maintenance_date:
              raw.next_maintenance_date ?? null,
            meter_reading: raw.meter_reading ?? 0,
          }),
        }
      );

      const refreshed = await loadData(false);

      if (refreshed) {
        setToast(`${pump.id}: ${status}`);
      } else {
        setToast(
          "Pump status saved. Refresh to reload data."
        );
      }
    } catch (err) {
      setError(
        err.message || "Failed to update pump status."
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------
  // KPI CARD
  // ---------------------------------------------------
  const stat = (label, value, note, icon) => (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold text-slate-600">
            {label}
          </p>
          <p className="mt-1 text-2xl text-slate-900 font-bold">
            {value}
          </p>
        </div>

        {icon}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        {note}
      </p>
    </div>
  );

  // ---------------------------------------------------
  // TANK ROW
  // ---------------------------------------------------
  const tankRow = (tank) => {
    const state = tankState(tank);

    return (
      <div
        key={tank.dbId}
        className="flex items-center gap-3 rounded-lg border p-3 text-sm"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {tank.id} · {tank.fuel}
          </p>

          <p className="text-xs text-slate-500">
            {L(tank.current)} / {L(tank.capacity)}
          </p>
        </div>

        <i
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${state.dot}`}
        />

        <span className="w-14 text-xs">
          {state.label}
        </span>

        <GreenBtn
          type="button"
          onClick={() =>
            setModal({
              type: "tank",
              id: tank.dbId,
            })
          }
        >
          Details
        </GreenBtn>
      </div>
    );
  };

  // ---------------------------------------------------
  // LOADING SCREEN
  // ---------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center bg-gray-300 p-6">
        <div className="flex items-center gap-3 rounded-xl bg-white p-5 shadow">
          <LoaderCircle
            size={24}
            className="animate-spin text-emerald-600"
          />

          <span className="text-sm font-medium text-slate-700">
            Loading fuel monitoring data...
          </span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------
  // MAIN UI
  // ---------------------------------------------------
  return (
    <div className="space-y-5 bg-slate-300 -m-6 p-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">
          Fuel Tank Monitoring
        </h2>

        <div className="flex gap-2">
          <GreenBtn
            type="button"
            onClick={() => loadData()}
            disabled={saving}
            className="flex items-center gap-1.5 py-2 text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </GreenBtn>

          <GreenBtn
            type="button"
            className="py-2 text-sm"
            onClick={() => setModal({ type: "tanks" })}
          >
            View Details
          </GreenBtn>
        </div>
      </div>

      {/* GLOBAL ERROR */}
      {error && !modal && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stat(
          "Total Fuel",
          L(total),
          "All in Tanks",
          <Fuel size={36} className="text-red-500" />
        )}

        {stat(
          "Active Tank",
          `${activeTanks} / ${tanks.length}` ,
          "Operational",
          <Gauge
            size={34}
            className="rounded-full bg-black p-1.5 text-white"
          />
        )}

        {stat(
          "Low Fuel",
          `${lowTanks.length} Tank${lowTanks.length === 1 ? "" : "s"}`,
          "Needs to Refill",
          <AlertTriangle
            size={34}
            className="text-red-500"
          />
        )}

        {stat(
          "Pump Status",
          `# ${activePumps} / ${pumps.length} Active`,
          "Available or In Use",
          <Fuel size={36} className="text-red-500" />
        )}
      </div>

      {/* TANK LEVELS AND PUMP STATUS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* FUEL TANKS */}
        <section>
          <div className="mb-3 flex items-center gap-4">
            <h3 className="text-lg font-bold text-slate-800">
              Fuel Tank Levels
            </h3>

            <GreenBtn
              type="button"
              onClick={() => setModal({ type: "tanks" })}
            >
              View Details
            </GreenBtn>
          </div>

          {tanks.length === 0 ? (
            <div className="rounded-xl bg-white p-6 text-sm text-slate-500">
              No fuel tanks found in the database.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tanks.map((tank) => {
                const state = tankState(tank);

                return (
                  <div
                    key={tank.dbId}
                    className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                  >
                    <p className="flex items-center gap-2 font-bold">
                      <Gauge
                        size={18}
                        className="rounded-full bg-black p-0.5 text-white"
                      />
                      {tank.id}
                    </p>

                    <p className="mt-1 text-xs">
                      {tank.fuel}
                    </p>

                    <p className="text-xs text-slate-600">
                      {L(tank.current)} / {L(tank.capacity)}
                    </p>

                    <div className="mt-1">
                      <Bar
                        value={pct(tank)}
                        color={state.bar}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs">
                        <i
                          className={`h-3 w-3 rounded-full ${state.dot}`}
                        />
                        {state.label}
                      </span>

                      <GreenBtn
                        type="button"
                        className="!px-2.5 !py-1 !text-[10px]"
                        onClick={() =>
                          setModal({
                            type: "tank",
                            id: tank.dbId,
                          })
                        }
                      >
                        View Details
                      </GreenBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PUMPS */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              Pump Status
            </h3>

            <GreenBtn
              type="button"
              onClick={() => setModal({ type: "pumps" })}
            >
              View All
            </GreenBtn>
          </div>

          {pumps.length === 0 ? (
            <div className="rounded-xl bg-white p-6 text-sm text-slate-500">
              No fuel pumps found in the database.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pumps.map((pump) => (
                <button
                  key={pump.dbId}
                  type="button"
                  onClick={() =>
                    setModal({
                      type: "pump",
                      id: pump.dbId,
                    })
                  }
                  className="rounded-xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md"
                >
                  <p className="text-xl font-bold">
                    {pump.id}
                  </p>

                  <p className="mb-2">
                    {pump.fuel}
                  </p>

                  <p className="flex items-center justify-center gap-2 text-sm">
                    <i
                      className={`h-3.5 w-3.5 rounded-full ${
                        PUMP_STATUS[pump.status] ??
                        "bg-slate-400"
                      }`}
                    />

                    {pump.status}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* REFILL HISTORY */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-800">
            Recently Tank Refills
          </h3>

          <div className="flex flex-wrap gap-2">
            <GreenBtn
              type="button"
              disabled={tanks.length === 0 || saving}
              onClick={() => openRefill()}
            >
              + Record Refill
            </GreenBtn>

            <GreenBtn
              type="button"
              onClick={() =>
                setShowAllRefills((value) => !value)
              }
            >
              {showAllRefills ? "Show Less" : "View All"}
            </GreenBtn>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-slate-500">
                {[
                  "TANK_ID",
                  "FUEL_NAME",
                  "QUANTITY",
                  "REFILL_DATE",
                  "REFILL_BY",
                ].map((heading) => (
                  <th key={heading} className="px-3 py-2">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {refills.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    No refill records found.
                  </td>
                </tr>
              ) : (
                (showAllRefills
                  ? refills
                  : refills.slice(0, 4)
                ).map((refill, index) => (
                  <tr
                    key={refill.id ?? `${refill.tank}-${index}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-2.5">
                      {refill.tank}
                    </td>

                    <td className="px-3 py-2.5">
                      {refill.fuel}
                    </td>

                    <td className="px-3 py-2.5">
                      {L(refill.qty)}
                    </td>

                    <td className="px-3 py-2.5">
                      {refill.date}
                    </td>

                    <td className="px-3 py-2.5">
                      {refill.by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ALL TANKS MODAL */}
      {modal?.type === "tanks" && (
        <Modal title="All Fuel Tanks" onClose={close}>
          <div className="space-y-2">
            {tanks.length ? (
              tanks.map(tankRow)
            ) : (
              <p className="text-sm text-slate-500">
                No fuel tanks available.
              </p>
            )}
          </div>

          <GreenBtn
            type="button"
            className="mt-4"
            disabled={!tanks.length || saving}
            onClick={() => openRefill()}
          >
            + Record Refill
          </GreenBtn>
        </Modal>
      )}

      {/* SINGLE TANK DETAILS */}
      {selTank && (() => {
        const state = tankState(selTank);

        return (
          <Modal
            title={`${selTank.id} · ${selTank.fuel}`}
            onClose={close}
          >
            <Bar
              value={pct(selTank)}
              color={state.bar}
            />

            <dl className="my-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Current</dt>
              <dd>{L(selTank.current)}</dd>

              <dt className="text-slate-500">Capacity</dt>
              <dd>{L(selTank.capacity)}</dd>

              <dt className="text-slate-500">Free space</dt>
              <dd>
                {L(
                  Math.max(
                    0,
                    selTank.capacity - selTank.current
                  )
                )}
              </dd>

              <dt className="text-slate-500">Minimum Level</dt>
              <dd>{L(selTank.minVolume)}</dd>

              <dt className="text-slate-500">Location</dt>
              <dd>{selTank.location}</dd>

              <dt className="text-slate-500">Status</dt>
              <dd className="flex items-center gap-2">
                <i
                  className={`h-2.5 w-2.5 rounded-full ${state.dot}`}
                />
                {state.label}
              </dd>
            </dl>

            <p className="mb-3 text-xs text-slate-500">
              Tank status is read from the database.
              Use the tank management screen to change it.
            </p>

            <GreenBtn
              type="button"
              disabled={saving || !selTank.online}
              onClick={() => openRefill(selTank.dbId)}
            >
              Record Refill
            </GreenBtn>
          </Modal>
        );
      })()}

      {/* ALL PUMPS MODAL */}
      {modal?.type === "pumps" && (
        <Modal title="All Pumps" onClose={close}>
          <div className="space-y-2">
            {pumps.length === 0 ? (
              <p className="text-sm text-slate-500">
                No pumps available.
              </p>
            ) : (
              pumps.map((pump) => (
                <div
                  key={pump.dbId}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <i
                    className={`h-3 w-3 rounded-full ${
                      PUMP_STATUS[pump.status] ??
                      "bg-slate-400"
                    }`}
                  />

                  <span className="min-w-0 flex-1 font-semibold">
                    {pump.id} · {pump.fuel}
                  </span>

                  <select
                    aria-label={`Status for ${pump.id}`}
                    value={pump.status}
                    disabled={saving}
                    onChange={(event) =>
                      setPumpStatus(
                        pump,
                        event.target.value
                      )
                    }
                    className="rounded border px-2 py-1 text-xs"
                  >
                    {Object.keys(PUMP_STATUS).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* SINGLE PUMP MODAL */}
      {selPump && (
        <Modal
          title={`${selPump.id} · ${selPump.fuel}`}
          onClose={close}
        >
          <p className="mb-3 text-sm text-slate-500">
            Change pump status
          </p>

          <div className="grid grid-cols-2 gap-2">
            {Object.keys(PUMP_STATUS).map((status) => (
              <button
                key={status}
                type="button"
                disabled={saving}
                onClick={() =>
                  setPumpStatus(selPump, status)
                }
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${
                  selPump.status === status
                    ? "border-emerald-500 bg-emerald-50 font-semibold"
                    : "hover:bg-slate-50"
                }`}
              >
                <i
                  className={`h-3 w-3 rounded-full ${PUMP_STATUS[status]}`}
                />

                {status}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* RECORD REFILL MODAL */}
      {modal?.type === "refill" && (
        <Modal
          title="Record Tank Refill"
          onClose={close}
        >
          <form
            onSubmit={submitRefill}
            className="space-y-3 text-sm"
          >
            <label className="block">
              Tank

              <select
                required
                value={form.tankId}
                disabled={saving}
                onChange={(event) =>
                  setForm({
                    ...form,
                    tankId: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                {tanks.map((tank) => (
                  <option
                    key={tank.dbId}
                    value={tank.dbId}
                    disabled={!tank.online}
                  >
                    {tank.id} · {tank.fuel} (
                    {L(
                      Math.max(
                        0,
                        tank.capacity - tank.current
                      )
                    )} free)
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              Quantity (L)

              <input
                type="number"
                min="0.001"
                step="any"
                required
                value={form.qty}
                disabled={saving}
                onChange={(event) =>
                  setForm({
                    ...form,
                    qty: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Enter quantity in liters"
              />
            </label>

            <label className="block">
              Notes (optional)

              <textarea
                rows={3}
                value={form.notes}
                disabled={saving}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Enter refill notes"
              />
            </label>

            {error && (
              <p role="alert" className="text-red-500">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="rounded-full border px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Cancel
              </button>

              <GreenBtn
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle
                      size={14}
                      className="animate-spin"
                    />
                    Saving...
                  </span>
                ) : (
                  "Save Refill"
                )}
              </GreenBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* TOAST */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
