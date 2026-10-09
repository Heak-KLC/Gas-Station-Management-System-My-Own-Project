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
  Pencil,
  PackagePlus,
  History,
  Minus,
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
  updateProduct,
  deleteProduct,
  adjustProductInventory,
  getProductInventoryLogs,
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
//
// Images ចាស់ៗដែលមិនមាន image នៅ Database
// នឹងប្រើ Local Frontend Images ជា fallback.
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
  image: null,
  imagePreview: "",
};

// =========================================================
// Product Image Mapping
//
// ប្រើសម្រាប់ Product ចាស់ៗដែលមិនមាន image
// នៅក្នុង Database.
// =========================================================
const getProductImage = (productName) => {
  const name = String(productName || "").toLowerCase();

  if (name.includes("chips")) {
    return imgSourCreamChips;
  }

  if (name.includes("nuts")) {
    return imgNuts;
  }

  if (name.includes("snack")) {
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

  return null;
};

// =========================================================
// Convert Laravel Product → UI Product
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

  purchasePrice: Number(
    product.purchase_price || 0
  ),

  price: Number(
    product.selling_price || 0
  ),

  stock: Number(
    product.quantity_in_stock || 0
  ),

  minStock: Number(
    product.min_stock_level || 0
  ),

  unit: product.unit || "piece",

  taxRate: Number(
    product.tax_rate || 0
  ),

  isActive: Boolean(product.is_active),

  // =======================================================
  // Database Image
  //
  // If Laravel has image:
  // http://127.0.0.1:8000/storage/products/xxxxx.jpg
  //
  // Otherwise use old local image.
  // =======================================================
  image: product.image
    ? `http://127.0.0.1:8000/storage/${product.image}`
    : getProductImage(product.product_name),
});

// =========================================================
// Convert Laravel Category → UI Category
// =========================================================
const mapCategoryToUi = (category) => ({
  id: category.category_id,
  name: category.category_name,
  code: category.category_code,
  description: category.description || "",
  productCount: category.products_count || 0,
});

// =========================================================
// Convert Inventory Log → UI
//
// Backend field names can vary slightly depending on
// ProductInventoryLog model/controller.
//
// We use fallback values so the UI remains safe.
// =========================================================
const mapInventoryLogToUi = (log) => ({
  id:
    log.inventory_log_id ??
    log.id ??
    Math.random(),

  quantityChange: Number(
    log.quantity_change ??
    log.quantityChange ??
    0
  ),

  quantityBefore: Number(
    log.quantity_before ??
    log.quantityBefore ??
    0
  ),

  quantityAfter: Number(
    log.quantity_after ??
    log.quantityAfter ??
    0
  ),

  reason:
    log.reason ||
    log.notes ||
    "Inventory Adjustment",

  createdBy:
    log.created_by?.full_name ||
    log.createdBy?.full_name ||
    log.user?.full_name ||
    "-",

  createdAt:
    log.created_at ||
    log.createdAt ||
    null,
});

// =========================================================
// Format Date
// =========================================================
const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

// =========================================================
// Main Component
// =========================================================
export default function ConvenienceStore() {

  // =========================================================
  // Products
  // =========================================================
  const [products, setProducts] = useState([]);

  // =========================================================
  // Categories
  // =========================================================
  const [categories, setCategories] = useState([]);

  // =========================================================
  // Loading
  // =========================================================
  const [loading, setLoading] = useState(true);

  // =========================================================
  // Saving
  // Used by Add / Edit / Delete / Inventory
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
  // Edit Product Modal
  // =========================================================
  const [isEditOpen, setIsEditOpen] = useState(false);

  // =========================================================
  // Product Form
  //
  // Same form is used for Add + Edit.
  // =========================================================
  const [form, setForm] = useState(
    EMPTY_PRODUCT_FORM
  );

  // =========================================================
  // Product Being Edited
  // =========================================================
  const [editingProduct, setEditingProduct] =
    useState(null);

  // =========================================================
  // Delete Confirmation
  // =========================================================
  const [deleteProductTarget, setDeleteProductTarget] =
    useState(null);

  // =========================================================
  // Inventory Adjustment Modal
  // =========================================================
  const [isInventoryOpen, setIsInventoryOpen] =
    useState(false);

  // =========================================================
  // Product Used for Inventory Adjustment
  // =========================================================
  const [inventoryProduct, setInventoryProduct] =
    useState(null);

  // =========================================================
  // Inventory Form
  // =========================================================
  const [inventoryForm, setInventoryForm] =
  useState({
    type: "add",
    quantity: "",
    reason: "purchase",
  });

  // =========================================================
  // Inventory Logs Modal
  // =========================================================
  const [isLogsOpen, setIsLogsOpen] =
    useState(false);

  // =========================================================
  // Inventory Logs
  // =========================================================
  const [inventoryLogs, setInventoryLogs] =
    useState([]);

  // =========================================================
  // Loading Inventory Logs
  // =========================================================
  const [logsLoading, setLogsLoading] =
    useState(false);

  // =========================================================
  // Manage Categories Modal
  // =========================================================
  const [
    isManageCategoriesOpen,
    setIsManageCategoriesOpen,
  ] = useState(false);

  // =========================================================
  // New Category Input
  // =========================================================
  const [newCategory, setNewCategory] =
    useState("");

  // =========================================================
  // Table Search
  // =========================================================
  const [tableQuery, setTableQuery] =
    useState("");

  // =========================================================
  // Pagination
  // =========================================================
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 5;

  // =========================================================
  // Load data when page opens
  // =========================================================
  useEffect(() => {
    loadConvenienceStoreData();
  }, []);

  // =========================================================
  // LOAD PRODUCTS + CATEGORIES
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

      const mappedProducts =
        Array.isArray(productsResponse)
          ? productsResponse.map(mapProductToUi)
          : [];

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
  // RESET PRODUCT FORM
  // =========================================================
  const resetProductForm = () => {
    setForm({
      ...EMPTY_PRODUCT_FORM,
    });
  };

  // =========================================================
  // GET VALIDATION ERROR MESSAGE
  // =========================================================
  const getApiErrorMessage = (
    err,
    fallbackMessage
  ) => {
    if (err?.response?.data?.errors) {
      return Object.values(
        err.response.data.errors
      )
        .flat()
        .join(" ");
    }

    return (
      err?.response?.data?.message ||
      fallbackMessage
    );
  };

  // =========================================================
  // ADD PRODUCT
  //
  // Form → FormData → Laravel
  // =========================================================
  async function handleAddProduct(e) {
    e.preventDefault();

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

      const formData = new FormData();

      // Product Code
      if (form.productCode.trim()) {
        formData.append(
          "product_code",
          form.productCode.trim()
        );
      }

      // Barcode
      if (form.barcode.trim()) {
        formData.append(
          "barcode",
          form.barcode.trim()
        );
      }

      // Product Name
      formData.append(
        "product_name",
        form.name.trim()
      );

      // Category
      formData.append(
        "category_id",
        form.categoryId
      );

      // Purchase Price
      formData.append(
        "purchase_price",
        form.purchasePrice || "0"
      );

      // Selling Price
      formData.append(
        "selling_price",
        form.price || "0"
      );

      // Initial Stock
      formData.append(
        "quantity_in_stock",
        form.stock || "0"
      );

      // Minimum Stock
      formData.append(
        "min_stock_level",
        form.minStock || "0"
      );

      // Unit
      formData.append(
        "unit",
        form.unit.trim() || "piece"
      );

      // Tax
      formData.append(
        "tax_rate",
        form.taxRate || "0"
      );

      // Active
      formData.append(
        "is_active",
        "1"
      );

      // Image
      if (form.image) {
        formData.append(
          "image",
          form.image
        );
      }

      await createProduct(formData);

      await loadConvenienceStoreData();

      resetProductForm();

      setIsAddOpen(false);
    } catch (err) {
      console.error(
        "Failed to create product:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Failed to create product."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // OPEN EDIT PRODUCT
  // =========================================================
  const openEditProduct = (product) => {
    setError("");

    setEditingProduct(product);

    // -------------------------------------------------------
    // Existing database image is NOT placed into
    // form.image because form.image must be a File.
    //
    // We only use the existing URL as preview.
    // -------------------------------------------------------
    setForm({
      productCode:
        product.productCode || "",

      barcode:
        product.barcode === "-"
          ? ""
          : product.barcode || "",

      name:
        product.name || "",

      categoryId:
        product.categoryId
          ? String(product.categoryId)
          : "",

      purchasePrice:
        product.purchasePrice ?? "",

      price:
        product.price ?? "",

      stock:
        product.stock ?? "",

      minStock:
        product.minStock ?? "",

      unit:
        product.unit || "piece",

      taxRate:
        product.taxRate ?? "",

      image: null,

      imagePreview:
        product.image || "",
    });

    setIsEditOpen(true);
  };

  // =========================================================
  // EDIT PRODUCT
  //
  // Uses FormData because image can be replaced.
  // =========================================================
  async function handleEditProduct(e) {
    e.preventDefault();

    if (!editingProduct) {
      return;
    }

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

      const formData = new FormData();

      // -----------------------------------------------------
      // Product Code
      // -----------------------------------------------------
      formData.append(
        "product_code",
        form.productCode.trim()
      );

      // -----------------------------------------------------
      // Barcode
      // -----------------------------------------------------
      formData.append(
        "barcode",
        form.barcode.trim()
      );

      // -----------------------------------------------------
      // Product Name
      // -----------------------------------------------------
      formData.append(
        "product_name",
        form.name.trim()
      );

      // -----------------------------------------------------
      // Category
      // -----------------------------------------------------
      formData.append(
        "category_id",
        form.categoryId
      );

      // -----------------------------------------------------
      // Prices
      // -----------------------------------------------------
      formData.append(
        "purchase_price",
        form.purchasePrice || "0"
      );

      formData.append(
        "selling_price",
        form.price || "0"
      );

      // -----------------------------------------------------
      // Stock
      //
      // IMPORTANT:
      // This keeps current Edit behavior.
      //
      // For normal stock movement, use Inventory
      // Adjustment instead.
      // -----------------------------------------------------
      formData.append(
        "quantity_in_stock",
        form.stock || "0"
      );

      // -----------------------------------------------------
      // Minimum Stock
      // -----------------------------------------------------
      formData.append(
        "min_stock_level",
        form.minStock || "0"
      );

      // -----------------------------------------------------
      // Unit
      // -----------------------------------------------------
      formData.append(
        "unit",
        form.unit.trim() || "piece"
      );

      // -----------------------------------------------------
      // Tax
      // -----------------------------------------------------
      formData.append(
        "tax_rate",
        form.taxRate || "0"
      );

      // -----------------------------------------------------
      // Active Status
      // -----------------------------------------------------
      formData.append(
        "is_active",
        editingProduct.isActive ? "1" : "0"
      );

      // -----------------------------------------------------
      // Replace Image
      //
      // Only append when a NEW File is selected.
      // -----------------------------------------------------
      if (form.image) {
        formData.append(
          "image",
          form.image
        );
      }

      await updateProduct(
        editingProduct.id,
        formData
      );

      await loadConvenienceStoreData();

      resetProductForm();

      setEditingProduct(null);

      setIsEditOpen(false);
    } catch (err) {
      console.error(
        "Failed to update product:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Failed to update product."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // OPEN DELETE CONFIRMATION
  // =========================================================
  const openDeleteProduct = (product) => {
    setError("");
    setDeleteProductTarget(product);
  };

  // =========================================================
  // DELETE PRODUCT
  // =========================================================
  async function handleDeleteProduct() {
    if (!deleteProductTarget) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await deleteProduct(
        deleteProductTarget.id
      );

      await loadConvenienceStoreData();

      setDeleteProductTarget(null);
    } catch (err) {
      console.error(
        "Failed to delete product:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "This product cannot be deleted."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // OPEN INVENTORY ADJUSTMENT
  // =========================================================
  const openInventoryAdjustment = (
  product,
  type = "add"
) => {
  setError("");

  setInventoryProduct(product);

  setInventoryForm({
    type,
    quantity: "",
    // Add stock → purchase
    // Remove stock → sale
    reason:
      type === "add"
        ? "purchase"
        : "sale",
  });

  setIsInventoryOpen(true);
};

  // =========================================================
  // ADJUST INVENTORY
  //
  // Add:
  // + quantity
  //
  // Remove:
  // - quantity
  //
  // Backend will create ProductInventoryLog.
  // =========================================================
  async function handleInventoryAdjustment(e) {
    e.preventDefault();

    if (!inventoryProduct) {
      return;
    }

    const quantity =
      Number(inventoryForm.quantity);

    if (!quantity || quantity <= 0) {
      setError(
        "Please enter a quantity greater than 0."
      );
      return;
    }

    if (
      !inventoryForm.reason.trim()
    ) {
      setError(
        "Please enter a reason."
      );
      return;
    }

    // -------------------------------------------------------
    // Add = positive
    // Remove = negative
    // -------------------------------------------------------
    const quantityChange =
      inventoryForm.type === "add"
        ? quantity
        : -quantity;

    // -------------------------------------------------------
    // Prevent removing more stock than available.
    // -------------------------------------------------------
    if (
      quantityChange < 0 &&
      quantity > inventoryProduct.stock
    ) {
      setError(
        `Cannot remove ${quantity}. Current stock is ${inventoryProduct.stock}.`
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await adjustProductInventory(
        inventoryProduct.id,
        {
          quantity_change:
            quantityChange,

          reason:
            inventoryForm.reason.trim(),
        }
      );

      await loadConvenienceStoreData();

      setInventoryProduct(null);

      setInventoryForm({
        type: "add",
        quantity: "",
        reason: "",
      });

      setIsInventoryOpen(false);
    } catch (err) {
      console.error(
        "Failed to adjust inventory:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Failed to adjust inventory."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // OPEN INVENTORY LOGS
  // =========================================================
  const openInventoryLogs = async (
    product
  ) => {
    try {
      setLogsLoading(true);
      setError("");

      setInventoryProduct(product);

      setIsLogsOpen(true);

      const response =
        await getProductInventoryLogs(
          product.id
        );

      const logs =
        Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];

      setInventoryLogs(
        logs.map(mapInventoryLogToUi)
      );
    } catch (err) {
      console.error(
        "Failed to load inventory logs:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Failed to load inventory logs."
        )
      );
    } finally {
      setLogsLoading(false);
    }
  };

  // =========================================================
  // ADD CATEGORY
  // =========================================================
  async function handleAddCategory(e) {
    e.preventDefault();

    const trimmed =
      newCategory.trim();

    if (!trimmed) {
      return;
    }

    const duplicate =
      categories.some(
        (category) =>
          category.name.toLowerCase() ===
          trimmed.toLowerCase()
      );

    if (duplicate) {
      setError(
        "This category already exists."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const categoryCode =
        trimmed
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_|_$/g, "");

      await createProductCategory({
        category_name: trimmed,

        category_code:
          categoryCode ||
          `CATEGORY_${Date.now()}`,

        description: null,
      });

      await loadConvenienceStoreData();

      setNewCategory("");
    } catch (err) {
      console.error(
        "Failed to create category:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "Failed to create category."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE CATEGORY
  // =========================================================
  async function handleRemoveCategory(
    categoryId
  ) {
    try {
      setSaving(true);
      setError("");

      await deleteProductCategory(
        categoryId
      );

      await loadConvenienceStoreData();
    } catch (err) {
      console.error(
        "Failed to delete category:",
        err
      );

      setError(
        getApiErrorMessage(
          err,
          "This category cannot be deleted."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // TABLE FILTER
  // =========================================================
  const filteredForTable =
    products.filter((p) => {
      const search =
        tableQuery.toLowerCase();

      return (
        p.name
          .toLowerCase()
          .includes(search) ||
        p.category
          .toLowerCase()
          .includes(search) ||
        p.barcode
          .toLowerCase()
          .includes(search)
      );
    });

  // =========================================================
  // TOTAL PAGES
  // =========================================================
  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredForTable.length /
        PAGE_SIZE
    )
  );

  // =========================================================
  // CURRENT PAGE PRODUCTS
  // =========================================================
  const pagedProducts =
    filteredForTable.slice(
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
  const visibleProducts =
    products.filter((p) => {
      const search =
        query.toLowerCase();

      return (
        p.name
          .toLowerCase()
          .includes(search) ||
        p.category
          .toLowerCase()
          .includes(search)
      );
    });

  // =========================================================
  // INVENTORY SUMMARY
  // =========================================================
  const totalItems =
    products.length;

  const lowStockCount =
    products.filter(
      (product) =>
        product.isActive &&
        product.stock > 0 &&
        product.stock <=
          product.minStock
    ).length;

  const outOfStockCount =
    products.filter(
      (product) =>
        product.isActive &&
        product.stock <= 0
    ).length;

  const discontinuedCount =
    products.filter(
      (product) =>
        !product.isActive
    ).length;

  // Database does not currently have expiry_date.
  const nearExpiryCount = 0;

  // =========================================================
  // INVENTORY CHART DATA
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

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="space-y-4 bg-gray-300 p-6">

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
            resetProductForm();
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
          LOADING
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
                  setQuery(
                    e.target.value
                  )
                }
                placeholder="Search"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-400"
              />
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-4 gap-3">

              {visibleProducts.map(
                (p) => (
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
                      Category:{" "}
                      {p.category}
                    </div>

                    {/* Price + Stock */}
                    <div className="mt-1 flex items-center justify-between">

                      <span className="font-semibold text-slate-800">
                        $
                        {p.price.toFixed(
                          2
                        )}
                      </span>

                      <span className="text-slate-400">
                        Avail:{" "}
                        {p.stock}
                      </span>

                    </div>

                    {/* =================================================
                        Product Actions
                        ================================================= */}
                    <div className="mt-2 flex items-center justify-end gap-1">

                      {/* Edit */}
                      <button
                        onClick={() =>
                          openEditProduct(
                            p
                          )
                        }
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-cyan-600"
                        title="Edit Product"
                      >
                        <Pencil
                          size={13}
                        />
                      </button>

                      {/* Add Inventory */}
                      <button
                        onClick={() =>
                          openInventoryAdjustment(
                            p,
                            "add"
                          )
                        }
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-emerald-600"
                        title="Add Stock"
                      >
                        <PackagePlus
                          size={13}
                        />
                      </button>

                      {/* Remove Inventory */}
                      <button
                        onClick={() =>
                          openInventoryAdjustment(
                            p,
                            "remove"
                          )
                        }
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-orange-600"
                        title="Remove Stock"
                      >
                        <Minus
                          size={13}
                        />
                      </button>

                      {/* Inventory Logs */}
                      <button
                        onClick={() =>
                          openInventoryLogs(
                            p
                          )
                        }
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-blue-600"
                        title="Inventory History"
                      >
                        <History
                          size={13}
                        />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() =>
                          openDeleteProduct(
                            p
                          )
                        }
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-500"
                        title="Delete Product"
                      >
                        <Trash2
                          size={13}
                        />
                      </button>

                    </div>

                  </div>
                )
              )}

              {visibleProducts.length ===
                0 && (
                <div className="col-span-4 py-8 text-center text-xs text-slate-400">
                  {products.length ===
                  0
                    ? "No products found in database."
                    : `No products match "${query}".`}
                </div>
              )}

            </div>

            {/* Product Count */}
            <div className="mt-3 text-center text-xs text-slate-400">
              Showing{" "}
              {
                visibleProducts.length
              }{" "}
              of{" "}
              {products.length}{" "}
              items
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

                      <th className="pb-2 font-medium">
                        Actions
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
                            $
                            {p.price.toFixed(
                              2
                            )}
                          </td>

                          <td className="py-2 text-slate-600">
                            {p.stock}
                          </td>

                          <td className="py-2">

                            <div className="flex items-center gap-1">

                              <button
                                onClick={() =>
                                  openEditProduct(
                                    p
                                  )
                                }
                                className="rounded p-1 text-slate-400 hover:text-cyan-600"
                                title="Edit"
                              >
                                <Pencil
                                  size={13}
                                />
                              </button>

                              <button
                                onClick={() =>
                                  openInventoryAdjustment(
                                    p,
                                    "add"
                                  )
                                }
                                className="rounded p-1 text-slate-400 hover:text-emerald-600"
                                title="Inventory"
                              >
                                <PackagePlus
                                  size={13}
                                />
                              </button>

                              <button
                                onClick={() =>
                                  openInventoryLogs(
                                    p
                                  )
                                }
                                className="rounded p-1 text-slate-400 hover:text-blue-600"
                                title="History"
                              >
                                <History
                                  size={13}
                                />
                              </button>

                              <button
                                onClick={() =>
                                  openDeleteProduct(
                                    p
                                  )
                                }
                                className="rounded p-1 text-slate-400 hover:text-rose-500"
                                title="Delete"
                              >
                                <Trash2
                                  size={13}
                                />
                              </button>

                            </div>

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
                  Showing{" "}
                  {rangeStart}{" "}
                  to{" "}
                  {rangeEnd}{" "}
                  of{" "}
                  {
                    filteredForTable.length
                  }{" "}
                  items
                </span>

                <div className="flex items-center gap-1">

                  <span>
                    Page
                  </span>

                  <button
                    onClick={() =>
                      setPage(
                        (p) =>
                          Math.max(
                            1,
                            p - 1
                          )
                      )
                    }
                    disabled={
                      page === 1
                    }
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
                      setPage(
                        (p) =>
                          Math.min(
                            totalPages,
                            p + 1
                          )
                      )
                    }
                    disabled={
                      page ===
                      totalPages
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

              {/* PRODUCT CATEGORY */}
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
                          key={
                            category.id
                          }
                          className="flex items-center gap-2"
                        >
                          <Icon
                            size={15}
                            className="text-slate-400"
                          />

                          {
                            category.name
                          }
                        </li>
                      );
                    }
                  )}

                  {categories.length ===
                    0 && (
                    <li className="py-4 text-center text-xs text-slate-400">
                      No categories yet.
                    </li>
                  )}

                </ul>

              </Panel>

              {/* INVENTORY STATUS */}
              <Panel title="Inventory Status">

                <ResponsiveContainer
                  width="100%"
                  height={150}
                >

                  <BarChart
                    data={
                      inventoryStatus
                    }
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
                            key={
                              entry.label
                            }
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
            onSubmit={
              handleAddProduct
            }
            className="space-y-3 text-sm"
          >

            {/* Product Code */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Product Code
              </label>

              <input
                value={
                  form.productCode
                }
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
                value={
                  form.barcode
                }
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
                    name:
                      e.target.value,
                  })
                }
                placeholder="Snacks - Salted Peanuts"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Product Image */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Product Image
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  if (
                    file.size >
                    2 *
                      1024 *
                      1024
                  ) {
                    setError(
                      "Image size must be less than 2MB."
                    );
                    return;
                  }

                  setForm({
                    ...form,
                    image: file,
                    imagePreview:
                      URL.createObjectURL(
                        file
                      ),
                  });

                  setError("");
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />

              {form.imagePreview && (
                <div className="mt-2 flex justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <img
                    src={
                      form.imagePreview
                    }
                    alt="Product Preview"
                    className="h-28 w-28 object-contain"
                  />
                </div>
              )}

              <p className="mt-1 text-[10px] text-slate-400">
                JPG, JPEG, PNG or
                WEBP. Maximum 2MB.
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Category
              </label>

              <select
                required
                value={
                  form.categoryId
                }
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
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Prices */}
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
                  value={
                    form.price
                  }
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

            {/* Stock */}
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
                  value={
                    form.stock
                  }
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
                  value={
                    form.minStock
                  }
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
                  value={
                    form.unit
                  }
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
                  value={
                    form.taxRate
                  }
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
          EDIT PRODUCT MODAL
          ========================================================= */}
      {isEditOpen && (
        <Modal
          title="Edit Product"
          onClose={() => {
            if (!saving) {
              setIsEditOpen(false);
              setEditingProduct(
                null
              );
              resetProductForm();
            }
          }}
        >

          <form
            onSubmit={
              handleEditProduct
            }
            className="space-y-3 text-sm"
          >

            {/* Product Code */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Product Code
              </label>

              <input
                value={
                  form.productCode
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    productCode:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Barcode
              </label>

              <input
                value={
                  form.barcode
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    barcode:
                      e.target.value,
                  })
                }
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
                    name:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Product Image */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Product Image
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  if (
                    file.size >
                    2 *
                      1024 *
                      1024
                  ) {
                    setError(
                      "Image size must be less than 2MB."
                    );
                    return;
                  }

                  setForm({
                    ...form,
                    image: file,
                    imagePreview:
                      URL.createObjectURL(
                        file
                      ),
                  });

                  setError("");
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />

              {/* Existing / New Image */}
              {form.imagePreview && (
                <div className="mt-2 flex justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <img
                    src={
                      form.imagePreview
                    }
                    alt="Product Preview"
                    className="h-28 w-28 object-contain"
                  />
                </div>
              )}

              <p className="mt-1 text-[10px] text-slate-400">
                Select a new image only
                if you want to replace
                the current image.
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Category
              </label>

              <select
                required
                value={
                  form.categoryId
                }
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
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}

              </select>
            </div>

            {/* Prices */}
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
                  value={
                    form.price
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />
              </div>

            </div>

            {/* Stock + Minimum */}
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
                  value={
                    form.stock
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />

                <p className="mt-1 text-[10px] text-slate-400">
                  For stock movement,
                  use Inventory
                  Adjustment.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Minimum Stock
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.minStock
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minStock:
                        e.target.value,
                    })
                  }
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
                  value={
                    form.unit
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit:
                        e.target.value,
                    })
                  }
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
                  value={
                    form.taxRate
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      taxRate:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                />
              </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2">

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setIsEditOpen(
                    false
                  );
                  setEditingProduct(
                    null
                  );
                  resetProductForm();
                }}
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
                  ? "Updating..."
                  : "Update Product"}
              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* =========================================================
          DELETE PRODUCT CONFIRMATION
          ========================================================= */}
      {deleteProductTarget && (
        <Modal
          title="Delete Product"
          onClose={() => {
            if (!saving) {
              setDeleteProductTarget(
                null
              );
            }
          }}
        >

          <div className="space-y-4">

            <p className="text-sm text-slate-600">
              Are you sure you want to
              delete{" "}
              <strong>
                {
                  deleteProductTarget.name
                }
              </strong>
              ?
            </p>

            <p className="text-xs text-slate-400">
              If this product has already
              been used in sales, Laravel
              will prevent the deletion.
            </p>

            <div className="flex justify-end gap-2">

              <button
                disabled={saving}
                onClick={() =>
                  setDeleteProductTarget(
                    null
                  )
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                onClick={
                  handleDeleteProduct
                }
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {saving
                  ? "Deleting..."
                  : "Delete"}
              </button>

            </div>

          </div>

        </Modal>
      )}

      {/* =========================================================
          INVENTORY ADJUSTMENT MODAL
          ========================================================= */}
      {isInventoryOpen &&
        inventoryProduct && (
          <Modal
            title={
              inventoryForm.type ===
              "add"
                ? "Add Stock"
                : "Remove Stock"
            }
            onClose={() => {
              if (!saving) {
                setIsInventoryOpen(
                  false
                );
              }
            }}
          >

            <form
              onSubmit={
                handleInventoryAdjustment
              }
              className="space-y-4"
            >

              {/* Product Information */}
              <div className="rounded-lg bg-slate-50 p-3">

                <div className="text-sm font-medium text-slate-700">
                  {
                    inventoryProduct.name
                  }
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Current Stock:{" "}
                  <span className="font-semibold text-slate-700">
                    {
                      inventoryProduct.stock
                    }
                  </span>{" "}
                  {
                    inventoryProduct.unit
                  }
                </div>

              </div>

              {/* Add / Remove */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Inventory Action
                </label>

                <select
                  value={
                    inventoryForm.type
                  }
                  onChange={(e) =>
                    setInventoryForm({
                      ...inventoryForm,
                      type:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                >
                  <option value="add">
                    Add Stock
                  </option>

                  <option value="remove">
                    Remove Stock
                  </option>
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Quantity
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={
                    inventoryForm.quantity
                  }
                  onChange={(e) =>
                    setInventoryForm({
                      ...inventoryForm,
                      quantity:
                        e.target.value,
                    })
                  }
                  placeholder="10"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Reason
                </label>

                <select
                  value={inventoryForm.reason}
                  onChange={(e) =>
                    setInventoryForm({
                      ...inventoryForm,
                      reason: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                >
                  <option value="purchase">
                    Purchase / Restock
                  </option>

                  <option value="sale">
                    Sale
                  </option>

                  <option value="return">
                    Product Return
                  </option>

                  <option value="adjustment">
                    Stock Adjustment
                  </option>

                  <option value="damage">
                    Damaged Product
                  </option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-1">

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setIsInventoryOpen(
                      false
                    )
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
                    : "Save Adjustment"}
                </button>

              </div>

            </form>

          </Modal>
        )}

      {/* =========================================================
          INVENTORY LOGS MODAL
          ========================================================= */}
      {isLogsOpen &&
        inventoryProduct && (
          <Modal
            title="Inventory History"
            onClose={() => {
              if (!logsLoading) {
                setIsLogsOpen(false);
              }
            }}
          >

            {/* Product Information */}
            <div className="mb-4 rounded-lg bg-slate-50 p-3">

              <div className="text-sm font-medium text-slate-700">
                {
                  inventoryProduct.name
                }
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Current Stock:{" "}
                <span className="font-semibold text-slate-700">
                  {
                    inventoryProduct.stock
                  }
                </span>{" "}
                {
                  inventoryProduct.unit
                }
              </div>

            </div>

            {logsLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Loading inventory
                history...
              </div>
            ) : inventoryLogs.length ===
              0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No inventory history
                found.
              </div>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">

                {inventoryLogs.map(
                  (log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-slate-100 p-3"
                    >

                      <div className="flex items-center justify-between">

                        <span
                          className={`font-semibold ${
                            log.quantityChange >=
                            0
                              ? "text-emerald-600"
                              : "text-rose-500"
                          }`}
                        >
                          {log.quantityChange >=
                          0
                            ? "+"
                            : ""}
                          {
                            log.quantityChange
                          }
                        </span>

                        <span className="text-[10px] text-slate-400">
                          {
                            formatDateTime(
                              log.createdAt
                            )
                          }
                        </span>

                      </div>

                      <div className="mt-1 text-xs text-slate-600">
                        {
                          log.reason
                        }
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">

                        <div>
                          Before:{" "}
                          <span className="font-medium text-slate-600">
                            {
                              log.quantityBefore
                            }
                          </span>
                        </div>

                        <div>
                          After:{" "}
                          <span className="font-medium text-slate-600">
                            {
                              log.quantityAfter
                            }
                          </span>
                        </div>

                        <div className="col-span-2">
                          Created By:{" "}
                          <span className="font-medium text-slate-600">
                            {
                              log.createdBy
                            }
                          </span>
                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

            <div className="mt-4 flex justify-end">

              <button
                onClick={() =>
                  setIsLogsOpen(false)
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>

            </div>

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
                    key={
                      category.id
                    }
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >

                    <span className="flex items-center gap-2 text-slate-700">

                      <Icon
                        size={15}
                        className="text-slate-400"
                      />

                      {
                        category.name
                      }

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

            {categories.length ===
              0 && (
              <li className="py-4 text-center text-xs text-slate-400">
                No categories yet.
              </li>
            )}

          </ul>

          {/* Add Category */}
          <form
            onSubmit={
              handleAddCategory
            }
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