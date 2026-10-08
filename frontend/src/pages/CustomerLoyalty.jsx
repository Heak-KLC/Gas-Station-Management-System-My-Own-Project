import React, { useState } from "react";
import {
  UserPlus,
  Megaphone,
  Settings2,
  Search,
  X,
  Award,
  Sparkles,
  Filter,
  CheckCircle2,
  Users,
  Gift,
  Coins,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { Panel, StatusBadge, StatCard } from "../components/ui";

const TABS = ["Customer List", "Promotions", "Loyalty Levels & Rules"];

const initialCustomers = [
  { name: "Sok Dara", phone: "012 345 678", email: "sokdara@gmail.com", tier: "Platinum", points: 2400, spend: "22,450,000", visit: "12/15/2023", status: "Active" },
  { name: "Vuth Tida", phone: "012 987 654", email: "vuth.tida@gmail.com", tier: "Gold", points: 250, spend: "10,300,000", visit: "12/15/2023", status: "Active" },
  { name: "Serey Da", phone: "011 223 344", email: "serey.da@gmail.com", tier: "Gold", points: 250, spend: "2,050,000", visit: "12/15/2023", status: "Active" },
  { name: "Roa Da", phone: "099 887 766", email: "roa.da@gmail.com", tier: "Silver", points: 150, spend: "2,050,000", visit: "12/15/2023", status: "Active" },
  { name: "Prom Dara", phone: "088 776 655", email: "prom.dara@gmail.com", tier: "Silver", points: 150, spend: "1,350,000", visit: "12/15/2023", status: "Inactive" },
  { name: "Pisey Sith", phone: "077 665 544", email: "pisey.sith@gmail.com", tier: "Bronze", points: 150, spend: "2,050,000", visit: "01/15/2026", status: "Active" },
  { name: "Sovan Da", phone: "066 554 433", email: "sovan.da@gmail.com", tier: "Bronze", points: 150, spend: "2,050,000", visit: "01/15/2026", status: "Active" },
  { name: "Kit Kit", phone: "015 554 433", email: "kit.kit@gmail.com", tier: "Bronze", points: 150, spend: "2,050,000", visit: "01/15/2026", status: "Inactive" },
];

const initialPromotions = [
  { id: "PRM-001", code: "SUPERDIESEL5", title: "5% Off High Grade Diesel", type: "Discount", tier: "Gold & Above", validUntil: "2026-12-31", status: "Active" },
  { id: "PRM-002", code: "DOUBLEPTS", title: "2x Points Weekend Fueling", type: "Points Multiplier", tier: "All Members", validUntil: "2026-10-15", status: "Active" },
];

const initialTiers = [
  { name: "Bronze", minSpend: "$0", multiplier: "1x Pts / $1", perk: "Standard Rewards, Birthday Special Coupon", bg: "bg-gradient-to-br from-amber-700/10 to-orange-500/5 border-amber-200 text-amber-900", badge: "bg-amber-100 text-amber-800" },
  { name: "Silver", minSpend: "$1,000", multiplier: "1.2x Pts / $1", perk: "5% Off Store, Free Car Wash Voucher", bg: "bg-gradient-to-br from-slate-200/50 to-slate-100/30 border-slate-300 text-slate-800", badge: "bg-slate-200 text-slate-700" },
  { name: "Gold", minSpend: "$5,000", multiplier: "1.5x Pts / $1", perk: "Priority Access, 8% Off Lubricants", bg: "bg-gradient-to-br from-amber-400/15 to-yellow-500/5 border-amber-300 text-amber-950", badge: "bg-amber-200 text-amber-900" },
  { name: "Platinum", minSpend: "$15,000", multiplier: "2.0x Pts / $1", perk: "VIP Lounge Access, Dedicated Manager", bg: "bg-gradient-to-br from-cyan-500/15 to-blue-600/5 border-cyan-300 text-cyan-950", badge: "bg-cyan-100 text-cyan-900" },
];

const TIER_BADGES = {
  Platinum: "bg-cyan-50 text-cyan-700 border border-cyan-200/60 font-semibold",
  Gold: "bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold",
  Silver: "bg-slate-100 text-slate-600 border border-slate-200 font-semibold",
  Bronze: "bg-orange-50 text-orange-700 border border-orange-200/60 font-semibold",
};

export default function CustomerLoyalty() {
  const [tab, setTab] = useState(TABS[0]);
  
  // Dynamic States
  const [customersList, setCustomersList] = useState(initialCustomers);
  const [promotionsList, setPromotionsList] = useState(initialPromotions);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState("All");

  // Modals state
  const [modalType, setModalType] = useState(null);

  // Forms
  const [regForm, setRegForm] = useState({ name: "", phone: "", email: "", tier: "Bronze" });
  const [prmForm, setPrmForm] = useState({ code: "", title: "", type: "Discount", tier: "All Members", validUntil: "" });

  const handleRegisterCustomer = (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.phone) return;

    const newCust = {
      name: regForm.name,
      phone: regForm.phone,
      email: regForm.email || "N/A",
      tier: regForm.tier,
      points: 0,
      spend: "0",
      visit: new Date().toLocaleDateString("en-US"),
      status: "Active",
    };

    setCustomersList([newCust, ...customersList]);
    setRegForm({ name: "", phone: "", email: "", tier: "Bronze" });
    setModalType(null);
  };

  const handleCreatePromotion = (e) => {
    e.preventDefault();
    if (!prmForm.code || !prmForm.title) return;

    const newPrm = {
      id: `PRM-00${promotionsList.length + 1}`,
      code: prmForm.code.toUpperCase(),
      title: prmForm.title,
      type: prmForm.type,
      tier: prmForm.tier,
      validUntil: prmForm.validUntil || "2026-12-31",
      status: "Active",
    };

    setPromotionsList([newPrm, ...promotionsList]);
    setPrmForm({ code: "", title: "", type: "Discount", tier: "All Members", validUntil: "" });
    setModalType(null);
  };

  const filteredCustomers = customersList.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    const matchesTier = selectedTierFilter === "All" || c.tier === selectedTierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="p-6 space-y-6 bg-gray-300 min-h-screen">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Customer &amp; Loyalty Hub</h1>
          <p className="text-sm text-black mt-0.5">Manage members, points rewards, and promotional offers</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => setModalType("register")}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-cyan-500/20 hover:bg-cyan-600 active:scale-[0.98] transition"
          >
            <UserPlus size={15} /> Register Customer
          </button>
          <button 
            onClick={() => setModalType("promotion")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition"
          >
            <Megaphone size={15} className="text-slate-500" /> Create Promotion
          </button>
          <button 
            onClick={() => setModalType("settings")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition"
          >
            <Settings2 size={15} className="text-slate-500" /> Settings
          </button>
        </div>
      </div>

      {/* Styled Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Users size={40} /></div>
          <div>
            <div className="text-base font-semibold text-black">Total Customers</div>
            <div className="text-2xl font-bold text-slate-800">{customersList.length.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Sparkles size={40} /></div>
          <div>
            <div className="text-base font-semibold text-black">Loyalty Members</div>
            <div className="text-2xl font-bold text-slate-800">{customersList.filter(c => c.tier !== "Bronze").length.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600"><Coins size={40} /></div>
          <div>
            <div className="text-bae font-semibold text-black">Total Points Issued</div>
            <div className="text-2xl font-bold text-slate-800">2,450,000 <span className="text-base font-normal text-black">Pts</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Gift size={40} /></div>
          <div>
            <div className="text-base font-semibold text-black">Active Promotions</div>
            <div className="text-2xl font-bold text-slate-800">{promotionsList.filter(p => p.status === "Active").length}</div>
          </div>
        </div>
      </div>

      {/* Tabs Design */}
      <div className="flex gap-2 border-b-2 border-cyan-600 pt-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 px-4 text-xl font-bold transition-all relative ${
              tab === t
                ? "text-cyan-800"
                : "text-gray-600 hover:text-slate-600"
            }`}
          >
            {t}
            {tab === t && (
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
              <SlidersHorizontal size={14} className="text-cyan-600" /> Filter Options
            </div>
            
            <div className="space-y-3.5 text-base">
              <div>
                <label className="mb-1 block font-medium text-slate-500">Search Keyword</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Name or Phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-400 bg-slate-50/50 py-2 pl-9 pr-3 text-xs outline-none focus:bg-white focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-500">Membership Tier</label>
                <select 
                  value={selectedTierFilter}
                  onChange={(e) => setSelectedTierFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-400 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-cyan-500 transition"
                >
                  <option value="All">All Tiers</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Bronze">Bronze</option>
                </select>
              </div>

              <button 
                onClick={() => { setSearchQuery(""); setSelectedTierFilter("All"); }}
                className="w-full py-2 bg-slate-200 hover:bg-slate-400/80 text-slate-600 rounded-xl font-semibold text-base transition"
              >
                Reset Filter
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
                  {filteredCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 font-bold text-slate-800">{c.name}</td>
                      <td className="py-3.5 text-slate-500">
                        <div className="font-medium text-slate-700">{c.phone}</div>
                        <div className="text-xs text-slate-400">{c.email}</div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] ${TIER_BADGES[c.tier]}`}>
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-cyan-600">{c.points.toLocaleString()} pts</td>
                      <td className="py-3.5 font-semibold text-slate-700">{c.spend} ៛</td>
                      <td className="py-3.5 text-slate-400">{c.visit}</td>
                      <td className="py-3.5">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">No matching customers found.</td>
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
                {promotionsList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 font-semibold text-slate-400">{p.id}</td>
                    <td className="py-3.5">
                      <span className="font-mono font-extrabold text-cyan-600 bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded-lg">
                        {p.code}
                      </span>
                    </td>
                    <td className="py-3.5 font-semibold text-slate-800">{p.title}</td>
                    <td className="py-3.5 text-black">{p.type}</td>
                    <td className="py-3.5 text-black">{p.tier}</td>
                    <td className="py-3.5 text-black">{p.validUntil}</td>
                    <td className="py-3.5"><StatusBadge status={p.status} /></td>
                    <td className="py-3.5 text-right">
                      <button 
                        onClick={() => {
                          setPromotionsList(promotionsList.map(item => item.id === p.id ? {...item, status: item.status === "Active" ? "Inactive" : "Active"} : item))
                        }}
                        className="text-base text-rose-500 hover:text-rose-700 font-semibold transition"
                      >
                        {p.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Loyalty Levels & Rules */}
      {tab === "Loyalty Levels & Rules" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {initialTiers.map((t) => (
            <div key={t.name} className={`p-5 rounded-2xl space-y-4 shadow-sm relative overflow-hidden bg-pink-300`}>
              <div className="flex justify-between items-center">
                <span className={`px-2.5 py-1 rounded-lg text-base font-bold ${t.badge}`}>
                  {t.name} Tier
                </span>
                <Award size={40} className="opacity-100" />
              </div>
              <div>
                <div className="text-sm text-bold uppercase tracking-wider font-bold">Requirement</div>
                <div className="text-base font-extrabold text-slate-800">Min. Spend {t.minSpend}</div>
              </div>
              <div>
                <div className="text-base text-black uppercase tracking-wider font-bold">Reward Rate</div>
                <div className="text-sm font-semibold text-slate-700">{t.multiplier}</div>
              </div>
              <div className="pt-3 border-t border-slate-200/60">
                <div className="text-[14px] text-slate-500 uppercase tracking-wider font-bold mb-1">Perks &amp; Benefits</div>
                <div className="text-sm leading-relaxed text-black">{t.perk}</div>
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
              <h3 className="font-bold text-slate-800 text-sm">Register New Customer</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleRegisterCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Chan Sokha"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Phone Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="012 345 678"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Email Address</label>
                <input 
                  type="email" 
                  placeholder="chansokha@gmail.com"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Initial Tier</label>
                <select 
                  value={regForm.tier}
                  onChange={(e) => setRegForm({ ...regForm, tier: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                >
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border rounded-xl text-slate-600 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Promotion */}
      {modalType === "promotion" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Create New Campaign</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreatePromotion} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Promo Code *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="FREEWASH"
                    value={prmForm.code}
                    onChange={(e) => setPrmForm({ ...prmForm, code: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 uppercase outline-none focus:bg-white focus:border-cyan-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Type</label>
                  <select 
                    value={prmForm.type}
                    onChange={(e) => setPrmForm({ ...prmForm, type: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                  >
                    <option value="Discount">Discount %</option>
                    <option value="Points Multiplier">Points Multiplier</option>
                    <option value="Free Gift">Free Gift</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Campaign Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Free Car Wash Voucher"
                  value={prmForm.title}
                  onChange={(e) => setPrmForm({ ...prmForm, title: e.target.value })}
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Target Tier</label>
                  <select 
                    value={prmForm.tier}
                    onChange={(e) => setPrmForm({ ...prmForm, tier: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                  >
                    <option value="All Members">All Members</option>
                    <option value="Silver & Above">Silver &amp; Above</option>
                    <option value="Gold & Above">Gold &amp; Above</option>
                    <option value="Platinum Only">Platinum Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Valid Until</label>
                  <input 
                    type="date" 
                    value={prmForm.validUntil}
                    onChange={(e) => setPrmForm({ ...prmForm, validUntil: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 border rounded-xl text-slate-600 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition">Launch Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Settings */}
      {modalType === "settings" && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Loyalty Rules Settings</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Earn Rate (Pts per $1 Spend)</label>
                <input 
                  type="number" 
                  defaultValue={1}
                  className="w-full border rounded-xl p-2.5 bg-slate-50/50 text-slate-800 outline-none focus:bg-white focus:border-cyan-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Redemption Rate (Pts for $1 Discount)</label>
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
          </div>
        </div>
      )}

    </div>
  );
}