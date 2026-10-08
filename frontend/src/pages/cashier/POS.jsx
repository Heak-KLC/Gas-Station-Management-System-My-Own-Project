import React, { useState } from 'react';
import { 
  Fuel, Printer, Archive, Trash2, Plus, Pause, X, Check, 
  CreditCard, Wallet, Building2, QrCode, Delete, FileText, ShoppingBag, RotateCcw
} from 'lucide-react';

const FUELS = [
  { id: 'PREMIUM', name: 'PREMIUM', sub: 'RON 95', price: 4.20, color: 'text-rose-600', activeBg: 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20' },
  { id: 'REGULAR', name: 'REGULAR', sub: 'RON 92', price: 4.20, color: 'text-emerald-600', activeBg: 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' },
  { id: 'DIESEL', name: 'DIESEL', sub: 'DIESEL B7', price: 3.50, color: 'text-blue-600', activeBg: 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20' },
  { id: 'LPG', name: 'LPG', sub: 'LIQUEFIED PETROLEUM GAS', price: 4.20, color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20' }
];

const PAYMENTS = [
  { id: 'Cash', label: 'Cash', icon: Wallet },
  { id: 'Credit Card', label: 'Credit Card', icon: CreditCard },
  { id: 'Debit Card', label: 'Debit Card', icon: CreditCard },
  { id: 'QR Payment', label: 'QR Payment', icon: QrCode },
  { id: 'Bank Transfer', label: 'Bank Transfer', icon: Building2 }
];

const PUMPS = ['Pump 01', 'Pump 02', 'Pump 03', 'Pump 04'];
const PRESETS = [10, 20, 30, 40, 50];

export default function POS() {
  // Main States
  const [selectedFuel, setSelectedFuel] = useState(FUELS[0]);
  const [selectedPump, setSelectedPump] = useState('Pump 01');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [receivedInput, setReceivedInput] = useState('');
  const [activeFocus, setActiveFocus] = useState('amount'); // 'amount' | 'received'
  const [note, setNote] = useState('');
  
  const [cartItems, setCartItems] = useState([]);
  const [heldSales, setHeldSales] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [activeModal, setActiveModal] = useState(null); // 'receipt' | 'drawer' | 'held' | null

  // Toast System
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Real-time Calculations
  const currentAmountVal = parseFloat(amountInput) || 0;
  const currentLitersVal = selectedFuel && currentAmountVal ? (currentAmountVal / selectedFuel.price) : 0;

  const totalLiters = cartItems.reduce((sum, item) => sum + item.liters, 0) + (cartItems.length === 0 ? currentLitersVal : 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.amount, 0) + (cartItems.length === 0 ? currentAmountVal : 0);
  const discount = 0.00;
  const totalAmount = subtotal - discount;

  const receivedAmount = parseFloat(receivedInput) || 0;
  const change = Math.max(0, receivedAmount - totalAmount);

  // 1. បន្ថែមប្រេងចូល Cart
  const handleAddFuelToCart = (overrideAmt) => {
    const val = overrideAmt !== undefined ? parseFloat(overrideAmt) : parseFloat(amountInput);
    if (!selectedFuel || !val || val <= 0) {
      triggerToast('សូមបញ្ចូលចំនួនទឹកប្រាក់ ($) ជាមុនសិន!');
      return;
    }

    const newItem = {
      id: Date.now(),
      fuelType: selectedFuel.id,
      pump: selectedPump,
      liters: val / selectedFuel.price,
      unitPrice: selectedFuel.price,
      amount: val
    };

    setCartItems(prev => [...prev, newItem]);
    setAmountInput('');
    triggerToast(`បានបន្ថែម ${selectedFuel.id} ($${val.toFixed(2)}) ចូលក្នុងបញ្ជី!`);
  };

  // 2. Numpad Touch Handler
  const handleNumpadPress = (key) => {
    const isAmount = activeFocus === 'amount';
    const currentVal = isAmount ? amountInput : receivedInput;
    const setVal = isAmount ? setAmountInput : setReceivedInput;

    if (key === 'C') {
      setVal('');
    } else if (key === 'DEL') {
      setVal(currentVal.slice(0, -1));
    } else if (key === '.') {
      if (!currentVal.includes('.')) setVal(currentVal + '.');
    } else if (key === '=') {
      if (isAmount && amountInput) {
        handleAddFuelToCart();
      }
    } else {
      setVal(currentVal + key);
    }
  };

  // 3. Preset Button Click
  const handlePresetClick = (amt) => {
    setAmountInput(amt.toString());
    setActiveFocus('amount');
  };

  // 4. Action Handlers
  const handleNewSale = () => {
    setCartItems([]);
    setAmountInput('');
    setReceivedInput('');
    setNote('');
    setActiveFocus('amount');
    triggerToast('បានចាប់ផ្តើមការលក់ថ្មី');
  };

  const handleHoldSale = () => {
    if (cartItems.length === 0 && currentAmountVal === 0) {
      return triggerToast('មិនទាន់មានការលក់ដើម្បី Hold ទេ!');
    }

    const itemsToHold = cartItems.length > 0 ? cartItems : [{
      id: Date.now(),
      fuelType: selectedFuel.id,
      pump: selectedPump,
      liters: currentLitersVal,
      unitPrice: selectedFuel.price,
      amount: currentAmountVal
    }];

    const heldRecord = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      items: itemsToHold,
      totalAmount: itemsToHold.reduce((s, i) => s + i.amount, 0),
      note
    };

    setHeldSales(prev => [...prev, heldRecord]);
    handleNewSale();
    triggerToast('បានរក្សាទុកការលក់បណ្តោះអាសន្ន (Hold Sale)');
  };

  const handleRestoreHeldSale = (record) => {
    setCartItems(record.items);
    setNote(record.note || '');
    setHeldSales(prev => prev.filter(h => h.id !== record.id));
    setActiveModal(null);
    triggerToast('បានទាញយកការលក់ដែល Hold មកវិញ!');
  };

  const handleCancelSale = () => {
    if (cartItems.length === 0 && !amountInput) return;
    if (window.confirm('តើអ្នកពិតជាចង់បោះបង់ការលក់នេះមែនទេ?')) {
      handleNewSale();
    }
  };

  const handleCompleteSale = () => {
    if (cartItems.length === 0 && currentAmountVal === 0) {
      return triggerToast('សូមបញ្ចូលចំនួនទឹកប្រាក់ប្រេងជាមុនសិន!');
    }

    if (paymentMethod === 'Cash' && receivedAmount > 0 && receivedAmount < totalAmount) {
      return triggerToast('ចំនួនប្រាក់ទទួលបាន តិចជាងតម្លៃសរុប!');
    }

    triggerToast(`ទូទាត់ជោគជ័យ! សរុប: $${totalAmount.toFixed(2)} | ប្រាក់អាប់: $${change.toFixed(2)}`);
    handleNewSale();
  };

  return (
    <div className="p-6 bg-gray-400 min-h-screen text-slate-800 space-y-4 font-sans select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold border border-slate-700 animate-bounce">
          ⚡ {toastMessage}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* ================= LEFT SECTION: SELECT FUEL & PRESET (Col 3) ================= */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Select Fuel Card */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Fuel className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm uppercase text-slate-700 tracking-wider">Select Fuel</h3>
            </div>

            <div className="space-y-2.5">
              {FUELS.map((f) => {
                const isSelected = selectedFuel.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFuel(f)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center ${
                      isSelected 
                        ? `${f.activeBg} shadow-sm` 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <p className={`font-black text-sm ${f.color}`}>{f.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{f.sub}</p>
                    </div>
                    <span className="font-bold text-sm text-red-500">${f.price.toFixed(2)} /L</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset Amount */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-3">Preset Amount (Optional)</h4>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handlePresetClick(amt)}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    amountInput === amt.toString()
                      ? 'bg-blue-600 text-white border-blue-600 shadow'
                      : 'bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border-slate-200'
                  }`}
                >
                  ${amt}
                </button>
              ))}
              <button
                onClick={() => { setActiveFocus('amount'); setAmountInput(''); }}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  activeFocus === 'amount' && !PRESETS.includes(Number(amountInput))
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setActiveModal('receipt')}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Last Receipt</span>
              </button>
              <button 
                onClick={() => setActiveModal('drawer')}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-blue-50 hover:border-blue-300 transition-all gap-1.5"
              >
                <Archive className="w-4 h-4 text-slate-600" />
                <span>Open Cash Drawer</span>
              </button>
            </div>
            {heldSales.length > 0 && (
              <button
                onClick={() => setActiveModal('held')}
                className="w-full mt-2 py-2 bg-amber-100 border border-amber-300 text-amber-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> View Held Sales ({heldSales.length})
              </button>
            )}
          </div>

        </div>

        {/* ================= MIDDLE SECTION: DISPENSER DISPLAY & CART (Col 5) ================= */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Dispenser & Pump Selector */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Sale</p>
              <p className="text-xs font-semibold text-slate-600 mb-3">Pump / Dispenser</p>

              <div className="grid grid-cols-4 gap-2 mb-5">
                {PUMPS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPump(p)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedPump === p 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Fuel className="w-3.5 h-3.5" />
                    {p}
                  </button>
                ))}
              </div>

              {/* Real-time Display Screen Boxes */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">LITERS</p>
                  <p className="text-2xl font-black text-slate-800">{currentLitersVal.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">UNIT PRICE ($/L)</p>
                  <p className="text-2xl font-black text-slate-800">{selectedFuel.price.toFixed(2)}</p>
                </div>
                <div 
                  onClick={() => setActiveFocus('amount')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    activeFocus === 'amount' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase">AMOUNT ($)</p>
                  <p className="text-2xl font-black text-blue-600">
                    {amountInput ? parseFloat(amountInput).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Cart Table */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 min-h-[220px] flex flex-col justify-between">
              {cartItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase">
                        <th className="pb-2"># Fuel Type</th>
                        <th className="pb-2">Pump</th>
                        <th className="pb-2">Liters(L)</th>
                        <th className="pb-2">Unit Price</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {cartItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 text-slate-800">{item.fuelType}</td>
                          <td className="py-2.5 text-slate-500">{item.pump}</td>
                          <td className="py-2.5">{item.liters.toFixed(2)}</td>
                          <td className="py-2.5">${item.unitPrice.toFixed(2)}</td>
                          <td className="py-2.5 font-extrabold text-blue-600">${item.amount.toFixed(2)}</td>
                          <td className="py-2.5 text-right">
                            <button 
                              onClick={() => setCartItems(cartItems.filter(i => i.id !== item.id))}
                              className="text-rose-500 hover:text-rose-700 p-1"
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
                  <p className="text-xs">Select fuel type and pump to start fueling.</p>
                </div>
              )}

              {/* Note Input */}
              <div className="pt-3 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Add Note (Optional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SECTION: SUMMARY, PAYMENT & NUMPAD (Col 4) ================= */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Sale Summary */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-2">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Sale Summary</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Liters</span>
                <span className="font-bold text-slate-800">{totalLiters.toFixed(2)} L</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-800">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span className="font-bold text-slate-800">${discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-sm font-black text-slate-900">
                <span>TOTAL AMOUNT</span>
                <span className="text-emerald-600">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">Payment Method</h4>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENTS.map((pm) => {
                const Icon = pm.icon;
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Received Amount Input */}
            <div 
              onClick={() => setActiveFocus('received')}
              className={`p-2.5 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                activeFocus === 'received' ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-xs font-bold text-slate-500">Received Amount:</span>
              <span className="text-base font-extrabold text-slate-800">${receivedAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500">Change:</span>
              <span className="text-emerald-600 text-sm">${change.toFixed(2)}</span>
            </div>
          </div>

          {/* Touch Screen Numpad */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
            <div className="grid grid-cols-4 gap-2 text-sm font-extrabold text-slate-700">
              {['7','8','9','DEL','4','5','6','C','1','2','3','.','0'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleNumpadPress(btn)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl border border-slate-200 transition-all"
                >
                  {btn}
                </button>
              ))}
              <button
                onClick={() => handleNumpadPress('=')}
                className="col-span-3 p-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow"
              >
                + Add Fuel / Enter
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Main Action Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        <button 
          onClick={handleNewSale}
          className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> + New Sale
        </button>
        <button 
          onClick={handleHoldSale}
          className="py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Pause className="w-4 h-4" /> II Hold Sale
        </button>
        <button 
          onClick={handleCancelSale}
          className="py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" /> X Cancel Sale
        </button>
        <button 
          onClick={handleCompleteSale}
          className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> ✓ Complete Sale
        </button>
      </div>

      {/* Modals for Print Receipt / Open Drawer / Held Sales */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-lg">
                {activeModal === 'receipt' && '🖨️ Last Receipt Simulator'}
                {activeModal === 'drawer' && '🔓 Cash Drawer Simulator'}
                {activeModal === 'held' && '⏸️ Held Sales List'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeModal === 'receipt' && (
              <div className="bg-slate-50 p-4 rounded-xl font-mono text-xs space-y-1">
                <p className="text-center font-bold">V-SYCHL GAS STATION</p>
                <p className="text-center">Branch: Chamkar Mon</p>
                <p>--------------------------------</p>
                <p>Receipt #: FS-2026-0099</p>
                <p>Date: {new Date().toLocaleString()}</p>
                <p>Fuel: PREMIUM 95 (15.00 L)</p>
                <p>Total: $63.00</p>
                <p>Status: PAID (Cash)</p>
                <p>--------------------------------</p>
                <p className="text-center">Thank you for your visit!</p>
              </div>
            )}

            {activeModal === 'drawer' && (
              <div className="text-center py-6 space-y-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Archive className="w-8 h-8" />
                </div>
                <p className="font-bold text-slate-800">Cash Drawer Unlocked!</p>
                <p className="text-xs text-slate-500">Signal sent to POS drawer hardware successfully.</p>
              </div>
            )}

            {activeModal === 'held' && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {heldSales.map(h => (
                  <div key={h.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Time: {h.time}</p>
                      <p className="text-slate-500">{h.items.length} items - Total: ${h.totalAmount.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => handleRestoreHeldSale(h)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}