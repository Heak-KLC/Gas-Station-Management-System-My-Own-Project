import React, { useState } from 'react';
import { Fuel, FileText, AlertTriangle, Droplets, Banknote, Gauge } from 'lucide-react';

// Pumps Status Data
const initialPumps = [
  { id: 'Pump A', name: 'Pump A (Super)', status: 'Online', lastMeter: '12345.6 L', active: true },
  { id: 'Pump B', name: 'Pump B (Diesel)', status: 'Online', lastMeter: '12345.6 L', active: true },
  { id: 'Pump C', name: 'Pump C (Normal)', status: 'Maintenance', lastMeter: 'N/A', active: false },
  { id: 'Pump D', name: 'Pump D (Super)', status: 'Online', lastMeter: '12345.6 L', active: true }
];

// Recent Activity Data
const initialActivities = [
  { id: '372 132066', pump: 'Pump A', fuel: 'Super', liters: '50 L', amount: '2,250,000', time: '10:15 AM' },
  { id: '372 132065', pump: 'Pump B', fuel: 'Diesel', liters: '100 L', amount: '4,100,000', time: '10:08 AM' },
  { id: '372 132064', pump: 'Pump A', fuel: 'Super', liters: '40 L', amount: '1,800,000', time: '09:55 AM' },
  { id: '372 132063', pump: 'Pump C', fuel: 'Normal', liters: '30 L', amount: '1,290,000', time: '09:45 AM' },
  { id: '372 132062', pump: 'Pump D', fuel: 'Super', liters: '80 L', amount: '3,280,000', time: '08:15 AM' },
  { id: '372 132061', pump: 'Pump A', fuel: 'Super', liters: '40 L', amount: '1,800,000', time: '08:10 AM' },
  { id: '372 132060', pump: 'Pump B', fuel: 'Diesel', liters: '80 L', amount: '3,280,000', time: '07:45 AM' }
];

export default function Dashboard({ onNavigate }) {
  const [shiftActive, setShiftActive] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // 'invoice' | 'issue' | null
  const [toastMessage, setToastMessage] = useState('');

  // Toast Handler
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // 1. End Shift Button
  const handleEndShift = () => {
    if (window.confirm('តើអ្នកពិតជាចង់បញ្ចប់វេនការងារនេះមែនទេ? (End Shift)')) {
      setShiftActive(false);
      triggerToast('បានបញ្ចប់វេនការងារជោគជ័យ!');
    }
  };

  // 2. Report Issue Form Submit
  const handleReportSubmit = (e) => {
    e.preventDefault();
    setActiveModal(null);
    triggerToast('បានផ្ញើសាររាយការណ៍បញ្ហាទៅផ្នែក Maintenance រួចរាល់!');
  };

  // 3. Create Invoice Form Submit
  const handleInvoiceSubmit = (e) => {
    e.preventDefault();
    setActiveModal(null);
    triggerToast('បានបង្កើត Invoice ជោគជ័យ!');
  };

  return (
    // App.jsx already adds the page padding, so no p-5 / min-h-screen / background here.
    <div className="text-slate-800 space-y-4 font-sans bg-slate-200 p-6">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-base font-bold border border-slate-700 animate-bounce">
          ⚡ {toastMessage}
        </div>
      )}

      {/* Top Section: Shift & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Current Shift Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-base text-slate-800">Current Shift</h3>
              <span className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-full ${shiftActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${shiftActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {shiftActive ? 'Online' : 'Shift Ended'}
              </span>
            </div>
            <p className="text-3xl font-black text-slate-900 my-2">
              {shiftActive ? 'Shift #01 – Active' : 'Shift #01 – Closed'}
            </p>
            <p className="text-sm font-semibold text-slate-600">
              Attendant: Employee name
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Start Time: 06:00 AM Duration: 04:15 hrs
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleEndShift}
              disabled={!shiftActive}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              End Shift
            </button>
          </div>
        </div>

        {/* Total Liters sold Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-5 bg-blue-600 rounded-sm"></span>
              <h3 className="font-bold text-base text-slate-800">Total Liters sold (Shift)</h3>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-4xl font-black text-slate-900">12,450 L</p>
              <Droplets className="w-10 h-10 text-rose-500 opacity-80" />
            </div>
          </div>
          <p className="text-sm font-semibold text-emerald-600 mt-4">
            Change vs Yesterday: <span className="font-bold">+50 L</span>
          </p>
        </div>

        {/* Total Revenue Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-5 bg-blue-600 rounded-sm"></span>
              <h3 className="font-bold text-base text-slate-800">Total Revenue (Shift)</h3>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-2xl lg:text-3xl font-black text-slate-900">35,450,000 KHR</p>
              <Banknote className="w-10 h-10 text-emerald-500 opacity-80" />
            </div>
          </div>
          <p className="text-sm font-semibold text-emerald-600 mt-4">
            Change vs Yesterday: <span className="font-bold">+800,000 KHR</span>
          </p>
        </div>

      </div>

      {/* Middle Section: Operational Status & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Pump Operational Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-5 bg-emerald-500 rounded-sm"></span>
            <h3 className="font-bold text-base text-slate-800">Pump Operational Status</h3>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-4xl font-black text-emerald-600">Active 3/4</p>
              <p className="text-sm text-slate-500 font-semibold mt-1">Pumps in Maintenance: 1</p>
            </div>

            <div className="flex gap-4">
              {initialPumps.map((p) => (
                <div key={p.id} className="flex flex-col items-center">
                  <Fuel className={`w-8 h-8 ${p.active ? 'text-emerald-500' : 'text-rose-500'}`} />
                  <span className="text-xs font-bold text-slate-700 mt-1">{p.id.replace(' ', '')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-5 bg-emerald-500 rounded-sm"></span>
            <h3 className="font-bold text-base text-slate-800">Quick Actions</h3>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* + Add Meter: go to the Fuel Dispense & Meter Input page (it has the full form) */}
            <button
              onClick={() => onNavigate?.('fuel-dispense-and-meter-input')}
              className="py-4 px-3 bg-lime-200 hover:bg-lime-300 text-slate-900 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Gauge className="w-4 h-4 text-slate-800" />
              <span>+ Add Meter</span>
            </button>

            <button
              onClick={() => setActiveModal('invoice')}
              className="py-4 px-3 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-amber-900" />
              <span>Create Invoice</span>
            </button>

            <button
              onClick={() => setActiveModal('issue')}
              className="py-4 px-3 bg-rose-200 hover:bg-rose-300 text-slate-900 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-800" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Section: Detailed Assigned Pumps & My Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* A. Assigned Pumps - Detailed */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-lg text-slate-800 border-b pb-3">A. Assigned Pumps - Detailed</h3>

          <div className="divide-y divide-slate-100 text-base font-semibold">
            {initialPumps.map((p) => (
              <div key={p.id} className="py-3.5 flex justify-between items-center">
                <span className="text-slate-900 font-bold text-base">{p.name}</span>
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className={p.active ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                    {p.status}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 font-semibold text-sm">Last Meter: {p.lastMeter}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* B. My Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-lg text-slate-800 border-b pb-3">B. My Recent Activity</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-blue-600 text-white font-bold text-sm">
                  <th className="p-3 rounded-l-xl">Transaction ID</th>
                  <th className="p-3">Pump</th>
                  <th className="p-3">Fuel Type</th>
                  <th className="p-3">Liters</th>
                  <th className="p-3">Amount (KHR)</th>
                  <th className="p-3 rounded-r-xl">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {initialActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50 transition-all">
                    <td className="p-3 font-bold text-slate-900">{act.id}</td>
                    <td className="p-3">{act.pump}</td>
                    <td className="p-3">{act.fuel}</td>
                    <td className="p-3 font-bold text-blue-600">{act.liters}</td>
                    <td className="p-3 font-black text-slate-900">{act.amount}</td>
                    <td className="p-3 text-slate-500">{act.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal Form: Create Invoice */}
      {activeModal === 'invoice' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleInvoiceSubmit} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" /> Create Invoice
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Pump</label>
                <select className="w-full p-3 border rounded-xl bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Pump A (Super)</option>
                  <option>Pump B (Diesel)</option>
                  <option>Pump D (Super)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Liters</label>
                <input type="number" step="0.1" required placeholder="50.0" className="w-full p-3 border rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Amount (KHR)</label>
                <input type="text" required placeholder="2,250,000" className="w-full p-3 border rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setActiveModal(null)} className="px-5 py-2.5 bg-slate-100 font-bold text-sm rounded-xl">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-xl shadow">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Form: Report Issue */}
      {activeModal === 'issue' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleReportSubmit} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Report Issue
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Equipment / Pump</label>
                <select className="w-full p-3 border rounded-xl bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Pump C (Normal)</option>
                  <option>Pump A (Super)</option>
                  <option>Pump B (Diesel)</option>
                  <option>Pump D (Super)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Description</label>
                <textarea rows="4" required placeholder="Describe the maintenance issue..." className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setActiveModal(null)} className="px-5 py-2.5 bg-slate-100 font-bold text-sm rounded-xl">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-rose-500 text-white font-bold text-sm rounded-xl shadow">Submit Report</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
