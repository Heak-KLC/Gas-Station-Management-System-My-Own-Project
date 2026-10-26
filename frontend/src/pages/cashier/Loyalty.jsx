
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, S, Input, Select, Pager } from '../../components/kit';

const API_URL = 'http://127.0.0.1:8000/api';

const TIER_OPTIONS = ['All', 'None', 'Bronze', 'Silver', 'Gold', 'Platinum'];

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMoney = (value) => {
  const amount = Number(value);

  if (value === null || value === undefined || value === '' ||
      !Number.isFinite(amount)) {
    return '—';
  }

  return `$ ${amount.toFixed(2)}`;
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return value;
};

const getTierLabel = (tier) => {
  const value = (tier || 'none').toLowerCase();

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getActiveLabel = (active) => {
  return active ? 'Yes' : 'No';
};

export default function Loyalty() {
  // Search filters
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedTier, setSelectedTier] = useState('All');

  // API data and selected customer
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Load customers from Laravel API
  useEffect(() => {
    let cancelled = false;

    const fetchCustomers = async () => {
      setLoading(true);
      setError('');

      try {
        const token = sessionStorage.getItem('gas_station_token');

        if (!token) {
          throw new Error('Please log in again. Authentication token not found.');
        }

        const response = await fetch(`${API_URL}/loyalty/customers`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || `Unable to load customers (${response.status}).`
          );
        }

        const customerList = Array.isArray(result.data)
          ? result.data
          : [];

        if (cancelled) return;

        console.log("Customer API data:", customerList);
console.log("First customer:", customerList[0]);


        setCustomers(customerList);

        setSelectedCustomer((current) => {
          if (current) {
            const updated = customerList.find(
              (customer) =>
                Number(customer.customer_id) ===
                Number(current.customer_id)
            );

            if (updated) return updated;
          }

          return customerList[0] || null;
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load customers.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter actual database customers
  const filteredRows = useMemo(() => {
    const searchPhone = phoneInput.replace(/\s/g, '').trim();
    const searchName = nameInput.trim().toLowerCase();

    return customers.filter((customer) => {
      const phone = String(customer.phone || '').replace(/\s/g, '');
      const name = String(customer.full_name || '').toLowerCase();
      const tier = String(
        customer.loyalty_membership || 'none'
      ).toLowerCase();

      const matchPhone = phone.includes(searchPhone);
      const matchName = name.includes(searchName);

      const matchTier =
        selectedTier === 'All' ||
        tier === selectedTier.toLowerCase();

      return matchPhone && matchName && matchTier;
    });
  }, [customers, phoneInput, nameInput, selectedTier]);

  // Reset page when filters change
  const handlePhoneChange = (event) => {
    setPhoneInput(event.target.value);
    setCurrentPage(1);
  };

  const handleNameChange = (event) => {
    setNameInput(event.target.value);
    setCurrentPage(1);
  };

  const handleTierChange = (event) => {
    setSelectedTier(event.target.value);
    setCurrentPage(1);
  };

  // Keep the selected customer in sync with the filtered results
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  // Paginate filtered results
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / pageSize)
  );

  const safePage = Math.min(currentPage, totalPages);

  const pageRows = filteredRows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Keep selected customer visible when the filter changes
  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedCustomer(null);
      return;
    }

    const stillVisible = filteredRows.some(
      (customer) =>
        Number(customer.customer_id) ===
        Number(selectedCustomer?.customer_id)
    );

    if (!stillVisible) {
      setSelectedCustomer(filteredRows[0]);
    }
  }, [filteredRows, selectedCustomer]);

  return (
    <div className="space-y-4 bg-slate-300 -m-6 p-6">

      {/* 1. Search Customer */}
      <Card title="Search customer">
        <div className="flex flex-wrap items-end gap-4">

          <div className="flex-1 min-w-[220px]">
            <Input
              label="Phone number"
              placeholder="Enter phone number"
              value={phoneInput}
              onChange={handlePhoneChange}
            />
          </div>

          <div className="flex-1 min-w-[220px]">
            <Input
              label="Name"
              placeholder="Enter customer name"
              value={nameInput}
              onChange={handleNameChange}
            />
          </div>

          <div className="w-[220px]">
            <Select
              label="Loyalty tier"
              options={TIER_OPTIONS}
              value={selectedTier}
              onChange={handleTierChange}
            />
          </div>

        </div>
      </Card>

      {/* 2. Customer Recent Table */}
      <Card title="Customer Recent">

        {loading && (
          <p className="py-4 text-sm text-slate-600">
            Loading customers...
          </p>
        )}

        {!loading && error && (
          <div className="py-4 space-y-2">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <Table
              head={[
                '#',
                'Name',
                'Phone number',
                'Tier',
                'Points',
                'Last Visit',
                'Total Purchases',
                'Total Spent',
              ]}
              rows={pageRows.map((customer, index) => [
                (safePage - 1) * pageSize + index + 1,

                <button
                  key={`name-${customer.customer_id}`}
                  type="button"
                  className="font-bold text-slate-800 hover:text-blue-600"
                  onClick={() => handleSelectCustomer(customer)}
                >
                  {customer.full_name}
                </button>,

                displayValue(customer.phone),

                S(getTierLabel(customer.loyalty_membership)),

                Number(customer.loyalty_points || 0),

                formatDate(customer.lastVisit),

displayValue(customer.totalPurchases),

formatMoney(customer.totalSpent),
              ])}
            />

            {filteredRows.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No customers found.
              </p>
            )}

            {filteredRows.length > pageSize && (
              <div className="mt-4 flex justify-center">
                <Pager
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Showing {pageRows.length} of {filteredRows.length} customers
            </p>
          </>
        )}
      </Card>

      {/* 3. Customer Details */}
      {selectedCustomer && !loading && !error && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Customer Information */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-2 border-b pb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
                👤
              </div>

              <div className="leading-tight">
                <h3 className="text-base font-bold text-slate-900">
                  {selectedCustomer.full_name}
                </h3>

                <p className="text-[11px] font-semibold text-blue-600">
                  Customer Information
                </p>
              </div>
            </div>

            <dl className="space-y-2 text-xs">

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Customer Code</dt>
                <dd className="text-right font-semibold text-slate-700">
                  {displayValue(selectedCustomer.customer_code)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Phone</dt>
                <dd className="text-right font-semibold text-slate-700">
                  {displayValue(selectedCustomer.phone)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Member Since</dt>
                <dd className="text-right font-semibold text-slate-700">
                  {formatDate(selectedCustomer.memberSince)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Date of Birth</dt>
                <dd className="text-right font-semibold text-slate-700">
                  {formatDate(selectedCustomer.date_of_birth)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Email</dt>
                <dd className="break-all text-right font-semibold text-slate-700">
                  {displayValue(selectedCustomer.email)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Address</dt>
                <dd className="text-right font-semibold text-slate-700">
                  {displayValue(selectedCustomer.address)}
                </dd>
              </div>

            </dl>
          </div>

          {/* Loyalty Summary */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <h3 className="border-b pb-2 text-xs font-bold uppercase tracking-wider text-blue-600">
              Loyalty Summary
            </h3>

            <dl className="space-y-2 text-xs">

              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-slate-400">Tier</dt>
                <dd>{S(getTierLabel(selectedCustomer.loyalty_membership))}</dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Total Points</dt>
                <dd className="font-bold text-slate-700">
                  {Number(selectedCustomer.loyalty_points || 0).toLocaleString()}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Points Earned</dt>
                <dd className="font-semibold text-slate-700">{Number(selectedCustomer.pointsEarned || 0).toLocaleString()}</dd>
              </div>

              <div className="flex justify-between gap-3">
  <dt className="font-medium text-slate-400">
    Points Redeemed
  </dt>
  <dd className="font-semibold text-slate-700">
    {Number(selectedCustomer.pointsRedeemed || 0).toLocaleString()}
  </dd>
</div>

              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-slate-400">Active</dt>
                <dd
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    selectedCustomer.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {getActiveLabel(selectedCustomer.is_active)}
                </dd>
              </div>

            </dl>
          </div>

          {/* Transaction Summary */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <h3 className="border-b pb-2 text-xs font-bold uppercase tracking-wider text-blue-600">
              Transaction Summary
            </h3>

            <dl className="space-y-2 text-xs">

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Total Purchases</dt>
                <dd className="font-bold text-slate-700">
                  {displayValue(
  selectedCustomer.total_purchases ??
  selectedCustomer.totalPurchases
)}
                </dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Total Spent</dt>
                <dd className="font-bold text-slate-800">{formatMoney(selectedCustomer.totalSpent)}</dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Total Refund</dt>
                <dd className="font-semibold text-slate-700">{formatMoney(selectedCustomer.totalRefund)}</dd>
              </div>

              <div className="flex justify-between gap-3">
                <dt className="font-medium text-slate-400">Last Purchase</dt>
                <dd className="font-semibold text-slate-700">{formatDate(selectedCustomer.lastPurchase)}</dd>
              </div>

            </dl>
          </div>

        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <p className="text-sm text-slate-600">
          No customers are registered in the database yet.
        </p>
      )}

    </div>
  );
}
