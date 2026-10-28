
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  DollarSign,
  Droplet,
  ShoppingCart,
  PieChart,
  Eye,
  Download,
  Mail,
  Filter,
  RotateCcw,
  X,
  FileText,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Package,
  Wrench,
} from "lucide-react";

const API_URL = "https://gas-station-backend-ps9c.onrender.com/api";

const GOLD = "#b8860b";

const REPORT_TYPES = [
  { label: "Monthly Summary", value: "monthly_revenue" },
  { label: "Daily Sales", value: "daily_fuel_sales" },
  { label: "Fuel Sales", value: "daily_fuel_sales" },
  { label: "Inventory", value: "fuel_inventory" },
  { label: "Profit & Loss", value: "profit_loss" },
  { label: "Store Sales", value: "store_sales" },
  { label: "Fuel Purchase", value: "fuel_purchase" },
  { label: "Maintenance", value: "equipment_maintenance" },
];

const REPORT_LABELS = {
  daily_fuel_sales: "Daily Sales",
  monthly_revenue: "Monthly Summary",
  fuel_inventory: "Inventory",
  fuel_purchase: "Fuel Purchase",
  customer: "Customer",
  supplier: "Supplier",
  employee: "Employee",
  store_sales: "Store Sales",
  profit_loss: "Profit & Loss",
  equipment_maintenance: "Maintenance",
};

const PERIODS = [
  "This Month",
  "Last Month",
  "Last 3 Months",
  "This Year",
];

const COMPARE_OPTIONS = [
  "Previous Month",
  "Previous Year",
  "No comparison",
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "payments", label: "Payment Methods" },
  { id: "categories", label: "Store Categories" },
  { id: "weekly", label: "Weekly Overview" },
];

const nf = (value, decimals = 2) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const money = (value) => `$ ${nf(value)}`;

const numberValue = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const dateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return (
    date.toLocaleDateString("en-GB") +
    " " +
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

const getToken = () => sessionStorage.getItem("gas_station_token");

async function apiRequest(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "មិនមាន Login Token ទេ។ សូម Login ម្តងទៀត រួចសាកល្បងឡើងវិញ។"
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";

    throw new Error(
      validationMessage ||
        result.message ||
        `Request failed (${response.status})`
    );
  }

  return result;
}

function downloadCSV(filename, headers, rows) {
  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const content = [headers, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            type="button"
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

function Btn({
  children,
  variant = "gold",
  className = "",
  ...props
}) {
  const styles = {
    gold: "bg-[#b8860b] text-white hover:bg-[#9a7009]",
    ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <label className="block min-w-[150px] text-sm text-slate-700">
      {label}
      <select
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-[#b8860b]"
      >
        {options.map((option) => {
          const item =
            typeof option === "string"
              ? { label: option, value: option }
              : option;

          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

const tableHeader =
  "whitespace-nowrap bg-[#0b2545] px-3 py-3 text-left text-xs font-semibold text-white";

function DataTable({
  columns,
  rows,
  emptyMessage = "No data available.",
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label} className={tableHeader}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id ?? row.key ?? index}
              className="border-b last:border-0 hover:bg-slate-50"
            >
              {columns.map((column) => (
                <td
                  key={column.label}
                  className="whitespace-nowrap px-3 py-3 text-slate-700"
                >
                  {column.render
                    ? column.render(row)
                    : row[column.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BarChart({ data, valueKey, labelKey = "label", format = money }) {
  const values = data.map((item) => numberValue(item[valueKey]));
  const max = Math.max(...values, 1);

  if (!data.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        No chart data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const value = numberValue(item[valueKey]);
        const width = Math.max((value / max) * 100, value > 0 ? 1 : 0);

        return (
          <div key={`${item[labelKey]}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="max-w-[65%] truncate text-slate-600">
                {item[labelKey] || "Other"}
              </span>
              <span className="font-semibold text-slate-800">
                {format(value)}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${width}%`,
                  backgroundColor: index % 2 === 0 ? GOLD : "#d39a2c",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getReportType(report) {
  return (
    REPORT_LABELS[report.report_type] ||
    report.report_type ||
    "Report"
  );
}

function getReportName(report) {
  const parameters = report.parameters || {};

  return (
    parameters.name ||
    parameters.report_name ||
    `${getReportType(report)} Report`
  );
}

function getReportData(report) {
  let data = report.report_data;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return data;
    }
  }

  return data;
}

function formatReportPayload(data) {
  if (data == null) return "No report data.";

  if (typeof data === "string") return data;

  return JSON.stringify(data, null, 2);
}

const DEFAULT_FILTERS = {
  period: "This Month",
  compare: "No comparison",
  reportType: "all",
};

export default function BranchReports() {
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(DEFAULT_FILTERS);

  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);

  const [generation, setGeneration] = useState({
    type: "monthly_revenue",
    period: "This Month",
  });

  const loadData = useCallback(async (isRefresh = false) => {
    setError("");

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const endpoints = [
      {
        key: "summary",
        path: "/reports/summary",
      },
      {
        key: "weekly",
        path: "/reports/integrated-overview",
      },
      {
        key: "payments",
        path: "/reports/sales-by-payment-method",
      },
      {
        key: "categories",
        path: "/reports/store-categories",
      },
      {
        key: "reports",
        path: "/reports",
      },
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map((endpoint) => apiRequest(endpoint.path))
      );

      const failed = [];

      results.forEach((result, index) => {
        const key = endpoints[index].key;

        if (result.status === "rejected") {
          failed.push({
            key,
            message: result.reason?.message || "Failed to load data.",
          });
          return;
        }

        const response = result.value;

        if (response.success === false) {
          failed.push({
            key,
            message: response.message || "API returned an error.",
          });
          return;
        }

        const data = response.data;

        if (key === "summary") {
          setSummary(data || null);
        } else if (key === "weekly") {
          setWeeklyData(Array.isArray(data) ? data : []);
        } else if (key === "payments") {
          setPaymentData(Array.isArray(data) ? data : []);
        } else if (key === "categories") {
          setCategoryData(Array.isArray(data) ? data : []);
        } else if (key === "reports") {
          setReports(Array.isArray(data) ? data : []);
        }
      });

      if (failed.length) {
        setError(
          failed
            .map((item) => `${item.key}: ${item.message}`)
            .join(" | ")
        );
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (message) => setToast(message);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const closeModal = () => setModal(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const startOfLastMonth = new Date(year, month - 1, 1);
    const endOfLastMonth = new Date(year, month, 0);

    const startOfThreeMonths = new Date(year, month - 2, 1);

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const format = (date) => date.toLocaleDateString("en-GB");

    let start = startOfMonth;
    let end = endOfMonth;

    if (applied.period === "Last Month") {
      start = startOfLastMonth;
      end = endOfLastMonth;
    } else if (applied.period === "Last 3 Months") {
      start = startOfThreeMonths;
      end = endOfMonth;
    } else if (applied.period === "This Year") {
      start = startOfYear;
      end = endOfYear;
    }

    return `${format(start)} - ${format(end)}`;
  }, [applied.period]);

  const totals = useMemo(() => {
    const fuelSales = numberValue(summary?.fuel_sales);
    const storeSales = numberValue(summary?.store_sales);
    const refunds = numberValue(summary?.approved_refunds);
    const maintenance = numberValue(summary?.maintenance_cost);
    const revenueAfterRefunds = numberValue(
      summary?.revenue_after_refunds
    );

    return {
      fuelSales,
      storeSales,
      refunds,
      maintenance,
      revenueAfterRefunds,
      totalSales: fuelSales + storeSales,
    };
  }, [summary]);

  const filteredReports = useMemo(() => {
    if (applied.reportType === "all") return reports;

    return reports.filter(
      (report) => report.report_type === applied.reportType
    );
  }, [reports, applied.reportType]);

  const paymentRows = useMemo(
    () =>
      paymentData.map((item, index) => ({
        ...item,
        key: `${item.payment_method || "unknown"}-${index}`,
        payment_method: item.payment_method || "Unknown",
        total_sales: numberValue(item.total_sales),
        transaction_count: numberValue(item.transaction_count),
      })),
    [paymentData]
  );

  const categoryRows = useMemo(
    () =>
      categoryData.map((item, index) => ({
        ...item,
        key: `${item.category_id ?? "category"}-${index}`,
        category_name: item.category_name || "Uncategorized",
        units_sold: numberValue(item.units_sold),
        total_sales: numberValue(item.total_sales),
      })),
    [categoryData]
  );

  const weeklyRows = useMemo(
    () =>
      weeklyData.map((item, index) => ({
        ...item,
        key: `${item.week ?? "week"}-${index}`,
        week: item.week ?? "—",
        week_end: item.week_end ?? "—",
        revenue: numberValue(item.revenue),
        expenses: numberValue(item.expenses),
      })),
    [weeklyData]
  );

  const kpis = [
    {
      label: "Fuel Sales",
      value: money(totals.fuelSales),
      description: "Paid fuel sales",
      icon: Droplet,
      tone: "bg-violet-50",
      iconTone: "bg-violet-100 text-violet-700",
    },
    {
      label: "Store Sales",
      value: money(totals.storeSales),
      description: "Paid store sales",
      icon: ShoppingCart,
      tone: "bg-orange-50",
      iconTone: "bg-orange-100 text-orange-600",
    },
    {
      label: "Total Sales",
      value: money(totals.totalSales),
      description: "Fuel + store sales",
      icon: DollarSign,
      tone: "bg-emerald-50",
      iconTone: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Approved Refunds",
      value: money(totals.refunds),
      description: "Approved refunds",
      icon: CreditCard,
      tone: "bg-red-50",
      iconTone: "bg-red-100 text-red-600",
    },
    {
      label: "Maintenance Cost",
      value: money(totals.maintenance),
      description: "Completed maintenance",
      icon: Wrench,
      tone: "bg-blue-50",
      iconTone: "bg-blue-100 text-blue-700",
    },
  ];

  const paymentColumns = [
    {
      label: "Payment Method",
      render: (row) => row.payment_method,
    },
    {
      label: "Total Sales",
      render: (row) => money(row.total_sales),
    },
    {
      label: "Transactions",
      render: (row) => nf(row.transaction_count, 0),
    },
  ];

  const categoryColumns = [
    {
      label: "Category",
      render: (row) => row.category_name,
    },
    {
      label: "Units Sold",
      render: (row) => nf(row.units_sold, 0),
    },
    {
      label: "Total Sales",
      render: (row) => money(row.total_sales),
    },
  ];

  const weeklyColumns = [
    {
      label: "Week",
      render: (row) => row.week,
    },
    {
      label: "Week Ending",
      render: (row) => row.week_end,
    },
    {
      label: "Revenue",
      render: (row) => money(row.revenue),
    },
    {
      label: "Expenses",
      render: (row) => money(row.expenses),
    },
  ];

  const reportColumns = [
    {
      label: "Report Name",
      render: (row) => (
        <span className="font-medium text-slate-800">
          {getReportName(row)}
        </span>
      ),
    },
    {
      label: "Report Type",
      render: (row) => getReportType(row),
    },
    {
      label: "Generated Date",
  render: (row) => dateTime(row.generated_date),
    },
    {
  label: "Generated By",
  render: (row) =>
    row.generated_by_name ||
    row.generatedBy?.name ||
    row.generatedBy?.username ||
    row.generated_by?.name ||
    row.generated_by?.username ||
    "—",
},
    {
      label: "Action",
      render: (row) => (
        <div className="flex gap-1">
          <button
            type="button"
            title="View report"
            aria-label="View report"
            className="rounded p-1 hover:bg-slate-200"
            onClick={() => setModal({ type: "viewReport", report: row })}
          >
            <Eye size={15} />
          </button>

          <button
            type="button"
            title="Download report data"
            aria-label="Download report data"
            className="rounded p-1 hover:bg-slate-200"
            onClick={() => {
              const data = getReportData(row);

              downloadCSV(
                `${getReportName(row).replace(/[^\w-]+/g, "_")}.csv`,
                ["Report Type", "Generated Date", "Report Data"],
                [[getReportType(row), dateTime(row.created_at), formatReportPayload(data)]]
              );

              showToast("Report downloaded");
            }}
          >
            <Download size={15} />
          </button>
        </div>
      ),
    },
  ];

  const exportPaymentData = () => {
    downloadCSV(
      "sales_by_payment_method.csv",
      ["Payment Method", "Total Sales", "Transaction Count"],
      paymentRows.map((row) => [
        row.payment_method,
        row.total_sales,
        row.transaction_count,
      ])
    );

    showToast("Payment report downloaded");
  };

  const exportCategoryData = () => {
    downloadCSV(
      "store_categories.csv",
      ["Category", "Units Sold", "Total Sales"],
      categoryRows.map((row) => [
        row.category_name,
        row.units_sold,
        row.total_sales,
      ])
    );

    showToast("Category report downloaded");
  };

  const exportWeeklyData = () => {
    downloadCSV(
      "weekly_overview.csv",
      ["Week", "Week Ending", "Revenue", "Expenses"],
      weeklyRows.map((row) => [
        row.week,
        row.week_end,
        row.revenue,
        row.expenses,
      ])
    );

    showToast("Weekly report downloaded");
  };

  const generateReport = async (event) => {
    event.preventDefault();

    try {
      const reportType = generation.type;

      const reportData = {
        summary: summary || {},
        weekly_overview: weeklyData,
        sales_by_payment_method: paymentData,
        store_categories: categoryData,
      };

      const result = await apiRequest("/reports", {
        method: "POST",
        body: JSON.stringify({
          report_type: reportType,
          report_data: reportData,
          parameters: {
            name: `${REPORT_LABELS[reportType] || reportType} Report`,
            period: generation.period,
            scope: "system-wide",
            generated_at: new Date().toISOString(),
          },
        }),
      });

      if (result.success === false) {
        throw new Error(result.message || "Could not generate report.");
      }

      if (result.data) {
        setReports((current) => [result.data, ...current]);
      } else {
        await loadData(true);
      }

      closeModal();
      showToast("Report saved successfully");
    } catch (requestError) {
      setError(requestError.message || "Could not generate report.");
    }
  };

  const markAllRead = () => {
    // The current API does not provide a mark-as-read endpoint.
    showToast(
      "Mark-as-read is unavailable because the API has no read-status endpoint."
    );
  };

  return (
    <div className="min-h-full space-y-4 bg-slate-300 p-4 md:p-6 -m-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#b8860b] text-white">
            <FileText size={28} />
          </span>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Business Report
            </h2>
            <p className="text-sm text-slate-600">
              View and analyze actual sales and operating reports.
            </p>
            
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Btn
            variant="ghost"
            onClick={markAllRead}
            className="!px-3"
            type="button"
          >
            <Mail size={17} />
            Mark all as read
          </Btn>

          <Btn
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            type="button"
          >
            {refreshing ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </Btn>
        </div>
      </div>

      {/* API error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Some report data could not be loaded.</p>
            <p className="mt-1 break-words">{error}</p>
            <p className="mt-1 text-xs">
              Check Laravel, the API routes, your login token, and the browser
              console for database errors.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Filters */}
      <section className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <SelectField
          label="Period"
          options={PERIODS}
          value={draft.period}
          onChange={(event) =>
            setDraft({ ...draft, period: event.target.value })
          }
        />

        <SelectField
          label="Compare With"
          options={COMPARE_OPTIONS}
          value={draft.compare}
          onChange={(event) =>
            setDraft({ ...draft, compare: event.target.value })
          }
        />

        <SelectField
          label="Report Type"
          options={[
            { label: "All Reports", value: "all" },
            ...Object.entries(REPORT_LABELS).map(([value, label]) => ({
              label,
              value,
            })),
          ]}
          value={draft.reportType}
          onChange={(event) =>
            setDraft({ ...draft, reportType: event.target.value })
          }
        />

        <Btn
          onClick={() => setApplied(draft)}
          type="button"
          className="flex items-center gap-2"
        >
          <Filter size={15} />
          Filter
        </Btn>

        <Btn
          variant="ghost"
          type="button"
          onClick={() => {
            setDraft(DEFAULT_FILTERS);
            setApplied(DEFAULT_FILTERS);
          }}
        >
          <RotateCcw size={15} />
          Reset
        </Btn>

        <p className="pb-2 text-xs text-slate-500">
          Selected period: {dateRange}
        </p>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={`flex items-center justify-between gap-3 rounded-xl p-4 ring-1 ring-slate-100 ${item.tone}`}
            >
              <div className="min-w-0">
                <p className="text-xs text-slate-600">{item.label}</p>

                <p className="mt-1 break-words text-lg font-bold text-slate-900">
                  {loading ? "Loading..." : item.value}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.description}
                </p>
              </div>

              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.iconTone}`}
              >
                <Icon size={20} />
              </span>
            </div>
          );
        })}
      </div>

      {/* Revenue after refunds */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <TrendingUp size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Revenue After Refunds
            </p>
            <p className="text-xs text-slate-600">
              API summary value; this is not net profit.
            </p>
          </div>
        </div>

        <p className="text-xl font-bold text-[#8b6508]">
          {loading ? "Loading..." : money(totals.revenueAfterRefunds)}
        </p>
      </div>

      {/* Report content */}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex flex-wrap gap-5 border-b text-sm">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`-mb-px border-b-2 pb-2 ${
                    activeTab === item.id
                      ? "border-[#b8860b] font-semibold text-[#b8860b]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <>
                <h3 className="mb-4 text-sm font-bold text-slate-800">
                  Sales Overview
                </h3>

                <BarChart
                  data={[
                    { label: "Fuel Sales", value: totals.fuelSales },
                    { label: "Store Sales", value: totals.storeSales },
                    { label: "Approved Refunds", value: totals.refunds },
                    {
                      label: "Maintenance Cost",
                      value: totals.maintenance,
                    },
                  ]}
                  valueKey="value"
                />
              </>
            )}

            {activeTab === "payments" && (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    Sales by Payment Method
                  </h3>

                  <Btn
                    variant="ghost"
                    onClick={exportPaymentData}
                    type="button"
                    className="!px-3 !py-1.5"
                  >
                    <Download size={14} />
                    CSV
                  </Btn>
                </div>

                <BarChart
                  data={paymentRows.map((item) => ({
                    label: item.payment_method,
                    sales: item.total_sales,
                  }))}
                  valueKey="sales"
                />
              </>
            )}

            {activeTab === "categories" && (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    Store Category Sales
                  </h3>

                  <Btn
                    variant="ghost"
                    onClick={exportCategoryData}
                    type="button"
                    className="!px-3 !py-1.5"
                  >
                    <Download size={14} />
                    CSV
                  </Btn>
                </div>

                <BarChart
                  data={categoryRows.map((item) => ({
                    label: item.category_name,
                    sales: item.total_sales,
                  }))}
                  valueKey="sales"
                />
              </>
            )}

            {activeTab === "weekly" && (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    Weekly Revenue and Expenses
                  </h3>

                  <Btn
                    variant="ghost"
                    onClick={exportWeeklyData}
                    type="button"
                    className="!px-3 !py-1.5"
                  >
                    <Download size={14} />
                    CSV
                  </Btn>
                </div>

                <BarChart
                  data={weeklyRows.map((item) => ({
                    label: `Week ${item.week}`,
                    value: item.revenue,
                  }))}
                  valueKey="value"
                />

                <p className="mt-3 text-xs text-slate-500">
                  The chart shows revenue. The table below also shows expenses.
                </p>
              </>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-3 text-sm font-bold text-slate-800">
              Operating Summary
            </h3>

            <div className="space-y-3">
              {[
                {
                  label: "Fuel Sales",
                  value: totals.fuelSales,
                  icon: Droplet,
                },
                {
                  label: "Store Sales",
                  value: totals.storeSales,
                  icon: Package,
                },
                {
                  label: "Approved Refunds",
                  value: totals.refunds,
                  icon: CreditCard,
                },
                {
                  label: "Maintenance Cost",
                  value: totals.maintenance,
                  icon: Wrench,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Icon size={17} className="text-[#b8860b]" />
                      {item.label}
                    </div>

                    <span className="text-sm font-semibold text-slate-800">
                      {loading ? "Loading..." : money(item.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                {activeTab === "payments"
                  ? "Payment Method Details"
                  : activeTab === "categories"
                  ? "Category Details"
                  : activeTab === "weekly"
                  ? "Weekly Details"
                  : "Sales Summary"}
              </h3>

              {activeTab === "overview" && (
                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                  System-wide
                </span>
              )}
            </div>

            {activeTab === "payments" ? (
              <DataTable
                columns={paymentColumns}
                rows={paymentRows}
                emptyMessage="No payment method data returned by the API."
              />
            ) : activeTab === "categories" ? (
              <DataTable
                columns={categoryColumns}
                rows={categoryRows}
                emptyMessage="No store category data returned by the API."
              />
            ) : activeTab === "weekly" ? (
              <DataTable
                columns={weeklyColumns}
                rows={weeklyRows}
                emptyMessage="No weekly overview data returned by the API."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    label: "Metric",
                    key: "label",
                  },
                  {
                    label: "Amount",
                    render: (row) => money(row.value),
                  },
                ]}
                rows={[
                  { key: "fuel", label: "Fuel Sales", value: totals.fuelSales },
                  {
                    key: "store",
                    label: "Store Sales",
                    value: totals.storeSales,
                  },
                  {
                    key: "total",
                    label: "Total Sales",
                    value: totals.totalSales,
                  },
                  {
                    key: "refund",
                    label: "Approved Refunds",
                    value: totals.refunds,
                  },
                  {
                    key: "maintenance",
                    label: "Maintenance Cost",
                    value: totals.maintenance,
                  },
                  {
                    key: "net",
                    label: "Revenue After Refunds",
                    value: totals.revenueAfterRefunds,
                  },
                ]}
              />
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Recent Reports
              </h3>

              <Btn
                type="button"
                onClick={() => setModal({ type: "generate" })}
                className="!px-3 !py-1.5"
              >
                + Generate Report
              </Btn>
            </div>

            <DataTable
              columns={reportColumns}
              rows={filteredReports.slice(0, 5)}
              emptyMessage="No saved reports match your filters."
            />

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>{filteredReports.length} saved report(s)</span>
              <button
                type="button"
                className="font-medium text-sky-700 hover:underline"
                onClick={() =>
                  setModal({ type: "allReports", reports: filteredReports })
                }
              >
                View all reports →
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Generate report modal */}
      {modal?.type === "generate" && (
        <Modal title="Generate Report" onClose={closeModal}>
          <form onSubmit={generateReport} className="space-y-4">
            <p className="text-sm text-slate-500">
              The report will be saved to the reports table using the current
              data returned by the API.
            </p>

            <SelectField
              label="Report Type"
              options={REPORT_TYPES.filter(
                (item, index, array) =>
                  array.findIndex((other) => other.value === item.value) ===
                  index
              )}
              value={generation.type}
              onChange={(event) =>
                setGeneration({
                  ...generation,
                  type: event.target.value,
                })
              }
            />

            <SelectField
              label="Report Period"
              options={PERIODS}
              value={generation.period}
              onChange={(event) =>
                setGeneration({
                  ...generation,
                  period: event.target.value,
                })
              }
            />

            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              This saves a system-wide report. The current API does not provide
              branch-specific report data.
            </div>

            <div className="flex justify-end gap-2">
              <Btn
                type="button"
                variant="ghost"
                onClick={closeModal}
              >
                Cancel
              </Btn>

              <Btn type="submit">
                <FileText size={15} />
                Generate and Save
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* View saved report */}
      {modal?.type === "viewReport" && (
        <Modal
          wide
          title={getReportName(modal.report)}
          onClose={closeModal}
        >
          <div className="mb-4 space-y-1 text-sm text-slate-500">
            <p>Type: {getReportType(modal.report)}</p>
            <p>Generated: {dateTime(modal.report.created_at)}</p>
            <p>
              Generated by:{" "}
              {modal.report.generatedBy?.name ||
                modal.report.generated_by_name ||
                modal.report.generated_by ||
                "—"}
            </p>
          </div>

          <pre className="max-h-[50vh] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
            {formatReportPayload(getReportData(modal.report))}
          </pre>

          <div className="mt-4 flex justify-end">
            <Btn variant="ghost" onClick={closeModal} type="button">
              Close
            </Btn>
          </div>
        </Modal>
      )}

      {/* View all saved reports */}
      {modal?.type === "allReports" && (
        <Modal
          wide
          title="All Saved Reports"
          onClose={closeModal}
        >
          <DataTable
            columns={reportColumns}
            rows={modal.reports}
            emptyMessage="No saved reports found."
          />
        </Modal>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-4 text-sm text-slate-500">
          <LoaderCircle size={18} className="animate-spin" />
          Loading report data from Laravel...
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
