import React, { useState } from 'react';
import { Card, Btn, Input, Select } from '../../components/kit';

// Denominations លុយដុល្លារ
const denominations = [100, 50, 20, 10, 5, 1];

export default function ShiftHandover() {
  // Shift Information States
  const [shiftDate, setShiftDate] = useState('2026-07-22');
  const [shiftType, setShiftType] = useState('Morning Shift (07:00-04:00PM)');
  const [preparedBy, setPreparedBy] = useState('Rin Linda');
  const [handoverTo, setHandoverTo] = useState('Leng Sang');

  // Cash Denomination States
  const [counts, setCounts] = useState({
    100: 8,
    50: 12,
    20: 10,
    10: 5,
    5: 8,
    1: 8
  });

  // Note State
  const [note, setNote] = useState('');

  // គណនាតម្លៃ Cash Denomination សរុប
  const totalCash = denominations.reduce((sum, d) => sum + d * (counts[d] || 0), 0);

  // កែប្រែចំនួន Count
  const handleCountChange = (denom, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setCounts(prev => ({ ...prev, [denom]: num }));
  };

  // មុខងារ Export PDF / Document ពិតប្រាកដ (Download ជាឯកសារ Report)
  const handleExportPDF = () => {
    // ១. បង្កើតអត្ថបទ Report ផ្លូវការ
    const reportContent = `
==================================================
           V-SYCHL GAS STATION
         SHIFT HANDOVER REPORT
==================================================
Shift Date  : ${shiftDate}
Shift Type  : ${shiftType}
Prepared By : ${preparedBy}
Handover To : ${handoverTo}
Generated At: ${new Date().toLocaleString()}

--------------------------------------------------
1. SALE SUMMARY
--------------------------------------------------
Opening Balance : $ 200.00
Total Sale      : $ 1,400.00
Total Refund    : $ 200.00
Cash Received   : $ 1,400.00
Card Received   : $ 0.00
NET TOTAL       : $ 1,400.00

--------------------------------------------------
2. INVENTORY & STOCK
--------------------------------------------------
Fuel Sale (L)   : L 1,800.00
Fuel Sale ($)   : $ 1,800.00
Store Sale      : $ 900.00
Fuel Stock      : L 10,800.00
Store Stock     : $ 4,000.00
TOTAL STOCK     : $ 14,800.00

--------------------------------------------------
3. CASH DENOMINATION
--------------------------------------------------
$100 x ${counts[100]} = $${100 * counts[100]}
$50  x ${counts[50]}  = $${50 * counts[50]}
$20  x ${counts[20]}  = $${20 * counts[20]}
$10  x ${counts[10]}  = $${10 * counts[10]}
$5   x ${counts[5]}   = $${5 * counts[5]}
$1   x ${counts[1]}   = $${1 * counts[1]}
--------------------------------------------------
TOTAL CASH      : $${totalCash}

--------------------------------------------------
4. NOTE / REMARKS
--------------------------------------------------
${note || 'No additional note provided.'}
==================================================
    `;

    // ២. បង្កើត Blob និងទាញយកជាឯកសារដោនឡូតចូលកុំព្យូទ័រ
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shift_Handover_${shiftDate}_${preparedBy.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 text-slate-800">
      {/* 1. Shift Information Card */}
      <Card title="Shift Information">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-blue-600 mb-1">Shift Date</label>
            <Input 
              type="date" 
              value={shiftDate} 
              onChange={(e) => setShiftDate(e.target.value)} 
              className="text-base py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Shift</label>
            <Select 
              options={['Morning Shift (07:00-04:00PM)', 'Night Shift (04:00-12:00AM)']} 
              value={shiftType} 
              onChange={(e) => setShiftType(e.target.value)} 
              className="text-base py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Prepare By</label>
            <Select 
              options={['Rin Linda', 'Sovan Dara', 'Hoeur Heak']} 
              value={preparedBy} 
              onChange={(e) => setPreparedBy(e.target.value)} 
              className="text-base py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Handover To</label>
            <Select 
              options={['Leng Sang', 'Khy Yuleng', 'Corn Chorm']} 
              value={handoverTo} 
              onChange={(e) => setHandoverTo(e.target.value)} 
              className="text-base py-2"
            />
          </div>
        </div>
      </Card>

      {/* 2. Top Summary Grid: Sale Summary & Inventory & Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Sale Summary Box */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-base text-blue-600 border-b pb-2">Sale Summary</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Opening balance</dt>
              <dd className="font-bold text-slate-800 text-base">$ 200.00</dd>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Total Sale</dt>
              <dd className="font-bold text-slate-800 text-base">$ 1400.00</dd>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Total Refund</dt>
              <dd className="font-bold text-slate-800 text-base">$ 200.00</dd>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Cash Received</dt>
              <dd className="font-bold text-slate-800 text-base">$ 1400.00</dd>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Card Received</dt>
              <dd className="font-bold text-slate-800 text-base">$ 0.00</dd>
            </div>
            <div className="flex justify-between items-center pt-3 border-t text-base font-black bg-purple-50 p-3 rounded-xl">
              <dt className="text-purple-700">Total</dt>
              <dd className="text-purple-700 text-lg">$ 1400.00</dd>
            </div>
          </dl>
        </div>

        {/* Inventory & Stock Box */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-base text-blue-600 border-b pb-2">Inventory & Stock</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Fuel Sale(L)</dt>
              <dd className="font-bold text-slate-800 text-base">L 1800.00</dd>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Fuel Sale($)</dt>
              <dd className="font-bold text-slate-800 text-base">$ 1800.00</dd>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Store Sale</dt>
              <dd className="font-bold text-slate-800 text-base">$ 900.00</dd>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Fuel Stock</dt>
              <dd className="font-bold text-slate-800 text-base">L 10800.00</dd>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <dt className="font-medium">Store Stock</dt>
              <dd className="font-bold text-slate-800 text-base">$ 4000.00</dd>
            </div>
            <div className="flex justify-between items-center pt-3 border-t text-base font-black bg-purple-50 p-3 rounded-xl">
              <dt className="text-purple-700">Total Stock</dt>
              <dd className="text-purple-700 text-lg">$ 14800.00</dd>
            </div>
          </dl>
        </div>

      </div>

      {/* 3. Bottom Grid: Cash Denomination & Note / Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Cash Denomination Table Box */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-base text-blue-600 border-b pb-2">Cash Denomination</h3>
          
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-900 font-bold text-base">
                <th className="pb-3">Denomination</th>
                <th className="pb-3 text-center">Count</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
              {denominations.map((d) => (
                <tr key={d}>
                  <td className="py-2.5 text-base">$ {d}</td>
                  <td className="py-2.5 text-center">
                    <input
                      type="number"
                      min="0"
                      value={counts[d]}
                      onChange={(e) => handleCountChange(d, e.target.value)}
                      className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-center text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2.5 text-right text-base">$ {d * (counts[d] || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center pt-4 border-t font-black text-base text-purple-700">
            <span>Total Cash</span>
            <span className="text-xl">$ {totalCash}</span>
          </div>
        </div>

        {/* Note & Export PDF Box */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-base text-blue-600 border-b pb-2 mb-3">Note</h3>
            <div className="relative">
              <textarea
                rows="7"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add some note or any important information"
                className="w-full p-4 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <span className="absolute bottom-3 right-3 text-xs text-slate-400 font-semibold">
                {note.length}/500
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleExportPDF}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95"
            >
              Export PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}