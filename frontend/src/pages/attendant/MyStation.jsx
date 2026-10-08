import React, { useState } from 'react';
import { 
  Fuel, 
  Wrench, 
  Database, 
  AlertTriangle, 
  Search, 
  CheckCircle, 
  X, 
  Clock, 
  Gauge, 
  FileText 
} from 'lucide-react';

const initialPumps = [
  {
    id: 'Pump A',
    name: 'Pump A',
    fuel: 'Super (95)',
    status: 'Active',
    tank: 'Tank A',
    level: 40,
    meter: '12,345.10 L',
    rawMeter: 12345.10
  },
  {
    id: 'Pump B',
    name: 'Pump B',
    fuel: 'Diesel',
    status: 'Active',
    tank: 'Tank B',
    level: 65,
    meter: '9,876.50 L',
    rawMeter: 9876.50
  },
  {
    id: 'Pump C',
    name: 'Pump C',
    fuel: 'Normal (92)',
    status: 'Maintenance',
    tank: 'Tank C',
    level: 0,
    reportedDate: 'Aug/10/2026 11:25 AM',
    errorMsg: 'Floater sensor failure',
    meter: 'N/A',
    rawMeter: 0
  },
  {
    id: 'Pump D',
    name: 'Pump D',
    fuel: 'Diesel',
    status: 'Active',
    tank: 'Tank B',
    level: 65,
    meter: '21,345.67 L',
    rawMeter: 21345.67
  }
];

export default function MyStation() {
  const [pumps, setPumps] = useState(initialPumps);
  const [selectedPump, setSelectedPump] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'meter' | 'report' | 'details' | null

  // Meter Reading Form State
  const [shiftType, setShiftType] = useState('Closing Meter'); // 'Opening Meter' | 'Closing Meter'
  const [newReading, setNewReading] = useState('');

  // Report Issue Form State
  const [issueDesc, setIssueDesc] = useState('');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Open Meter Reading Modal
  const handleOpenMeterModal = (pump) => {
    if (pump.status === 'Maintenance') return;
    setSelectedPump(pump);
    setShiftType('Closing Meter');
    setNewReading('');
    setActiveModal('meter');
  };

  // Open Report Issue Modal
  const handleOpenReportModal = (pump) => {
    setSelectedPump(pump);
    setIssueDesc('');
    setActiveModal('report');
  };

  // Open View Details Modal
  const handleOpenDetailsModal = (pump) => {
    setSelectedPump(pump);
    setActiveModal('details');
  };

  // Save Meter Reading Submit
  const handleSaveMeter = (e) => {
    e.preventDefault();
    if (!newReading) {
      triggerToast('សូមបញ្ចូលលេខកុងទ័រថ្មី (New Reading)!');
      return;
    }

    const val = parseFloat(newReading);
    if (val < selectedPump.rawMeter) {
      triggerToast('លេខកុងទ័រថ្មី មិនអាចតូចជាងលេខកុងទ័រចាស់ទេ!');
      return;
    }

    setPumps(prevPumps =>
      prevPumps.map(p =>
        p.id === selectedPump.id
          ? {
              ...p,
              rawMeter: val,
              meter: `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`
            }
          : p
      )
    );

    setActiveModal(null);
    triggerToast(`បានកត់ត្រាលេខកុងទ័រសម្រាប់ ${selectedPump.name} រួចរាល់!`);
  };

  // Submit Issue Report
  const handleSaveReport = (e) => {
    e.preventDefault();
    if (!issueDesc) {
      triggerToast('សូមបញ្ចូលព័ត៌មានលម្អិតនៃបញ្ហា!');
      return;
    }

    setPumps(prevPumps =>
      prevPumps.map(p =>
        p.id === selectedPump.id
          ? {
              ...p,
              status: 'Maintenance',
              reportedDate: new Date().toLocaleString(),
              errorMsg: issueDesc,
              meter: 'N/A'
            }
          : p
      )
    );

    setActiveModal(null);
    triggerToast(`បានផ្ញើសាររាយការណ៍បញ្ហាសម្រាប់ ${selectedPump.name} រួចរាល់!`);
  };

  return (
    <div className="p-6 bg-slate-200 min-h-screen text-slate-800 space-y-5 font-sans select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-base font-bold border border-slate-700 animate-bounce">
          ⚡ {toastMessage}
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Chamkar Mon Branch - Station 09</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" /> Shift Starts in: 05:00 AM
          </p>
        </div>
        <div className="text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          Active Shift: <span className="text-blue-600">#09 (05:00 AM – 02:00 PM)</span>
        </div>
      </div>

      {/* 4 Stat Cards Top Grid (ស្អាតដូច UI ក្នុងរូបភាព) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Active Pumps Card */}
        <div className="bg-emerald-200/80 p-5 rounded-2xl border-2 border-emerald-400/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-400/50 rounded-2xl text-emerald-900">
            <Fuel className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-950 uppercase tracking-wide">Action Pumps</p>
            <p className="text-3xl font-black text-emerald-950">3</p>
          </div>
        </div>

        {/* Pumps in Maintenance Card */}
        <div className="bg-rose-300/80 p-5 rounded-2xl border-2 border-rose-400/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-400/50 rounded-2xl text-rose-950">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-rose-950 uppercase tracking-wide">Pumps in Maintenance</p>
            <p className="text-3xl font-black text-rose-950">1</p>
          </div>
        </div>

        {/* Super (95) Tank Card */}
        <div className="bg-amber-100 p-5 rounded-2xl border-2 border-amber-300/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-300/50 rounded-2xl text-amber-950">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-950 uppercase tracking-wide">Super (95) Tank</p>
            <p className="text-3xl font-black text-amber-600">40%</p>
          </div>
        </div>

        {/* Diesel Tank Level Card */}
        <div className="bg-purple-200/80 p-5 rounded-2xl border-2 border-purple-300/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-300/50 rounded-2xl text-purple-950">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-purple-950 uppercase tracking-wide">Diesel Tank Level</p>
            <p className="text-3xl font-black text-lime-600">65%</p>
          </div>
        </div>

      </div>

      {/* Pumps Grid (2x2) ស្អាតដូចក្នុងរូបភាព ១០០% */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pumps.map((p) => {
          const isMaintenance = p.status === 'Maintenance';
          return (
            <div
              key={p.id}
              className={`bg-white p-6 rounded-2xl shadow-sm border-2 transition-all flex flex-col justify-between ${
                isMaintenance ? 'border-emerald-400' : 'border-emerald-400'
              }`}
            >
              <div>
                {/* Header Row: Title & Active Status Badge */}
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-2xl font-black text-slate-900">{p.name}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isMaintenance
                        ? 'bg-rose-100 text-rose-600 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {/* Fuel Type */}
                <p className="text-base font-bold text-slate-600 flex items-center gap-1.5 mb-4">
                  <Fuel className="w-4 h-4 text-slate-500" /> {p.fuel}
                </p>

                {/* Body Details: Active or Maintenance */}
                {isMaintenance ? (
                  <div className="flex items-start gap-3 my-4 bg-rose-50 p-3.5 rounded-xl border border-rose-200">
                    <Fuel className="w-8 h-8 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-sm font-semibold text-slate-700 space-y-1">
                      <p className="text-rose-600 font-bold">Reported: {p.reportedDate}</p>
                      <p className="text-slate-800">Error: {p.errorMsg}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <Fuel className="w-8 h-8 text-emerald-500 shrink-0" />
                    <div className="text-sm font-bold text-slate-700 space-y-0.5">
                      <p>{p.tank} (Level: {p.level}%)</p>
                      <p className="text-base text-slate-900">Current Meter Reading: {p.meter}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenMeterModal(p)}
                  disabled={isMaintenance}
                  className={`py-3 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    isMaintenance
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-md active:scale-95'
                  }`}
                >
                  <Gauge className="w-4 h-4" /> Enter Meter Reading
                </button>

                {isMaintenance ? (
                  <button
                    onClick={() => handleOpenDetailsModal(p)}
                    className="py-3 px-3 border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Search className="w-4 h-4" /> View Details
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenReportModal(p)}
                    className="py-3 px-3 border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Report Issue
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= MODAL 1: ENTER METER READING (ដូច UI ក្នុងរូបភាព 100%) ================= */}
      {activeModal === 'meter' && selectedPump && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveMeter}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-slate-900">Enter Meter Reading</h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Select Nozzle Header */}
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">
                Select Nozzle: <span className="text-slate-900">{selectedPump.name} - {selectedPump.fuel}</span>
              </p>

              {/* Shift Type Radio Buttons */}
              <div className="space-y-1.5 my-3 text-xs font-bold text-slate-700">
                <p className="text-slate-400 mb-1">Shift Type</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="shiftType"
                    checked={shiftType === 'Opening Meter'}
                    onChange={() => setShiftType('Opening Meter')}
                    className="accent-cyan-600 w-4 h-4"
                  />
                  <span>Opening Meter</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="shiftType"
                    checked={shiftType === 'Closing Meter'}
                    onChange={() => setShiftType('Closing Meter')}
                    className="accent-cyan-600 w-4 h-4"
                  />
                  <span>Closing Meter</span>
                </label>
              </div>
            </div>

            {/* Previous & New Reading Input Fields */}
            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-500 mb-1">Previous Reading</label>
                <input
                  type="text"
                  readOnly
                  value={selectedPump.meter}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">New Reading</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="Enter new meter reading..."
                  value={newReading}
                  onChange={(e) => setNewReading(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Modal Buttons (Cancel & Save) */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
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

      {/* ================= MODAL 2: REPORT ISSUE ================= */}
      {activeModal === 'report' && selectedPump && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveReport}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Report Issue - {selectedPump.name}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">Issue Description</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Describe the maintenance error (e.g. Floater sensor failure)..."
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL 3: VIEW DETAILS ================= */}
      {activeModal === 'details' && selectedPump && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Maintenance Details - {selectedPump.name}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <dl className="space-y-2 text-xs font-semibold text-slate-700 bg-slate-50 p-4 rounded-xl border">
              <div className="flex justify-between">
                <dt className="text-slate-400">Pump Name</dt>
                <dd className="font-bold text-slate-900">{selectedPump.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Fuel Type</dt>
                <dd className="font-bold text-slate-900">{selectedPump.fuel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Status</dt>
                <dd className="font-bold text-rose-600">{selectedPump.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Reported Time</dt>
                <dd className="font-bold text-slate-900">{selectedPump.reportedDate || 'N/A'}</dd>
              </div>
              <div className="flex justify-between border-t pt-2">
                <dt className="text-slate-400">Error Description</dt>
                <dd className="font-bold text-slate-900">{selectedPump.errorMsg || 'N/A'}</dd>
              </div>
            </dl>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition-all"
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