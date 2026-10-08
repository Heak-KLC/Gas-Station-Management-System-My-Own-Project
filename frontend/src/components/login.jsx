import React, { useState } from "react";
import { Mail, Eye, EyeOff } from "lucide-react";
import api from "../api/axios";

// Receive onLogin from App.jsx.
// This function will be called when the Login form is submitted.
export default function Login({ onLogin }) {
  // Controls whether the password is visible or hidden.
  const [showPassword, setShowPassword] = useState(false);

  // Stores the Remember Me checkbox state.
  const [rememberMe, setRememberMe] = useState(false);

  // Stores the email entered by the user.
  const [email, setEmail] = useState("");

  // Stores the password entered by the user.
  const [password, setPassword] = useState("");

  // --------------------------------------------------
  // Handle Login form submission
  // --------------------------------------------------
  // This function sends the email and password to
  // Laravel's POST /api/login endpoint.
  const handleSubmit = async (e) => {
    // Prevent the browser from refreshing the page.
    e.preventDefault();

    try {
      // Send login information to Laravel.
      const response = await api.post("/login", {
        email: email,
        password: password,
      });

      // Get token and user information from Laravel response.
      const { token, user } = response.data;

      // --------------------------------------------------
      // Store the Sanctum token in the current session.
      // --------------------------------------------------
      // We use sessionStorage instead of localStorage.
      //
      // This keeps the authentication token limited to
      // the current browser session and prevents the
      // application from permanently restoring login
      // from localStorage.
      // --------------------------------------------------
      sessionStorage.setItem("gas_station_token", token);

      // Send the authenticated user back to App.jsx.
      onLogin(user);

      console.log("Login successful:", user);
    } catch (error) {
      // If Laravel returns an error, show the error message.
      const message =
        error.response?.data?.message || "Login failed. Please try again.";

      alert(message);

      console.error("Login error:", error);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 relative"
      style={{
        backgroundImage:
          "url('https://i.pinimg.com/1200x/ec/e5/bc/ece5bcbca2610e40317e528caddbafc1.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-slate-950/40" />

      {/* Login card */}
      <div className="relative w-full max-w-md rounded-3xl border border-cyan-200/30 bg-slate-900/40 backdrop-blur-xl shadow-2xl p-8">
        <h1 className="text-2xl font-semibold text-white text-center mb-6">
          Login to your account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white/90 mb-1.5"
            >
              Email Address
            </label>

            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@gmail.com"
                className="w-full rounded-xl bg-cyan-50/10 border border-cyan-200/40 text-white placeholder-white/50 px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-cyan-300/60 focus:border-cyan-300/60 transition"
                required
              />

              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-100/80" />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/90 mb-1.5"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create your password"
                className="w-full rounded-xl bg-cyan-50/10 border border-cyan-200/40 text-white placeholder-white/50 px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-cyan-300/60 focus:border-cyan-300/60 transition"
                required
              />

              {/* Show / Hide password button */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-100/80 hover:text-white transition"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me / Forgot password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-white/85 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-cyan-200/50 bg-transparent accent-cyan-400"
              />

              Remember me
            </label>

            <a
              href="#"
              className="text-cyan-300 hover:text-cyan-200 font-medium transition"
            >
              Forgot Password?
            </a>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full rounded-xl bg-white text-slate-900 font-semibold py-3 hover:bg-cyan-50 transition shadow-lg"
          >
            Login
          </button>

          {/* Sign up link */}
          <p className="text-center text-sm text-white/85">
            Don't have an account?{" "}
            <a
              href="#"
              className="text-cyan-300 hover:text-cyan-200 font-medium transition"
            >
              Get Started
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
