import React, { useState } from 'react';
import { Fuel, Save, Gauge, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';

const initialPumps = [
  { 
    id: 'Pump A (Super 95)', 
    pumpName: 'Pump A', 
    fuelType: 'Super 95', 
    tank: 'Tank A', 
    prev: 12345.1, 
    off: false 
  },
  { 
    id: 'Pump B (Diesel)', 
    pumpName: 'Pump B', 
    fuelType: 'Diesel', 
    tank: 'Tank B', 
    prev: 9876.5, 
    off: false 
  },
  { 
    id: 'Pump C (Normal 92)', 
    pumpName: 'Pump C', 
    fuelType: 'Normal 92', 
    tank: 'Tank C', 
    prev: 0, 
    off: true, 
    reason: 'Status: Maintenance,\nFloater sensor failure\nReported: Aug/10/2026 11:25 AM' 
  },
  { 
    id: 'Pump D (Diesel)', 
    pumpName: 'Pump D', 
    fuelType: 'Diesel', 
    tank: 'Tank B', 
    prev: 12345.1, 
    off: false 
  }
];

const initialLogs = [
  { id: '372 132066', pump: 'Pump A', fuel: 'Super', liters: '50 L', amount: '2,250,000', time: '10:15 AM', attendant: 'Sovan Dara', status: 'Complete' },
  { id: '372 132065', pump: 'Pump B', fuel: 'Diesel', liters: '100 L', amount: '4,100,000', time: '10:08 AM', attendant: 'Sovan Dara', status: 'Complete' },
  { id: '372 132064', pump: 'Pump A', fuel: 'Super', liters: '40 L', amount: '1,800,000', time: '09:55 AM', attendant: 'Sovan Dara', status: 'Complete' },
  { id: '372 132063', pump: 'Pump A', fuel: 'Super', liters: '30 L', amount: '1,290,000', time: '09:45 AM', attendant: 'Sovan Dara', status: 'Complete' },
  { id: '372 132062', pump: 'Pump D', fuel: 'Super', liters: '80 L', amount: '3,280,000', time: '08:15 AM', attendant: 'Sovan Dara', status: 'Pending' },
  { id: '372 132061', pump: 'Pump A', fuel: 'Super', liters: '40 L', amount: '1,800,000', time: '08:10 AM', attendant: 'Sovan Dara', status: 'Complete' },
  { id: '372 132060', pump: 'Pump B', fuel: 'Diesel', liters: '80 L', amount: '3,280,000', time: '07:45 AM', attendant: 'Sovan Dara', status: 'Complete' },
  { id: '372 132059', pump: 'Pump A', fuel: 'Super', liters: '50 L', amount: '2,250,000', time: '06:50 AM', attendant: 'Sovan Dara', status: 'Complete' },
  { id: '372 132058', pump: 'Pump C', fuel: 'Normal', liters: '0.0 L', amount: '0', time: '06:08 AM', attendant: 'System', status: 'Error (Maint)' }
];

export default function MeterInput() {
  const [pumps, setPumps] = useState(initialPumps);
  const [newMeters, setNewMeters] = useState({});
  const [logs, setLogs] = useState(initialLogs);

  // Modal State
  const [activeModalPump, setActiveModalPump] = useState(null);
  const [modalMeterInput, setModalMeterInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Toast System
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // គណនា Liters (New Meter - Previous Meter)
  const getAutoCalcLiters = (p) => {
    const val = newMeters[p.id];
    if (val !== undefined && val !== '') {
      const diff = parseFloat(val) - p.prev;
      return diff.toFixed(1);
    }
    return '';
  };

  // ពិនិត្យ Validation Rule (Must be >= previous)
  const isInvalid = (p) => {
    const val = newMeters[p.id];
    return val !== undefined && val !== '' && parseFloat(val) < p.prev;
  };

  // 1. Save All Bulk Meters
  const handleSaveAll = () => {
    let hasError = false;
    let savedCount = 0;

    pumps.forEach((p) => {
      if (!p.off) {
        if (isInvalid(p)) {
          hasError = true;
        } else if (newMeters[p.id] !== undefined && newMeters[p.id] !== '') {
          savedCount++;
        }
      }
    });

    if (hasError) {
      triggerToast('សូមពិនិត្យមើលលេខកុងទ័រ! លេខកុងទ័រថ្មីត្រូវតែធំជាង ឬស្មើលេខកុងទ័រចាស់។');
      return;
    }

    if (savedCount === 0) {
      triggerToast('សូមបញ្ចូលលេខកុងទ័រថ្មីយ៉ាងហោចណាស់មួយជាមុនសិន!');
      return;
    }

    triggerToast(`បានរក្សាទុកលេខកុងទ័រ ${savedCount} Pumps រួចរាល់!`);
  };

  // 2. Open Single Pump Modal
  const handleOpenSingleModal = (p) => {
    if (p.off) return;
    setActiveModalPump(p);
    setModalMeterInput(newMeters[p.id] || '');
  };

  // 3. Save Single Pump Modal
  const handleSaveSingleModal = (e) => {
    e.preventDefault();
    if (!modalMeterInput) return;

    const val = parseFloat(modalMeterInput);
    if (val < activeModalPump.prev) {
      triggerToast('លេខកុងទ័រថ្មីមិនអាចតូចជាងលេខកុងទ័រចាស់ទេ!');
      return;
    }

    setNewMeters((prev) => ({ ...prev, [activeModalPump.id]: modalMeterInput }));
    setActiveModalPump(null);
    triggerToast(`បានបញ្ចូលកុងទ័រសម្រាប់ ${activeModalPump.id} រួចរាល់!`);
  };

  return (
    <div className="p-6 bg-slate-200 min-h-screen text-slate-800 space-y-6 font-sans select-none">
      
      {/* Dynamic Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-base font-bold border border-slate-700 animate-bounce">
          ⚡ {toastMessage}
        </div>
      )}

      {/* 1. Bulk Meter Entry Form Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        
        {/* Header Title & Save All Button */}
        <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
          <h2 className="text-lg lg:text-xl font-black text-slate-900">
            Active Shift & Bulk Meter Entry Form <span className="text-slate-500 font-semibold text-base">(SHIFT #9 05:00 AM - 02:00 PM)</span>
          </h2>
          <button
            onClick={handleSaveAll}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save All
          </button>
        </div>

        {/* Pump List Rows (ស្អាតដូចក្នុង UI រូបភាព 100%) */}
        <div className="space-y-3">
          {pumps.map((p) => {
            const invalid = isInvalid(p);
            const liters = getAutoCalcLiters(p);

            return (
              <div
                key={p.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold"
              >
                {/* Col 1: Pump ID & Tank */}
                <div className="md:col-span-3">
                  <p className="text-base font-black text-slate-900">{p.id}</p>
                  <p className="text-xs text-slate-500 font-semibold">{p.tank}</p>
                </div>

                {/* Col 2: Previous Meter / Status */}
                <div className="md:col-span-3">
                  {p.off ? (
                    <div className="bg-slate-200/80 p-2.5 rounded-xl border border-slate-300 text-xs text-rose-600 font-bold whitespace-pre-line leading-tight">
                      {p.reason}
                    </div>
                  ) : (
                    <div className="bg-sky-100/70 p-2.5 rounded-xl border border-sky-200 text-xs text-slate-700">
                      Previous Meter: <span className="font-extrabold text-slate-900">{p.prev.toLocaleString()} L</span>
                    </div>
                  )}
                </div>

                {/* Col 3: New Meter Input */}
                <div className="md:col-span-2">
                  <input
                    disabled={p.off}
                    type="number"
                    step="0.1"
                    placeholder={p.off ? 'N/A' : 'New Meter (Input)'}
                    value={newMeters[p.id] || ''}
                    onChange={(e) => setNewMeters({ ...newMeters, [p.id]: e.target.value })}
                    className={`w-full p-2.5 bg-white border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed ${
                      invalid ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-300 focus:ring-blue-500'
                    }`}
                  />
                </div>

                {/* Col 4: Auto-calc Liters Display */}
                <div className="md:col-span-2">
                  <div className="bg-slate-200/70 p-2.5 rounded-xl text-xs font-bold text-slate-700 text-center min-h-[40px] flex items-center justify-center">
                    {p.off ? (
                      <span className="text-slate-500">Maintenance</span>
                    ) : invalid ? (
                      <span className="text-rose-600 font-extrabold">Must be ≥ previous</span>
                    ) : liters !== '' ? (
                      <span className="text-blue-700 font-black text-sm">{liters} L</span>
                    ) : (
                      <span className="text-slate-400">Total Liters (Auto-calc)</span>
                    )}
                  </div>
                </div>

                {/* Col 5: Enter Start/End Meter Button */}
                <div className="md:col-span-2">
                  <button
                    disabled={p.off}
                    onClick={() => handleOpenSingleModal(p)}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                      p.off
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-cyan-500 hover:bg-cyan-600 text-white active:scale-95'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5" /> Enter Start/End Meter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Shift Dispense Log Table Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-lg font-black text-slate-900 border-b pb-3">
          Shift Dispense Log & Recent Submissions <span className="text-slate-500 text-sm font-semibold">(Latest 9 Entries)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-blue-600 text-white font-bold text-sm">
                <th className="p-3 rounded-l-xl">Transaction ID</th>
                <th className="p-3">Pump</th>
                <th className="p-3">Fuel Type</th>
                <th className="p-3">Liters</th>
                <th className="p-3">Amount (KHR)</th>
                <th className="p-3">Time</th>
                <th className="p-3">Attendant</th>
                <th className="p-3 rounded-r-xl text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-all">
                  <td className="p-3 font-extrabold text-slate-900">{log.id}</td>
                  <td className="p-3">{log.pump}</td>
                  <td className="p-3">{log.fuel}</td>
                  <td className="p-3 font-black text-blue-600">{log.liters}</td>
                  <td className="p-3 font-black text-slate-900">{log.amount}</td>
                  <td className="p-3 text-slate-500 font-semibold">{log.time}</td>
                  <td className="p-3 text-slate-600">{log.attendant}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-extrabold inline-block min-w-[90px] ${
                        log.status === 'Complete'
                          ? 'bg-emerald-100 text-emerald-700'
                          : log.status === 'Pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Pump Modal Form */}
      {activeModalPump && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveSingleModal}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-slate-900">Enter Start/End Meter</h3>
              <button
                type="button"
                onClick={() => setActiveModalPump(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold">
              <p className="text-slate-500">
                Pump Name: <span className="text-slate-900 font-extrabold">{activeModalPump.id}</span>
              </p>

              <div>
                <label className="block text-slate-500 mb-1">Previous Meter Reading</label>
                <input
                  type="text"
                  readOnly
                  value={`${activeModalPump.prev.toLocaleString()} L`}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">New Meter Reading</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  autoFocus
                  placeholder="Enter new reading..."
                  value={modalMeterInput}
                  onChange={(e) => setModalMeterInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setActiveModalPump(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}