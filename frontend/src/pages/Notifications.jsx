
import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  TriangleAlert,
  Info,
  Gift,
  CheckCircle2,
  X,
  ShoppingCart,
  Clock,
} from "lucide-react";

import { Panel } from "../components/ui";

// Import the API functions created in notificationAPI.js.
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveAllNotifications,
} from "../api/notificationAPI";

const FILTERS = [
  "All Notifications",
  "Low Fuel Stock Alerts",
  "Price Update Notifications",
  "Maintenance Reminders",
  "Membership Promotion",
];

// Map database notification types to the existing UI filter labels.
const TYPE_LABELS = {
  fuel_low_stock: "Low Fuel Stock Alerts",
  price_update: "Price Update Notifications",
  maintenance_reminder: "Maintenance Reminders",
  promotion: "Membership Promotion",
  delivery_reminder: "Low Fuel Stock Alerts",
  system_alert: "System Alerts",
};

// Select the icon, color, and action based on notification type.
const TYPE_CONFIG = {
  fuel_low_stock: {
    icon: AlertTriangle,
    tone: "rose",
    action: "Order Fuel Refill",
    actionType: "refill",
  },
  price_update: {
    icon: Info,
    tone: "cyan",
    action: "View Price History",
    actionType: "price",
  },
  maintenance_reminder: {
    icon: TriangleAlert,
    tone: "amber",
    action: "View Maintenance Details",
    actionType: "maintenance",
  },
  promotion: {
    icon: Gift,
    tone: "emerald",
    action: "View Promotion Details",
    actionType: "promotion",
  },
  delivery_reminder: {
    icon: Info,
    tone: "cyan",
    action: "Monitor Delivery",
    actionType: "delivery",
  },
  system_alert: {
    icon: AlertTriangle,
    tone: "rose",
    action: "View Details",
    actionType: "details",
  },
};

const TONE_STYLES = {
  rose: "bg-rose-50 text-rose-500 border-rose-100",
  amber: "bg-amber-50 text-amber-500 border-amber-100",
  cyan: "bg-cyan-50 text-cyan-500 border-cyan-100",
  emerald: "bg-emerald-50 text-emerald-500 border-emerald-100",
};

// Convert the database timestamp into a readable relative time.
const formatNotificationTime = (dateValue) => {
  if (!dateValue) return "Unknown time";

  const date = new Date(dateValue.replace?.(" ", "T") ?? dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const difference = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
};

// Convert Laravel database fields into the format used by the UI.
const mapNotification = (item) => {
  const config =
    TYPE_CONFIG[item.notification_type] ?? TYPE_CONFIG.system_alert;

  return {
    id: item.notification_id,
    userId: item.user_id,
    type:
      TYPE_LABELS[item.notification_type] ?? "System Alerts",
    icon: config.icon,
    tone: config.tone,
    title: item.title,
    body: item.message,
    time: formatNotificationTime(item.created_at),
    action: config.action,
    actionType: config.actionType,
    isRead: Boolean(item.is_read),
  };
};

export default function Notifications() {
  const [filter, setFilter] = useState(FILTERS[0]);

  // Notifications are now loaded from Laravel instead of hard-coded data.
  const [notificationsList, setNotificationsList] = useState([]);

  // Track loading and errors when communicating with Laravel.
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Modal States.
  const [activeModal, setActiveModal] = useState(null);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [refillLiters, setRefillLiters] = useState(15000);
  const [successToast, setSuccessToast] = useState("");

  // Load notifications from the database when this page opens.
  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const result = await getNotifications();

        // The Laravel controller returns notifications in result.data.
        if (!Array.isArray(result.data)) {
          throw new Error("Invalid notification response from server.");
        }

        if (isMounted) {
          setNotificationsList(result.data.map(mapNotification));
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);

        if (isMounted) {
          setLoadError(
            error.response?.data?.message ||
              "Unable to load notifications. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();

    // Prevent state updates if this page unmounts during the request.
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter the loaded notifications without changing the total count.
  const filteredNotifications = notificationsList.filter((n) => {
    if (filter === "All Notifications") return true;
    return n.type === filter;
  });

  const unreadCount = notificationsList.filter(
    (n) => !n.isRead
  ).length;

  // Display a toast message.
  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 3500);
  };

  // Mark one notification as read in Laravel and then update the UI.
  const handleMarkAsRead = async (id) => {
    const notification = notificationsList.find((n) => n.id === id);

    if (!notification || notification.isRead) return;

    try {
      await markNotificationAsRead(id);

      setNotificationsList((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        )
      );

      showToast("Notification marked as read!");
    } catch (error) {
      console.error("Failed to mark notification as read:", error);

      showToast(
        error.response?.data?.message ||
          "Unable to mark notification as read."
      );
    }
  };

  
  // Mark all visible notifications as read for the current Admin.
  const handleMarkAllAsRead = async () => {
    try {
      // Ask Laravel to save the read status in the database.
      const result = await markAllNotificationsAsRead();

      if (result.success) {
        // Update every notification in the UI, including
        // shared notifications where userId is null.
        setNotificationsList((prev) =>
          prev.map((n) => ({
            ...n,
            isRead: true,
          }))
        );

        showToast("Your notifications have been marked as read!");
      } else {
        showToast("Unable to mark notifications as read.");
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);

      showToast(
        error.response?.data?.message ||
          "Unable to mark notifications as read."
      );
    }
  };



  // Archive all notifications using the Laravel API.
  const handleArchiveAll = async () => {
    // Prevent archiving while notifications are still loading.
    if (isLoading || notificationsList.length === 0) {
      return;
    }

    try {
      // Send the request to Laravel.
      const result = await archiveAllNotifications();

      if (result.success) {
        // Remove archived notifications from the current UI.
        setNotificationsList([]);

        // Close any open notification modal.
        setActiveModal(null);
        setSelectedNotif(null);

        // Show a success message using your existing toast function.
        showToast("All notifications archived successfully!");
      } else {
        showToast("Unable to archive notifications.");
      }
    } catch (error) {
      // Log the error to help with debugging.
      console.error("Failed to archive notifications:", error);

      // Display the error returned by Laravel, if available.
      showToast(
        error.response?.data?.message ||
          "Failed to archive notifications."
      );
    }
  };



  // Open the appropriate modal for the selected notification.
  const handleActionClick = (notification) => {
    setSelectedNotif(notification);

    if (notification.actionType === "refill") {
      setActiveModal("refill");
    } else {
      setActiveModal("details");
    }
  };

  // The refill purchase-order API has not been implemented yet.
  const handleConfirmRefill = (e) => {
    e.preventDefault();

    showToast(
      "Creating a refill order requires the purchase-order API."
    );
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
          Unread:{" "}
          <span className="font-bold text-rose-500">
            {unreadCount}
          </span>{" "}
          / Total:{" "}
          <span className="font-bold text-slate-700">
            {notificationsList.length} Notifications
          </span>
        </div>

        <div className="flex gap-4 text-xs font-semibold text-cyan-600">
          <button
            onClick={handleMarkAllAsRead}
            disabled={isLoading || unreadCount === 0}
            className="hover:text-cyan-700 hover:underline disabled:opacity-50"
          >
            Mark All as Read
          </button>

          
          <button
            onClick={handleArchiveAll}
            disabled={isLoading || notificationsList.length === 0}
            className="hover:text-cyan-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Archive All
          </button>

        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-500 text-xs">
            Loading notifications...
          </div>
        ) : loadError ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-rose-100 text-rose-500 text-xs">
            <p>{loadError}</p>

            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-cyan-600 hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
            No notifications available in this section.
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const Icon = n.icon;

            return (
              <Panel
                key={n.id}
                className={`transition ${
                  !n.isRead
                    ? "border-l-4 border-l-cyan-500 bg-cyan-50/10"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3.5 p-1">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      TONE_STYLES[n.tone]
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-800">
                          {n.title}
                        </h4>

                        {!n.isRead && (
                          <span
                            className="h-2 w-2 rounded-full bg-rose-500 inline-block"
                            title="Unread"
                          />
                        )}
                      </div>

                      <span className="shrink-0 text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} /> {n.time}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {n.body}
                    </p>

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

              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRefill} className="space-y-3 text-xs">
              <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100">
                <p className="font-semibold">{selectedNotif.title}</p>
                <p className="mt-0.5">{selectedNotif.body}</p>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Select Supplier
                </label>

                <select
                  defaultValue="Caltex Cambodia Ltd."
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                >
                  <option>Caltex Cambodia Ltd.</option>
                  <option>Tela Petroleum</option>
                  <option>PTT Cambodia</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Order Volume (Liters)
                </label>

                <input
                  type="number"
                  min="1"
                  required
                  value={refillLiters}
                  onChange={(e) =>
                    setRefillLiters(e.target.value)
                  }
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
              <h3 className="font-bold text-slate-800 text-sm">
                Notification Details
              </h3>

              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800 text-sm">
                  {selectedNotif.title}
                </div>

                <div className="text-slate-600 leading-relaxed">
                  {selectedNotif.body}
                </div>

                <div className="text-[11px] text-slate-400 pt-1">
                  Timestamp: {selectedNotif.time}
                </div>
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
