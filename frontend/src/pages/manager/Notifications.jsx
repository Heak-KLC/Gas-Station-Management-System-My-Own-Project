
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Mail,
  MailOpen,
  Clock,
  Eye,
  Filter,
  RotateCcw,
  Search,
  X,
  Archive,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";

const API_URL = "https://gas-station-backend-ps9c.onrender.com/api";
const PAGE_SIZE = 8;

const TYPES = {
  fuel_low_stock: {
    label: "Low Stock",
    cls: "bg-amber-100 text-amber-700",
  },
  price_update: {
    label: "Price Update",
    cls: "bg-sky-100 text-sky-700",
  },
  delivery_reminder: {
    label: "Delivery",
    cls: "bg-violet-100 text-violet-700",
  },
  maintenance_reminder: {
    label: "Maintenance",
    cls: "bg-orange-100 text-orange-700",
  },
  promotion: {
    label: "Promotion",
    cls: "bg-pink-100 text-pink-700",
  },
  system_alert: {
    label: "System Alert",
    cls: "bg-slate-200 text-slate-700",
  },
};

const STATUS_CLS = {
  Unread: "bg-red-100 text-red-600",
  Read: "bg-emerald-100 text-emerald-700",
  Expired: "bg-slate-200 text-slate-500",
};

const TARGETS = {
  TANK: ["fuel-and-tank-monitoring", "Fuel & Tank Monitoring"],
  PRICE: ["fuel-and-tank-monitoring", "Fuel & Tank Monitoring"],
  PUMP: ["pumps-status", "Pumps & Status"],
  DEL: ["fuel-purchases", "Fuel Purchases"],
  GEN: ["equipment-maintenance", "Equipment Maintenance"],
};

const EMPTY_F = {
  q: "",
  type: "All Type",
  status: "All Status",
  from: "",
  to: "",
};

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("gas_station_token");

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const isoDay = (date) => {
  const d = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const parseDate = (value) => {
  if (!value) return null;

  // Interpret MySQL DATETIME as local time when it has no timezone.
  const normalized =
    typeof value === "string" && !value.includes("T")
      ? value.replace(" ", "T")
      : value;

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
};

const fmtDT = (value) => {
  const date = value instanceof Date ? value : parseDate(value);

  if (!date) return "-";

  return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit" }
  )}`;
};

const mapNotification = (item) => ({
  id: Number(item.notification_id),
  type: item.notification_type,
  title: item.title ?? "",
  message: item.message ?? "",
  referenceId: item.reference_id ?? null,
  ref:
    item.reference_id != null
      ? String(item.reference_id)
      : `NOTIF-${item.notification_id}`,
  read:
    item.is_read === true ||
    item.is_read === 1 ||
    item.is_read === "1",
  created: parseDate(item.created_at),
  expires: parseDate(item.expires_at),
});

const statusOf = (notification) => {
  if (
    notification.expires &&
    notification.expires.getTime() < Date.now()
  ) {
    return "Expired";
  }

  return notification.read ? "Read" : "Unread";
};

const target = (ref) => {
  if (!ref) return null;

  return TARGETS[ref.split("-")[0]] ?? null;
};

async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("gas_station_token");

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
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

const Btn = ({
  children,
  v = "gold",
  className = "",
  ...props
}) => {
  const variants = {
    gold: "bg-[#b8860b] text-white hover:bg-[#9a7009]",
    ghost: "border bg-white text-slate-700 hover:bg-slate-50",
    red: "bg-red-500 text-white hover:bg-red-600",
    green: "bg-emerald-500 text-white hover:bg-emerald-600",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[v]} ${className}`}
    >
      {children}
    </button>
  );
};

const Pill = ({ cls, children }) => (
  <span
    className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
  >
    {children}
  </span>
);

const Sel = ({ label, options, ...props }) => (
  <label className="block min-w-[140px] text-sm text-slate-600">
    {label}
    <select
      {...props}
      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-400"
    >
      {options.map((option) =>
        Array.isArray(option) ? (
          <option key={option[0]} value={option[0]}>
            {option[1]}
          </option>
        ) : (
          <option key={option} value={option}>
            {option}
          </option>
        )
      )}
    </select>
  </label>
);

const DateIn = ({ label, ...props }) => (
  <label className="block min-w-[145px] text-sm text-slate-600">
    {label}
    <input
      type="date"
      {...props}
      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-sky-400"
    />
  </label>
);

function Stat({ icon: Icon, tone, label, value, note }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone}`}
      >
        <Icon size={24} />
      </span>
      <div>
        <p className="text-lg text-slate-600 font-bold">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{note}</p>
      </div>
    </div>
  );
}

export default function Notifications({ onNavigate = () => {} }) {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(EMPTY_F);
  const [applied, setApplied] = useState(EMPTY_F);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await apiRequest("/notifications");

      setItems(
        Array.isArray(result.data)
          ? result.data.map(mapNotification)
          : []
      );
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const count = (status) =>
    items.filter((item) => statusOf(item) === status).length;

  const unread = count("Unread");
  const read = count("Read");
  const expired = count("Expired");

  const filtered = useMemo(() => {
    const search = applied.q.trim().toLowerCase();

    return items.filter((notification) => {
      const typeInfo = TYPES[notification.type];
      const status = statusOf(notification);

      const matchesSearch =
        !search ||
        [
          notification.title,
          notification.message,
          notification.ref,
          notification.type,
          typeInfo?.label ?? notification.type,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(search)
        );

      const matchesType =
        applied.type === "All Type" ||
        notification.type === applied.type;

      const matchesStatus =
        applied.status === "All Status" ||
        status === applied.status;

      const createdDay = notification.created
        ? isoDay(notification.created)
        : "";

      const matchesFrom =
        !applied.from || createdDay >= applied.from;

      const matchesTo =
        !applied.to || createdDay <= applied.to;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [items, applied]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice(
    (cur - 1) * PAGE_SIZE,
    cur * PAGE_SIZE
  );

  const selected = items.find((item) => item.id === openId);
  const selectedTarget = selected ? target(selected.ref) : null;

  const openNotification = async (notification) => {
    setOpenId(notification.id);
    setConfirmArchive(false);

    if (!notification.read && statusOf(notification) !== "Expired") {
      await updateRead(notification.id, true, false);
    }
  };

  const closeModal = () => {
    setOpenId(null);
    setConfirmArchive(false);
  };

  async function updateRead(id, shouldRead, showMessage = true) {
    if (busy) return;

    try {
      setBusy(true);

      const endpoint = shouldRead
        ? `/notifications/${id}/read`
        : `/notifications/${id}/unread`;

      await apiRequest(endpoint, { method: "PATCH" });

      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: shouldRead } : item
        )
      );

      if (showMessage) {
        setToast(
          shouldRead
            ? "Notification marked as read."
            : "Notification marked as unread."
        );
      }
    } catch (err) {
      setToast(err.message || "Unable to update notification.");
    } finally {
      setBusy(false);
    }
  }

  const markAll = async () => {
    if (busy || unread === 0) return;

    try {
      setBusy(true);

      const result = await apiRequest("/notifications/read-all", {
        method: "PATCH",
      });

      setItems((current) =>
        current.map((item) =>
          statusOf(item) === "Unread"
            ? { ...item, read: true }
            : item
        )
      );

      setToast(
        `${result.updated_count ?? unread} notification(s) marked as read.`
      );
    } catch (err) {
      setToast(err.message || "Unable to mark notifications as read.");
    } finally {
      setBusy(false);
    }
  };

  const archiveOne = async () => {
    if (!selected || busy) return;

    try {
      setBusy(true);

      await apiRequest(
        `/notifications/${selected.id}/archive`,
        { method: "PATCH" }
      );

      setItems((current) =>
        current.filter((item) => item.id !== selected.id)
      );

      closeModal();
      setToast("Notification archived.");
    } catch (err) {
      setToast(err.message || "Unable to archive notification.");
    } finally {
      setBusy(false);
    }
  };

  const archiveAll = async () => {
    if (busy || items.length === 0) return;

    const confirmed = window.confirm(
      "Archive all active notifications visible to your account?"
    );

    if (!confirmed) return;

    try {
      setBusy(true);

      const result = await apiRequest("/notifications/archive-all", {
        method: "PATCH",
      });

      setItems([]);
      closeModal();

      setToast(
        `${result.archived_count ?? items.length} notification(s) archived.`
      );
    } catch (err) {
      setToast(err.message || "Unable to archive notifications.");
    } finally {
      setBusy(false);
    }
  };

  const applyFilter = () => {
    if (draft.from && draft.to && draft.from > draft.to) {
      setToast("The From date cannot be later than the To date.");
      return;
    }

    setApplied({ ...draft });
    setPage(1);
  };

  const resetFilter = () => {
    setDraft({ ...EMPTY_F });
    setApplied({ ...EMPTY_F });
    setPage(1);
  };

  return (
    <div className="space-y-4 bg-slate-300 -m-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#b8860b] text-white">
            <Bell size={28} />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Notifications
            </h2>
            <p className="text-sm text-slate-600">
              View and manage system notifications
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Btn
            disabled={busy || unread === 0}
            onClick={markAll}
          >
            <Mail size={18} />
            Mark all as read
          </Btn>

          <Btn
            v="ghost"
            disabled={busy || items.length === 0}
            onClick={archiveAll}
          >
            <Archive size={18} />
            Archive all
          </Btn>

          <Btn
            v="ghost"
            disabled={loading || busy}
            onClick={fetchNotifications}
          >
            <RefreshCw size={16} />
            Refresh
          </Btn>
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <Btn v="ghost" onClick={fetchNotifications}>
            Retry
          </Btn>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Bell}
          tone="bg-sky-100 text-sky-500"
          label="Total Notifications"
          value={items.length}
          note="Currently available"
        />
        <Stat
          icon={Mail}
          tone="bg-emerald-100 text-emerald-600"
          label="Unread"
          value={unread}
          note="Unread notifications"
        />
        <Stat
          icon={MailOpen}
          tone="bg-pink-100 text-pink-500"
          label="Read"
          value={read}
          note="Read notifications"
        />
        <Stat
          icon={Clock}
          tone="bg-red-100 text-red-500"
          label="Expired"
          value={expired}
          note="In the loaded data"
        />
      </div>

      <div className="flex flex-col items-end gap-3 lg:flex-row">
        <label className="block w-full flex-1 text-sm text-slate-600">
          Search
          <span className="relative mt-1 block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={draft.q}
              onChange={(event) =>
                setDraft({ ...draft, q: event.target.value })
              }
              onKeyDown={(event) =>
                event.key === "Enter" && applyFilter()
              }
              placeholder="Search notifications..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 outline-none focus:border-sky-400"
            />
          </span>
        </label>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
          <Sel
            label="Type"
            options={[
              ["All Type", "All Type"],
              ...Object.entries(TYPES).map(([key, value]) => [
                key,
                value.label,
              ]),
            ]}
            value={draft.type}
            onChange={(event) =>
              setDraft({ ...draft, type: event.target.value })
            }
          />

          <Sel
            label="Status"
            options={[
              "All Status",
              "Unread",
              "Read",
              "Expired",
            ]}
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value })
            }
          />

          <DateIn
            label="From"
            value={draft.from}
            onChange={(event) =>
              setDraft({ ...draft, from: event.target.value })
            }
          />

          <DateIn
            label="To"
            value={draft.to}
            onChange={(event) =>
              setDraft({ ...draft, to: event.target.value })
            }
          />
        </div>

        <div className="flex gap-2">
          <Btn onClick={applyFilter}>
            <Filter size={15} />
            Filter
          </Btn>
          <Btn v="ghost" onClick={resetFilter}>
            <RotateCcw size={15} />
            Reset
          </Btn>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sky-500 text-left text-white">
                {[
                  "ID",
                  "Type",
                  "Title",
                  "Message",
                  "Reference",
                  "Status",
                  "Date",
                  "Expires At",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-3 py-3 text-sm font-semibold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loading &&
                rows.map((notification, index) => {
                  const status = statusOf(notification);
                  const typeInfo = TYPES[notification.type] ?? {
                    label: notification.type,
                    cls: "bg-slate-100 text-slate-700",
                  };

                  return (
                    <tr
                      key={notification.id}
                      className={`border-b border-slate-100 last:border-0 ${
                        index % 2 ? "bg-sky-50" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-3">
                        {String(notification.id).padStart(3, "0")}
                      </td>

                      <td className="px-3 py-3">
                        <Pill cls={typeInfo.cls}>
                          {typeInfo.label}
                        </Pill>
                      </td>

                      <td
                        className={`min-w-[180px] px-3 py-3 ${
                          status === "Unread"
                            ? "font-bold"
                            : "font-medium"
                        }`}
                      >
                        {notification.title}
                      </td>

                      <td className="max-w-[260px] px-3 py-3 text-slate-600">
                        {notification.message}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 font-medium">
                        {notification.ref}
                      </td>

                      <td className="px-3 py-3">
                        <Pill cls={STATUS_CLS[status]}>
                          {status}
                        </Pill>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {fmtDT(notification.created)}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        {fmtDT(notification.expires)}
                      </td>

                      <td className="px-3 py-3">
                        <button
                          aria-label="View notification"
                          title="View notification"
                          onClick={() =>
                            openNotification(notification)
                          }
                          className="rounded-lg bg-slate-200 p-2 text-slate-600 hover:bg-slate-300"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle size={18} className="animate-spin" />
                      Loading notifications...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-slate-400"
                  >
                    No notifications match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1 py-3">
          <button
            disabled={cur === 1}
            onClick={() => setPage(cur - 1)}
            className="rounded border px-2.5 py-1 text-sm disabled:opacity-40"
          >
            ‹
          </button>

          {Array.from({ length: pages }, (_, index) => index + 1).map(
            (number) => (
              <button
                key={number}
                onClick={() => setPage(number)}
                className={`rounded border px-3 py-1 text-sm ${
                  number === cur
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "hover:bg-slate-50"
                }`}
              >
                {number}
              </button>
            )
          )}

          <button
            disabled={cur === pages}
            onClick={() => setPage(cur + 1)}
            className="rounded border px-2.5 py-1 text-sm disabled:opacity-40"
          >
            »
          </button>

          <span className="ml-2 text-xs text-slate-500">
            {filtered.length} record(s)
          </span>
        </div>
      </div>

      {selected && (
        <Modal title={selected.title} onClose={closeModal}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill
              cls={
                (TYPES[selected.type] ?? {
                  cls: "bg-slate-100 text-slate-700",
                }).cls
              }
            >
              {(TYPES[selected.type] ?? {
                label: selected.type,
              }).label}
            </Pill>

            <Pill cls={STATUS_CLS[statusOf(selected)]}>
              {statusOf(selected)}
            </Pill>
          </div>

          <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">
            {selected.message}
          </p>

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Notification ID</dt>
            <dd>{selected.id}</dd>

            <dt className="text-slate-500">Reference ID</dt>
            <dd>{selected.referenceId ?? "-"}</dd>

            <dt className="text-slate-500">Date</dt>
            <dd>{fmtDT(selected.created)}</dd>

            <dt className="text-slate-500">Expires at</dt>
            <dd>{fmtDT(selected.expires)}</dd>
          </dl>

          {confirmArchive ? (
            <div className="mt-5 rounded-lg bg-amber-50 p-3 text-sm">
              <p className="mb-3 text-amber-800">
                Archive this notification for your account?
              </p>

              <div className="flex justify-end gap-2">
                <Btn
                  v="ghost"
                  disabled={busy}
                  onClick={() => setConfirmArchive(false)}
                >
                  Cancel
                </Btn>

                <Btn
                  v="red"
                  disabled={busy}
                  onClick={archiveOne}
                >
                  {busy ? "Archiving..." : "Confirm Archive"}
                </Btn>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {selectedTarget && (
                <Btn
                  v="green"
                  onClick={() => {
                    closeModal();
                    onNavigate(selectedTarget[0]);
                  }}
                >
                  Open {selectedTarget[1]}
                </Btn>
              )}

              {statusOf(selected) !== "Expired" && (
                <Btn
                  v="ghost"
                  disabled={busy}
                  onClick={() =>
                    updateRead(selected.id, !selected.read)
                  }
                >
                  {selected.read
                    ? "Mark as unread"
                    : "Mark as read"}
                </Btn>
              )}

              <Btn
                v="ghost"
                disabled={busy}
                onClick={() => setConfirmArchive(true)}
              >
                <Archive size={16} />
                Archive
              </Btn>
            </div>
          )}
        </Modal>
      )}

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
