
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReceiptText,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Check,
  Ban,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import api from "../../api/axios";

const FILTERS = [
  { label: "All Refunds", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
};

const getErrorMessage = (error) => {
  const data = error.response?.data;

  if (data?.errors) {
    return Object.values(data.errors).flat().join(" ");
  }

  return (
    data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
};

export default function RefundManagement() {
  const [refunds, setRefunds] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRefund, setSelectedRefund] = useState(null);

  // Load refund requests from Laravel.
  const loadRefunds = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setSuccess("");

      try {
        const params = { page };

        if (filter !== "all") {
          params.status = filter;
        }

        const response = await api.get("/refunds", { params });

        // Laravel paginate() returns:
        // { data: [...], current_page, last_page, total, ... }
        const result = response.data;
        const rows = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result)
            ? result
            : [];

        setRefunds(rows);
        setLastPage(Number(result.last_page || 1));
        setTotal(Number(result.total ?? rows.length));
      } catch (err) {
        setRefunds([]);
        setLastPage(1);
        setTotal(0);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, filter]
  );

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  // Search the refunds loaded on the current page.
  const filteredRefunds = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return refunds;

    return refunds.filter((refund) => {
      const values = [
        refund.refund_id,
        refund.original_sale_id,
        refund.original_store_sale_id,
        refund.reason,
        refund.status,
        refund.refund_amount,
      ];

      return values.some((value) =>
        String(value ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [refunds, search]);

  // These cards count records on the current page only.
  const counts = useMemo(
    () => ({
      pending: refunds.filter((r) => r.status === "pending").length,
      approved: refunds.filter((r) => r.status === "approved").length,
      rejected: refunds.filter((r) => r.status === "rejected").length,
    }),
    [refunds]
  );

  // Approve or reject a pending refund.
  const handleDecision = async (refund, decision) => {
    const actionLabel = decision === "approve" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} Refund #${refund.refund_id}?`
    );

    if (!confirmed) return;

    setProcessingId(refund.refund_id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/refunds/${refund.refund_id}/${decision}`);

      setSuccess(
        `Refund #${refund.refund_id} was ${decision === "approve" ? "approved" : "rejected"} successfully.`
      );

      if (selectedRefund?.refund_id === refund.refund_id) {
        setSelectedRefund(null);
      }

      await loadRefunds(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProcessingId(null);
    }
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    setPage(1);
    setSearch("");
  };

  const StatusIcon = ({ status }) => {
    if (status === "approved") return <CheckCircle2 size={15} />;
    if (status === "rejected") return <XCircle size={15} />;
    return <Clock size={15} />;
  };

  return (
    <div className="space-y-6 bg-slate-300 p-6 -m-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Refund Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review refund requests and manage approval decisions.
          </p>
        </div>

        <button
          type="button"
          disabled={loading || refreshing}
          onClick={() => loadRefunds(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Error and success messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Pending Refunds"
          count={counts.pending}
          description="On this page"
          icon={Clock}
          iconClass="text-amber-500"
        />
        <SummaryCard
          title="Approved Refunds"
          count={counts.approved}
          description="On this page"
          icon={CheckCircle2}
          iconClass="text-emerald-500"
        />
        <SummaryCard
          title="Rejected Refunds"
          count={counts.rejected}
          description="On this page"
          icon={XCircle}
          iconClass="text-rose-500"
        />
      </div>

      {/* Refund table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-800">
                Refund Requests
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {total} matching request{total === 1 ? "" : "s"}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search current page..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleFilterChange(item.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  filter === item.value
                    ? "bg-[#0b2545] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Refund ID</th>
                <th className="px-5 py-4 font-medium">Original Sale</th>
                <th className="px-5 py-4 font-medium">Amount ($)</th>
                <th className="px-5 py-4 font-medium">Reason</th>
                <th className="px-5 py-4 font-medium">Date</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <LoaderCircle
                      size={28}
                      className="mx-auto animate-spin text-slate-400"
                    />
                    <p className="mt-3 text-slate-500">
                      Loading refund requests...
                    </p>
                  </td>
                </tr>
              ) : filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <ReceiptText
                      size={34}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 font-medium text-slate-600">
                      No refund requests found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try another filter or search term.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((refund) => {
                  const status = String(refund.status || "")
                    .toLowerCase();

                  const busy = processingId === refund.refund_id;

                  return (
                    <tr
                      key={refund.refund_id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        #{refund.refund_id}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {refund.original_sale_id
                          ? `Fuel #${refund.original_sale_id}`
                          : refund.original_store_sale_id
                            ? `Store #${refund.original_store_sale_id}`
                            : "—"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        ${money(refund.refund_amount)}
                      </td>

                      <td className="max-w-[220px] px-5 py-4 text-slate-600">
                        <span className="line-clamp-2">
                          {refund.reason || "No reason provided"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(refund.refund_date)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[status] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <StatusIcon status={status} />
                          {status
                            ? status.charAt(0).toUpperCase() +
                              status.slice(1)
                            : "Unknown"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            title="View details"
                            onClick={() => setSelectedRefund(refund)}
                            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                          >
                            <Eye size={16} />
                          </button>

                          {status === "pending" && (
                            <>
                              <button
                                type="button"
                                title="Approve refund"
                                disabled={busy}
                                onClick={() =>
                                  handleDecision(refund, "approve")
                                }
                                className="rounded-md bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                {busy ? (
                                  <LoaderCircle
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Check size={16} />
                                )}
                              </button>

                              <button
                                type="button"
                                title="Reject refund"
                                disabled={busy}
                                onClick={() =>
                                  handleDecision(refund, "reject")
                                }
                                className="rounded-md bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              >
                                <Ban size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">
            Page {page} of {lastPage}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Refund details modal */}
      {selectedRefund && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setSelectedRefund(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-detail-title"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="refund-detail-title"
                  className="text-lg font-bold text-slate-800"
                >
                  Refund #{selectedRefund.refund_id}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Refund request details
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <DetailRow
                label="Amount"
                value={`$${money(selectedRefund.refund_amount)}`}
              />
              <DetailRow
                label="Fuel Sale ID"
                value={selectedRefund.original_sale_id ?? "—"}
              />
              <DetailRow
                label="Store Sale ID"
                value={selectedRefund.original_store_sale_id ?? "—"}
              />
              <DetailRow
                label="Date"
                value={formatDate(selectedRefund.refund_date)}
              />
              <DetailRow
                label="Status"
                value={selectedRefund.status}
              />

              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  Reason
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {selectedRefund.reason || "No reason provided"}
                </p>
              </div>
            </div>

            {String(selectedRefund.status).toLowerCase() === "pending" && (
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={processingId === selectedRefund.refund_id}
                  onClick={() =>
                    handleDecision(selectedRefund, "reject")
                  }
                  className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  Reject
                </button>

                <button
                  type="button"
                  disabled={processingId === selectedRefund.refund_id}
                  onClick={() =>
                    handleDecision(selectedRefund, "approve")
                  }
                  className="rounded-lg bg-[#0b2545] px-4 py-2 text-sm font-medium text-white hover:bg-[#15365f] disabled:opacity-50"
                >
                  Approve Refund
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, count, description, icon: Icon, iconClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <Icon size={20} className={iconClass} />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-800">{count}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="break-all text-right text-sm font-medium text-slate-800">
        {String(value ?? "—")}
      </p>
    </div>
  );
}
