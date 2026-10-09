import React, { useEffect, useState } from "react";
import {
  UserPlus,
  Megaphone,
  Settings2,
  Search,
  X,
  Award,
  Sparkles,
  Users,
  Gift,
  Coins,
  SlidersHorizontal,
} from "lucide-react";

import { StatusBadge } from "../components/ui";

// Import the existing Laravel Customer API functions.
import {
  getCustomers,
  createCustomer,
} from "../api/customerApi";

const TABS = ["Customer List", "Promotions", "Loyalty Levels & Rules"];

// Promotions remain mock data until a Promotions API is implemented.
const initialPromotions = [
  {
    id: "PRM-001",
    code: "SUPERDIESEL5",
    title: "5% Off High Grade Diesel",
    type: "Discount",
    tier: "Gold & Above",
    validUntil: "2026-12-31",
    status: "Active",
  },
  {
    id: "PRM-002",
    code: "DOUBLEPTS",
    title: "2x Points Weekend Fueling",
    type: "Points Multiplier",
    tier: "All Members",
    validUntil: "2026-10-15",
    status: "Active",
  },
];

const initialTiers = [
  {
    name: "Bronze",
    minSpend: "$0",
    multiplier: "1x Pts / $1",
    perk: "Standard Rewards, Birthday Special Coupon",
    bg: "bg-gradient-to-br from-amber-700/10 to-orange-500/5 border-amber-200 text-amber-900",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    name: "Silver",
    minSpend: "$1,000",
    multiplier: "1.2x Pts / $1",
    perk: "5% Off Store, Free Car Wash Voucher",
    bg: "bg-gradient-to-br from-slate-200/50 to-slate-100/30 border-slate-300 text-slate-800",
    badge: "bg-slate-200 text-slate-700",
  },
  {
    name: "Gold",
    minSpend: "$5,000",
    multiplier: "1.5x Pts / $1",
    perk: "Priority Access, 8% Off Lubricants",
    bg: "bg-gradient-to-br from-amber-400/15 to-yellow-500/5 border-amber-300 text-amber-950",
    badge: "bg-amber-200 text-amber-900",
  },
  {
    name: "Platinum",
    minSpend: "$15,000",
    multiplier: "2.0x Pts / $1",
    perk: "VIP Lounge Access, Dedicated Manager",
    bg: "bg-gradient-to-br from-cyan-500/15 to-blue-600/5 border-cyan-300 text-cyan-950",
    badge: "bg-cyan-100 text-cyan-900",
  },
];

const TIER_BADGES = {
  Platinum:
    "bg-cyan-50 text-cyan-700 border border-cyan-200/60 font-semibold",
  Gold:
    "bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold",
  Silver:
    "bg-slate-100 text-slate-600 border border-slate-200 font-semibold",
  Bronze:
    "bg-orange-50 text-orange-700 border border-orange-200/60 font-semibold",
  None:
    "bg-gray-100 text-gray-600 border border-gray-200 font-semibold",
};

// Convert the database membership value into the display label used by the UI.
const formatTier = (tier) => {
  const normalizedTier = String(tier || "none").toLowerCase();

  const tierNames = {
    none: "None",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
  };

  return tierNames[normalizedTier] || "None";
};

// Convert a Laravel customer record into the existing UI data structure.
const mapCustomerFromApi = (customer) => ({
  id: customer.customer_id,
  customerCode: customer.customer_code,
  name: customer.full_name || "",
  phone: customer.phone || "",
  email: customer.email || "N/A",
  tier: formatTier(customer.loyalty_membership),
  points: Number(customer.loyalty_points || 0),
  spend: Number(customer.total_purchases || 0),
  visit: customer.registered_at
    ? new Date(
        String(customer.registered_at).replace(" ", "T")
      ).toLocaleDateString("en-GB")
    : "N/A",
  status: customer.is_active ? "Active" : "Inactive",
});

// Display numbers with thousands separators.
const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-US");

export default function CustomerLoyalty() {
  const [tab, setTab] = useState(TABS[0]);

  // Customer records now come from Laravel instead of hard-coded sample data.
  const [customersList, setCustomersList] = useState([]);

  // Promotions are still local until their backend API is implemented.
  const [promotionsList, setPromotionsList] = useState(initialPromotions);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState("All");

  // Track loading, submitting and API error/success messages.
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Control which modal is currently visible.
  const [modalType, setModalType] = useState(null);

  // Customer registration form.
  // The default membership is "none", which is supported by the database.
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    email: "",
    tier: "None",
  });

  // Promotion form remains unchanged.
  const [prmForm, setPrmForm] = useState({
    code: "",
    title: "",
    type: "Discount",
    tier: "All Members",
    validUntil: "",
  });

  // --------------------------------------------------
  // Load customers from Laravel when this component opens.
  // --------------------------------------------------
  const loadCustomers = async () => {
    setLoadingCustomers(true);
    setErrorMessage("");

    try {
      const response = await getCustomers();

      // The Laravel controller returns { message, data: [...] }.
      const customerRecords = Array.isArray(response.data)
        ? response.data
        : [];

      setCustomersList(customerRecords.map(mapCustomerFromApi));
    } catch (error) {
      console.error("Failed to load customers:", error);

      setErrorMessage(
        error.response?.data?.message ||
          "Unable to load customers. Please check the backend API and try again."
      );
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // --------------------------------------------------
  // Register a customer through the Laravel API.
  // Customer information is saved in MySQL by the backend.
  // --------------------------------------------------
  const handleRegisterCustomer = async (e) => {
    e.preventDefault();

    if (!regForm.name.trim() || !regForm.phone.trim()) {
      setErrorMessage("Full name and phone number are required.");
      return;
    }

    setSavingCustomer(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Map the existing form field names to the database/API field names.
      const customerData = {
        full_name: regForm.name.trim(),
        phone: regForm.phone.trim(),
        email: regForm.email.trim() || null,
        loyalty_membership: regForm.tier.toLowerCase(),
      };

      await createCustomer(customerData);

      // Reload the list to display the record returned by the database.
      await loadCustomers();

      setRegForm({
        name: "",
        phone: "",
        email: "",
        tier: "None",
      });

      setModalType(null);
      setSuccessMessage("Customer registered successfully.");
    } catch (error) {
      console.error("Failed to register customer:", error);

      // Laravel validation errors may include details for individual fields.
      const validationErrors = error.response?.data?.errors;
      const firstValidationError = validationErrors
        ? Object.values(validationErrors).flat()[0]
        : null;

      setErrorMessage(
        firstValidationError ||
          error.response?.data?.message ||
          "Unable to register the customer. Please try again."
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  // --------------------------------------------------
  // Create a promotion locally for now.
  // This does not save the promotion to MySQL yet.
  // --------------------------------------------------
  const handleCreatePromotion = (e) => {
    e.preventDefault();

    if (!prmForm.code.trim() || !prmForm.title.trim()) return;

    const newPrm = {
      id: `PRM-${String(promotionsList.length + 1).padStart(3, "0")}`,
      code: prmForm.code.trim().toUpperCase(),
      title: prmForm.title.trim(),
      type: prmForm.type,
      tier: prmForm.tier,
      validUntil: prmForm.validUntil || "2026-12-31",
      status: "Active",
    };

    setPromotionsList((previous) => [newPrm, ...previous]);

    setPrmForm({
      code: "",
      title: "",
      type: "Discount",
      tier: "All Members",
      validUntil: "",
    });

    setModalType(null);
  };

  // --------------------------------------------------
  // Search customers by name, phone, email or customer code.
  // Apply the selected membership filter as well.
  // --------------------------------------------------
  const filteredCustomers = customersList.filter((customer) => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      String(customer.customerCode || "").toLowerCase().includes(query);

    const matchesTier =
      selectedTierFilter === "All" ||
      customer.tier === selectedTierFilter;

    return matchesSearch && matchesTier;
  });

  // Calculate statistics from the customers currently loaded from the API.
  const totalCustomers = customersList.length;

  const totalLoyaltyMembers = customersList.filter(
    (customer) => customer.tier !== "None"
  ).length;

  const totalPoints = customersList.reduce(
    (total, customer) => total + customer.points,
    0
  );

  const activePromotions = promotionsList.filter(
    (promotion) => promotion.status === "Active"
  ).length;

  return (
    <div className="p-6 space-y-6 bg-gray-300 min-h-screen">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Customer &amp; Loyalty Hub
          </h1>
          <p className="text-sm text-black mt-0.5">
            Manage members, points rewards, and promotional offers
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setErrorMessage("");
              setSuccessMessage("");
              setModalType("register");
            }}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-cyan-500/20 hover:bg-cyan-600 active:scale-[0.98] transition"
          >
            <UserPlus size={15} />
            Register Customer
          </button>

          <button
            onClick={() => setModalType("promotion")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition"
          >
            <Megaphone size={15} className="text-slate-500" />
            Create Promotion
          </button>

          <button
            onClick={() => setModalType("settings")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition"
          >
            <Settings2 size={15} className="text-slate-500" />
            Settings
          </button>
        </div>
      </div>

      {/* API success and error messages */}
      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              className="shrink-0 font-semibold"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Styled Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Users size={40} />
          </div>
          <div>
            <div className="text-base font-semibold text-black">
              Total Customers
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {loadingCustomers ? "..." : formatNumber(totalCustomers)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Sparkles size={40} />
          </div>
          <div>
            <div className="text-base font-semibold text-black">
              Loyalty Members
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {loadingCustomers ? "..." : formatNumber(totalLoyaltyMembers)}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600">
            <Coins size={40} />
          </div>
          <div>
            <div className="text-base font-semibold text-black">
              Total Points Issued
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {loadingCustomers ? "..." : formatNumber(totalPoints)}
              <span className="text-base font-normal text-black"> Pts</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Gift size={40} />
          </div>
          <div>
            <div className="text-base font-semibold text-black">
              Active Promotions
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {activePromotions}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Design */}
      <div className="flex gap-2 border-b-2 border-cyan-600 pt-1 overflow-x-auto">
        {TABS.map((currentTab) => (
          <button
            key={currentTab}
            onClick={() => setTab(currentTab)}
            className={`pb-3 px-4 text-xl font-bold transition-all relative whitespace-nowrap ${
              tab === currentTab
                ? "text-cyan-800"
                : "text-gray-600 hover:text-slate-600"
            }`}
          >
            {currentTab}
            {tab === currentTab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: Customer List */}
      {tab === "Customer List" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Left Panel: Filter */}
          <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm h-fit space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-slate-700 border-b border-slate-400 pb-2.5">
              <SlidersHorizontal size={14} className="text-cyan-600" />
              Filter Options
            </div>

            <div className="space-y-3.5 text-base">
              <div>
                <label className="mb-1 block font-medium text-slate-500">
                  Search Keyword
                </label>

                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Name, phone or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-400 bg-slate-50/50 py-2 pl-9 pr-3 text-xs outline-none focus:bg-white focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-500">
                  Membership Tier
                </label>

                <select
                  value={selectedTierFilter}
                  onChange={(e) => setSelectedTierFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-400 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-cyan-500 transition"
                >
                  <option value="All">All Tiers</option>
                  <option value="None">None</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Bronze">Bronze</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTierFilter("All");
                }}
                className="w-full py-2 bg-slate-200 hover:bg-slate-400/80 text-slate-600 rounded-xl font-semibold text-base transition"
              >
                Reset Filter
              </button>

              {/* Reload customer records directly from Laravel */}
              <button
                type="button"
                onClick={loadCustomers}
                disabled={loadingCustomers}
                className="w-full py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl font-semibold text-sm transition disabled:opacity-50"
              >
                {loadingCustomers ? "Loading..." : "Refresh Customers"}
              </button>
            </div>
          </div>

          {/* Right Panel: Customer Table */}
          <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-400 text-black text-base">
                    <th className="pb-3 font-semibold">Full Name</th>
                    <th className="pb-3 font-semibold">Contact Details</th>
                    <th className="pb-3 font-semibold">Tier</th>
                    <th className="pb-3 font-semibold">Points Balance</th>
                    <th className="pb-3 font-semibold">Total Spend</th>
                    <th className="pb-3 font-semibold">Last Visit</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50 text-sm">
                  {loadingCustomers ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-slate-400"
                      >
                        Loading customers from database...
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id ?? customer.customerCode}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-3.5 font-bold text-slate-800">
                          {customer.name}
                          {customer.customerCode && (
                            <div className="text-xs font-normal text-slate-400 mt-1">
                              {customer.customerCode}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 text-slate-500">
                          <div className="font-medium text-slate-700">
                            {customer.phone}
                          </div>
                          <div className="text-xs text-slate-400">
                            {customer.email}
                          </div>
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] ${
                              TIER_BADGES[customer.tier] || TIER_BADGES.None
                            }`}
                          >
                            {customer.tier}
                          </span>
                        </td>

                        <td className="py-3.5 font-bold text-cyan-600">
                          {formatNumber(customer.points)} pts
                        </td>

                        <td className="py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                          {formatNumber(customer.spend)} ៛
                        </td>

                        <td className="py-3.5 text-slate-400 whitespace-nowrap">
                          {customer.visit}
                        </td>

                        <td className="py-3.5">
                          <StatusBadge status={customer.status} />
                        </td>
                      </tr>
                    ))
                  )}

                  {!loadingCustomers && filteredCustomers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-slate-400"
                      >
                        {errorMessage
                          ? "Customer data could not be loaded."
                          : "No matching customers found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Promotions */}
      {tab === "Promotions" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-slate-400 text-black">
                  <th className="pb-3 font-semibold">Promo ID</th>
                  <th className="pb-3 font-semibold">Promo Code</th>
                  <th className="pb-3 font-semibold">Campaign Title</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Target Tier</th>
                  <th className="pb-3 font-semibold">Valid Until</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50 text-base">
                {promotionsList.map((promotion) => (
                  <tr
                    key={promotion.id}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="py-3.5 font-semibold text-slate-400">
                      {promotion.id}
                    </td>

                    <td className="py-3.5">
                      <span className="font-mono font-extrabold text-cyan-600 bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded-lg">
                        {promotion.code}
                      </span>
                    </td>

                    <td className="py-3.5 font-semibold text-slate-800">
                      {promotion.title}
                    </td>

                    <td className="py-3.5 text-black">
                      {promotion.type}
                    </td>

                    <td className="py-3.5 text-black">
                      {promotion.tier}
                    </td>

                    <td className="py-3.5 text-black">
                      {promotion.validUntil}
                    </td>

                    <td className="py-3.5">
                      <StatusBadge status={promotion.status} />
                    </td>

                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          setPromotionsList((previous) =>
                            previous.map((item) =>
                              item.id === promotion.id
                                ? {
                                    ...item,
                                    status:
                                      item.status === "Active"
                                        ? "Inactive"
                                        : "Active",
                                  }
                                : item
                            )
                          );
                        }}
                        className="text-base text-rose-500 hover:text-rose-700 font-semibold transition"
                      >
                        {promotion.status === "Active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Promotions are currently stored in frontend state only. Changes
            will not persist after refreshing the page.
          </p>
        </div>
      )}

      {/* TAB 3: Loyalty Levels & Rules */}
      {tab === "Loyalty Levels & Rules" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {initialTiers.map((tier) => (
            <div
              key={tier.name}
              className={`p-5 rounded-2xl space-y-4 shadow-sm relative overflow-hidden bg-pink-300 ${tier.bg}`}
            >
              <div className="flex justify-between items-center">
                <span
                  className={`px-2.5 py-1 rounded-lg text-base font-bold ${tier.badge}`}
                >
                  {tier.name} Tier
                </span>
                <Award size={40} className="opacity-100" />
              </div>

              <div>
                <div className="text-sm uppercase tracking-wider font-bold">
                  Requirement
                </div>
                <div className="text-base font-extrabold text-slate-800">
                  Min. Spend {tier.minSpend}
                </div>
              </div>

              <div>
                <div className="text-base text-black uppercase tracking-wider font-bold">
                  Reward Rate
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {tier.multiplier}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60">
                <div className="text-[14px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                  Perks &amp; Benefits
                </div>
                <div className="text-sm leading-relaxed text-black">
                  {tier.perk}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Modal 1: Register Customer */}
      {modalType === "register" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Register New Customer
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleRegisterCustomer}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Chan Sokha"
                  value={regForm.name}
                  onChange={(e) =>
                    setRegForm({ ...regForm, name: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={20}
                  placeholder="012 345 678"
                  value={regForm.phone}
                  onChange={(e) =>
                    setRegForm({ ...regForm, phone: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Email Address
                </label>
                <input
                  type="email"
                  maxLength={100}
                  placeholder="chansokha@gmail.com"
                  value={regForm.email}
                  onChange={(e) =>
                    setRegForm({ ...regForm, email: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Initial Tier
                </label>
                <select
                  value={regForm.tier}
                  onChange={(e) =>
                    setRegForm({ ...regForm, tier: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                >
                  <option value="None">None</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  disabled={savingCustomer}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCustomer ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Promotion - still frontend-only */}
      {modalType === "promotion" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Create New Campaign
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreatePromotion}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Promo Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="FREEWASH"
                    value={prmForm.code}
                    onChange={(e) =>
                      setPrmForm({ ...prmForm, code: e.target.value })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 uppercase outline-none focus:bg-white focus:border-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Type
                  </label>
                  <select
                    value={prmForm.type}
                    onChange={(e) =>
                      setPrmForm({ ...prmForm, type: e.target.value })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                  >
                    <option value="Discount">Discount %</option>
                    <option value="Points Multiplier">Points Multiplier</option>
                    <option value="Free Gift">Free Gift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free Car Wash Voucher"
                  value={prmForm.title}
                  onChange={(e) =>
                    setPrmForm({ ...prmForm, title: e.target.value })
                  }
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Target Tier
                  </label>
                  <select
                    value={prmForm.tier}
                    onChange={(e) =>
                      setPrmForm({ ...prmForm, tier: e.target.value })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                  >
                    <option value="All Members">All Members</option>
                    <option value="Silver & Above">Silver &amp; Above</option>
                    <option value="Gold & Above">Gold &amp; Above</option>
                    <option value="Platinum Only">Platinum Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={prmForm.validUntil}
                    onChange={(e) =>
                      setPrmForm({ ...prmForm, validUntil: e.target.value })
                    }
                    className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Settings - not connected to backend yet */}
      {modalType === "settings" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Loyalty Rules Settings
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Earn Rate (Pts per $1 Spend)
                </label>
                <input
                  type="number"
                  defaultValue={1}
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Redemption Rate (Pts for $1 Discount)
                </label>
                <input
                  type="number"
                  defaultValue={100}
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>
            </div>

            <button
              onClick={() => setModalType(null)}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
            >
              Save Configuration
            </button>

            <p className="text-xs text-slate-400">
              These settings are not saved to the database yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}