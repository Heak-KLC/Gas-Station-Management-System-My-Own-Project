import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  Search,
  RefreshCw,
  Plus,
  X,
  CheckCircle,
  XCircle,
  Banknote,
  LoaderCircle,
  CalendarDays,
  Users,
  CircleDollarSign,
} from "lucide-react";
import api from "../api/axios";

const API = "/salary-payments";
const PAGE_SIZE = 10;

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const EMPTY_FORM = {
  employee_id: "",
  salary_month: String(new Date().getMonth() + 1),
  salary_year: String(new Date().getFullYear()),
  basic_salary: "",
  allowance: "0",
  bonus: "0",
  tax_deduction: "0",
  other_deductions: "0",
  notes: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

function getErrorMessage(error) {
  const data = error.response?.data;

  if (data?.errors) {
    return Object.values(data.errors).flat().join("\n");
  }

  return data?.message || "Something went wrong. Please try again.";
}

function getRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 ring-amber-200",
    Approved: "bg-blue-50 text-blue-700 ring-blue-200",
    Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
    Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

export default function SalaryManagement() {
  const today = new Date();

  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [salaryResponse, employeeResponse] = await Promise.all([
        api.get(API, {
          params: {
            month: month || undefined,
            year: year || undefined,
            status: status || undefined,
          },
        }),
        api.get("/employees"),
      ]);

      setSalaries(getRows(salaryResponse.data));
      setEmployees(getRows(employeeResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [month, year, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    resetMessages();
    setSaving(true);

    try {
      await api.post(API, {
        employee_id: Number(form.employee_id),
        salary_month: Number(form.salary_month),
        salary_year: Number(form.salary_year),
        basic_salary: Number(form.basic_salary),
        allowance: Number(form.allowance || 0),
        bonus: Number(form.bonus || 0),
        tax_deduction: Number(form.tax_deduction || 0),
        other_deductions: Number(form.other_deductions || 0),
        notes: form.notes || null,
      });

      setSuccess("Salary record created successfully.");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (salary) => {
    if (
      !window.confirm(
        `Approve salary for ${salary.employee?.full_name || "this employee"}?`
      )
    ) {
      return;
    }

    resetMessages();
    setActionId(salary.salary_payment_id);

    try {
      await api.patch(`${API}/${salary.salary_payment_id}/approve`);
      setSuccess("Salary approved successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (salary) => {
    const reason = window.prompt(
      "Enter the reason for rejecting this salary record:"
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }

    resetMessages();
    setActionId(salary.salary_payment_id);

    try {
      await api.patch(`${API}/${salary.salary_payment_id}/reject`, {
        notes: reason.trim(),
      });

      setSuccess("Salary record rejected.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const handleMarkPaid = async (salary) => {
    const paymentDate = window.prompt(
      "Payment date and time (YYYY-MM-DD HH:mm:ss):",
      new Date().toISOString().slice(0, 19).replace("T", " ")
    );

    if (!paymentDate) return;

    const paymentMethod = window.prompt(
      "Payment method: Cash, ABA, Wing, or Bank Transfer",
      "Cash"
    );

    if (!paymentMethod) return;

    const allowedMethods = ["Cash", "ABA", "Wing", "Bank Transfer"];

    if (!allowedMethods.includes(paymentMethod)) {
      setError("Invalid payment method. Please use one of the listed methods.");
      return;
    }

    const reference = window.prompt(
      "Payment reference (optional):",
      ""
    );

    resetMessages();
    setActionId(salary.salary_payment_id);

    try {
      await api.patch(`${API}/${salary.salary_payment_id}/mark-paid`, {
        payment_date: paymentDate,
        payment_method: paymentMethod,
        payment_reference: reference || null,
      });

      setSuccess("Salary payment recorded successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const filteredSalaries = salaries.filter((salary) => {
    const term = search.trim().toLowerCase();

    if (!term) return true;

    return [
      salary.employee?.full_name,
      salary.employee?.employee_code,
      salary.employee?.role,
      salary.status,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const totalNet = filteredSalaries.reduce(
    (sum, salary) => sum + Number(salary.net_salary || 0),
    0
  );

  const pendingCount = filteredSalaries.filter(
    (salary) => salary.status === "Pending"
  ).length;

  const approvedCount = filteredSalaries.filter(
    (salary) => salary.status === "Approved"
  ).length;

  const paidCount = filteredSalaries.filter(
    (salary) => salary.status === "Paid"
  ).length;

  const totalPages = Math.max(
  1,
  Math.ceil(filteredSalaries.length / PAGE_SIZE)
);

const startIndex = (currentPage - 1) * PAGE_SIZE;

const paginatedSalaries = filteredSalaries.slice(
  startIndex,
  startIndex + PAGE_SIZE
);

const firstRecord =
  filteredSalaries.length === 0 ? 0 : startIndex + 1;

const lastRecord = Math.min(
  startIndex + PAGE_SIZE,
  filteredSalaries.length
);

useEffect(() => {
  setCurrentPage(1);
}, [search, month, year, status]);

useEffect(() => {
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }
}, [currentPage, totalPages]);

  return (
    <div className="min-h-full space-y-6 bg-slate-300 p-5 md:p-7">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Wallet size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Salary Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage monthly salaries, approvals, and payments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              setShowCreate(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0b2545] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#15365f]"
          >
            <Plus size={17} />
            Create Salary
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span className="whitespace-pre-line">{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <span>{success}</span>
          <button onClick={() => setSuccess("")} aria-label="Dismiss success">
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Net Salary"
          value={money(totalNet)}
          subtitle="Current filtered records"
          icon={CircleDollarSign}
          iconClass="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          title="Pending Approval"
          value={pendingCount}
          subtitle="Waiting for Admin action"
          icon={CalendarDays}
          iconClass="bg-amber-50 text-amber-700"
        />

        <SummaryCard
          title="Approved"
          value={approvedCount}
          subtitle="Awaiting payment"
          icon={CheckCircle}
          iconClass="bg-indigo-50 text-indigo-700"
        />

        <SummaryCard
          title="Paid"
          value={paidCount}
          subtitle="Payment recorded"
          icon={Banknote}
          iconClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Salary Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {Array.from(
                { length: 7 },
                (_, index) => today.getFullYear() - 3 + index
              ).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Search
            </label>
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, code, role..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Salary table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-800">
              Monthly Salary Records
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {filteredSalaries.length} record(s) in the loaded results
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500">
            <LoaderCircle size={20} className="animate-spin" />
            Loading salary records...
          </div>
        ) : filteredSalaries.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-4 text-slate-400">
              <Wallet size={28} />
            </div>
            <p className="font-medium text-slate-700">
              No salary records found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Select another period or create a salary record.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 text-right font-semibold">Basic</th>
                  <th className="px-4 py-3 text-right font-semibold">Allowance</th>
                  <th className="px-4 py-3 text-right font-semibold">Bonus</th>
                  <th className="px-4 py-3 text-right font-semibold">Deductions</th>
                  <th className="px-4 py-3 text-right font-semibold">Net Salary</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedSalaries.map((salary) => {
                  const deductions =
                    Number(salary.tax_deduction || 0) +
                    Number(salary.other_deductions || 0);

                  const busy =
                    actionId === salary.salary_payment_id;

                  return (
                    <tr
                      key={salary.salary_payment_id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">
                          {salary.employee?.full_name || "Unknown employee"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {salary.employee?.employee_code || "—"}
                          {salary.employee?.role
                            ? ` · ${salary.employee.role}`
                            : ""}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {MONTHS[Number(salary.salary_month) - 1] || "—"}{" "}
                        {salary.salary_year}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600">
                        {money(salary.basic_salary)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600">
                        {money(salary.allowance)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600">
                        {money(salary.bonus)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-rose-600">
                        {money(deductions)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-slate-800">
                        {money(salary.net_salary)}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={salary.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {salary.status === "Pending" && (
                            <>
                              <ActionButton
                                title="Approve"
                                disabled={busy}
                                onClick={() => handleApprove(salary)}
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                {busy ? (
                                  <LoaderCircle size={16} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                              </ActionButton>

                              <ActionButton
                                title="Reject"
                                disabled={busy}
                                onClick={() => handleReject(salary)}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100"
                              >
                                <XCircle size={16} />
                              </ActionButton>
                            </>
                          )}

                          {salary.status === "Approved" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleMarkPaid(salary)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              {busy ? (
                                <LoaderCircle size={15} className="animate-spin" />
                              ) : (
                                <Banknote size={15} />
                              )}
                              Mark Paid
                            </button>
                          )}

                          {salary.status === "Paid" && (
                            <span className="text-xs text-slate-400">
                              Completed
                            </span>
                          )}

                          {salary.status === "Rejected" && (
                            <span className="text-xs text-slate-400">
                              Rejected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

{/* Salary Records Pagination */}
<div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-sm text-gray-500">
    Showing{" "}
    <span className="font-medium text-gray-800">
      {firstRecord}
    </span>
    {" "}to{" "}
    <span className="font-medium text-gray-800">
      {lastRecord}
    </span>
    {" "}of{" "}
    <span className="font-medium text-gray-800">
      {filteredSalaries.length}
    </span>
    {" "}salary records
  </p>

  <div className="flex flex-wrap items-center gap-1">
    <button
      type="button"
      onClick={() =>
        setCurrentPage((page) => Math.max(1, page - 1))
      }
      disabled={currentPage === 1 || loading}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Previous
    </button>

    {Array.from(
      { length: totalPages },
      (_, index) => index + 1
    ).map((page) => (
      <button
        key={page}
        type="button"
        onClick={() => setCurrentPage(page)}
        disabled={loading}
        aria-current={
          currentPage === page ? "page" : undefined
        }
        className={`min-w-9 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          currentPage === page
            ? "border-indigo-600 bg-indigo-600 text-white"
            : "border-gray-200 text-gray-600 hover:bg-gray-50"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {page}
      </button>
    ))}

    <button
      type="button"
      onClick={() =>
        setCurrentPage((page) =>
          Math.min(totalPages, page + 1)
        )
      }
      disabled={currentPage === totalPages || loading}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Next
    </button>
  </div>
</div>

          </div>
        )}
      </section>

      {/* Create salary modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Create Monthly Salary
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a salary record for one employee.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Employee *
                  </label>
                  <select
                    required
                    value={form.employee_id}
                    onChange={(e) => setField("employee_id", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select an employee</option>
                    {employees
                      .filter((employee) => employee.is_active !== false && Number(employee.is_active) !== 0)
                      .map((employee) => (
                        <option
                          key={employee.employee_id}
                          value={employee.employee_id}
                        >
                          {employee.employee_code} — {employee.full_name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Only active employees are listed.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Salary Month *
                  </label>
                  <select
                    required
                    value={form.salary_month}
                    onChange={(e) => setField("salary_month", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    {MONTHS.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Salary Year *
                  </label>
                  <input
                    type="number"
                    required
                    min="2000"
                    max="2100"
                    value={form.salary_year}
                    onChange={(e) => setField("salary_year", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <MoneyInput
                  label="Basic Salary ($) *"
                  required
                  value={form.basic_salary}
                  onChange={(value) => setField("basic_salary", value)}
                />

                <MoneyInput
                  label="Allowance ($)"
                  value={form.allowance}
                  onChange={(value) => setField("allowance", value)}
                />

                <MoneyInput
                  label="Bonus ($)"
                  value={form.bonus}
                  onChange={(value) => setField("bonus", value)}
                />

                <MoneyInput
                  label="Tax Deduction ($)"
                  value={form.tax_deduction}
                  onChange={(value) => setField("tax_deduction", value)}
                />

                <MoneyInput
                  label="Other Deductions ($)"
                  value={form.other_deductions}
                  onChange={(value) => setField("other_deductions", value)}
                />

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Optional notes..."
                    className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <div className="flex items-center gap-2 font-semibold">
                    <Users size={16} />
                    Approval workflow
                  </div>
                  <p className="mt-1">
                    The new record will be saved as Pending. Net salary is
                    calculated by the Laravel backend.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !form.employee_id || !form.basic_salary}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0b2545] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#15365f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving ? "Saving..." : "Create Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon, iconClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`rounded-xl p-3 ${iconClass}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ children, title, onClick, disabled, className }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function MoneyInput({ label, value, onChange, required = false }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        
        <input
          type="number"
          min="0"
          step="0.1"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 w-full rounded-lg border border-slate-200 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-blue-500"
          placeholder="0.00"
          
        />
      </div>
    </div>
  );
}
