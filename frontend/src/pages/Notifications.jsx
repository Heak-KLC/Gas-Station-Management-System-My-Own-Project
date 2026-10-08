import React, { useState } from "react";
import { AlertTriangle, TriangleAlert, Info, Gift, CheckCircle2, X, ShoppingCart, Clock } from "lucide-react";
import { Panel } from "../components/ui";

const FILTERS = [
  "All Notifications",
  "Low Fuel Stock Alerts",
  "Price Update Notifications",
  "Maintenance Reminders",
  "Membership Promotion",
];

const initialNotifications = [
  {
    id: 1,
    type: "Low Fuel Stock Alerts",
    icon: AlertTriangle,
    tone: "rose",
    title: "CRITICAL: Tank A Low Stock Alert",
    body: "Available quantity (1,200L) below minimum level (2,000L). Tank Capacity 20,000L.",
    time: "5 mins ago",
    action: "Order Fuel Refill",
    actionType: "refill",
    isRead: false,
  },
  {
    id: 2,
    type: "Maintenance Reminders",
    icon: TriangleAlert,
    tone: "amber",
    title: "WARNING: Fuel Pump Maintenance Scheduled (Pump3: Diesel)",
    body: "Scheduled maintenance required by 15-Aug-2026. Last maintenance: 60 days ago.",
    time: "3 hours ago",
    action: "View Maintenance Details",
    actionType: "maintenance",
    isRead: false,
  },
  {
    id: 3,
    type: "Price Update Notifications",
    icon: Info,
    tone: "cyan",
    title: "INFO: Fuel Price Updated (Regular Gasoline)",
    body: "Regular Gasoline selling price changed from $1.45 to $1.50 per Litre by Admin.",
    time: "Today, 8:15 PM",
    action: "View Price History",
    actionType: "price",
    isRead: false,
  },
  {
    id: 4,
    type: "Low Fuel Stock Alerts",
    icon: Info,
    tone: "cyan",
    title: "INFO: Fuel Delivery Incoming (PO #19817038)",
    body: "Purchase order form Caltex Cambodia Ltd. Due today at 02:00 PM (Liters: 15,000, Petrol 92).",
    time: "Yesterday, 4:30 PM",
    action: "Monitor Delivery",
    actionType: "delivery",
    isRead: true,
  },
  {
    id: 5,
    type: "Membership Promotion",
    icon: Gift,
    tone: "emerald",
    title: "INFO: Membership Level Up Promotion",
    body: "Gold membership level promotion active. Offers 5% discount on convenience store items.",
    time: "2 days ago",
    action: "View Promotion Details",
    actionType: "promotion",
    isRead: true,
  },
];

const TONE_STYLES = {
  rose: "bg-rose-50 text-rose-500 border-rose-100",
  amber: "bg-amber-50 text-amber-500 border-amber-100",
  cyan: "bg-cyan-50 text-cyan-500 border-cyan-100",
  emerald: "bg-emerald-50 text-emerald-500 border-emerald-100",
};

export default function Notifications() {
  const [filter, setFilter] = useState(FILTERS[0]);
  const [notificationsList, setNotificationsList] = useState(initialNotifications);
  
  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'refill' | 'details' | null
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [refillLiters, setRefillLiters] = useState(15000);
  const [successToast, setSuccessToast] = useState("");

  // Filter Logic
  const filteredNotifications = notificationsList.filter((n) => {
    if (filter === "All Notifications") return true;
    return n.type === filter;
  });

  const unreadCount = notificationsList.filter((n) => !n.isRead).length;

  // Actions
  const handleMarkAsRead = (id) => {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast("All notifications marked as read!");
  };

  const handleArchiveAll = () => {
    setNotificationsList([]);
    showToast("All notifications archived.");
  };

  const handleActionClick = (n) => {
    setSelectedNotif(n);
    if (n.actionType === "refill") {
      setActiveModal("refill");
    } else {
      setActiveModal("details");
    }
  };

  const handleConfirmRefill = (e) => {
    e.preventDefault();
    setActiveModal(null);
    showToast(`Fuel Refill Order of ${refillLiters.toLocaleString()}L created successfully!`);
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 3500);
  };

  return (
    <div className="space-y-4 p-6 bg-gray-300 min-h-screen">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-800 text-white px-4 py-3 shadow-xl text-xs font-medium animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          {successToast}
        </div>
      )}

      {/* Header Tabs Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-cyan-500 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Counter & Bulk Actions Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
        <div className="text-xs text-slate-500">
          Unread: <span className="font-bold text-rose-500">{unreadCount}</span> / Total:{" "}
          <span className="font-bold text-slate-700">{notificationsList.length} Notifications</span>
        </div>
        <div className="flex gap-4 text-xs font-semibold text-cyan-600">
          <button onClick={handleMarkAllAsRead} className="hover:text-cyan-700 hover:underline">
            Mark All as Read
          </button>
          <button onClick={handleArchiveAll} className="hover:text-cyan-700 hover:underline">
            Archive All
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
            No notifications available in this section.
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const Icon = n.icon;
            return (
              <Panel key={n.id} className={`transition ${!n.isRead ? "border-l-4 border-l-cyan-500 bg-cyan-50/10" : ""}`}>
                <div className="flex items-start gap-3.5 p-1">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${TONE_STYLES[n.tone]}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" title="Unread"></span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} /> {n.time}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{n.body}</p>
                    <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold">
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="text-slate-400 hover:text-slate-600 transition"
                        >
                          Mark as Read
                        </button>
                      )}
                      <button
                        onClick={() => handleActionClick(n)}
                        className="text-cyan-600 hover:text-cyan-700 hover:underline"
                      >
                        {n.action}
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })
        )}
      </div>

      {/* Modal 1: Refill Order Modal */}
      {activeModal === "refill" && selectedNotif && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ShoppingCart className="text-cyan-500" size={18} />
                Create Refill Purchase Order
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleConfirmRefill} className="space-y-3 text-xs">
              <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100">
                <p className="font-semibold">{selectedNotif.title}</p>
                <p className="mt-0.5">{selectedNotif.body}</p>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Select Supplier</label>
                <select className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500">
                  <option>Caltex Cambodia Ltd.</option>
                  <option>Tela Petroleum</option>
                  <option>PTT Cambodia</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Order Volume (Liters)</label>
                <input
                  type="number"
                  value={refillLiters}
                  onChange={(e) => setRefillLiters(e.target.value)}
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 shadow-sm"
                >
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: View Details Modal */}
      {activeModal === "details" && selectedNotif && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Notification Details</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800 text-sm">{selectedNotif.title}</div>
                <div className="text-slate-600 leading-relaxed">{selectedNotif.body}</div>
                <div className="text-[11px] text-slate-400 pt-1">Timestamp: {selectedNotif.time}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}