import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Package,
  ClipboardList,
  PackageX,
  Calculator,
  Search,
  MoreVertical,
  X,
  RefreshCw,
  LoaderCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const API_URL = "https://gas-station-backend-ps9c.onrender.com/api";

const STATUSES = [
  "All stock status",
  "In stock",
  "Low stock",
  "Out of stock",
];

const STATUS_STYLE = {
  "In stock": "bg-emerald-100 text-emerald-700",
  "Low stock": "bg-amber-100 text-amber-700",
  "Out of stock": "bg-red-100 text-red-600",
};

const ACTIONS = {
  restock: { label: "Restock", sign: 1, reason: "purchase" },
  sale: { label: "Record sale", sign: -1, reason: "sale" },
  damage: { label: "Mark damage", sign: -1, reason: "damage" },
};

const EMPTY_FORM = {
  product_code: "",
  product_name: "",
  category_id: "",
  purchase_price: "",
  selling_price: "",
  quantity_in_stock: "0",
  min_stock_level: "10",
  unit: "piece",
};

const statusOf = (product) =>
  product.stock <= 0
    ? "Out of stock"
    : product.stock <= product.min
      ? "Low stock"
      : "In stock";

const usd = (number) =>
  Number(number || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function getArray(response, keys = []) {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.data)) return response.data;

  return [];
}

async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("gas_station_token");

  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const validationMessage = result?.errors
      ? Object.values(result.errors).flat().join("\n")
      : "";

    if (response.status === 401) {
      throw new Error(
        "Authentication failed. Please log in again and check your API token."
      );
    }

    throw new Error(
      validationMessage ||
        result?.message ||
        `Request failed: ${response.status}`
    );
  }

  return result;
}

function normalizeProduct(product) {
  return {
    ...product,
    id: product.product_id ?? product.id,
    name: product.product_name ?? product.name ?? "Unnamed product",
    categoryId:
      product.category_id ?? product.category?.category_id ?? "",
    category:
      product.category?.category_name ??
      product.category?.name ??
      product.category_name ??
      "Uncategorized",
    stock: Number(product.quantity_in_stock ?? 0),
    price: Number(product.selling_price ?? 0),
    cost: Number(product.purchase_price ?? 0),
    min: Number(product.min_stock_level ?? 0),
    unit: product.unit ?? "piece",
  };
}

function normalizeCategory(category) {
  return {
    id: category.category_id ?? category.id,
    name: category.category_name ?? category.name ?? "Category",
  };
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function formatReason(reason) {
  const labels = {
    purchase: "Restock",
    sale: "Sale",
    damage: "Damage",
    return: "Return",
    adjustment: "Adjustment",
  };

  return labels[reason] || String(reason || "Adjustment").replaceAll("_", " ");
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="my-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

const GreenBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const Badge = ({ status }) => (
  <span
    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
      STATUS_STYLE[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status}
  </span>
);

const Field = ({ label, className = "", ...props }) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <input
      {...props}
      className={`mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${className}`}
    />
  </label>
);

function StatCard({ label, value, note, icon: Icon, onReview }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
            {label}
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
          <Icon size={25} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{note}</span>
        <GreenBtn type="button" onClick={onReview}>
          Review
        </GreenBtn>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-700">{start}–{end}</span>
        {" "}of{" "}
        <span className="font-semibold text-slate-700">{totalItems}</span>
      </p>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={15} />
          Previous
        </button>

        <span className="min-w-20 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-700">
          Page {page} / {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export default function StoreInventory() {
  const [products, setProducts] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [activity, setActivity] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [st, setSt] = useState(STATUSES[0]);

  const [menuId, setMenuId] = useState(null);
  const [modal, setModal] = useState(null);
  const [qty, setQty] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const [allAlerts, setAllAlerts] = useState(false);
  const [allActivity, setAllActivity] = useState(false);

  // Pagination states must be inside the component.
  const [inventoryPage, setInventoryPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  const inventoryPageSize = 5;
  const activityPageSize = 8;

  const tableRef = useRef(null);
  const activityRef = useRef(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const [productResponse, categoryResponse] = await Promise.all([
        apiRequest("/products"),
        apiRequest("/product-categories"),
      ]);

      const productRows = getArray(productResponse, ["products"]);
      const categoryRows = getArray(categoryResponse, [
        "categories",
        "product_categories",
      ]);

      const normalizedProducts = productRows.map(normalizeProduct);
      const normalizedCategories = categoryRows
        .map(normalizeCategory)
        .filter((item) => item.id != null);

      setProducts(normalizedProducts);
      setCategoriesData(normalizedCategories);

      // Load real inventory logs from Laravel.
      const logResponses = await Promise.allSettled(
        normalizedProducts.map(async (product) => {
          if (product.id == null) return [];

          const response = await apiRequest(
            `/products/${product.id}/inventory-logs`
          );

          return getArray(response, ["logs", "inventory_logs"]).map(
            (log, index) => ({
              id: log.inventory_log_id ?? log.id ?? `${product.id}-${index}`,
              productId: product.id,
              product:
                log.product?.product_name ??
                log.product_name ??
                product.name,
              change: Number(log.quantity_change ?? 0),
              kind: log.reason ?? "adjustment",
              date: log.created_at,
            })
          );
        })
      );

      const logs = logResponses
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value)
        .sort(
          (a, b) =>
            new Date(b.date || 0).getTime() -
            new Date(a.date || 0).getTime()
        );

      setActivity(logs);
    } catch (err) {
      setError(err.message || "Unable to load inventory.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Filter products using the real data loaded from the API.
  const categories = useMemo(
    () => [{ id: "all", name: "All Categories" }, ...categoriesData],
    [categoriesData]
  );

  const rows = useMemo(() => {
    const search = q.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        String(product.product_code ?? "").toLowerCase().includes(search) ||
        String(product.barcode ?? "").toLowerCase().includes(search);

      const matchesCategory =
        cat === "all" || String(product.categoryId) === String(cat);

      const matchesStatus =
        st === STATUSES[0] || statusOf(product) === st;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, q, cat, st]);

  // Return to page 1 whenever search or filters change.
  useEffect(() => {
    setInventoryPage(1);
  }, [q, cat, st]);

  const inventoryTotalPages = Math.max(
    1,
    Math.ceil(rows.length / inventoryPageSize)
  );

  const paginatedProducts = useMemo(() => {
    const start = (inventoryPage - 1) * inventoryPageSize;
    return rows.slice(start, start + inventoryPageSize);
  }, [rows, inventoryPage]);

  // Keep the current page valid when products are deleted or filtered.
  useEffect(() => {
    setInventoryPage((page) =>
      Math.min(page, inventoryTotalPages)
    );
  }, [inventoryTotalPages]);

  const lowItems = useMemo(
    () => products.filter((product) => statusOf(product) !== "In stock"),
    [products]
  );

  const outCount = products.filter(
    (product) => product.stock <= 0
  ).length;

  const lowCount = products.filter(
    (product) => product.stock > 0 && product.stock <= product.min
  ).length;

  const value = products.reduce(
    (total, product) => total + product.stock * product.price,
    0
  );

  // View all switches between the latest 8 activities and the full history.
  const displayedActivities = useMemo(
    () => (allActivity ? activity : activity.slice(0, 8)),
    [activity, allActivity]
  );

  useEffect(() => {
    setActivityPage(1);
  }, [allActivity]);

  const activityTotalPages = Math.max(
    1,
    Math.ceil(displayedActivities.length / activityPageSize)
  );

  const paginatedActivities = useMemo(() => {
    const start = (activityPage - 1) * activityPageSize;
    return displayedActivities.slice(start, start + activityPageSize);
  }, [displayedActivities, activityPage]);

  useEffect(() => {
    setActivityPage((page) => Math.min(page, activityTotalPages));
  }, [activityTotalPages]);

  const selectedProduct =
    modal?.id != null
      ? products.find(
          (product) => String(product.id) === String(modal.id)
        )
      : null;

  const close = () => {
    if (saving) return;
    setModal(null);
    setError("");
  };

  const jump = (status) => {
    setQ("");
    setCat("all");
    setSt(status);
    setInventoryPage(1);

    tableRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openQty = (action, id) => {
    setMenuId(null);
    setQty("");
    setError("");
    setModal({ type: "qty", action, id });
  };

  
const submitQty = async (event) => {
  event.preventDefault();

  if (!selectedProduct || !modal?.action) return;

  const action = ACTIONS[modal.action];
  const quantity = Number(qty);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    setError("Please enter a whole number greater than 0.");
    return;
  }

  if (action.sign < 0 && quantity > selectedProduct.stock) {
    setError(`Only ${selectedProduct.stock} items are in stock.`);
    return;
  }

  setSaving(true);
  setError("");

  try {
    if (modal.action === "sale") {
      // Record the sale through StoreSaleController.
      // The backend will save the sale and reduce stock
      // in one database transaction.
      const response = await apiRequest("/store-sales", {
        method: "POST",
        body: JSON.stringify({
          payment_method: "cash",
          payment_status: "paid",
          discount: 0,
          items: [
            {
              product_id: selectedProduct.id,
              quantity,
              discount: 0,
            },
          ],
        }),
      });

      const sale = response?.sale ?? response?.data ?? response;

      setModal(null);
      setQty("");

      setToast(
        `Sale recorded successfully: ${selectedProduct.name} × ${quantity}${
          sale?.sale_number ? ` (${sale.sale_number})` : ""
        }`
      );
    } else {
      // Keep Restock and Mark damage unchanged.
      await apiRequest(
        `/products/${selectedProduct.id}/adjust-inventory`,
        {
          method: "POST",
          body: JSON.stringify({
            quantity_change: action.sign * quantity,
            reason: action.reason,
          }),
        }
      );

      setModal(null);
      setQty("");

      setToast(
        `${action.label}: ${selectedProduct.name} ${
          action.sign > 0 ? "+" : "-"
        }${quantity}`
      );
    }

    // Reload current stock and inventory activity from Laravel.
    await loadData(false);
  } catch (err) {
    setError(err.message || "Unable to complete the operation.");
  } finally {
    setSaving(false);
  }
};


  const submitAdd = async (event) => {
    event.preventDefault();

    if (!form.product_name.trim()) {
      setError("Please enter a product name.");
      return;
    }

    if (!form.category_id) {
      setError("Please select a product category.");
      return;
    }

    const stock = Number(form.quantity_in_stock);
    const purchasePrice = Number(form.purchase_price);
    const sellingPrice = Number(form.selling_price);
    const minimumStock = Number(form.min_stock_level || 0);

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a whole number of 0 or more.");
      return;
    }

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0 ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      setError("Prices must be 0 or greater.");
      return;
    }

    if (!Number.isInteger(minimumStock) || minimumStock < 0) {
      setError("Minimum stock must be a whole number of 0 or more.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiRequest("/products", {
        method: "POST",
        body: JSON.stringify({
          product_code: form.product_code.trim() || null,
          product_name: form.product_name.trim(),
          category_id: Number(form.category_id),
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          quantity_in_stock: stock,
          min_stock_level: minimumStock,
          unit: form.unit || "piece",
          is_active: true,
        }),
      });

      const name = form.product_name.trim();

      setModal(null);
      setForm(EMPTY_FORM);
      setInventoryPage(1);
      setToast(`${name} added successfully.`);

      await loadData(false);
    } catch (err) {
      setError(err.message || "Unable to create product.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!selectedProduct) return;

    setSaving(true);
    setError("");

    try {
      await apiRequest(`/products/${selectedProduct.id}`, {
        method: "DELETE",
      });

      setModal(null);
      setToast(`${selectedProduct.name} removed.`);
      await loadData(false);
    } catch (err) {
      setError(err.message || "Unable to delete product.");
    } finally {
      setSaving(false);
    }
  };

  const categoryValues = useMemo(
    () =>
      categoriesData.map((category) => {
        const list = products.filter(
          (product) =>
            String(product.categoryId) === String(category.id)
        );

        return {
          ...category,
          items: list.reduce((sum, product) => sum + product.stock, 0),
          value: list.reduce(
            (sum, product) => sum + product.stock * product.price,
            0
          ),
        };
      }),
    [categoriesData, products]
  );

  const statusByProductId = (id) => {
    const product = products.find(
      (item) => String(item.id) === String(id)
    );

    return product ? statusOf(product) : null;
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-300 p-4 md:p-6 -m-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
            <Package size={23} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 md:text-2xl">
              Product and Inventory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage products and monitor your store stock.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && !modal && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={19} className="mt-0.5 shrink-0" />
          <p className="flex-1 whitespace-pre-line">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Products"
          value={`${products.length} Items`}
          note="Products in inventory"
          icon={Package}
          onReview={() => jump(STATUSES[0])}
        />
        <StatCard
          label="Low stock items"
          value={`${lowCount} Items`}
          note="Need to reorder"
          icon={ClipboardList}
          onReview={() => jump("Low stock")}
        />
        <StatCard
          label="Out of stock"
          value={`${outCount} Items`}
          note="Unavailable items"
          icon={PackageX}
          onReview={() => jump("Out of stock")}
        />
        <StatCard
          label="Inventory value"
          value={usd(value)}
          note="Based on selling price"
          icon={Calculator}
          onReview={() => setModal({ type: "value" })}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="min-w-0 space-y-6 xl:col-span-3">
          {/* Inventory Overview */}
          <section
            ref={tableRef}
            className="scroll-mt-4 overflow-visible rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 md:p-5"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 md:text-xl">
                  Inventory Overview
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {products.length} products loaded from your database
                </p>
              </div>

              <GreenBtn
                type="button"
                onClick={() => {
                  setError("");
                  setForm(EMPTY_FORM);
                  setModal({ type: "add" });
                }}
              >
                + Add Product
              </GreenBtn>
            </div>

            {/* Search and filters */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="relative min-w-[180px] flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-50"
                />
              </div>

              <select
                value={cat}
                onChange={(event) => setCat(event.target.value)}
                className="min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-emerald-400"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={st}
                onChange={(event) => setSt(event.target.value)}
                className="min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-emerald-400"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
                <LoaderCircle
                  size={21}
                  className="animate-spin text-emerald-500"
                />
                Loading inventory...
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold tracking-wide text-slate-500">
                        {[
                          "PRODUCT",
                          "CATEGORY",
                          "STOCK",
                          "PRICE",
                          "STATUS",
                          "ACTION",
                        ].map((heading) => (
                          <th key={heading} className="px-2 py-3">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="border-b border-slate-100 transition last:border-0 hover:bg-emerald-50/30"
                        >
                          <td className="max-w-36 px-2 py-3">
                            <p className="truncate font-semibold text-slate-800">
                              {product.name}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-slate-400">
                              {product.product_code || "No product code"}
                            </p>
                          </td>

                          <td className="px-2 py-3 text-slate-600">
                            {product.category}
                          </td>

                          <td className="px-2 py-3">
                            <span className="font-semibold text-slate-800">
                              {product.stock}
                            </span>
                            <span className="ml-1 text-xs text-slate-400">
                              {product.unit}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              Min: {product.min}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-2 py-3 font-medium text-slate-700">
                            {usd(product.price)}
                          </td>

                          <td className="px-2 py-3">
                            <Badge status={statusOf(product)} />
                          </td>

                          <td className="relative px-2 py-3">
                            <button
                              type="button"
                              aria-label={`Actions for ${product.name}`}
                              onClick={() =>
                                setMenuId(
                                  menuId === product.id
                                    ? null
                                    : product.id
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            >
                              <MoreVertical size={17} />
                            </button>

                            {menuId === product.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setMenuId(null)}
                                />

                                <div className="absolute right-2 top-10 z-20 w-40 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 text-sm shadow-xl">
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-emerald-50"
                                    onClick={() =>
                                      openQty("restock", product.id)
                                    }
                                  >
                                    Restock
                                  </button>

                                  <button
                                    type="button"
                                    disabled={product.stock <= 0}
                                    className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-emerald-50 disabled:opacity-40"
                                    onClick={() =>
                                      openQty("sale", product.id)
                                    }
                                  >
                                    Record sale
                                  </button>

                                  <button
                                    type="button"
                                    disabled={product.stock <= 0}
                                    className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-emerald-50 disabled:opacity-40"
                                    onClick={() =>
                                      openQty("damage", product.id)
                                    }
                                  >
                                    Mark damage
                                  </button>

                                  <button
                                    type="button"
                                    className="block w-full border-t border-slate-100 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      setMenuId(null);
                                      setError("");
                                      setModal({
                                        type: "remove",
                                        id: product.id,
                                      });
                                    }}
                                  >
                                    Remove product
                                  </button>
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}

                      {rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-10 text-center text-sm text-slate-400"
                          >
                            <Package
                              size={27}
                              className="mx-auto mb-2 opacity-50"
                            />
                            No products match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Inventory Overview Pagination */}
                <Pagination
                  page={inventoryPage}
                  totalPages={inventoryTotalPages}
                  totalItems={rows.length}
                  pageSize={inventoryPageSize}
                  onPageChange={setInventoryPage}
                />
              </>
            )}

            <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
              Showing {rows.length} filtered products out of {products.length} total products
            </div>
          </section>

          {/* Low stock alert */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Low stock alert
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Products that need attention
                </p>
              </div>

              <GreenBtn
                type="button"
                onClick={() => setAllAlerts((current) => !current)}
              >
                {allAlerts ? "Show less" : "View all"}
              </GreenBtn>
            </div>

            {lowItems.length ? (
              (allAlerts ? lowItems : lowItems.slice(0, 3)).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        product.stock === 0
                          ? "bg-red-50 text-red-500"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      <PackageX size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.stock} left / minimum {product.min}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openQty("restock", product.id)}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    Restock
                  </button>
                </div>
              ))
            ) : (
              <p className="py-5 text-center text-sm text-slate-400">
                All products are well stocked.
              </p>
            )}
          </section>
        </div>

        {/* Recent inventory activity */}
        <section
          ref={activityRef}
          className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 xl:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Recent inventory activity
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Actual stock movement history
              </p>
            </div>

            <GreenBtn
              type="button"
              onClick={() => {
                setAllActivity((current) => !current);
                setActivityPage(1);
              }}
            >
              {allActivity ? "Latest 8" : "View all"}
            </GreenBtn>
          </div>

          {loading && activity.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle
                size={19}
                className="animate-spin text-emerald-500"
              />
              Loading activity...
            </div>
          ) : displayedActivities.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList
                size={30}
                className="mx-auto mb-2 text-slate-300"
              />
              <p className="text-sm text-slate-500">
                No inventory activity available.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {paginatedActivities.map((item) => {
                  const status = statusByProductId(item.productId);

                  return (
                    <li
                      key={`${item.productId}-${item.id}`}
                      className="flex items-center gap-3 py-3"
                    >
                      <div
                        className={`shrink-0 rounded-xl p-2 ${
                          item.change > 0
                            ? "bg-emerald-50 text-emerald-600"
                            : item.change < 0
                              ? "bg-rose-50 text-rose-600"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.change > 0 ? (
                          <TrendingUp size={18} />
                        ) : (
                          <TrendingDown size={18} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.product}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatReason(item.kind)}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {formatDate(item.date)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`text-sm font-bold ${
                            item.change > 0
                              ? "text-emerald-600"
                              : item.change < 0
                                ? "text-red-500"
                                : "text-slate-500"
                          }`}
                        >
                          {item.change > 0 ? "+" : ""}
                          {item.change}
                        </span>

                        {status ? (
                          <Badge status={status} />
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Recent Inventory Activity Pagination */}
              <Pagination
                page={activityPage}
                totalPages={activityTotalPages}
                totalItems={displayedActivities.length}
                pageSize={activityPageSize}
                onPageChange={setActivityPage}
              />
            </>
          )}
        </section>
      </div>

      {/* Quantity modal */}
      {modal?.type === "qty" && selectedProduct && (
        <Modal
          title={`${ACTIONS[modal.action].label}: ${selectedProduct.name}`}
          onClose={close}
        >
          <form onSubmit={submitQty} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current stock</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {selectedProduct.stock}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {selectedProduct.unit}
                </span>
              </p>
            </div>

            <Field
              label="Quantity"
              type="number"
              min="1"
              step="1"
              max={
                modal.action === "restock"
                  ? undefined
                  : selectedProduct.stock
              }
              required
              autoFocus
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              placeholder="Enter quantity"
            />

            <p className="text-xs text-slate-500">
              Action: {ACTIONS[modal.action].reason}
            </p>

            {error && (
              <p className="whitespace-pre-line text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <GreenBtn type="submit" disabled={saving}>
                {saving && (
                  <LoaderCircle size={14} className="animate-spin" />
                )}
                Save
              </GreenBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* Add product modal */}
      {modal?.type === "add" && (
        <Modal title="Add Product" onClose={close}>
          <form onSubmit={submitAdd} className="space-y-3">
            <Field
              label="Product name *"
              required
              maxLength={100}
              value={form.product_name}
              onChange={(event) =>
                setForm({ ...form, product_name: event.target.value })
              }
              placeholder="Enter product name"
            />

            <Field
              label="Product code"
              maxLength={50}
              value={form.product_code}
              onChange={(event) =>
                setForm({ ...form, product_code: event.target.value })
              }
              placeholder="Optional product code"
            />

            <label className="block text-sm font-medium text-slate-700">
              Category *
              <select
                required
                value={form.category_id}
                onChange={(event) =>
                  setForm({ ...form, category_id: event.target.value })
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select category</option>
                {categoriesData.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Purchase price ($) *"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.purchase_price}
                onChange={(event) =>
                  setForm({ ...form, purchase_price: event.target.value })
                }
              />

              <Field
                label="Selling price ($) *"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.selling_price}
                onChange={(event) =>
                  setForm({ ...form, selling_price: event.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Initial stock"
                type="number"
                min="0"
                step="1"
                value={form.quantity_in_stock}
                onChange={(event) =>
                  setForm({
                    ...form,
                    quantity_in_stock: event.target.value,
                  })
                }
              />

              <Field
                label="Minimum stock"
                type="number"
                min="0"
                step="1"
                value={form.min_stock_level}
                onChange={(event) =>
                  setForm({
                    ...form,
                    min_stock_level: event.target.value,
                  })
                }
              />
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Unit
              <select
                value={form.unit}
                onChange={(event) =>
                  setForm({ ...form, unit: event.target.value })
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-emerald-400"
              >
                {[
                  "piece",
                  "bottle",
                  "can",
                  "pack",
                  "box",
                  "kg",
                  "liter",
                ].map((unit) => (
                  <option key={unit} value={unit}>
                    {unit.charAt(0).toUpperCase() + unit.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            {categoriesData.length === 0 && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                No categories were found. Create a product category first.
              </p>
            )}

            {error && (
              <p className="whitespace-pre-line text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={close}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <GreenBtn
                type="submit"
                disabled={saving || categoriesData.length === 0}
              >
                {saving && (
                  <LoaderCircle size={14} className="animate-spin" />
                )}
                Add Product
              </GreenBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* Remove product modal */}
      {modal?.type === "remove" && selectedProduct && (
        <Modal title="Remove Product" onClose={close}>
          <div className="mb-4 rounded-xl bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="shrink-0 text-red-500"
                size={22}
              />
              <div>
                <p className="font-semibold text-slate-800">
                  {selectedProduct.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Are you sure you want to delete this product?
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Current stock: {selectedProduct.stock}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="mb-3 whitespace-pre-line text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={close}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={removeProduct}
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {saving && (
                <LoaderCircle size={14} className="animate-spin" />
              )}
              Delete Product
            </button>
          </div>
        </Modal>
      )}

      {/* Inventory value modal */}
      {modal?.type === "value" && (
        <Modal title="Inventory Value by Category" onClose={close}>
          <p className="mb-4 text-xs text-slate-500">
            Value is calculated from stock quantity multiplied by selling
            price.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-3">CATEGORY</th>
                  <th className="px-2 py-3">ITEMS</th>
                  <th className="py-3 text-right">VALUE</th>
                </tr>
              </thead>

              <tbody>
                {categoryValues.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 font-medium text-slate-700">
                      {category.name}
                    </td>
                    <td className="px-2 py-3 text-slate-500">
                      {category.items}
                    </td>
                    <td className="py-3 text-right font-medium text-slate-700">
                      {usd(category.value)}
                    </td>
                  </tr>
                ))}

                {categoryValues.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-6 text-center text-slate-400"
                    >
                      No category data available.
                    </td>
                  </tr>
                )}

                <tr className="font-bold text-slate-800">
                  <td className="pt-4">Total</td>
                  <td className="px-2 pt-4">
                    {products.reduce(
                      (sum, product) => sum + product.stock,
                      0
                    )}
                  </td>
                  <td className="pt-4 text-right text-emerald-700">
                    {usd(value)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* Success notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm text-white shadow-xl">
          <CheckCircle2
            size={18}
            className="shrink-0 text-emerald-400"
          />
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
            className="ml-1 text-slate-300 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
