
import React, { useState, useEffect, useCallback } from "react";
import {
  FilePlus,
  Download,
  Printer,
  X,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Panel, StatusBadge, StatCard } from "../components/ui";
import api from "../api/axios";

// =====================================================
// MASTER REPORTS
// React Frontend + Laravel API + MySQL
//
// GET  /api/reports
// POST /api/reports
// GET  /api/reports/summary
// GET  /api/reports/integrated-overview
// GET  /api/reports/sales-by-payment-method
// GET  /api/reports/store-categories
// =====================================================

// Keep the existing chart colors.
const CHART_COLORS = {
  fuel: "#0ea5e9",
  store: "#f59e0b",
  refunds: "#10b981",
  expenses: "#f43f5e",
  purple: "#6366f1",
};

// Report types must match the Laravel validation rules.
const REPORT_TYPES = [
  "daily_fuel_sales",
  "monthly_revenue",
  "fuel_inventory",
  "fuel_purchase",
  "customer",
  "supplier",
  "employee",
  "store_sales",
  "profit_loss",
  "equipment_maintenance",
];

// Format a number as USD currency.
const formatCurrency = (value) => {
  const amount = Number(value);

  return `$${(Number.isFinite(amount) ? amount : 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

// Safely parse JSON fields returned by Laravel.
const parseJsonValue = (value, fallback = {}) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// Map database report records to the existing report table.
const mapReport = (item) => {
  const parameters = parseJsonValue(item.parameters, {});
  const reportData = parseJsonValue(item.report_data, {});

  // generatedBy is the Laravel relationship.
  const generatedBy =
    item.generatedBy ||
    item.generated_by_user ||
    (typeof item.generated_by === "object"
      ? item.generated_by
      : null);

  const reportId = item.report_id ?? item.id;

  return {
    id: `#REP-${String(reportId ?? "").padStart(3, "0")}`,
    databaseId: reportId,
    title: parameters.title || item.report_type || "Untitled Report",
    period: parameters.period || "All Time",
    location: parameters.location || "All Stations",
    by:
      generatedBy?.full_name ||
      generatedBy?.username ||
      parameters.author ||
      "Unknown",
    date: item.generated_date
      ? String(item.generated_date).slice(0, 10)
      : "",
    status: parameters.status || "Completed",
    report_type: item.report_type,
    report_data: reportData,
    parameters,
  };
};

export default function MasterReports() {
  // =====================================================
  // STATE
  // =====================================================

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Live financial summary from Laravel.
  const [summary, setSummary] = useState({
    fuel_sales: 0,
    store_sales: 0,
    approved_refunds: 0,
    maintenance_cost: 0,
    revenue_after_refunds: 0,
  });

  // Real data returned by the three chart APIs.
  const [revenueExpenseData, setRevenueExpenseData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [storeCategoryData, setStoreCategoryData] = useState([]);

  // Chart loading and errors are separate from report history.
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [chartErrors, setChartErrors] = useState({});

  // New Report Form State.
  const [newReport, setNewReport] = useState({
    title: "",
    report_type: "profit_loss",
    period: "Q4 2026",
    location: "Main Station (#ST-001)",
    by: "",
    status: "Completed",
  });

  // =====================================================
  // FETCH REPORT HISTORY
  // GET /api/reports
  // =====================================================

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    setReportError("");

    try {
      const response = await api.get("/reports");
      const records = response.data?.data;

      if (!Array.isArray(records)) {
        throw new Error("The reports API returned an invalid response.");
      }

      setReports(records.map(mapReport));
    } catch (error) {
      console.error("Failed to load report history:", error);

      setReportError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load report history."
      );
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // =====================================================
  // FETCH LIVE FINANCIAL SUMMARY
  // GET /api/reports/summary
  // =====================================================

  const fetchSummary = useCallback(async () => {
    setSummaryError("");

    try {
      const response = await api.get("/reports/summary");

      if (
        response.data?.success !== true ||
        !response.data?.data
      ) {
        throw new Error("The summary API returned an invalid response.");
      }

      setSummary((previous) => ({
        ...previous,
        ...response.data.data,
      }));
    } catch (error) {
      console.error("Failed to load report summary:", error);

      setSummaryError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load financial summary."
      );
    }
  }, []);

  // =====================================================
  // FETCH MASTER REPORT CHART DATA
  // =====================================================

  const fetchChartData = useCallback(async () => {
    setLoadingCharts(true);
    setChartErrors({});

    // Load each chart independently.
    // One failed endpoint will not block the other charts.
    const endpoints = [
      {
        key: "overview",
        url: "/reports/integrated-overview",
        setter: setRevenueExpenseData,
      },
      {
        key: "payment",
        url: "/reports/sales-by-payment-method",
        setter: setPaymentMethodData,
      },
      {
        key: "categories",
        url: "/reports/store-categories",
        setter: setStoreCategoryData,
      },
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map(({ url }) => api.get(url))
      );

      const errors = {};

      results.forEach((result, index) => {
        const endpoint = endpoints[index];

        if (result.status === "fulfilled") {
          const response = result.value;

          if (
            response.data?.success === true &&
            Array.isArray(response.data?.data)
          ) {
            endpoint.setter(response.data.data);
          } else {
            errors[endpoint.key] =
              "The API returned an invalid data format.";
          }
        } else {
          console.error(
            `Failed to load ${endpoint.key} chart:`,
            result.reason
          );

          errors[endpoint.key] =
            result.reason?.response?.data?.message ||
            result.reason?.message ||
            `Unable to load ${endpoint.key} chart data.`;
        }
      });

      setChartErrors(errors);
    } finally {
      setLoadingCharts(false);
    }
  }, []);

  // Load reports, summary, and charts when the page opens.
  useEffect(() => {
    fetchReports();
    fetchSummary();
    fetchChartData();
  }, [fetchReports, fetchSummary, fetchChartData]);

  // =====================================================
  // ADD AND SAVE REPORT
  // POST /api/reports
  // =====================================================

  const handleAddReport = async (e) => {
    e.preventDefault();

    if (!newReport.title.trim() || !newReport.by.trim()) {
      setReportError("Please enter the report title and author.");
      return;
    }

    setSavingReport(true);
    setReportError("");

    try {
      // Save a snapshot of the current financial summary.
      // Title, period, location, and author are stored in parameters.
      const payload = {
        report_type: newReport.report_type,
        report_data: {
          fuel_sales: Number(summary.fuel_sales || 0),
          store_sales: Number(summary.store_sales || 0),
          approved_refunds: Number(summary.approved_refunds || 0),
          maintenance_cost: Number(summary.maintenance_cost || 0),
          revenue_after_refunds: Number(
            summary.revenue_after_refunds || 0
          ),
        },
        parameters: {
          title: newReport.title.trim(),
          period: newReport.period.trim(),
          location: newReport.location.trim(),
          author: newReport.by.trim(),
          status: newReport.status,
        },
      };

      // Wait for Laravel to confirm that the report was saved.
      await api.post("/reports", payload);

      // Reload the actual records from the database.
      await fetchReports();

      setNewReport({
        title: "",
        report_type: "profit_loss",
        period: "Q4 2026",
        location: "Main Station (#ST-001)",
        by: "",
        status: "Completed",
      });

      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Failed to save report:", error);

      setReportError(
        error.response?.data?.message ||
          "Unable to save the report. Please try again."
      );
    } finally {
      setSavingReport(false);
    }
  };

  // =====================================================
  // EXPORT REPORT HISTORY TO CSV
  // =====================================================

  const handleExportCSV = () => {
    const headers = [
      "Report ID",
      "Report Title",
      "Period",
      "Location",
      "Generated By",
      "Date",
      "Status",
    ];

    // Escape CSV values so commas and quotation marks are safe.
    const escapeCSV = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = reports.map((report) =>
      [
        report.id,
        report.title,
        report.period,
        report.location,
        report.by,
        report.date,
        report.status,
      ]
        .map(escapeCSV)
        .join(",")
    );

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows,
    ].join("\r\n");

    // UTF-8 BOM improves compatibility with Microsoft Excel.
    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `Master_Report_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // =====================================================
  // PRINT PAGE / SAVE AS PDF
  // =====================================================

  const handlePrint = () => {
    window.print();
    setShowExportMenu(false);
  };

  // =====================================================
  // DOWNLOAD ONE REPORT AS JSON
  // =====================================================

  const handleDownloadReport = (report) => {
    const jsonData = {
      report_id: report.databaseId,
      title: report.title,
      report_type: report.report_type,
      period: report.period,
      location: report.location,
      generated_by: report.by,
      generated_date: report.date,
      status: report.status,
      report_data: report.report_data,
      parameters: report.parameters,
    };

    const blob = new Blob(
      [JSON.stringify(jsonData, null, 2)],
      { type: "application/json;charset=utf-8;" }
    );

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${report.id}_Summary.json`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  };

  // =====================================================
  // CHART DATA TRANSFORMATION
  // Convert Laravel JSON fields to Recharts fields.
  // =====================================================

  // Backend fields: week, revenue, expenses.
  // The existing Line chart uses the key "expense".
  const revenueExpense = revenueExpenseData.map((item) => ({
    week: item.week,
    revenue: Number(item.revenue || 0),
    expense: Number(item.expenses || 0),
  }));

  // Backend fields: payment_method, total_sales, transaction_count.
  const paymentMethod = paymentMethodData.map((item) => ({
    payment_method: item.payment_method || "Unknown",
    total_sales: Number(item.total_sales || 0),
    transaction_count: Number(item.transaction_count || 0),
  }));

  // Backend fields: category_name, units_sold, total_sales.
  const categoryColors = [
    CHART_COLORS.fuel,
    CHART_COLORS.store,
    CHART_COLORS.refunds,
    CHART_COLORS.purple,
    CHART_COLORS.expenses,
  ];

  const storeCategory = storeCategoryData.map((item, index) => ({
    name: item.category_name || "Uncategorized",
    value: Number(item.total_sales || 0),
    units_sold: Number(item.units_sold || 0),
    color: categoryColors[index % categoryColors.length],
  }));

  // Financial breakdown uses actual sales totals.
  // Refunds and maintenance costs are not revenue categories.
  const financialBreakdown = [
    {
      name: "Fuel Sales",
      value: Number(summary.fuel_sales || 0),
      color: CHART_COLORS.fuel,
    },
    {
      name: "Store Sales",
      value: Number(summary.store_sales || 0),
      color: CHART_COLORS.store,
    },
  ].filter((item) => item.value > 0);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-5 p-6 bg-gray-300 min-h-screen print:bg-white print:p-0 print:m-0 print:min-h-0 print:w-full print:overflow-visible">

      {/* Print stylesheet for A4 reports. */}
      <style>{`
        @media print {
          aside, nav, header, .sidebar, .topbar, .navbar, .print\\:hidden {
            display: none !important;
          }

          html, body, #root, main {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .print-area {
            zoom: 82% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .recharts-responsive-container {
            display: block !important;
            position: relative !important;
            visibility: visible !important;
          }

          .overflow-x-auto {
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="print-area space-y-5">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print-break-avoid">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Master Report
            </h2>
            <p className="text-xs text-slate-400">
              Integrated financial analytics, inventory, and station performance overview
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-600 transition"
            >
              <FilePlus size={15} /> Add New Report
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
              >
                <Download size={15} /> Export (PDF/Excel)
                <ChevronDown size={13} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 text-xs">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText size={14} className="text-emerald-500" />
                    Export Excel (.CSV)
                  </button>

                  <button
                    onClick={handlePrint}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Printer size={14} className="text-cyan-500" />
                    Save as PDF (Print)
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        {/* API Error Messages */}
        {(reportError || summaryError) && (
          <div className="space-y-2 print:hidden">
            {reportError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {reportError}
              </div>
            )}

            {summaryError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                {summaryError}
                <button
                  onClick={fetchSummary}
                  className="ml-2 underline font-semibold"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-break-avoid">
          <StatCard
            label="Total Fuel Sales ($)"
            value={formatCurrency(summary.fuel_sales)}
            delta="Paid sales"
            deltaTone="neutral"
          />

          <StatCard
            label="Store Sale ($)"
            value={formatCurrency(summary.store_sales)}
            delta="Paid sales"
            deltaTone="neutral"
          />

          <StatCard
            label="Approved Refunds ($)"
            value={formatCurrency(summary.approved_refunds)}
            delta="Approved only"
            deltaTone="neutral"
          />

          <StatCard
            label="Revenue After Refunds ($)"
            value={formatCurrency(summary.revenue_after_refunds)}
            delta="Before operating costs"
            deltaTone="neutral"
          />
        </div>

        {/* Row 1 Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print-break-avoid">

          {/* Weekly Revenue vs Expenses */}
          <Panel title="Station Integrated Overview — Revenue vs Expenses">
            {loadingCharts ? (
              <div className="h-[210px] flex items-center justify-center text-xs text-slate-400">
                Loading weekly financial data...
              </div>
            ) : chartErrors.overview ? (
              <div className="h-[210px] flex flex-col items-center justify-center gap-2 text-center text-xs text-red-500">
                <p>{chartErrors.overview}</p>
                <button
                  onClick={fetchChartData}
                  className="underline text-cyan-600"
                >
                  Retry
                </button>
              </div>
            ) : revenueExpense.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={revenueExpense}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={CHART_COLORS.fuel}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Expenses"
                    stroke={CHART_COLORS.expenses}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[210px] flex items-center justify-center text-center text-xs text-slate-400 px-6">
                No weekly financial data available.
              </div>
            )}
          </Panel>

          {/* Financial Breakdown */}
          <Panel title="Overall Performance — Financial Breakdown & Operations Details">
            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <div>
                <div className="text-slate-400">Avg. Wait Time</div>
                <div className="font-bold text-slate-700 text-sm">N/A</div>
              </div>

              <div>
                <div className="text-slate-400">Gallons per Hour</div>
                <div className="font-bold text-slate-700 text-sm">N/A</div>
              </div>

              <div>
                <div className="text-slate-400">Tank Levels %</div>
                <div className="font-bold text-slate-700 text-sm">N/A</div>
              </div>
            </div>

            {financialBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={145}>
                <PieChart>
                  <Pie
                    data={financialBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                  >
                    {financialBreakdown.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[145px] flex items-center justify-center text-xs text-slate-400">
                No paid sales data available.
              </div>
            )}
          </Panel>
        </div>

        {/* Row 2 Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print-break-avoid">

          {/* Sales by Payment Method */}
          <Panel title="Sales Breakdown by Payment Method">
            {loadingCharts ? (
              <div className="h-[190px] flex items-center justify-center text-xs text-slate-400">
                Loading payment data...
              </div>
            ) : chartErrors.payment ? (
              <div className="h-[190px] flex flex-col items-center justify-center gap-2 text-center text-xs text-red-500">
                <p>{chartErrors.payment}</p>
                <button
                  onClick={fetchChartData}
                  className="underline text-cyan-600"
                >
                  Retry
                </button>
              </div>
            ) : paymentMethod.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={paymentMethod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="payment_method"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "Total Sales"
                        ? formatCurrency(value)
                        : value,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="total_sales"
                    name="Total Sales"
                    fill={CHART_COLORS.fuel}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[190px] flex items-center justify-center text-center text-xs text-slate-400 px-6">
                No payment method sales data available.
              </div>
            )}
          </Panel>

          {/* Store Sales by Product Category */}
          <Panel title="Convenience Store Top Categories">
            {loadingCharts ? (
              <div className="h-[190px] flex items-center justify-center text-xs text-slate-400">
                Loading product categories...
              </div>
            ) : chartErrors.categories ? (
              <div className="h-[190px] flex flex-col items-center justify-center gap-2 text-center text-xs text-red-500">
                <p>{chartErrors.categories}</p>
                <button
                  onClick={fetchChartData}
                  className="underline text-cyan-600"
                >
                  Retry
                </button>
              </div>
            ) : storeCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={storeCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {storeCategory.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[190px] flex items-center justify-center text-center text-xs text-slate-400 px-6">
                No store category sales data available.
              </div>
            )}
          </Panel>
        </div>

        {/* Master Audit Log Table */}
        <div className="print-break-avoid">
          <Panel title="Audit-Level Master Report Log Table">

            {loadingReports && (
              <div className="py-5 text-center text-xs text-slate-500">
                Loading report history...
              </div>
            )}

            {!loadingReports && !reportError && reports.length === 0 && (
              <div className="py-5 text-center text-xs text-slate-500">
                No reports have been saved yet.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-400">
                    <th className="px-3.5 py-2.5 font-semibold">Report ID</th>
                    <th className="px-3.5 py-2.5 font-semibold">Report Type & Period</th>
                    <th className="px-3.5 py-2.5 font-semibold">Location Context</th>
                    <th className="px-3.5 py-2.5 font-semibold">Generated By</th>
                    <th className="px-3.5 py-2.5 font-semibold">Date</th>
                    <th className="px-3.5 py-2.5 font-semibold">Status</th>
                    <th className="px-3.5 py-2.5 font-semibold text-right print:hidden">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {!loadingReports &&
                    reports.map((report) => (
                      <tr
                        key={report.databaseId ?? report.id}
                        className="hover:bg-slate-50/70 transition"
                      >
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800 font-mono">
                          {report.id}
                        </td>

                        <td className="px-3.5 py-2.5">
                          <div className="font-semibold text-slate-700">
                            {report.title}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {report.period}
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5 text-slate-500">
                          {report.location}
                        </td>

                        <td className="px-3.5 py-2.5 font-medium text-slate-600">
                          {report.by}
                        </td>

                        <td className="px-3.5 py-2.5 text-slate-500">
                          {report.date}
                        </td>

                        <td className="px-3.5 py-2.5">
                          <StatusBadge
                            status={
                              report.status === "Completed"
                                ? "Active"
                                : "Check Status"
                            }
                          />
                        </td>

                        <td className="px-3.5 py-2.5 text-right font-medium space-x-2 print:hidden">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="text-cyan-600 hover:text-cyan-700 hover:underline"
                          >
                            View
                          </button>

                          <span className="text-slate-300">·</span>

                          <button
                            onClick={() => handleDownloadReport(report)}
                            className="text-cyan-600 hover:text-cyan-700 hover:underline"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Retry loading report history. */}
            {!loadingReports && reportError && (
              <div className="pt-3 print:hidden">
                <button
                  onClick={fetchReports}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Retry Loading Reports
                </button>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* =====================================================
          ADD NEW REPORT MODAL
          ===================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">

            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Generate New Master Report
              </h3>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddReport} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Report Title / Type *
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Integrated Q4 Financial & Fuel Audit"
                  value={newReport.title}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      title: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Report Type
                  </label>

                  <select
                    value={newReport.report_type}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        report_type: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  >
                    {REPORT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Status
                  </label>

                  <select
                    value={newReport.status}
                    onChange={(e) =>
                      setNewReport({
                        ...newReport,
                        status: e.target.value,
                      })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Period
                </label>

                <input
                  type="text"
                  value={newReport.period}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      period: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Location Context
                </label>

                <input
                  type="text"
                  value={newReport.location}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      location: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Generated By (Author) *
                </label>

                <input
                  type="text"
                  required
                  placeholder="Enter author name"
                  value={newReport.by}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      by: e.target.value,
                    })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50 text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={savingReport}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-medium disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingReport}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 shadow-sm disabled:opacity-60"
                >
                  {savingReport ? "Saving..." : "Generate Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW REPORT DETAILS MODAL
          ===================================================== */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">

            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <FileText className="text-cyan-500" size={18} />

                <h3 className="font-bold text-slate-800 text-sm">
                  Report Details ({selectedReport.id})
                </h3>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close report details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block">Report Title:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedReport.title}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block">Time Period:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedReport.period}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block">Report Status:</span>
                  <StatusBadge
                    status={
                      selectedReport.status === "Completed"
                        ? "Active"
                        : "Check Status"
                    }
                  />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block">Station Location:</span>
                <span className="font-semibold text-slate-700">
                  {selectedReport.location}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block">Generated By:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedReport.by}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block">Date Generated:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedReport.date}
                  </span>
                </div>
              </div>

              {/* Display the saved financial snapshot. */}
              {selectedReport.report_data &&
                Object.keys(selectedReport.report_data).length > 0 && (
                  <div className="border-t border-slate-200 pt-3 space-y-2">
                    <div className="font-semibold text-slate-700">
                      Saved Summary
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Fuel Sales</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(selectedReport.report_data.fuel_sales)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Store Sales</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(selectedReport.report_data.store_sales)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Approved Refunds</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(
                          selectedReport.report_data.approved_refunds
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Maintenance Cost</span>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(
                          selectedReport.report_data.maintenance_cost
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
                      <span className="text-slate-600 font-semibold">
                        Revenue After Refunds
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(
                          selectedReport.report_data.revenue_after_refunds
                        )}
                      </span>
                    </div>
                  </div>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleDownloadReport(selectedReport)}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 text-xs shadow-sm"
              >
                <Download size={14} /> Download File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
