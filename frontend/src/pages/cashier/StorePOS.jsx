
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ShoppingBag, Search, Plus, Minus, Trash2,
  RefreshCw, LoaderCircle, Check, Wallet, CreditCard,
  Building2, QrCode
} from "lucide-react";

const API_URL = "https://gas-station-backend-ps9c.onrender.com";

const PAYMENT_OPTIONS = [
  { label: "Cash", value: "cash", icon: Wallet },
  { label: "Credit Card", value: "credit_card", icon: CreditCard },
  { label: "Debit Card", value: "debit_card", icon: CreditCard },
  { label: "QR Payment", value: "qr_payment", icon: QrCode },
  { label: "Bank Transfer", value: "bank_transfer", icon: Building2 },
];

const money = (value) => Number(value || 0).toFixed(2);

const getHeaders = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${sessionStorage.getItem("gas_station_token") || ""}`,
});

async function readResponse(response) {
  const text = await response.text();
  let result = {};

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }

    if (result.errors) {
      throw new Error(Object.values(result.errors).flat().join(" "));
    }

    throw new Error(result.message || `Request failed (${response.status}).`);
  }

  return result;
}

function getRows(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  return [];
}

export default function StorePOS({ onBack }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountInput, setDiscountInput] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [receipt, setReceipt] = useState(null);

  const notify = useCallback((message) => {
    setToast(message);
    setTimeout(() => {
      setToast((current) => current === message ? "" : current);
    }, 3000);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      if (!sessionStorage.getItem("gas_station_token")) {
        throw new Error("Please log in to use Store Sale.");
      }

      const response = await fetch(
        `${API_URL}/products?is_active=1`,
        { headers: getHeaders() }
      );

      const result = await readResponse(response);

      const mapped = getRows(result)
        .filter((p) => p.is_active === true || Number(p.is_active) === 1)
        .map((p) => ({
        id: Number(p.product_id),
        code: p.product_code || "",
        name: p.product_name,
        image: p.image || null,
        category: p.category?.category_name || "Uncategorized",
        price: Number(p.selling_price || 0),
        stock: Number(p.quantity_in_stock || 0),
        unit: p.unit || "unit",
        taxRate: Number(p.tax_rate || 0),
        }));

      setProducts(mapped);
    } catch (error) {
      notify(error.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  }, [products, search]);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Tax preview only. Laravel calculates the official tax.
  const taxPreview = cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity * item.taxRate / 100,
    0
  );

  const discount = Math.max(0, Number(discountInput) || 0);
  const total = Math.max(0, subtotal + taxPreview - discount);

  const addProduct = (product) => {
    if (product.price <= 0) {
      notify("This product has an invalid selling price.");
      return;
    }

    if (product.stock <= 0) {
      notify("This product is out of stock.");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          notify(`Insufficient stock for ${product.name}.`);
          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        { ...product, quantity: 1, itemDiscount: 0 },
      ];
    });
  };

  const changeQuantity = (productId, delta) => {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== productId) return item;

        const next = item.quantity + delta;

        if (next <= 0) return item;

        if (next > item.stock) {
          notify(`Insufficient stock for ${item.name}.`);
          return item;
        }

        return { ...item, quantity: next };
      })
    );
  };

  const removeProduct = (productId) => {
    setCart((current) => current.filter((item) => item.id !== productId));
  };

  const completeSale = async () => {
    if (saving) return;

    if (cart.length === 0) {
      notify("Please add products to the cart.");
      return;
    }

    if (discount > subtotal + taxPreview) {
      notify("Discount cannot exceed the sale total.");
      return;
    }

    if (!sessionStorage.getItem("gas_station_token")) {
      notify("Please log in before completing the sale.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/store-sales`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          discount,
          payment_method: paymentMethod,
          payment_status: "paid",
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            discount: item.itemDiscount || 0,
          })),
        }),
      });

      const result = await readResponse(response);
      const sale = result.data;

      setReceipt(sale);
      setCart([]);
      setDiscountInput("0");

      notify(result.message || "Store sale completed successfully.");

      await loadProducts();
    } catch (error) {
      notify(error.message || "Unable to complete store sale.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-300 p-5 space-y-5 text-slate-800">
      {toast && (
        <div
          role="status"
          className="fixed right-5 top-5 z-50 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl"
        >
          {toast}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border bg-white p-3 hover:bg-slate-50"
            title="Back to POS selection"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-xl font-black">Store Sale</h1>
            <p className="text-sm text-slate-500">
              Convenience Store POS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadProducts}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Products
        </button>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="space-y-4 xl:col-span-2">
          <div className="rounded-2xl border bg-white p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product name, code, or category..."
                className="w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white py-16 text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border bg-white py-16 text-center text-sm text-slate-500">
              No active products found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product)}
                  disabled={product.stock <= 0}
                  className="rounded-2xl border bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="mb-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
  {product.image ? (
    <img
      src={
        product.image.startsWith("http")
          ? product.image
          : `http://127.0.0.1:8000/storage/${product.image.replace(/^\/+/, "")}`
      }
      alt={product.name}
      className="h-full w-full object-contain"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  ) : (
    <ShoppingBag className="h-10 w-10 text-gray-400" />
  )}
</div>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500">
                      Stock: {money(product.stock)} {product.unit}
                    </span>
                  </div>

                  <p className="font-bold">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {product.code || product.category}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-black text-blue-600">
                      ${money(product.price)}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                      <Plus className="h-4 w-4" /> Add
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit space-y-4 rounded-2xl border bg-white p-4">
          <h2 className="flex items-center gap-2 font-black">
            <ShoppingBag className="h-5 w-5" />
            Cart ({cart.length})
          </h2>

          {cart.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              <ShoppingBag className="mx-auto mb-2 h-10 w-10 opacity-40" />
              No products added yet.
            </div>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="rounded-xl border p-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        ${money(item.price)} / {item.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(item.id)}
                      className="h-fit text-rose-500 hover:text-rose-700"
                      title="Remove product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                        className="rounded-lg border p-1.5 disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        className="rounded-lg border p-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <span className="text-sm font-black">
                      ${money(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal (preview)</span>
              <span className="font-bold">${money(subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Tax (preview)</span>
              <span className="font-bold">${money(taxPreview)}</span>
            </div>

            <label className="block text-xs font-semibold text-slate-500">
              Sale Discount
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2.5 text-sm text-slate-800 outline-none focus:border-blue-500"
              />
            </label>

            <div className="flex justify-between border-t pt-3 text-base font-black">
              <span>Total (preview)</span>
              <span className="text-emerald-600">${money(total)}</span>
            </div>

            <p className="text-xs text-slate-400">
              The final tax and total are calculated by Laravel using
              the saved product prices and tax rates.
            </p>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Payment Method
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_OPTIONS.map((payment) => {
              const Icon = payment.icon;

              return (
                <button
                  key={payment.value}
                  type="button"
                  onClick={() => setPaymentMethod(payment.value)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${
                    paymentMethod === payment.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {payment.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={completeSale}
            disabled={saving || loading || cart.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? <LoaderCircle className="h-4 w-4 animate-spin" />
              : <Check className="h-4 w-4" />}
            {saving ? "Processing..." : "Complete Store Sale"}
          </button>
        </aside>
      </div>

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black">Sale Completed</h2>
              <p className="mt-1 text-sm text-slate-500">
                {receipt.sale_number}
              </p>
            </div>

            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${money(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${money(receipt.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>${money(receipt.discount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-black">
                <span>Total</span>
                <span>${money(receipt.total_amount)}</span>
              </div>
              <p className="text-xs text-slate-500">
                Payment: {receipt.payment_method}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white"
            >
              New Store Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
