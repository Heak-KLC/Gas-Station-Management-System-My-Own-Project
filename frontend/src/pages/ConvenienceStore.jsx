import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Beer,
  Cookie,
  UtensilsCrossed,
  Droplet,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Panel } from "../components/ui";

// =========================================================
// Product API
// ប្រើសម្រាប់ Products CRUD និង Inventory
// =========================================================
import {
  getProducts,
  createProduct,
  deleteProduct,
} from "../api/productApi";

// =========================================================
// Product Category API
// ប្រើសម្រាប់ Categories CRUD
// =========================================================
import {
  getProductCategories,
  createProductCategory,
  deleteProductCategory,
} from "../api/productCategoryApi";

// =========================================================
// Product Images
// Images នៅតែរក្សាទុកនៅ Frontend
// ព្រោះ products table មិនមាន image column
// =========================================================
import imgSourCreamChips from "../image/chips.png";
import imgSnacks from "../image/snacks.png";
import imgNuts from "../image/nuts.png";
import imgSoda from "../image/soda.png";
import imgCoffee from "../image/coffee.png";
import imgEnergyDrink from "../image/energy-drink.png";
import imgFreshJuice from "../image/juice.png";
import imgDriedFruit from "../image/dried-fruit.png";
import imgChiliPaste from "../image/chili-paste.png";

// =========================================================
// Category Icons
// Category ថ្មីដែលមិនមានក្នុង mapping នឹងប្រើ Tag
// =========================================================
const CATEGORY_ICONS = {
  Beverages: Beer,
  Snacks: Cookie,
  "Prepared Foods": UtensilsCrossed,
  Condiments: Droplet,
  "Personal Care": Sparkles,
};

// =========================================================
// Inventory Chart Colors
// =========================================================
const STATUS_COLORS = {
  "Total Items": "#22c55e",
  "Low Stock": "#f59e0b",
  "Near Expiry": "#f97316",
  Discontinued: "#e11d48",
  "Out of Stock": "#dc2626",
};

// =========================================================
// Modal Component
// =========================================================
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {title}
          </h3>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

// =========================================================
// Empty Product Form
//
// IMPORTANT:
// categoryId គឺជា category_id ពិតពី Database
// មិនមែន category name ទៀតទេ
// =========================================================
const EMPTY_PRODUCT_FORM = {
  productCode: "",
  barcode: "",
  name: "",
  categoryId: "",
  purchasePrice: "",
  price: "",
  stock: "",
  minStock: "",
  unit: "piece",
  taxRate: "",
};

// =========================================================
// Product Image Mapping
//
// Database មិនមាន image_url
// ដូច្នេះ Image ត្រូវរកពី Product Name នៅ Frontend
// =========================================================
const getProductImage = (productName) => {
  const name = String(productName || "").toLowerCase();

  if (name.includes("chips")) {
    return imgSourCreamChips;
  }

  if (
    name.includes("snack") ||
    name.includes("nuts")
  ) {
    return imgSnacks;
  }

  if (name.includes("soda")) {
    return imgSoda;
  }

  if (name.includes("coffee")) {
    return imgCoffee;
  }

  if (name.includes("energy")) {
    return imgEnergyDrink;
  }

  if (name.includes("juice")) {
    return imgFreshJuice;
  }

  if (name.includes("dried")) {
    return imgDriedFruit;
  }

  if (name.includes("chili")) {
    return imgChiliPaste;
  }

  return imgSnacks;
};

// =========================================================
// Convert Laravel Product → UI Product
//
// Database:
// product_id
// product_name
// category.category_name
// selling_price
// quantity_in_stock
//
// UI:
// id
// name
// category
// price
// stock
// image
// =========================================================
const mapProductToUi = (product) => ({
  id: product.product_id,

  productCode: product.product_code,

  barcode: product.barcode || "-",

  name: product.product_name,

  categoryId: product.category_id,

  category:
    product.category?.category_name ||
    "Uncategorized",

  purchasePrice:
    Number(product.purchase_price || 0),

  price:
    Number(product.selling_price || 0),

  stock:
    Number(product.quantity_in_stock || 0),

  minStock:
    Number(product.min_stock_level || 0),

  unit:
    product.unit || "piece",

  taxRate:
    Number(product.tax_rate || 0),

  isActive:
    Boolean(product.is_active),

  // Image remains frontend-only
  image: getProductImage(product.product_name),
});

// =========================================================
// Convert Laravel Category → UI Category
//
// យើងរក្សា object ពេញ ដើម្បីបាន category_id
// =========================================================
const mapCategoryToUi = (category) => ({
  id: category.category_id,
  name: category.category_name,
  code: category.category_code,
  description: category.description || "",
  productCount: category.products_count || 0,
});

export default function ConvenienceStore() {
  // =========================================================
  // Products
  // ឥឡូវនេះមិនមាន initialProducts Static ទៀតទេ
  // =========================================================
  const [products, setProducts] = useState([]);

  // =========================================================
  // Categories
  // ឥឡូវនេះមិនមាន initialCategories Static ទៀតទេ
  // =========================================================
  const [categories, setCategories] = useState([]);

  // =========================================================
  // Loading State
  // =========================================================
  const [loading, setLoading] = useState(true);

  // =========================================================
  // Saving State
  // ប្រើពេល Add Product / Add Category / Delete Category
  // =========================================================
  const [saving, setSaving] = useState(false);

  // =========================================================
  // Error Message
  // =========================================================
  const [error, setError] = useState("");

  // =========================================================
  // Product Grid Search
  // =========================================================
  const [query, setQuery] = useState("");

  // =========================================================
  // Add Product Modal
  // =========================================================
  const [isAddOpen, setIsAddOpen] = useState(false);

  // =========================================================
  // Add Product Form
  // =========================================================
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);

  // =========================================================
  // Manage Categories Modal
  // =========================================================
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] =
    useState(false);

  // =========================================================
  // New Category Input
  // =========================================================
  const [newCategory, setNewCategory] = useState("");

  // =========================================================
  // Table Search
  // =========================================================
  const [tableQuery, setTableQuery] = useState("");

  // =========================================================
  // Pagination
  // =========================================================
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 5;

  // =========================================================
  // Load Products + Categories
  //
  // useEffect runs once when ConvenienceStore is mounted.
  // =========================================================
  useEffect(() => {
    loadConvenienceStoreData();
  }, []);

  // =========================================================
  // LOAD CONVENIENCE STORE DATA
  //
  // GET:
  // /api/products
  // /api/product-categories
  //
  // Promise.all() makes both API requests together.
  // =========================================================
  const loadConvenienceStoreData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        productsResponse,
        categoriesResponse,
      ] = await Promise.all([
        getProducts(),
        getProductCategories(),
      ]);

      // -------------------------------------------------------
      // Laravel Products
      // → UI Products
      // -------------------------------------------------------
      const mappedProducts =
        Array.isArray(productsResponse)
          ? productsResponse.map(mapProductToUi)
          : [];

      // -------------------------------------------------------
      // Laravel Categories
      // → UI Categories
      // -------------------------------------------------------
      const mappedCategories =
        Array.isArray(categoriesResponse)
          ? categoriesResponse.map(mapCategoryToUi)
          : [];

      setProducts(mappedProducts);
      setCategories(mappedCategories);
    } catch (err) {
      console.error(
        "Failed to load Convenience Store data:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load Convenience Store data."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // ADD PRODUCT
  //
  // Form → API Payload → Laravel → MySQL
  // =========================================================
  async function handleAddProduct(e) {
    e.preventDefault();

    // -------------------------------------------------------
    // Basic Frontend Validation
    // -------------------------------------------------------
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // -------------------------------------------------------
      // Prepare data for Laravel
      // -------------------------------------------------------
      const payload = {
        product_code:
          form.productCode.trim() || null,

        barcode:
          form.barcode.trim() || null,

        product_name:
          form.name.trim(),

        category_id:
          Number(form.categoryId),

        purchase_price:
          Number(form.purchasePrice || 0),

        selling_price:
          Number(form.price || 0),

        quantity_in_stock:
          Number(form.stock || 0),

        min_stock_level:
          Number(form.minStock || 0),

        unit:
          form.unit.trim() || "piece",

        tax_rate:
          Number(form.taxRate || 0),

        is_active: true,
      };

      // -------------------------------------------------------
      // POST /api/products
      // -------------------------------------------------------
      await createProduct(payload);

      // -------------------------------------------------------
      // Reload Products + Categories
      // ដើម្បីឱ្យ UI ទទួល Data ថ្មីពី Database
      // -------------------------------------------------------
      await loadConvenienceStoreData();

      // -------------------------------------------------------
      // Reset Form
      // -------------------------------------------------------
      setForm(EMPTY_PRODUCT_FORM);

      // -------------------------------------------------------
      // Close Modal
      // -------------------------------------------------------
      setIsAddOpen(false);
    } catch (err) {
      console.error(
        "Failed to create product:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to create product."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // ADD CATEGORY
  //
  // New Category → Laravel API → MySQL
  // =========================================================
  async function handleAddCategory(e) {
    e.preventDefault();

    const trimmed = newCategory.trim();

    if (!trimmed) {
      return;
    }

    // -------------------------------------------------------
    // Check duplicate category on frontend first
    // -------------------------------------------------------
    const duplicate = categories.some(
      (category) =>
        category.name.toLowerCase() ===
        trimmed.toLowerCase()
    );

    if (duplicate) {
      setError("This category already exists.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // -------------------------------------------------------
      // Generate Category Code
      // Example:
      // Personal Care → PERSONAL_CARE
      // -------------------------------------------------------
      const categoryCode = trimmed
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      // -------------------------------------------------------
      // POST /api/product-categories
      // -------------------------------------------------------
      await createProductCategory({
        category_name: trimmed,
        category_code:
          categoryCode || `CATEGORY_${Date.now()}`,
        description: null,
      });

      // -------------------------------------------------------
      // Reload data from Laravel
      // -------------------------------------------------------
      await loadConvenienceStoreData();

      // -------------------------------------------------------
      // Clear input
      // -------------------------------------------------------
      setNewCategory("");
    } catch (err) {
      console.error(
        "Failed to create category:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to create category."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE CATEGORY
  //
  // Important:
  // Backend will reject deletion if the category
  // still contains products.
  // =========================================================
  async function handleRemoveCategory(categoryId) {
    try {
      setSaving(true);
      setError("");

      // -------------------------------------------------------
      // DELETE /api/product-categories/{id}
      // -------------------------------------------------------
      await deleteProductCategory(categoryId);

      // -------------------------------------------------------
      // Reload real database data
      // -------------------------------------------------------
      await loadConvenienceStoreData();
    } catch (err) {
      console.error(
        "Failed to delete category:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "This category cannot be deleted."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE PRODUCT
  //
  // Currently not displayed as a button in the original UI,
  // but this handler is ready for future Product actions.
  // =========================================================
  async function handleDeleteProduct(productId) {
    try {
      setSaving(true);
      setError("");

      await deleteProduct(productId);

      await loadConvenienceStoreData();
    } catch (err) {
      console.error(
        "Failed to delete product:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "This product cannot be deleted."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // TABLE FILTER
  // =========================================================
  const filteredForTable = products.filter((p) => {
    const search = tableQuery.toLowerCase();

    return (
      p.name.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search) ||
      p.barcode.toLowerCase().includes(search)
    );
  });

  // =========================================================
  // TOTAL PAGES
  // =========================================================
  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredForTable.length / PAGE_SIZE
    )
  );

  // =========================================================
  // CURRENT PAGE PRODUCTS
  // =========================================================
  const pagedProducts = filteredForTable.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // =========================================================
  // TABLE RANGE
  // =========================================================
  const rangeStart =
    filteredForTable.length === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  const rangeEnd = Math.min(
    page * PAGE_SIZE,
    filteredForTable.length
  );

  // =========================================================
  // PRODUCT GRID SEARCH
  // =========================================================
  const visibleProducts = products.filter((p) => {
    const search = query.toLowerCase();

    return (
      p.name.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search)
    );
  });

  // =========================================================
  // INVENTORY SUMMARY
  //
  // These values are calculated from real database products.
  // =========================================================

  // Number of products
  const totalItems = products.length;

  // Products below minimum stock level
  const lowStockCount = products.filter(
    (product) =>
      product.isActive &&
      product.stock > 0 &&
      product.stock <= product.minStock
  ).length;

  // Products with zero stock
  const outOfStockCount = products.filter(
    (product) =>
      product.isActive &&
      product.stock <= 0
  ).length;

  // Products marked inactive
  const discontinuedCount = products.filter(
    (product) =>
      !product.isActive
  ).length;

  // =========================================================
  // IMPORTANT:
  // Database currently has no expiry_date.
  //
  // Therefore Near Expiry cannot be calculated from real data.
  // We keep it as 0 instead of using fake/static data.
  // =========================================================
  const nearExpiryCount = 0;

  // =========================================================
  // REAL INVENTORY CHART DATA
  // =========================================================
  const inventoryStatus = [
    {
      label: "Total Items",
      value: totalItems,
    },
    {
      label: "Low Stock",
      value: lowStockCount,
    },
    {
      label: "Near Expiry",
      value: nearExpiryCount,
    },
    {
      label: "Discontinued",
      value: discontinuedCount,
    },
    {
      label: "Out of Stock",
      value: outOfStockCount,
    },
  ];

  return (
    <div className="space-y-4 p-6 bg-gray-300">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-700">
          Convenience Store Inventory
        </h2>

        <button
          onClick={() => {
            setError("");
            setForm(EMPTY_PRODUCT_FORM);
            setIsAddOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600"
        >
          <Plus size={15} />
          Add Product
        </button>
      </div>

      {/* =====================================================
          ERROR MESSAGE
          ===================================================== */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* =====================================================
          LOADING MESSAGE
          ===================================================== */}
      {loading ? (
        <Panel>
          <div className="py-12 text-center text-sm text-slate-400">
            Loading Convenience Store data...
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-2 gap-4">

          {/* =================================================
              LEFT COLUMN
              Product Grid
              ================================================= */}
          <Panel>

            {/* Product Search */}
            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder="Search"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400"
              />
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-4 gap-3">

              {visibleProducts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-left text-xs"
                >

                  {/* Product Image */}
                  <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-md bg-white">

                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        No photo
                      </span>
                    )}

                  </div>

                  {/* Product Name */}
                  <div className="font-medium text-slate-700">
                    {p.name}
                  </div>

                  {/* Category */}
                  <div className="text-slate-400">
                    Category: {p.category}
                  </div>

                  {/* Price + Stock */}
                  <div className="mt-1 flex items-center justify-between">

                    <span className="font-semibold text-slate-800">
                      ${p.price.toFixed(2)}
                    </span>

                    <span className="text-slate-400">
                      Avail: {p.stock}
                    </span>

                  </div>
                </div>
              ))}

              {/* No Search Result */}
              {visibleProducts.length === 0 && (
                <div className="col-span-4 py-8 text-center text-xs text-slate-400">
                  {products.length === 0
                    ? "No products found in database."
                    : `No products match "${query}".`}
                </div>
              )}

            </div>

            {/* Product Count */}
            <div className="mt-3 text-center text-xs text-slate-400">
              Showing {visibleProducts.length} of{" "}
              {products.length} items
            </div>

          </Panel>

          {/* =================================================
              RIGHT COLUMN
              ================================================= */}
          <div className="space-y-4">

            {/* =================================================
                PRODUCT TABLE
                ================================================= */}
            <Panel>

              {/* Table Search */}
              <div className="relative mb-3">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={tableQuery}
                  onChange={(e) => {
                    setTableQuery(
                      e.target.value
                    );

                    setPage(1);
                  }}
                  placeholder="Search"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400"
                />
              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-left text-xs">

                  <thead>
                    <tr className="text-slate-400">
                      <th className="pb-2 font-medium">
                        ID
                      </th>

                      <th className="pb-2 font-medium">
                        Unique Barcodes
                      </th>

                      <th className="pb-2 font-medium">
                        Category
                      </th>

                      <th className="pb-2 font-medium">
                        Price
                      </th>

                      <th className="pb-2 font-medium">
                        Stock Quantity
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {pagedProducts.map(
                      (p, i) => (
                        <tr
                          key={`${p.id}-${i}`}
                          className="border-t border-slate-100"
                        >

                          <td className="py-2 text-slate-600">
                            {p.id}
                          </td>

                          <td className="py-2 text-slate-500">
                            {p.barcode}
                          </td>

                          <td className="py-2 text-slate-600">
                            {p.category}
                          </td>

                          <td className="py-2 font-medium text-slate-700">
                            ${p.price.toFixed(2)}
                          </td>

                          <td className="py-2 text-slate-600">
                            {p.stock}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

              {/* Pagination */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">

                <span>
                  Showing {rangeStart} to{" "}
                  {rangeEnd} of{" "}
                  {filteredForTable.length} items
                </span>

                <div className="flex items-center gap-1">

                  <span>
                    Page
                  </span>

                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.max(
                          1,
                          p - 1
                        )
                      )
                    }
                    disabled={page === 1}
                    className="rounded border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={14}
                    />
                  </button>

                  <span className="rounded bg-cyan-100 px-2 py-1 font-medium text-cyan-700">
                    {page}
                  </span>

                  <button
                    onClick={() =>
                      setPage((p) =>
                        Math.min(
                          totalPages,
                          p + 1
                        )
                      )
                    }
                    disabled={
                      page === totalPages
                    }
                    className="rounded border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight
                      size={14}
                    />
                  </button>

                </div>
              </div>

            </Panel>

            {/* =================================================
                CATEGORY + INVENTORY
                ================================================= */}
            <div className="grid grid-cols-2 gap-4">

              {/* =================================================
                  PRODUCT CATEGORY
                  ================================================= */}
              <Panel
                title="Product Category"
                action={
                  <button
                    onClick={() => {
                      setError("");
                      setIsManageCategoriesOpen(
                        true
                      );
                    }}
                    className="text-slate-400 hover:text-cyan-600"
                    title="Manage categories"
                  >
                    <SlidersHorizontal
                      size={15}
                    />
                  </button>
                }
              >

                <ul className="space-y-2 text-sm text-slate-600">

                  {categories.map(
                    (category) => {
                      const Icon =
                        CATEGORY_ICONS[
                          category.name
                        ] ?? Tag;

                      return (
                        <li
                          key={category.id}
                          className="flex items-center gap-2"
                        >
                          <Icon
                            size={15}
                            className="text-slate-400"
                          />

                          {category.name}
                        </li>
                      );
                    }
                  )}

                  {categories.length === 0 && (
                    <li className="py-4 text-center text-xs text-slate-400">
                      No categories yet.
                    </li>
                  )}

                </ul>

              </Panel>

              {/* =================================================
                  INVENTORY STATUS
                  ================================================= */}
              <Panel title="Inventory Status">

                <ResponsiveContainer
                  width="100%"
                  height={150}
                >

                  <BarChart
                    data={inventoryStatus}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef2f7"
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 9,
                        fill: "#94a3b8",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "#94a3b8",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      radius={[
                        3,
                        3,
                        0,
                        0,
                      ]}
                    >

                      {inventoryStatus.map(
                        (entry) => (
                          <Cell
                            key={entry.label}
                            fill={
                              STATUS_COLORS[
                                entry.label
                              ] ??
                              "#0ea5e9"
                            }
                          />
                        )
                      )}

                      <LabelList
                        dataKey="value"
                        position="top"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          fill: "#334155",
                        }}
                      />

                    </Bar>

                  </BarChart>

                </ResponsiveContainer>

              </Panel>

            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          ADD PRODUCT MODAL
          ========================================================= */}
      {isAddOpen && (
        <Modal
          title="Add Product"
          onClose={() => {
            if (!saving) {
              setIsAddOpen(false);
            }
          }}
        >

          <form
            onSubmit={handleAddProduct}
            className="space-y-3 text-sm"
          >

            {/* Product Code */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Product Code
              </label>

              <input
                value={form.productCode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    productCode:
                      e.target.value,
                  })
                }
                placeholder="Optional - auto generated"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Barcode
              </label>

              <input
                value={form.barcode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    barcode:
                      e.target.value,
                  })
                }
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Product Name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Product Name
              </label>

              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                placeholder="Snacks - Salted Peanuts"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Category
              </label>

              <select
                required
                value={form.categoryId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categoryId:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              >

                <option value="">
                  Select Category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  )
                )}

              </select>
            </div>

            {/* Purchase Price + Selling Price */}
            <div className="grid grid-cols-2 gap-2">

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Purchase Price ($)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={
                    form.purchasePrice
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      purchasePrice:
                        e.target.value,
                    })
                  }
                  placeholder="10.00"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Selling Price ($)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price:
                        e.target.value,
                    })
                  }
                  placeholder="12.50"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />
              </div>

            </div>

            {/* Stock + Minimum Stock */}
            <div className="grid grid-cols-2 gap-2">

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Stock Quantity
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.stock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock:
                        e.target.value,
                    })
                  }
                  placeholder="25"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Minimum Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minStock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minStock:
                        e.target.value,
                    })
                  }
                  placeholder="5"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />
              </div>

            </div>

            {/* Unit + Tax */}
            <div className="grid grid-cols-2 gap-2">

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Unit
                </label>

                <input
                  value={form.unit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit:
                        e.target.value,
                    })
                  }
                  placeholder="piece"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Tax Rate (%)
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      taxRate:
                        e.target.value,
                    })
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />
              </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setIsAddOpen(false)
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Add Product"}
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* =========================================================
          MANAGE CATEGORIES MODAL
          ========================================================= */}
      {isManageCategoriesOpen && (
        <Modal
          title="Manage Categories"
          onClose={() => {
            if (!saving) {
              setIsManageCategoriesOpen(
                false
              );
            }
          }}
        >

          <ul className="mb-4 space-y-2">

            {categories.map(
              (category) => {
                const Icon =
                  CATEGORY_ICONS[
                    category.name
                  ] ?? Tag;

                return (
                  <li
                    key={category.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >

                    <span className="flex items-center gap-2 text-slate-700">

                      <Icon
                        size={15}
                        className="text-slate-400"
                      />

                      {category.name}

                    </span>

                    <button
                      onClick={() =>
                        handleRemoveCategory(
                          category.id
                        )
                      }
                      disabled={saving}
                      className="text-slate-400 hover:text-rose-500 disabled:opacity-40"
                      title={`Remove ${category.name}`}
                    >
                      <Trash2
                        size={14}
                      />
                    </button>

                  </li>
                );
              }
            )}

            {categories.length === 0 && (
              <li className="py-4 text-center text-xs text-slate-400">
                No categories yet.
              </li>
            )}

          </ul>

          {/* Add Category */}
          <form
            onSubmit={handleAddCategory}
            className="flex gap-2"
          >

            <input
              value={newCategory}
              onChange={(e) =>
                setNewCategory(
                  e.target.value
                )
              }
              placeholder="New category name"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Add"}
            </button>

          </form>

          {/* Done */}
          <div className="mt-4 flex justify-end">

            <button
              onClick={() =>
                setIsManageCategoriesOpen(
                  false
                )
              }
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Done
            </button>

          </div>

        </Modal>
      )}

    </div>
  );
}