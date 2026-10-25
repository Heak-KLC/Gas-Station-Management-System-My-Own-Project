import React, { useCallback, useEffect, useState } from "react";
import {
  Save,
  Gauge,
  RefreshCw,
  LoaderCircle,
  AlertTriangle,
  X,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

const getToken = () =>
  sessionStorage.getItem("gas_station_token");

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        result.message ||
        `Request failed (${response.status}).`
    );
  }

  return result;
}

function formatNumber(value, decimals = 3) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0.000";

  return number.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
  });
}

function getPumpStatus(status) {
  return String(status || "").toLowerCase().replaceAll(" ", "_");
}

function isPumpUnavailable(pump) {
  return ["under_maintenance", "out_of_service"].includes(
    getPumpStatus(pump.status)
  );
}

function mapPump(pump) {
  return {
    id: pump.pump_id,
    pumpNumber: pump.pump_number || `Pump ${pump.pump_id}`,
    fuelType:
      pump.fuel_type?.name ||
      pump.fuel_type?.fuel_name ||
      pump.fuelType?.name ||
      pump.fuelType?.fuel_name ||
      pump.fuelType?.fuel_type ||
      `Fuel ID ${pump.fuel_id}`,
    fuelId: Number(pump.fuel_id),
    status: getPumpStatus(pump.status),
    prev: Number(pump.meter_reading ?? 0),
    raw: pump,
  };
}

function mapSale(sale) {
  return {
    id: sale.sale_id,
    saleNumber: sale.sale_number || `SALE-${sale.sale_id}`,
    pump:
      sale.pump?.pump_number ||
      (sale.pump_id ? `Pump ${sale.pump_id}` : "—"),
    fuel:
      sale.fuelType?.name ||
      sale.fuelType?.fuel_name ||
      sale.fuelType?.fuel_type ||
      `Fuel ID ${sale.fuel_id}`,
    liters: Number(sale.quantity ?? 0),
    amount: Number(sale.total_amount ?? 0),
    time: sale.sale_date,
    attendant:
  sale.soldBy?.full_name ||
  sale.sold_by?.full_name ||
  sale.seller?.full_name ||
  sale.attendant?.full_name ||
  sale.sold_by_name ||
  "—",
    status: sale.payment_status || "Recorded",
  };
}

export default function MeterInput() {
  const [pumps, setPumps] = useState([]);
  const [newMeters, setNewMeters] = useState({});
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const [activeModalPump, setActiveModalPump] = useState(null);
  const [modalMeterInput, setModalMeterInput] = useState("");

  const triggerToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [pumpResult, salesResult] = await Promise.all([
        apiRequest("/fuel-pumps"),
        apiRequest("/fuel-sales"),
      ]);

      const pumpData = Array.isArray(pumpResult)
        ? pumpResult
        : Array.isArray(pumpResult.data)
        ? pumpResult.data
        : [];

      const salesData = Array.isArray(salesResult)
        ? salesResult
        : Array.isArray(salesResult.data)
        ? salesResult.data
        : [];

      setPumps(pumpData.map(mapPump));

      setLogs(
        salesData
          .map(mapSale)
          .sort(
            (a, b) =>
              new Date(b.time || 0).getTime() -
              new Date(a.time || 0).getTime()
          )
          .slice(0, 9)
      );
    } catch (err) {
      console.error("Failed to load meter input data:", err);
      setError(err.message || "Failed to load pump and sales data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAutoCalcLiters = (pump) => {
    const value = newMeters[pump.id];

    if (value === undefined || value === "") return "";

    const reading = Number(value);

    if (!Number.isFinite(reading)) return "";

    return (reading - pump.prev).toFixed(3);
  };

  const isInvalid = (pump) => {
    const value = newMeters[pump.id];

    return (
      value !== undefined &&
      value !== "" &&
      (!Number.isFinite(Number(value)) ||
        Number(value) < pump.prev)
    );
  };

  const saveMeter = async (pump, inputValue) => {
    const value = Number(inputValue);

    if (!inputValue || !Number.isFinite(value) || value < 0) {
      throw new Error("Please enter a valid meter reading.");
    }

    if (value < pump.prev) {
      throw new Error(
        "The new meter reading cannot be lower than the previous reading."
      );
    }

    if (isPumpUnavailable(pump)) {
      throw new Error("This pump is unavailable for meter input.");
    }

    const raw = pump.raw;

    // Keep all fields required by the existing pump update endpoint.
    const payload = {
      pump_number: raw.pump_number,
      fuel_id: raw.fuel_id,
      status: raw.status,
      model: raw.model ?? null,
      serial_number: raw.serial_number ?? null,
      installation_date: raw.installation_date ?? null,
      last_maintenance_date: raw.last_maintenance_date ?? null,
      next_maintenance_date: raw.next_maintenance_date ?? null,
      meter_reading: value,
    };

    await apiRequest(`/fuel-pumps/${pump.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  };

  const handleSaveAll = async () => {
    if (saving) return;

    const pending = pumps.filter(
      (pump) =>
        !isPumpUnavailable(pump) &&
        newMeters[pump.id] !== undefined &&
        newMeters[pump.id] !== ""
    );

    if (pending.length === 0) {
      triggerToast("Please enter at least one new meter reading.");
      return;
    }

    const invalidPump = pending.find(isInvalid);

    if (invalidPump) {
      triggerToast(
        `${invalidPump.pumpNumber}: the new reading must be greater than or equal to the previous reading.`
      );
      return;
    }

    setSaving(true);
    setError("");

    const savedIds = [];
    const failed = [];

    // Save individually so one failed request does not hide other results.
    for (const pump of pending) {
      try {
        await saveMeter(pump, newMeters[pump.id]);
        savedIds.push(pump.id);
      } catch (err) {
        failed.push(`${pump.pumpNumber}: ${err.message}`);
      }
    }

    try {
      await loadData();
    } catch {
      // loadData displays its own error message.
    }

    setNewMeters((previous) => {
      const remaining = { ...previous };

      savedIds.forEach((id) => {
        delete remaining[id];
      });

      return remaining;
    });

    setSaving(false);

    if (failed.length > 0) {
      setError(
        `Some readings could not be saved:\n${failed.join("\n")}`
      );

      if (savedIds.length > 0) {
        triggerToast(
          `Saved ${savedIds.length} reading(s). Some readings failed.`
        );
      }
    } else {
      triggerToast(`Successfully saved ${savedIds.length} meter reading(s).`);
    }
  };

  const handleOpenSingleModal = (pump) => {
    if (isPumpUnavailable(pump) || saving) return;

    setActiveModalPump(pump);
    setModalMeterInput(
      newMeters[pump.id] !== undefined
        ? newMeters[pump.id]
        : ""
    );
  };

  const handleSaveSingleModal = async (event) => {
    event.preventDefault();

    if (!activeModalPump || saving) return;

    try {
      setSaving(true);
      setError("");

      await saveMeter(activeModalPump, modalMeterInput);

      const savedId = activeModalPump.id;

      setActiveModalPump(null);
      setModalMeterInput("");

      setNewMeters((previous) => {
        const next = { ...previous };
        delete next[savedId];
        return next;
      });

      await loadData();
      triggerToast("Meter reading saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save meter reading.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-200 p-6 font-sans text-slate-800">
      {toastMessage && (
        <div
          role="status"
          className="fixed right-5 top-5 z-50 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl"
        >
          {toastMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Active Shift & Bulk Meter Entry Form
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pump readings are loaded from the database.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading || saving}
              className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={loading || saving || pumps.length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save All
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
            <LoaderCircle className="h-6 w-6 animate-spin" />
            <span className="font-semibold">Loading pump data...</span>
          </div>
        ) : pumps.length === 0 ? (
          <div className="py-10 text-center text-sm font-semibold text-slate-500">
            No pumps were returned by the API.
          </div>
        ) : (
          <div className="space-y-3">
            {pumps.map((pump) => {
              const unavailable = isPumpUnavailable(pump);
              const invalid = isInvalid(pump);
              const liters = getAutoCalcLiters(pump);

              return (
                <div
                  key={pump.id}
                  className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-12"
                >
                  <div className="md:col-span-3">
                    <p className="text-base font-black text-slate-900">
                      {pump.pumpNumber}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {pump.fuelType}
                    </p>
                    <p
                      className={`mt-1 text-xs font-bold ${
                        unavailable ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {pump.status.replaceAll("_", " ")}
                    </p>
                  </div>

                  <div className="md:col-span-3">
                    <div className="rounded-xl border border-sky-200 bg-sky-100/70 p-3 text-xs text-slate-700">
                      Previous Meter:
                      <span className="ml-1 font-extrabold text-slate-900">
                        {formatNumber(pump.prev)} L
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="number"
                      min={pump.prev}
                      step="0.001"
                      disabled={unavailable || saving}
                      placeholder={unavailable ? "Unavailable" : "New Reading"}
                      value={newMeters[pump.id] ?? ""}
                      onChange={(event) =>
                        setNewMeters((previous) => ({
                          ...previous,
                          [pump.id]: event.target.value,
                        }))
                      }
                      className={`w-full rounded-xl border bg-white p-2.5 text-sm font-bold focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-200 ${
                        invalid
                          ? "border-rose-500 focus:ring-rose-300"
                          : "border-slate-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>

                  <div className="flex min-h-10 items-center justify-center rounded-xl bg-slate-200/70 p-2.5 text-center text-xs font-bold md:col-span-2">
                    {unavailable ? (
                      <span className="text-rose-600">Unavailable</span>
                    ) : invalid ? (
                      <span className="text-rose-600">
                        Must be ≥ previous
                      </span>
                    ) : liters !== "" ? (
                      <span className="text-blue-700">
                        {formatNumber(liters)} L
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Dispensed Liters
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      disabled={unavailable || saving}
                      onClick={() => handleOpenSingleModal(pump)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Gauge className="h-4 w-4" />
                      Enter Reading
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="border-b pb-3">
          <h3 className="text-lg font-black text-slate-900">
            Fuel Dispense Log & Recent Sales
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Latest records returned by the Fuel Sales API.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-blue-600 text-sm font-bold text-white">
                <th className="rounded-l-xl p-3">Sale Number</th>
                <th className="p-3">Pump</th>
                <th className="p-3">Fuel Type</th>
                <th className="p-3">Liters</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Time</th>
                <th className="p-3">Attendant</th>
                <th className="rounded-r-xl p-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {!loading && logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center font-semibold text-slate-500"
                  >
                    No fuel sales were returned by the API.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-900">
                      {log.saleNumber}
                    </td>
                    <td className="p-3">{log.pump}</td>
                    <td className="p-3">{log.fuel}</td>
                    <td className="p-3 font-black text-blue-600">
                      {formatNumber(log.liters)} L
                    </td>
                    <td className="p-3 font-black text-slate-900">
                      {formatNumber(log.amount, 2)}
                    </td>
                    <td className="p-3 text-slate-500">
                      {formatDateTime(log.time)}
                    </td>
                    <td className="p-3">{log.attendant}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold text-slate-700">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {activeModalPump && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveSingleModal}
            className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-slate-900">
                Enter Meter Reading
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalPump(null)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-600">
              Pump:
              <span className="ml-1 font-extrabold text-slate-900">
                {activeModalPump.pumpNumber}
              </span>
            </p>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-600">
                Previous Meter Reading
              </label>
              <input
                readOnly
                value={`${formatNumber(activeModalPump.prev)} L`}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 p-3 font-bold text-slate-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                New Meter Reading
              </label>
              <input
                autoFocus
                required
                type="number"
                min={activeModalPump.prev}
                step="0.001"
                value={modalMeterInput}
                onChange={(event) => setModalMeterInput(event.target.value)}
                placeholder="Enter new meter reading"
                className="w-full rounded-xl border border-slate-300 p-3 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {modalMeterInput !== "" &&
                Number(modalMeterInput) >= activeModalPump.prev && (
                  <p className="mt-2 text-xs font-bold text-blue-700">
                    Dispensed:{" "}
                    {formatNumber(
                      Number(modalMeterInput) - activeModalPump.prev
                    )}{" "}
                    L
                  </p>
                )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setActiveModalPump(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Save Reading
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
