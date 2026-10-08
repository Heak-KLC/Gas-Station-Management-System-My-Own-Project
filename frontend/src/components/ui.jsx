export function StatCard({ icon, label, value, delta, deltaTone = "up" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-medium text-black">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{value}</div>
        </div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
      {delta && (
        <div
          className={`mt-2 text-xs font-medium ${
            deltaTone === "up"
              ? "text-emerald-500"
              : deltaTone === "neutral"
              ? "text-slate-400"
              : "text-rose-500"
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES = {
  sufficient: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  active: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  "critical low": "bg-rose-50 text-rose-600 ring-rose-200",
  "check status": "bg-amber-50 text-amber-600 ring-amber-200",
  "low stock": "bg-amber-50 text-amber-600 ring-amber-200",
  "critical stock": "bg-rose-50 text-rose-600 ring-rose-200",
  "in stock": "bg-emerald-50 text-emerald-600 ring-emerald-200",
};

export function StatusBadge({ status }) {
  const style =
    STATUS_STYLES[status?.toLowerCase()] ??
    "bg-slate-100 text-slate-500 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}

export function Panel({ title, action, children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-md transition-shadow hover:shadow-lg ${className}`}
    >
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
