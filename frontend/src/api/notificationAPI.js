import api from "./axios";

// ==================================================
// NOTIFICATION API
// This file contains functions for communicating
// with the Laravel Notification API.
// The existing axios.js automatically attaches
// the Sanctum Bearer Token to each request.
// ==================================================

// Get all notifications or filter by notification type.
export const getNotifications = async (type = null) => {
  const params = {};

  // Only send the filter when a specific type is selected.
  if (type) {
    params.type = type;
  }

  const response = await api.get("/notifications", {
    params,
  });

  return response.data;
};

// Mark one notification as read.
export const markNotificationAsRead = async (id) => {
  const response = await api.patch(
    `/notifications/${id}/read`
  );

  return response.data;
};

// Mark all of the current user's notifications as read.
export const markAllNotificationsAsRead = async () => {
  const response = await api.patch(
    "/notifications/read-all"
  );

  return response.data;
};


/**
 * Archive all notifications visible to the current Admin.
 */
export const archiveAllNotifications = async () => {
  const response = await api.patch("/notifications/archive-all");
  return response.data;
};
