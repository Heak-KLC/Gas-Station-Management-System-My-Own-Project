import { useEffect, useMemo, useState } from "react";
import { Search, X, RefreshCw, LoaderCircle } from "lucide-react";

const API_URL = "https://gas-station-backend-ps9c.onrender.com/api";

const STATUS_STYLE = {
  Received: "bg-emerald-100 text-emerald-700",
  Delivered: "bg-sky-100 text-sky-700",
  Pending: "bg-amber-100 text-amber-700",
  Ordered: "bg-blue-100 text-blue-700",
  Canceled: "bg-red-100 text-red-600",
};

const DATE_FILTERS = ["All dates", "This month", "Last 30 days", "This year"];

const iso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmt = (s) => {
  if (!s) return "-";
  const date = String(s).slice(0, 10);
  const parts = date.split("-");
  return parts.length === 3 ? parts.reverse().join("/") : date;
};

const L = (n) => `${Number(n || 0).toLocaleString("en-US")} L`;

const usd = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const getArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const readJson = async (response) => {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationErrors = result?.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationErrors ||
        result?.message ||
        `Request failed (${response.status})`
    );
  }

  return result;
};

async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("gas_station_token");

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  return readJson(response);
}

const getSupplierName = (supplier) =>
  supplier?.supplier_name ??
  supplier?.name ??
  supplier?.company_name ??
  supplier?.supplier ??
  "Unknown supplier";

const getFuelName = (fuel) =>
  fuel?.fuel_name ??
  fuel?.name ??
  fuel?.fuel_type ??
  fuel?.type_name ??
  "Unknown fuel";

const getStatus = (status) => {
  const s = String(status || "pending").toLowerCase();

  if (s === "received") return "Received";
  if (s === "delivered") return "Delivered";
  if (s === "ordered") return "Ordered";
  if (s === "cancelled" || s === "canceled") return "Canceled";

  return "Pending";
};

const getStatusValue = (status) => {
  const values = {
    Pending: "pending",
    Ordered: "ordered",
    Delivered: "delivered",
    Received: "received",
    Canceled: "cancelled",
  };

  return values[status] || "pending";
};

const getOrderId = (order) => order?.purchase_order_id ?? order?.id;

function normalizeOrder(order) {
  const supplier = order.supplier;
  const fuel = order.fuelType ?? order.fuel_type ?? order.fuel;

  return {
    raw: order,
    id: String(order.po_number ?? getOrderId(order) ?? ""),
    dbId: getOrderId(order),
    supplierId: order.supplier_id ?? supplier?.supplier_id,
    fuelId: order.fuel_id ?? fuel?.fuel_id,
    supplier: typeof supplier === "string" ? supplier : getSupplierName(supplier),
    fuel: typeof fuel === "string" ? fuel : getFuelName(fuel),
    qty: Number(order.quantity ?? order.qty ?? 0),
    price: Number(order.unit_price ?? order.price ?? 0),
    orderDate: String(order.order_date ?? "").slice(0, 10),
    deliveryDate: order.delivery_date
      ? String(order.delivery_date).slice(0, 10)
      : null,
    receivedDate: order.received_date
      ? String(order.received_date).slice(0, 10)
      : null,
    total: Number(order.total_amount ?? order.total ?? 0),
    status: getStatus(order.status),
    notes: order.notes ?? "",
    receivedQty: Number(order.received_quantity ?? 0),
  };
}

function normalizeTank(tank) {
  const fuel = tank.fuelType ?? tank.fuel_type ?? tank.fuel;

  return {
    raw: tank,
    id: tank.tank_id ?? tank.id,
    name:
      tank.tank_number ??
      tank.tank_name ??
      tank.name ??
      `Tank_${String(tank.tank_id ?? tank.id).padStart(2, "0")}`,
    fuelId: tank.fuel_id ?? fuel?.fuel_id,
    fuel: typeof fuel === "string" ? fuel : getFuelName(fuel),
    current: Number(tank.current_volume ?? tank.current ?? 0),
    capacity: Number(tank.capacity ?? tank.tank_capacity ?? 0),
    status: String(tank.status ?? "active").toLowerCase(),
  };
}


function normalizeDelivery(refill) {
  const tank = refill.tank;
  const fuel = refill.fuelType ?? refill.fuel_type ?? refill.fuel;
  const order = refill.purchaseOrder ?? refill.purchase_order;
  const supplier =
    order?.supplier ??
    refill.supplier ??
    refill.purchaseOrder?.supplier;

  return {
    id: refill.refill_id ?? refill.id ?? "-",
    order:
      order?.po_number ??
      (refill.purchase_order_id
        ? `#${refill.purchase_order_id}`
        : "-"),
    supplier: getSupplierName(supplier),
    fuel: typeof fuel === "string" ? fuel : getFuelName(fuel),
    qty: Number(refill.quantity ?? 0),
    tank:
      tank?.tank_number ??
      tank?.tank_name ??
      tank?.name ??
      (refill.tank_id ? `Tank #${refill.tank_id}` : "-"),
    date: refill.refill_date ?? refill.created_at ?? null,
  };
}


function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
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

const GreenBtn = ({ children, className = "", ...p }) => (
  <button
    {...p}
    className={`rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
  >
    {children}
  </button>
);

const GhostBtn = ({ children, className = "", ...p }) => (
  <button
    {...p}
    className={`rounded-full border px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 ${className}`}
  >
    {children}
  </button>
);

const Badge = ({ s }) => (
  <span
    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      STATUS_STYLE[s] || STATUS_STYLE.Pending
    }`}
  >
    {s}
  </span>
);

const Field = ({ label, ...p }) => (
  <label className="block text-sm">
    {label}
    <input
      {...p}
      className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-sky-400"
    />
  </label>
);

const Sel = ({ label, options, ...p }) => (
  <label className="block text-sm">
    {label}
    <select
      {...p}
      className="mt-1 w-full rounded-lg border px-3 py-2"
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  </label>
);

export default function FuelPurchases() {
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [fuels, setFuels] = useState([]);

  const [q, setQ] = useState("");
  const [sup, setSup] = useState("All suppliers");
  const [st, setSt] = useState("All status");
  const [dt, setDt] = useState(DATE_FILTERS[0]);
  const [allDel, setAllDel] = useState(false);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    supplierId: "",
    fuelId: "",
    qty: "",
    price: "",
    expected: iso(),
  });
  const [recv, setRecv] = useState({ tankId: "", qty: "" });

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    setPageError("");

    try {
      const results = await Promise.all([
        apiRequest("/purchase-orders"),
        apiRequest("/fuel-tanks"),
        apiRequest("/tank-refills"),
        apiRequest("/suppliers"),
        apiRequest("/fuel-types"),
      ]);

      setOrders(getArray(results[0]).map(normalizeOrder));
      setTanks(getArray(results[1]).map(normalizeTank));
      setDeliveries(getArray(results[2]).map(normalizeDelivery));
      setSuppliers(getArray(results[3]));
      setFuels(getArray(results[4]));
    } catch (err) {
      setPageError(err.message || "Unable to load purchase data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const today = iso();
  const month = today.slice(0, 7);

  const inMonth = orders.filter((o) => o.orderDate.startsWith(month));

  const stats = {
    purchases: inMonth.filter((o) => o.status !== "Canceled").length,
    pending: orders.filter(
      (o) => o.status === "Pending" || o.status === "Ordered"
    ).length,
    received: inMonth
      .filter((o) => o.status === "Received")
      .reduce((sum, o) => sum + (o.receivedQty || o.qty), 0),
    cost: inMonth
      .filter((o) => o.status !== "Canceled")
      .reduce((sum, o) => sum + o.total, 0),
  };

  const rows = useMemo(() => {
    const search = q.trim().toLowerCase();

    return orders.filter((o) => {
      const searchable = [o.id, o.supplier, o.fuel]
        .some((v) => String(v ?? "").toLowerCase().includes(search));

      const days = (new Date(today) - new Date(o.orderDate)) / 86400000;

      const dateMatch =
        dt === "All dates" ||
        (dt === "This month" && o.orderDate.startsWith(month)) ||
        (dt === "Last 30 days" && days >= 0 && days <= 30) ||
        (dt === "This year" && o.orderDate.startsWith(today.slice(0, 4)));

      return (
        (!search || searchable) &&
        (sup === "All suppliers" || String(o.supplierId) === sup) &&
        (st === "All status" || o.status === st) &&
        dateMatch
      );
    });
  }, [orders, q, sup, st, dt, today, month]);

  const sel = modal?.id
    ? orders.find((o) => o.id === modal.id)
    : null;

  const close = () => {
    if (saving) return;
    setModal(null);
    setError("");
  };

  const supplierOptions = suppliers.map((s) => ({
    value: String(s.supplier_id ?? s.id),
    label: getSupplierName(s),
  }));

  const fuelOptions = fuels.map((f) => ({
    value: String(f.fuel_id ?? f.id),
    label: getFuelName(f),
  }));

  const openCreate = () => {
    setForm({
      supplierId: supplierOptions[0]?.value ?? "",
      fuelId: fuelOptions[0]?.value ?? "",
      qty: "",
      price: "",
      expected: today,
    });
    setError("");
    setModal({ type: "create" });
  };

  const updateOrder = async (order, status, extra = {}) => {
    const raw = order.raw;

    return apiRequest(`/purchase-orders/${order.dbId}`, {
      method: "PUT",
      body: JSON.stringify({
        po_number: raw.po_number ?? order.id,
        supplier_id: order.supplierId,
        fuel_id: order.fuelId,
        quantity: order.qty,
        unit_price: order.price,
        order_date: order.orderDate,
        delivery_date: extra.delivery_date ?? order.deliveryDate,
        received_date: extra.received_date ?? order.receivedDate,
        status: getStatusValue(status),
        approved_by: raw.approved_by ?? null,
        notes: raw.notes ?? null,
      }),
    });
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setError("");

    const qty = Number(form.qty);
    const price = Number(form.price);

    if (!form.supplierId) return setError("Please select a supplier.");
    if (!form.fuelId) return setError("Please select a fuel type.");
    if (!(qty > 0)) return setError("Enter a quantity greater than 0.");
    if (!(price > 0)) return setError("Enter a price per liter greater than 0.");
    if (!form.expected) return setError("Select an expected delivery date.");
    if (form.expected < today)
      return setError("Expected delivery cannot be in the past.");

    const selectedSupplier = suppliers.find(
      (s) => String(s.supplier_id ?? s.id) === form.supplierId
    );
    const selectedFuel = fuels.find(
      (f) => String(f.fuel_id ?? f.id) === form.fuelId
    );

    if (!selectedSupplier || !selectedFuel) {
      return setError("The selected supplier or fuel type is unavailable.");
    }

    setSaving(true);

    try {
      const year = today.slice(0, 4);

      const existingNumbers = orders
        .map((o) => {
          const match = o.id.match(/^PO-(\d{4})-(\d+)$/i);

          if (match && match[1] === year) {
            return Number(match[2]);
          }

          return 0;
        });

      const nextNumber = Math.max(0, ...existingNumbers) + 1;

      const poNumber = `PO-${year}-${String(nextNumber).padStart(3, "0")}`;

      await apiRequest("/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          po_number: poNumber,
          supplier_id: Number(form.supplierId),
          fuel_id: Number(form.fuelId),
          quantity: qty,
          unit_price: price,
          order_date: today,
          delivery_date: form.expected,
          status: "pending",
        }),
      });

      await loadData();
      setToast(`${poNumber} created successfully`);
      setModal(null);
    } catch (err) {
      setError(err.message || "Could not create purchase order.");
    } finally {
      setSaving(false);
    }
  };

  const markDelivered = async (order) => {
    setSaving(true);

    try {
      await updateOrder(order, "Delivered", {
        delivery_date: today,
      });
      await loadData();
      setToast(`${order.id} marked as delivered`);
    } catch (err) {
      setToast(err.message || "Could not update the order.");
    } finally {
      setSaving(false);
    }
  };

  const cancelOrder = async () => {
    if (!sel) return;

    setSaving(true);

    try {
      await updateOrder(sel, "Canceled");
      await loadData();
      setToast(`${sel.id} canceled`);
      setModal(null);
    } catch (err) {
      setError(err.message || "Could not cancel purchase order.");
    } finally {
      setSaving(false);
    }
  };

  
const openReceive = (order) => {
  const matchingTanks = tanks.filter(
    (tank) =>
      tank.status === "active" &&
      String(tank.fuelId) === String(order.fuelId) &&
      tank.capacity - tank.current >= order.qty
  );

  const availableTank = matchingTanks[0];

  setRecv({
    tankId: availableTank ? String(availableTank.id) : "",
    qty: availableTank ? String(order.qty) : "",
  });

  setError(
    availableTank
      ? ""
      : "No active tank of the correct fuel type has enough free capacity for the full order."
  );

  setModal({ type: "receive", id: order.id });
};


  
const submitReceive = async (e) => {
  e.preventDefault();

  if (!sel) return;

  setError("");

  const tank = tanks.find(
    (t) => String(t.id) === String(recv.tankId)
  );

  const qty = Number(recv.qty);
  const freeSpace = tank
    ? tank.capacity - tank.current
    : 0;

  if (!tank) {
    setError("Please select a valid tank.");
    return;
  }

  if (tank.status !== "active") {
    setError("The selected tank is not active.");
    return;
  }

  if (String(tank.fuelId) !== String(sel.fuelId)) {
    setError("The tank fuel type does not match the Purchase Order.");
    return;
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    setError("Enter a valid quantity greater than 0.");
    return;
  }

  // The current database schema does not support partial receipts.
  if (Math.abs(qty - sel.qty) > 0.0005) {
    setError(
      `The received quantity must equal the full order quantity: ${L(sel.qty)}.`
    );
    return;
  }

  if (qty > freeSpace + 0.0005) {
    setError(
      `${tank.name} only has ${L(freeSpace)} of free capacity.`
    );
    return;
  }

  if (sel.status !== "Delivered") {
    setError("Only delivered Purchase Orders can be received.");
    return;
  }

  setSaving(true);

  try {
    // Laravel handles the refill, tank volume and Purchase Order
    // status in one database transaction.
    await apiRequest("/tank-refills", {
      method: "POST",
      body: JSON.stringify({
        tank_id: Number(tank.id),
        quantity: qty,
        source: "Purchase Order",
        purchase_order_id: Number(sel.dbId),
        notes: `Received from purchase order ${sel.id}`,
      }),
    });

    // Refresh only after the server confirms success.
    await loadData();

    setToast(
      `${sel.id}: ${L(qty)} received into ${tank.name} successfully.`
    );

    setModal(null);
    setError("");
  } catch (err) {
    setError(
      err.message ||
        "Failed to receive fuel. Check the tank and Purchase Order, then try again."
    );
  } finally {
    setSaving(false);
  }
};


  const card = (title, value, note) => (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <p className="text-xl font-bold px-3 text-slate-600">{title}</p>
      <p className="px-7 mt-2 font-bold text-slate-900 text-2xl">{value}</p>
      <p className="px-7 mt-3 text-xs text-slate-500">{note}</p>
    </div>
  );

  const recvTank = tanks.find(
    (t) => String(t.id) === String(recv.tankId)
  );

  return (
    <div className="space-y-4 bg-slate-300 -m-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">
          Purchases Summary
        </h2>
        <GhostBtn onClick={loadData} disabled={loading || saving}>
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={14} />
            Refresh
          </span>
        </GhostBtn>
      </div>

      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Unable to load purchase data</p>
          <p className="mt-1">{pageError}</p>
          <GhostBtn className="mt-3" onClick={loadData}>
            Try again
          </GhostBtn>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {card("Purchases", stats.purchases, "This month")}
        {card("Pending", `${stats.pending} Pending`, "Awaiting Delivery")}
        {card("Received", L(stats.received), "This month")}
        {card("Cost", usd(stats.cost), "This month")}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold uppercase text-slate-800">
            Purchase Orders
          </h3>
          <GreenBtn onClick={openCreate} disabled={loading || saving}>
            + Create purchase order
          </GreenBtn>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search order"
              className="w-full rounded-full border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400"
            />
          </div>

          <select
            value={sup}
            onChange={(e) => setSup(e.target.value)}
            className="rounded-full bg-slate-600 px-4 py-2 text-sm text-white"
          >
            <option value="All suppliers">All suppliers</option>
            {supplierOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={st}
            onChange={(e) => setSt(e.target.value)}
            className="rounded-full bg-slate-600 px-4 py-2 text-sm text-white"
          >
            {["All status", "Pending", "Ordered", "Delivered", "Received", "Canceled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            value={dt}
            onChange={(e) => setDt(e.target.value)}
            className="rounded-full bg-slate-600 px-4 py-2 text-sm text-white"
          >
            {DATE_FILTERS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" />
            Loading purchase orders...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold text-slate-500">
                  {["Order", "Supplier", "Fuel", "Quantity", "Order date", "Delivery date", "Received date", "Total amount", "Status", "Action"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr
                    key={o.dbId ?? o.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2.5 font-semibold">{o.id}</td>
                    <td className="px-3 py-2.5">{o.supplier}</td>
                    <td className="px-3 py-2.5">{o.fuel}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{L(o.qty)}</td>
                    <td className="px-3 py-2.5">{fmt(o.orderDate)}</td>
                    <td className="px-3 py-2.5">{fmt(o.deliveryDate)}</td>
                    <td className="px-3 py-2.5">{fmt(o.receivedDate)}</td>
                    <td className="px-3 py-2.5">{usd(o.total)}</td>
                    <td className="px-3 py-2.5"><Badge s={o.status} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex gap-1.5">
                        {o.status === "Pending" && (
                          <>
                            <GreenBtn disabled={saving} onClick={() => markDelivered(o)}>
                              Mark delivered
                            </GreenBtn>
                            <GhostBtn disabled={saving} onClick={() => { setError(""); setModal({ type: "cancel", id: o.id }); }}>
                              Cancel
                            </GhostBtn>
                          </>
                        )}
                        {o.status === "Ordered" && (
                          <GreenBtn disabled={saving} onClick={() => markDelivered(o)}>
                            Mark delivered
                          </GreenBtn>
                        )}
                        
{o.status === "Delivered" && (
  <GreenBtn
    type="button"
    disabled={saving || loading}
    onClick={() => openReceive(o)}
  >
    Receive into tank
  </GreenBtn>
)}

                        <GhostBtn onClick={() => setModal({ type: "details", id: o.id })}>
                          Details
                        </GhostBtn>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No purchase orders match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            Recently Fuel Deliveries
          </h3>
          <GreenBtn onClick={() => setAllDel((v) => !v)}>
            {allDel ? "Show less" : "View All"}
          </GreenBtn>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-slate-500">
                {["Delivery_id", "Order", "Suppliers", "Fuel", "Quantity", "Tank"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(allDel ? deliveries : deliveries.slice(0, 4)).map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5 font-semibold">{d.id}</td>
                  <td className="px-3 py-2.5">{d.order}</td>
                  <td className="px-3 py-2.5">{d.supplier}</td>
                  <td className="px-3 py-2.5">{d.fuel}</td>
                  <td className="px-3 py-2.5">{L(d.qty)}</td>
                  <td className="px-3 py-2.5">{d.tank}</td>
                </tr>
              ))}
              {!deliveries.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No deliveries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal?.type === "create" && (
        <Modal title="Create purchase order" onClose={close}>
          <form onSubmit={submitCreate} className="space-y-3">
            <Sel
              label="Supplier"
              options={supplierOptions}
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              required
            />
            <Sel
              label="Fuel"
              options={fuelOptions}
              value={form.fuelId}
              onChange={(e) => setForm({ ...form, fuelId: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Quantity (L)"
                type="number"
                min="0.001"
                step="0.001"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                required
              />
              <Field
                label="Price per liter ($)"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <Field
              label="Expected delivery"
              type="date"
              min={today}
              value={form.expected}
              onChange={(e) => setForm({ ...form, expected: e.target.value })}
              required
            />
            <p className="text-sm">
              Total: <b>{usd((Number(form.qty) || 0) * (Number(form.price) || 0))}</b>
            </p>
            {error && <p className="whitespace-normal text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <GhostBtn type="button" onClick={close} disabled={saving}>Cancel</GhostBtn>
              <GreenBtn type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create order"}
              </GreenBtn>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "receive" && sel && (
        <Modal title={`Receive ${sel.id} into tank`} onClose={close}>
          <form onSubmit={submitReceive} className="space-y-3">
            <p className="text-sm text-slate-500">
              {sel.supplier} · {sel.fuel} · ordered {L(sel.qty)}
            </p>
            
<Sel
  label="Tank"
  options={[
    {
      value: "",
      label: "Select an available tank",
    },
    ...tanks
      .filter(
        (t) =>
          t.status === "active" &&
          String(t.fuelId) === String(sel.fuelId) &&
          t.capacity - t.current >= sel.qty
      )
      .map((t) => ({
        value: String(t.id),
        label: `${t.name} — ${L(t.capacity - t.current)} free`,
      })),
  ]}
  value={recv.tankId}
  onChange={(e) => {
    setRecv((prev) => ({
      ...prev,
      tankId: e.target.value,
      qty: sel.qty ? String(sel.qty) : "",
    }));
    setError("");
  }}
  required
/>

            {recvTank && (
              <p className="text-xs text-slate-500">
                Current volume: {L(recvTank.current)} · Capacity: {L(recvTank.capacity)} · Free space: {L(recvTank.capacity - recvTank.current)}
              </p>
            )}
            
<Field
  label="Quantity received (L)"
  type="number"
  min={sel.qty}
  max={sel.qty}
  step="0.001"
  value={recv.qty}
  onChange={(e) =>
    setRecv({ ...recv, qty: e.target.value })
  }
  required
/>
<p className="text-xs text-slate-500">
  Full order quantity required: {L(sel.qty)}
</p>

            {error && <p className="whitespace-normal text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2">
              <GhostBtn type="button" onClick={close} disabled={saving}>Cancel</GhostBtn>
              <GreenBtn
  type="submit"
  disabled={
    saving ||
    !recvTank ||
    recvTank.status !== "active" ||
    String(recvTank.fuelId) !== String(sel.fuelId) ||
    recvTank.capacity - recvTank.current < sel.qty ||
    Math.abs(Number(recv.qty) - sel.qty) > 0.0005
  }
>
  {saving ? "Saving..." : "Confirm receipt"}
</GreenBtn>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "cancel" && sel && (
        <Modal title="Cancel purchase order" onClose={close}>
          <p className="text-sm">
            Cancel <b>{sel.id}</b> ({sel.supplier}, {L(sel.qty)} {sel.fuel})?
            A canceled order cannot be reopened.
          </p>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <GhostBtn onClick={close} disabled={saving}>Keep order</GhostBtn>
            <button
              onClick={cancelOrder}
              disabled={saving}
              className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-40"
            >
              {saving ? "Canceling..." : "Cancel order"}
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === "details" && sel && (
        <Modal title={`${sel.id} · ${sel.supplier}`} onClose={close}>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt><dd><Badge s={sel.status} /></dd>
            <dt className="text-slate-500">Fuel</dt><dd>{sel.fuel}</dd>
            <dt className="text-slate-500">Quantity ordered</dt><dd>{L(sel.qty)}</dd>
            <dt className="text-slate-500">Quantity received</dt><dd>{sel.receivedQty ? L(sel.receivedQty) : "-"}</dd>
            <dt className="text-slate-500">Order date</dt><dd>{fmt(sel.orderDate)}</dd>
            <dt className="text-slate-500">Delivery date</dt><dd>{fmt(sel.deliveryDate)}</dd>
            <dt className="text-slate-500">Received date</dt><dd>{fmt(sel.receivedDate)}</dd>
            <dt className="text-slate-500">Total amount</dt><dd className="font-semibold">{usd(sel.total)}</dd>
          </dl>
          <div className="mt-4 flex justify-end gap-2">
            {sel.status === "Pending" && (
              <GreenBtn disabled={saving} onClick={() => markDelivered(sel)}>
                Mark delivered
              </GreenBtn>
            )}
            {sel.status === "Delivered" && (
              <GreenBtn disabled={saving} onClick={() => openReceive(sel)}>
                Receive into tank
              </GreenBtn>
            )}
            <GhostBtn onClick={close}>Close</GhostBtn>
          </div>
        </Modal>
      )}

      {saving && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm text-slate-700 shadow-lg">
          <LoaderCircle size={16} className="animate-spin" />
          Processing...
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
