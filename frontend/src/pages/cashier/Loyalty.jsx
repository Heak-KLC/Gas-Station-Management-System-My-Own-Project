import React, { useState } from 'react';
import { Card, Table, S, Input, Select, Pager } from '../../components/kit';

// ទិន្នន័យអតិថិជនគំរូ ស្របតាម UI ក្នុងរូបភាព
const initialCustomers = [
  { 
    id: 1, name: 'Sok San', phone: '012 456 783', tier: 'GOLD', points: 2000, lastVisit: '24 july 2026', totalPurchases: 25, totalSpent: 3400.00,
    memberSince: '10 Jan 2026', dob: '---', email: '---', address: '---', pointsEarned: 2400, pointsRedeemed: 200, active: 'Yes', totalRefund: 60.00, lastPurchase: '7 Aug 2026'
  },
  { 
    id: 2, name: 'Hak Ly', phone: '012 996 786', tier: 'GOLD', points: 1950, lastVisit: '15 apr 2026', totalPurchases: 24, totalSpent: 3000.00,
    memberSince: '15 Jan 2026', dob: '---', email: '---', address: '---', pointsEarned: 2200, pointsRedeemed: 250, active: 'Yes', totalRefund: 40.00, lastPurchase: '5 Aug 2026'
  },
  { 
    id: 3, name: 'Sok Yun', phone: '012 465 764', tier: 'GOLD', points: 1900, lastVisit: '05 july 2026', totalPurchases: 23, totalSpent: 2900.00,
    memberSince: '20 Jan 2026', dob: '---', email: '---', address: '---', pointsEarned: 2100, pointsRedeemed: 200, active: 'Yes', totalRefund: 50.00, lastPurchase: '4 Aug 2026'
  },
  { 
    id: 4, name: 'Yin Bin', phone: '096 487 4567', tier: 'Silver', points: 1450, lastVisit: '19 jun 2026', totalPurchases: 19, totalSpent: 1500.00,
    memberSince: '01 Feb 2026', dob: '---', email: '---', address: '---', pointsEarned: 1600, pointsRedeemed: 150, active: 'Yes', totalRefund: 20.00, lastPurchase: '2 Aug 2026'
  },
  { 
    id: 5, name: 'Try Tu', phone: '088 454 3225', tier: 'Silver', points: 1300, lastVisit: '26 aug 2026', totalPurchases: 15, totalSpent: 1200.00,
    memberSince: '10 Feb 2026', dob: '---', email: '---', address: '---', pointsEarned: 1400, pointsRedeemed: 100, active: 'Yes', totalRefund: 10.00, lastPurchase: '1 Aug 2026'
  },
  { 
    id: 6, name: 'Ly Chan', phone: '012 456 583', tier: 'Brown', points: 1000, lastVisit: '13 july 2026', totalPurchases: 10, totalSpent: 900.00,
    memberSince: '01 Mar 2026', dob: '---', email: '---', address: '---', pointsEarned: 1000, pointsRedeemed: 0, active: 'Yes', totalRefund: 0.00, lastPurchase: '28 Jul 2026'
  },
  { 
    id: 7, name: 'Hok Yin', phone: '012 456 888', tier: 'Brown', points: 900, lastVisit: '24 july 2026', totalPurchases: 9, totalSpent: 700.00,
    memberSince: '15 Mar 2026', dob: '---', email: '---', address: '---', pointsEarned: 900, pointsRedeemed: 0, active: 'Yes', totalRefund: 0.00, lastPurchase: '24 Jul 2026'
  },
  { 
    id: 8, name: 'Chanthy', phone: '012 666 777', tier: 'Brown', points: 750, lastVisit: '24 july 2026', totalPurchases: 7, totalSpent: 600.00,
    memberSince: '20 Mar 2026', dob: '---', email: '---', address: '---', pointsEarned: 750, pointsRedeemed: 0, active: 'Yes', totalRefund: 0.00, lastPurchase: '20 Jul 2026'
  }
];

export default function Loyalty() {
  // Search Filter States (Real-time)
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedTier, setSelectedTier] = useState('All');

  // Selected Customer State & Pagination
  const [selectedCustomer, setSelectedCustomer] = useState(initialCustomers[0]);
  const [currentPage, setCurrentPage] = useState(1);

  // គណនាទិន្នន័យ Filter ភ្លាមៗរាល់ពេលអ្នកប្រើប្រាស់វាយបញ្ចូល (Instant Real-time Filtering)
  const filteredRows = initialCustomers.filter((c) => {
    const matchPhone = c.phone.replace(/\s/g, '').includes(phoneInput.replace(/\s/g, ''));
    const matchName = c.name.toLowerCase().includes(nameInput.toLowerCase());
    const matchTier = selectedTier === 'All' || c.tier.toUpperCase() === selectedTier.toUpperCase();
    return matchPhone && matchName && matchTier;
  });

  return (
    <div className="space-y-4 bg-gray-400 p-6">
      {/* 1. Instant Search Customer Card */}
      <Card title="Search customer">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <Input 
              label="Phone number" 
              placeholder="Enter phone number" 
              value={phoneInput} 
              onChange={(e) => {
                setPhoneInput(e.target.value);
                setCurrentPage(1);
              }} 
            />
          </div>
          <div className="flex-1 min-w-[220px]">
            <Input 
              label="Name" 
              placeholder="Enter customer name" 
              value={nameInput} 
              onChange={(e) => {
                setNameInput(e.target.value);
                setCurrentPage(1);
              }} 
            />
          </div>
          <div className="w-[220px]">
            <Select 
              label="Loyalty tier" 
              options={['All', 'GOLD', 'Silver', 'Brown']} 
              value={selectedTier} 
              onChange={(e) => {
                setSelectedTier(e.target.value);
                setCurrentPage(1);
              }} 
            />
          </div>
        </div>
      </Card>

      {/* 2. Customer Recent Table */}
      <Card title="Customer Recent">
        <Table 
          head={['#', 'Name', 'Phone number', 'Tier', 'Points', 'Last Visit', 'Total Purchases', 'Total Spent']}
          rows={filteredRows.map((c, i) => [
            i + 1,
            <span 
              key={`name-${c.id}`} 
              className="font-bold text-slate-800 cursor-pointer hover:text-blue-600"
              onClick={() => setSelectedCustomer(c)}
            >
              {c.name}
            </span>,
            c.phone,
            S(c.tier),
            c.points,
            c.lastVisit,
            c.totalPurchases,
            `$ ${c.totalSpent.toFixed(2)}`
          ])}
        />
        
        {/* Pagination */}
        <div className="mt-4 flex justify-center">
          <Pager currentPage={currentPage} onPageChange={(page) => setCurrentPage(page)} />
        </div>
      </Card>

      {/* 3. Customer Details Section (3-Column Layout) */}
      {selectedCustomer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Customer Information Box */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 border-b pb-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                👤
              </div>
              <div className="leading-tight">
                <h3 className="font-bold text-base text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-[11px] text-blue-600 font-semibold">Customer Information</p>
              </div>
            </div>

            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Phone</dt>
                <dd className="font-semibold text-slate-700">{selectedCustomer.phone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Member Since</dt>
                <dd className="font-semibold text-slate-700">{selectedCustomer.memberSince}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Date of Birth</dt>
                <dd className="font-semibold text-slate-700">{selectedCustomer.dob}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Email</dt>
                <dd className="font-semibold text-slate-700">{selectedCustomer.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Address</dt>
                <dd className="font-semibold text-slate-700">{selectedCustomer.address}</dd>
              </div>
            </dl>
          </div>

          {/* Loyalty Summary Box */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h3 className="font-bold text-xs text-blue-600 uppercase tracking-wider border-b pb-2">
              Loyalty Summary
            </h3>

            <dl className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <dt className="text-slate-400 font-medium">Tier</dt>
                <dd>{S(selectedCustomer.tier)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Total points</dt>
                <dd className="font-bold text-slate-700">{selectedCustomer.points}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Points Earned</dt>
                <dd className="font-semibold text-slate-700">{selectedCustomer.pointsEarned}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Points Redeemed</dt>
                <dd className="font-semibold text-slate-700">{selectedCustomer.pointsRedeemed}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-400 font-medium">Active</dt>
                <dd className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  {selectedCustomer.active}
                </dd>
              </div>
            </dl>
          </div>

          {/* Transaction Summary Box */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h3 className="font-bold text-xs text-blue-600 uppercase tracking-wider border-b pb-2">
              Transaction Summary
            </h3>

            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Total Purchases</dt>
                <dd className="font-bold text-slate-700">{selectedCustomer.totalPurchases}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Total Spent</dt>
                <dd className="font-bold text-slate-800">$ {selectedCustomer.totalSpent.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Total Refund</dt>
                <dd className="font-semibold text-slate-700">$ {selectedCustomer.totalRefund.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400 font-medium">Last Purchase</dt>
                <dd className="font-semibold text-slate-700">{selectedCustomer.lastPurchase}</dd>
              </div>
            </dl>
          </div>

        </div>
      )}
    </div>
  );
}