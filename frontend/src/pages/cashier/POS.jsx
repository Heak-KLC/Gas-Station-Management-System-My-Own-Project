
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StorePOS from "./StorePOS";
import { ShoppingCart } from "lucide-react";
import {
  Fuel, Printer, Archive, Trash2, Plus, Pause, X, Check,
  CreditCard, Wallet, Building2, QrCode, FileText, ShoppingBag,
  RotateCcw, LoaderCircle, RefreshCw
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api';
const PRESETS = [10, 20, 30, 40, 50];

const FUEL_STYLES = {
  premium_gasoline: {
    color: 'text-rose-600',
    activeBg: 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20',
    sub: 'RON 95',
  },
  regular_gasoline: {
    color: 'text-emerald-600',
    activeBg: 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20',
    sub: 'RON 92',
  },
  diesel: {
    color: 'text-blue-600',
    activeBg: 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20',
    sub: 'DIESEL',
  },
  lpg: {
    color: 'text-amber-600',
    activeBg: 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20',
    sub: 'LPG',
  },
};

const PAYMENTS = [
  { id: 'Cash', label: 'Cash', icon: Wallet },
  { id: 'Credit Card', label: 'Credit Card', icon: CreditCard },
  { id: 'Debit Card', label: 'Debit Card', icon: CreditCard },
  { id: 'QR Payment', label: 'QR Payment', icon: QrCode },
  { id: 'Bank Transfer', label: 'Bank Transfer', icon: Building2 },
];

const PAYMENT_API_VALUES = {
  Cash: 'cash',
  'Credit Card': 'credit_card',
  'Debit Card': 'debit_card',
  'QR Payment': 'qr_payment',
  'Bank Transfer': 'bank_transfer',
};

const money = (value) => Number(value || 0).toFixed(2);

const getToken = () => sessionStorage.getItem('gas_station_token');

const getHeaders = (json = false) => ({
  Accept: 'application/json',
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(getToken()
    ? { Authorization: `Bearer ${getToken()}` }
    : {}),
});

const getRows = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  return [];
};

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
      throw new Error('Your session has expired. Please log in again.');
    }

    if (result.errors) {
      throw new Error(
        Object.values(result.errors).flat().join(' ')
      );
    }

    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

function getFuelStyle(category) {
  return FUEL_STYLES[category] || {
    color: 'text-slate-600',
    activeBg: 'bg-slate-50 border-slate-500 ring-2 ring-slate-500/20',
    sub: category || 'FUEL',
  };
}

export default function POS() {
  // API data
  const [fuels, setFuels] = useState([]);
  const [pumps, setPumps] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSale, setSavingSale] = useState(false);

  // Current sale
  const [selectedFuel, setSelectedFuel] = useState(null);
  const [selectedPump, setSelectedPump] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receivedInput, setReceivedInput] = useState('');
  const [activeFocus, setActiveFocus] = useState('amount');
  const [note, setNote] = useState('');

  // Cart and held sales
  const [cartItems, setCartItems] = useState([]);
  const [heldSales, setHeldSales] = useState([]);

  // UI
  const [toastMessage, setToastMessage] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);

  const triggerToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) =>
        current === message ? '' : current
      );
    }, 3000);
  }, []);

  // Load fuel types and pumps from Laravel.
  const loadPOSOptions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingOptions(true);

    try {
      if (!getToken()) {
        throw new Error('Please log in to use the POS terminal.');
      }

      const [fuelResponse, pumpResponse] = await Promise.all([
        fetch(`${API_URL}/fuel-types`, { headers: getHeaders() }),
        fetch(`${API_URL}/fuel-pumps`, { headers: getHeaders() }),
      ]);

      const [fuelResult, pumpResult] = await Promise.all([
        readResponse(fuelResponse),
        readResponse(pumpResponse),
      ]);

      const mappedFuels = getRows(fuelResult).map((fuel) => ({
        id: Number(fuel.fuel_id),
        name: fuel.fuel_name,
        category: fuel.fuel_category,
        sub: getFuelStyle(fuel.fuel_category).sub,
        price: Number(fuel.selling_price),
        stock: Number(fuel.available_quantity ?? 0),
        status: fuel.status,
        color: getFuelStyle(fuel.fuel_category).color,
        activeBg: getFuelStyle(fuel.fuel_category).activeBg,
      }));

      const mappedPumps = getRows(pumpResult).map((pump) => ({
        id: Number(pump.pump_id),
        name: pump.pump_number,
        fuelId: Number(pump.fuel_id),
        status: pump.status,
      }));

      setFuels(mappedFuels);
      setPumps(mappedPumps);

      setSelectedFuel((current) =>
        mappedFuels.find((fuel) => fuel.id === current?.id) ||
        mappedFuels[0] ||
        null
      );

      setSelectedPump((current) => {
        const existing = mappedPumps.find(
          (pump) => pump.name === current &&
            ['available', 'in_use'].includes(pump.status)
        );

        return existing?.name ||
          mappedPumps.find((pump) => pump.status === 'available')?.name ||
          '';
      });
    } catch (error) {
      triggerToast(error.message || 'Unable to load POS data.');
    } finally {
      setLoadingOptions(false);
      setRefreshing(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    loadPOSOptions();
  }, [loadPOSOptions]);

  // Selected pump and available pumps for the selected fuel.
  const selectedPumpObject = useMemo(
    () => pumps.find((pump) => pump.name === selectedPump) || null,
    [pumps, selectedPump]
  );

  const compatiblePumps = useMemo(
    () => pumps.filter((pump) =>
      pump.fuelId === selectedFuel?.id &&
      ['available', 'in_use'].includes(pump.status)
    ),
    [pumps, selectedFuel]
  );

  useEffect(() => {
    if (!selectedFuel) return;

    const compatible = pumps.find((pump) =>
      pump.fuelId === selectedFuel.id &&
      ['available', 'in_use'].includes(pump.status)
    );

    const current = pumps.find((pump) =>
      pump.name === selectedPump &&
      pump.fuelId === selectedFuel.id &&
      ['available', 'in_use'].includes(pump.status)
    );

    if (current) return;

    setSelectedPump(compatible?.name || '');
  }, [selectedFuel, pumps, selectedPump]);

  // Calculations include both cart items and the amount currently entered.
  const currentAmountVal = Math.max(0, Number.parseFloat(amountInput) || 0);

  const currentLitersVal =
    selectedFuel && selectedFuel.price > 0
      ? currentAmountVal / selectedFuel.price
      : 0;

  const totalLiters =
    cartItems.reduce((sum, item) => sum + item.liters, 0) +
    currentLitersVal;

  const subtotal =
    cartItems.reduce((sum, item) => sum + item.amount, 0) +
    currentAmountVal;

  const discount = 0;
  const totalAmount = Math.max(0, subtotal - discount);

  const receivedAmount = Math.max(0, Number.parseFloat(receivedInput) || 0);
  const change = Math.max(0, receivedAmount - totalAmount);

  // Reset the current sale form.
  const handleNewSale = () => {
    setCartItems([]);
    setAmountInput('');
    setReceivedInput('');
    setNote('');
    setActiveFocus('amount');
    triggerToast('Started a new sale.');
  };

  // Add current fuel selection to the cart.
  const handleAddFuelToCart = (overrideAmount) => {
    const value = overrideAmount !== undefined
      ? Number.parseFloat(overrideAmount)
      : Number.parseFloat(amountInput);

    if (!selectedFuel || !value || value <= 0) {
      triggerToast('Please enter a valid fuel amount.');
      return;
    }

    if (selectedFuel.status !== 'available') {
      triggerToast('This fuel is currently unavailable.');
      return;
    }

    if (selectedFuel.price <= 0) {
      triggerToast('The selling price for this fuel is invalid.');
      return;
    }

    const pump = pumps.find((item) => item.name === selectedPump);

    if (!pump || pump.fuelId !== selectedFuel.id) {
      triggerToast('Please select a compatible fuel pump.');
      return;
    }

    if (!['available', 'in_use'].includes(pump.status)) {
      triggerToast('The selected pump is not available.');
      return;
    }

    const liters = value / selectedFuel.price;

    const alreadyInCart = cartItems
      .filter((item) => item.fuelId === selectedFuel.id)
      .reduce((sum, item) => sum + item.liters, 0);

    if (alreadyInCart + liters > selectedFuel.stock) {
      triggerToast(
        `Insufficient stock. Available: ${money(selectedFuel.stock)} L.`
      );
      return;
    }

    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fuelId: selectedFuel.id,
      fuelType: selectedFuel.name,
      pumpId: pump.id,
      pump: pump.name,
      liters,
      unitPrice: selectedFuel.price,
      amount: value,
    };

    setCartItems((previous) => [...previous, newItem]);
    setAmountInput('');
    setActiveFocus('amount');
    triggerToast(
      `Added ${selectedFuel.name} ($${money(value)}) to the cart.`
    );
  };

  // Touch numpad.
  const handleNumpadPress = (key) => {
    const isAmount = activeFocus === 'amount';
    const currentValue = isAmount ? amountInput : receivedInput;
    const setValue = isAmount ? setAmountInput : setReceivedInput;

    if (key === 'C') {
      setValue('');
      return;
    }

    if (key === 'DEL') {
      setValue(currentValue.slice(0, -1));
      return;
    }

    if (key === '.') {
      if (!currentValue.includes('.')) {
        setValue(currentValue ? `${currentValue}.` : '0.');
      }
      return;
    }

    if (key === '=') {
      if (isAmount) handleAddFuelToCart();
      return;
    }

    if (!/^\d$/.test(key)) return;

    if (currentValue.includes('.') &&
        currentValue.split('.')[1].length >= 2) {
      return;
    }

    setValue(currentValue + key);
  };

  const handlePresetClick = (amount) => {
    setAmountInput(String(amount));
    setActiveFocus('amount');
  };

  // Hold current sale in local state.
  const handleHoldSale = () => {
    const itemsToHold = [...cartItems];

    if (currentAmountVal > 0) {
      if (!selectedFuel || !selectedPumpObject) {
        triggerToast('Select a compatible fuel and pump first.');
        return;
      }

      itemsToHold.push({
        id: `${Date.now()}-pending`,
        fuelId: selectedFuel.id,
        fuelType: selectedFuel.name,
        pumpId: selectedPumpObject.id,
        pump: selectedPumpObject.name,
        liters: currentLitersVal,
        unitPrice: selectedFuel.price,
        amount: currentAmountVal,
      });
    }

    if (itemsToHold.length === 0) {
      triggerToast('There is no sale to hold.');
      return;
    }

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: new Date().toLocaleTimeString(),
      items: itemsToHold,
      totalAmount: itemsToHold.reduce((sum, item) => sum + item.amount, 0),
      note,
      paymentMethod,
    };

    setHeldSales((previous) => [...previous, record]);
    setCartItems([]);
    setAmountInput('');
    setReceivedInput('');
    setNote('');
    setActiveFocus('amount');

    triggerToast('Sale held successfully.');
  };

  const handleRestoreHeldSale = (record) => {
    setCartItems(record.items);
    setAmountInput('');
    setReceivedInput('');
    setNote(record.note || '');
    setPaymentMethod(record.paymentMethod || 'Cash');
    setHeldSales((previous) =>
      previous.filter((item) => item.id !== record.id)
    );
    setActiveModal(null);
    triggerToast('Held sale restored.');
  };

  const handleCancelSale = () => {
    if (
      cartItems.length === 0 &&
      !amountInput &&
      !receivedInput &&
      !note
    ) {
      triggerToast('There is no active sale to cancel.');
      return;
    }

    if (window.confirm('Are you sure you want to cancel this sale?')) {
      setCartItems([]);
      setAmountInput('');
      setReceivedInput('');
      setNote('');
      setActiveFocus('amount');
      triggerToast('Sale cancelled.');
    }
  };

  const handleRemoveCartItem = (id) => {
    setCartItems((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  // Submit the sale to Laravel.
  const handleCompleteSale = async () => {
    if (savingSale) return;

    if (cartItems.length === 0 && currentAmountVal > 0) {
      triggerToast('Please add the entered fuel amount to the cart first.');
      return;
    }

    if (cartItems.length === 0) {
      triggerToast('Please add fuel to the cart before completing the sale.');
      return;
    }

    if (paymentMethod === 'Cash' && receivedAmount < totalAmount) {
      setActiveFocus('received');
      triggerToast('The received amount is less than the total amount.');
      return;
    }

    if (!getToken()) {
      triggerToast('Please log in before completing the sale.');
      return;
    }

    // Check stock against the current cart before sending.
    for (const item of cartItems) {
      const fuel = fuels.find((entry) => entry.id === item.fuelId);

      if (!fuel || fuel.status !== 'available') {
        triggerToast(`${item.fuelType} is currently unavailable.`);
        return;
      }

      const cartLitersForFuel = cartItems
        .filter((entry) => entry.fuelId === item.fuelId)
        .reduce((sum, entry) => sum + entry.liters, 0);

      if (cartLitersForFuel > fuel.stock) {
        triggerToast(`Insufficient stock for ${item.fuelType}.`);
        return;
      }
    }

    setSavingSale(true);

    try {
      const response = await fetch(`${API_URL}/fuel-sales`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            fuel_id: item.fuelId,
            pump_id: item.pumpId,
            quantity: Number(item.liters.toFixed(3)),
          })),
          payment_method: PAYMENT_API_VALUES[paymentMethod],
        }),
      });

      const result = await readResponse(response);

      setLastReceipt({
        date: new Date().toLocaleString(),
        paymentMethod,
        total: totalAmount,
        liters: totalLiters,
        items: [...cartItems],
        response: result,
      });

      setCartItems([]);
      setAmountInput('');
      setReceivedInput('');
      setNote('');
      setActiveFocus('amount');

      triggerToast(
        result.message ||
          `Sale completed successfully. Total: $${money(totalAmount)}.`
      );

      // Reload stock after successful sale.
      await loadPOSOptions(true);
    } catch (error) {
      triggerToast(error.message || 'Unable to complete the sale.');
    } finally {
      setSavingSale(false);
    }
  };

  const [saleMode, setSaleMode] = useState("fuel");

if (saleMode === "store") {
  return (
    <StorePOS onBack={() => setSaleMode("fuel")} />
  );
}

  return (
    <div className="p-6 bg-gray-400 min-h-screen text-slate-800 space-y-4 font-sans select-none">

      <div className="flex flex-wrap items-center gap-3">
  <button
    type="button"
    onClick={() => setSaleMode("fuel")}
    className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${
      saleMode === "fuel"
        ? "bg-blue-600 text-white"
        : "border border-slate-200 bg-white text-slate-600"
    }`}
  >
    <Fuel className="h-4 w-4" />
    Fuel Sale
  </button>

  <button
    type="button"
    onClick={() => setSaleMode("store")}
    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:border-blue-400 hover:bg-blue-50"
  >
    <ShoppingCart className="h-4 w-4" />
    Store Sale
  </button>
</div>

      {toastMessage && (
        <div
          role="status"
          className="fixed top-5 right-5 z-[60] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold border border-slate-700 max-w-sm"
        >
          {toastMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT SECTION */}
        <div className="lg:col-span-3 space-y-4">

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm uppercase text-slate-700 tracking-wider">
                  Select Fuel
                </h3>
              </div>

              <button
                type="button"
                onClick={() => loadPOSOptions(true)}
                disabled={refreshing || loadingOptions}
                title="Refresh fuel and pump data"
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                {refreshing
                  ? <LoaderCircle className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
              </button>
            </div>

            {loadingOptions ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Loading fuel types...
              </div>
            ) : fuels.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                No fuel types found.
              </p>
            ) : (
              <div className="space-y-2.5">
                {fuels.map((fuel) => {
                  const isSelected = selectedFuel?.id === fuel.id;

                  return (
                    <button
                      key={fuel.id}
                      type="button"
                      onClick={() => setSelectedFuel(fuel)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center gap-2 ${
                        isSelected
                          ? `${fuel.activeBg} shadow-sm`
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`font-black text-sm ${fuel.color}`}>
                          {fuel.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {fuel.sub}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Stock: {money(fuel.stock)} L
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-red-500">
                          ${money(fuel.price)} /L
                        </p>
                        <p className={`text-[10px] mt-1 ${
                          fuel.status === 'available'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}>
                          {fuel.status}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-3">
              Preset Amount (Optional)
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handlePresetClick(amount)}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    amountInput === String(amount)
                      ? 'bg-blue-600 text-white border-blue-600 shadow'
                      : 'bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border-slate-200'
                  }`}
                >
                  ${amount}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setActiveFocus('amount');
                  setAmountInput('');
                }}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  activeFocus === 'amount' &&
                  !PRESETS.includes(Number(amountInput))
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-3">
              Quick Actions
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveModal('receipt')}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Last Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('drawer')}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all gap-1.5"
              >
                <Archive className="w-4 h-4 text-slate-600" />
                <span>Open Cash Drawer</span>
              </button>
            </div>

            {heldSales.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveModal('held')}
                className="w-full mt-2 py-2 bg-amber-100 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                View Held Sales ({heldSales.length})
              </button>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Current Sale
              </p>
              <p className="text-xs font-semibold text-slate-600 mb-3">
                Pump / Dispenser
              </p>

              {loadingOptions ? (
                <p className="text-sm text-slate-500 mb-5">
                  Loading pumps...
                </p>
              ) : pumps.length === 0 ? (
                <p className="text-sm text-rose-600 mb-5">
                  No pumps found.
                </p>
              ) : compatiblePumps.length === 0 ? (
                <p className="text-sm text-amber-600 mb-5">
                  No available pump supports this fuel type.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                  {compatiblePumps.map((pump) => (
                    <button
                      key={pump.id}
                      type="button"
                      onClick={() => setSelectedPump(pump.name)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        selectedPump === pump.name
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Fuel className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{pump.name}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    LITERS
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {currentLitersVal.toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    UNIT PRICE ($/L)
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {money(selectedFuel?.price)}
                  </p>
                </div>

                <div
                  onClick={() => setActiveFocus('amount')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    activeFocus === 'amount'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    AMOUNT ($)
                  </p>
                  <p className="text-2xl font-black text-blue-600">
                    {money(currentAmountVal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Cart */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 min-h-[220px] flex flex-col justify-between">
              {cartItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase">
                        <th className="pb-2 pr-2">Fuel Type</th>
                        <th className="pb-2 pr-2">Pump</th>
                        <th className="pb-2 pr-2">Liters</th>
                        <th className="pb-2 pr-2">Unit Price</th>
                        <th className="pb-2 pr-2">Amount</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {cartItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 pr-2 text-slate-800">
                            {item.fuelType}
                          </td>
                          <td className="py-2.5 pr-2 text-slate-500">
                            {item.pump}
                          </td>
                          <td className="py-2.5 pr-2">
                            {item.liters.toFixed(2)}
                          </td>
                          <td className="py-2.5 pr-2">
                            ${money(item.unitPrice)}
                          </td>
                          <td className="py-2.5 pr-2 font-extrabold text-blue-600">
                            ${money(item.amount)}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(item.id)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center my-auto text-slate-400 py-8">
                  <ShoppingBag className="w-12 h-12 stroke-[1.5] mb-2 opacity-40" />
                  <p className="font-bold text-sm">No fuel added yet</p>
                  <p className="text-xs text-center">
                    Select fuel type and pump to start fueling.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Add Note (Optional)..."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="lg:col-span-4 space-y-4">

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-2">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">
              Sale Summary
            </h4>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Liters</span>
                <span className="font-bold text-slate-800">
                  {totalLiters.toFixed(2)} L
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-800">
                  ${money(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span className="font-bold text-slate-800">
                  ${money(discount)}
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t text-sm font-black text-slate-900">
                <span>TOTAL AMOUNT</span>
                <span className="text-emerald-600">
                  ${money(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">
              Payment Method
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {PAYMENTS.map((payment) => {
                const Icon = payment.icon;
                const isSelected = paymentMethod === payment.id;

                return (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => setPaymentMethod(payment.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{payment.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              onClick={() => setActiveFocus('received')}
              className={`p-2.5 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                activeFocus === 'received'
                  ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-xs font-bold text-slate-500">
                Received Amount:
              </span>
              <span className="text-base font-extrabold text-slate-800">
                ${money(receivedAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500">Change:</span>
              <span className="text-emerald-600 text-sm">
                ${money(change)}
              </span>
            </div>
          </div>

          {/* Numpad */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
            <div className="grid grid-cols-4 gap-2 text-sm font-extrabold text-slate-700">
              {[
                '7', '8', '9', 'DEL',
                '4', '5', '6', 'C',
                '1', '2', '3', '.',
                '0',
              ].map((button) => (
                <button
                  key={button}
                  type="button"
                  onClick={() => handleNumpadPress(button)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl border border-slate-200 transition-all"
                >
                  {button}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleNumpadPress('=')}
                className="col-span-3 p-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow"
              >
                + Add Fuel / Enter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        <button
          type="button"
          onClick={handleNewSale}
          disabled={savingSale}
          className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> New Sale
        </button>

        <button
          type="button"
          onClick={handleHoldSale}
          disabled={savingSale}
          className="py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Pause className="w-4 h-4" /> Hold Sale
        </button>

        <button
          type="button"
          onClick={handleCancelSale}
          disabled={savingSale}
          className="py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <X className="w-4 h-4" /> Cancel Sale
        </button>

        <button
          type="button"
          onClick={handleCompleteSale}
          disabled={savingSale || loadingOptions}
          className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {savingSale
            ? <LoaderCircle className="w-4 h-4 animate-spin" />
            : <Check className="w-4 h-4" />}
          {savingSale ? 'Processing...' : 'Complete Sale'}
        </button>
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">

            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-lg">
                {activeModal === 'receipt' && 'Last Receipt'}
                {activeModal === 'drawer' && 'Cash Drawer'}
                {activeModal === 'held' && 'Held Sales List'}
              </h3>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeModal === 'receipt' && (
              lastReceipt ? (
                <div className="bg-slate-50 p-4 rounded-xl font-mono text-xs space-y-2">
                  <p className="text-center font-bold">
                    GAS STATION RECEIPT
                  </p>
                  <p className="text-center">Payment Receipt</p>
                  <hr />
                  <p>Date: {lastReceipt.date}</p>
                  <p>Payment: {lastReceipt.paymentMethod}</p>

                  {lastReceipt.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span>
                        {item.fuelType} ({item.liters.toFixed(2)} L)
                      </span>
                      <span>${money(item.amount)}</span>
                    </div>
                  ))}

                  <hr />
                  <p>Total Liters: {lastReceipt.liters.toFixed(2)} L</p>
                  <p className="font-bold">
                    Total: ${money(lastReceipt.total)}
                  </p>
                  <p className="text-center">Thank you for your visit!</p>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full mt-2 py-2 bg-blue-600 text-white rounded-lg font-bold"
                  >
                    Print Receipt
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No completed sale receipt is available in this session.
                </div>
              )
            )}

            {activeModal === 'drawer' && (
              <div className="text-center py-6 space-y-2">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <Archive className="w-8 h-8" />
                </div>
                <p className="font-bold text-slate-800">
                  Cash Drawer Action
                </p>
                <p className="text-xs text-slate-500">
                  No cash drawer hardware integration is configured.
                </p>
              </div>
            )}

            {activeModal === 'held' && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {heldSales.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-5">
                    No held sales.
                  </p>
                ) : (
                  heldSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          Time: {sale.time}
                        </p>
                        <p className="text-slate-500">
                          {sale.items.length} items - Total: $
                          {money(sale.totalAmount)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreHeldSale(sale)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold"
                      >
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
