import { useEffect, useState } from "react";
import {
  Globe,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  Languages,
  ExternalLink,
  CheckCheck,
  Archive,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import api from "../api/axios";

export default function TopBar({
  title = "Dashboard",
  user = {},
  onLogout,
  onNavigate,
  pages = {},
  language = "en",
  onLanguageChange,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(
  user.avatar_url || ""
);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationActionId, setNotificationActionId] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
  let active = true;

  const loadProfile = async () => {
    try {
      // Use cached avatar first while the API is loading.
      const cachedUser = JSON.parse(
        sessionStorage.getItem("gas_station_user") || "{}"
      );

      if (active) {
        setAvatarUrl(cachedUser.avatar_url || user.avatar_url || "");
      }

      const response = await api.get("/profile");
      const profile = response.data?.data ?? response.data;

      if (!active) return;

      setAvatarUrl(profile.avatar_url || "");

      // Keep the latest profile information in session storage.
      sessionStorage.setItem(
        "gas_station_user",
        JSON.stringify({
          ...cachedUser,
          ...profile,
        })
      );
    } catch (error) {
      console.error("Failed to load profile photo:", error);
    }
  };

  loadProfile();

  // Refresh the avatar when Settings saves a new profile photo.
  const handleProfileUpdated = (event) => {
    const updatedUser = event.detail || {};

    setAvatarUrl(updatedUser.avatar_url || "");
  };

  window.addEventListener("profile-updated", handleProfileUpdated);

  return () => {
    active = false;
    window.removeEventListener("profile-updated", handleProfileUpdated);
  };
}, [user.user_id]);

  const userName =
    user.full_name || user.name || user.username || user.email || "User";

  const role = String(user.role || "guest").trim().toLowerCase();

  const roleLabels = {
    admin: "Admin",
    manager: "Manager",
    cashier: "Cashier",
    attendant: "Fuel Attendant",
    fuel_attendant: "Fuel Attendant",
  };

  const userRole = roleLabels[role] || "Guest";
  const isKhmer = language === "km";

  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const text = {
    language: isKhmer ? "ភាសា" : "Language",
    notifications: isKhmer ? "ការជូនដំណឹង" : "Notifications",
    loading: isKhmer ? "កំពុងទាញទិន្នន័យ..." : "Loading notifications...",
    empty: isKhmer
      ? "មិនមានការជូនដំណឹងទេ"
      : "No notifications found.",
    loadError: isKhmer
      ? "មិនអាចទាញការជូនដំណឹងបានទេ។"
      : "Could not load notifications.",
    markAllRead: isKhmer
      ? "អានទាំងអស់"
      : "Mark all as read",
    archive: isKhmer ? "ទុកក្នុងប័ណ្ណសារ" : "Archive",
    account: isKhmer ? "គណនីរបស់ខ្ញុំ" : "My Account",
    settings: isKhmer ? "ការកំណត់" : "Settings",
    logout: isKhmer ? "ចាកចេញ" : "Log Out",
    openNotifications: isKhmer
      ? "មើលការជូនដំណឹងទាំងអស់"
      : "View all notifications",
  };

  const toggleMenu = (menu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const changeLanguage = (nextLanguage) => {
    onLanguageChange?.(nextLanguage);
    setOpenMenu(null);
  };

  const notificationPageKey = Object.keys(pages).find(
    (key) => key === "notifications"
  );

  const settingsPageKey = Object.keys(pages).find(
    (key) => key === "settings"
  );

  // Load notifications when the notification menu opens.
  const loadNotifications = async () => {
    setLoadingNotifications(true);
    setNotificationError("");

    try {
      const response = await api.get("/notifications");
      const data = response.data;

      const items = Array.isArray(data.data) ? data.data : [];

      setNotifications(items);
      setUnreadCount(
        Number.isFinite(Number(data.unread_count))
          ? Number(data.unread_count)
          : items.filter((item) => !Boolean(item.is_read)).length
      );
    } catch (error) {
      console.error("Failed to load notifications:", error);

      setNotificationError(
        error.response?.status === 403
          ? "Your account does not have permission to view notifications."
          : text.loadError
      );
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (openMenu === "notifications") {
      loadNotifications();
    }
  }, [openMenu]);

  const markAsRead = async (notification) => {
    if (Boolean(notification.is_read)) return;

    const id = notification.notification_id;
    setNotificationActionId(id);
    setNotificationError("");

    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((current) =>
        current.map((item) =>
          item.notification_id === id
            ? { ...item, is_read: 1 }
            : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      setNotificationError(text.loadError);
    } finally {
      setNotificationActionId(null);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || markingAllRead) return;

    setMarkingAllRead(true);
    setNotificationError("");

    try {
      await api.patch("/notifications/read-all");

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: 1 }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      setNotificationError(text.loadError);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const archiveNotification = async (notification) => {
    const id = notification.notification_id;
    const wasUnread = !Boolean(notification.is_read);

    setNotificationActionId(id);
    setNotificationError("");

    try {
      await api.patch(`/notifications/${id}/archive`);

      setNotifications((current) =>
        current.filter((item) => item.notification_id !== id)
      );

      if (wasUnread) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error("Failed to archive notification:", error);
      setNotificationError(text.loadError);
    } finally {
      setNotificationActionId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(isKhmer ? "km-KH" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <header className="relative z-30 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-slate-800">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Language */}
        <div className="relative">
          <button
            type="button"
            aria-label={text.language}
            aria-expanded={openMenu === "language"}
            onClick={() => toggleMenu("language")}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Globe size={16} />
            <span className="hidden sm:inline">{text.language}</span>
            <ChevronDown size={14} />
          </button>

          {openMenu === "language" && (
            <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {[
                { value: "en", label: "English" },
                { value: "km", label: "ភាសាខ្មែរ" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeLanguage(option.value)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                    language === option.value
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-700"
                  }`}
                >
                  <Languages size={16} />
                  {option.label}
                  {language === option.value && (
                    <span className="ml-auto">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            aria-label={text.notifications}
            aria-expanded={openMenu === "notifications"}
            onClick={() => toggleMenu("notifications")}
            className="relative rounded-full p-2.5 text-slate-500 hover:bg-slate-100"
          >
            <Bell size={19} />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {openMenu === "notifications" && (
            <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    {text.notifications}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {unreadCount} unread
                  </p>
                </div>

                <button
                  type="button"
                  disabled={unreadCount === 0 || markingAllRead}
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {markingAllRead ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <CheckCheck size={14} />
                  )}
                  <span>{text.markAllRead}</span>
                </button>
              </div>

              {notificationError && (
                <div className="flex items-start gap-2 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{notificationError}</span>
                </div>
              )}

              <div className="max-h-[390px] overflow-y-auto">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                    <LoaderCircle size={18} className="animate-spin" />
                    {text.loading}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell
                      size={26}
                      className="mx-auto mb-2 text-slate-300"
                    />
                    <p className="text-sm text-slate-500">{text.empty}</p>
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const isRead = Boolean(notification.is_read);
                    const id = notification.notification_id;
                    const busy = notificationActionId === id;

                    return (
                      <div
                        key={id}
                        className={`border-b border-slate-100 px-4 py-3 ${
                          isRead ? "bg-white" : "bg-blue-50/60"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => markAsRead(notification)}
                          className="block w-full text-left disabled:opacity-60"
                        >
                          <div className="flex items-start gap-2">
                            {!isRead && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800">
                                {notification.title || notification.notification_type || text.notifications}
                              </p>

                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
                                {notification.message || ""}
                              </p>

                              <p className="mt-2 text-xs text-slate-400">
                                {formatDate(notification.created_at)}
                              </p>
                            </div>
                          </div>
                        </button>

                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => archiveNotification(notification)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                          >
                            {busy ? (
                              <LoaderCircle size={13} className="animate-spin" />
                            ) : (
                              <Archive size={13} />
                            )}
                            {text.archive}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {notificationPageKey && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.(notificationPageKey);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-slate-50"
                >
                  {text.openNotifications}
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative border-l border-slate-200 pl-3 sm:pl-4">
          <button
            type="button"
            aria-label={text.account}
            aria-expanded={openMenu === "profile"}
            onClick={() => toggleMenu("profile")}
            className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50 sm:gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-semibold text-white">
  {avatarUrl ? (
    <img
      src={avatarUrl}
      alt="Profile"
      className="h-full w-full object-cover"
      onError={() => setAvatarUrl("")}
    />
  ) : (
    initials
  )}
</div>

            <div className="hidden min-w-0 leading-tight sm:block">
              <p className="max-w-[160px] truncate text-sm font-medium text-slate-800">
                {userName}
              </p>
              <p className="mt-1 text-xs text-slate-500">{userRole}</p>
            </div>

            <ChevronDown
              size={15}
              className="hidden text-slate-400 sm:block"
            />
          </button>

          {openMenu === "profile" && (
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-4">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {userName}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {user.email || userRole}
                </p>
                <span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {userRole}
                </span>
              </div>

              {settingsPageKey && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate?.(settingsPageKey);
                    setOpenMenu(null);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings size={17} />
                  {text.settings}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onLogout?.();
                }}
                className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut size={17} />
                {text.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
