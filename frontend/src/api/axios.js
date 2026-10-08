import axios from "axios";

// --------------------------------------------------
// Laravel API base URL
// --------------------------------------------------
// All API requests from React will use this base URL.
// Laravel backend is currently running on port 8000.
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});


// --------------------------------------------------
// Add Sanctum token automatically to API requests
// --------------------------------------------------
// After login, the Sanctum token is stored in
// sessionStorage.
//
// This interceptor automatically reads the token
// and adds:
//
// Authorization: Bearer <token>
//
// to protected API requests.
// --------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // Get the authentication token from the
    // current browser session.
    const token = sessionStorage.getItem("gas_station_token");

    // If a token exists, attach it to the request.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// --------------------------------------------------
// Handle expired / invalid authentication tokens
// --------------------------------------------------
// If Laravel returns HTTP 401 Unauthorized,
// the current Sanctum token is no longer valid.
//
// This can happen when the same user logs out
// from another browser/session and Laravel deletes
// all tokens belonging to that user.
// --------------------------------------------------
api.interceptors.response.use(
  (response) => response,

  (error) => {
    // Check whether Laravel rejected the token.
    if (error.response?.status === 401) {

      // Remove the invalid token from the
      // current browser session.
      sessionStorage.removeItem("gas_station_token");

      // Return the user to the Login page.
      //
      // This ensures that a browser whose token
      // was deleted from Laravel cannot continue
      // using the authenticated application.
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);


export default api;