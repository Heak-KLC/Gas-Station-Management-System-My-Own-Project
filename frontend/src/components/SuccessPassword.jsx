import React from "react";
import { ShieldCheck } from "lucide-react";

export default function SuccessPassword({ onBackToLogin }) {
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
      <div className="relative w-full max-w-md rounded-3xl border border-cyan-200/30 bg-slate-900/40 backdrop-blur-xl shadow-2xl p-8 text-center">
        {/* Icon badge */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2} />
        </div>

        <h1 className="text-xl font-semibold text-white mb-3 leading-snug">
          You've successfully changed your password
        </h1>

        <p className="text-sm text-white/70 mb-8 leading-relaxed max-w-sm mx-auto">
          You can now use your new password to log in to your account.
        </p>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full rounded-xl bg-white text-slate-900 font-semibold py-3 hover:bg-cyan-50 transition shadow-lg"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
