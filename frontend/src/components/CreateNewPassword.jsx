import React, { useState } from "react";
import { EyeOff, Eye } from "lucide-react";

export default function CreateNewPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ password, confirmPassword });
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

      {/* Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-cyan-200/30 bg-slate-900/40 backdrop-blur-xl shadow-2xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Create New Password
        </h1>
        <p className="text-sm text-white/70 mb-6 leading-relaxed">
          Please enter a new password.
          <br />
          Your new password must be different from password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New password field */}
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
                placeholder="Set new password"
                className="w-full rounded-xl bg-cyan-50/10 border border-cyan-200/40 text-white placeholder-white/50 px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-cyan-300/60 focus:border-cyan-300/60 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-100/80 hover:text-white transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm password field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-white/90 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl bg-cyan-50/10 border border-cyan-200/40 text-white placeholder-white/50 px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-cyan-300/60 focus:border-cyan-300/60 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-100/80 hover:text-white transition"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full rounded-xl bg-white text-slate-900 font-semibold py-3 hover:bg-cyan-50 transition shadow-lg"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
