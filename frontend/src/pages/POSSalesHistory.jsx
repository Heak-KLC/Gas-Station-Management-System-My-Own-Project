import { useState } from "react";
import { Undo2, Printer, Calendar, X, ChevronDown } from "lucide-react";
import { Panel, StatusBadge } from "../components/ui";

const initialSales = [
  { id: "372132066", date: "17/07/2026", pump: "Pump A", fuel: "Super", liters: "50 L", amount: "2,250,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132065", date: "17/07/2026", pump: "Pump B", fuel: "Diesel", liters: "100 L", amount: "4,100,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132064", date: "17/07/2026", pump: "Pump A", fuel: "Diesel", liters: "100 L", amount: "3,280,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132063", date: "17/07/2026", pump: "Pump D", fuel: "Super", liters: "40 L", amount: "1,800,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132062", date: "17/07/2026", pump: "Pump A", fuel: "Super", liters: "50 L", amount: "1,290,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132063b", date: "17/07/2026", pump: "Pump A", fuel: "Diesel", liters: "80 L", amount: "1,800,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132064b", date: "17/07/2026", pump: "Pump A", fuel: "Diesel", liters: "80 L", amount: "3,280,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132065b", date: "17/07/2026", pump: "Pump C", fuel: "Normal", liters: "30 L", amount: "3,280,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132066b", date: "17/07/2026", pump: "Pump A", fuel: "Super", liters: "80 L", amount: "3,280,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132067", date: "17/07/2026", pump: "Pump A", fuel: "Super", liters: "80 L", amount: "1,800,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132068", date: "17/07/2026", pump: "Pump A", fuel: "Super", liters: "80 L", amount: "1,800,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132061", date: "17/07/2026", pump: "Pump A", fuel: "Super", liters: "80 L", amount: "1,800,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
  { id: "372132060", date: "17/07/2026", pump: "Pump B", fuel: "Super", liters: "80 L", amount: "1,800,000", time: "10:25 AM", attendant: "Sovan Dara", status: "Completed" },
];

const REFUND_REASONS = ["Customer changed mind", "Incorrect fuel dispensed", "Payment error", "Equipment malfunction", "Other"];

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`w-full ${wide ? "max-w-md" : "max-w-md"} rounded-2xl bg-white p-6 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function POSSalesHistory() {
  const [sales, setSales] = useState(initialSales);

  // Interactive filter states
  const [selectedDate, setSelectedDate] = useState("17/07/2026");
  const [selectedPump, setSelectedPump] = useState("All");
  const [selectedUser, setSelectedUser] = useState("All");

  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundTxnId, setRefundTxnId] = useState("");
  const [refundReason, setRefundReason] = useState(REFUND_REASONS[0]);
  const [refundDone, setRefundDone] = useState(false);

  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printTxnId, setPrintTxnId] = useState("");

  // Extract unique options dynamically from data
  const availableDates = Array.from(new Set(sales.map((s) => s.date)));
  const availablePumps = ["All", ...Array.from(new Set(sales.map((s) => s.pump)))];
  const availableUsers = ["All", ...Array.from(new Set(sales.map((s) => s.attendant)))];

  // Filtering logic based on selected filters
  const filteredSales = sales.filter((s) => {
    const matchDate = selectedDate === "" || s.date === selectedDate;
    const matchPump = selectedPump === "All" || s.pump === selectedPump;
    const matchUser = selectedUser === "All" || s.attendant === selectedUser;
    return matchDate && matchPump && matchUser;
  });

  function openRefund() {
    setRefundTxnId(filteredSales[0]?.id ?? sales[0]?.id ?? "");
    setRefundReason(REFUND_REASONS[0]);
    setRefundDone(false);
    setIsRefundOpen(true);
  }

  function handleProcessRefund(e) {
    e.preventDefault();
    setSales((list) =>
      list.map((s) => (s.id === refundTxnId ? { ...s, status: "Refunded" } : s))
    );
    setRefundDone(true);
  }

  function openPrint() {
    setPrintTxnId(filteredSales[0]?.id ?? sales[0]?.id ?? "");
    setIsPrintOpen(true);
  }

  function handlePrint() {
    window.print();
  }

  const printTxn = sales.find((s) => s.id === printTxnId);
  const refundTxn = sales.find((s) => s.id === refundTxnId);

  return (
    <div className="space-y-4 p-6 bg-gray-300 min-h-screen">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-700">Sales Records</h2>
        <div className="flex gap-2">
          <button
            onClick={openRefund}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <Undo2 size={15} /> Return/Refund Products
          </button>
          <button
            onClick={openPrint}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 shadow-sm"
          >
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </div>

      <Panel>
        {/* Interactive Filter Controls */}
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          
          {/* Date Filter */}
          <div>
            <div className="mb-1 text-sm font-medium text-black">Date</div>
            <div className="relative">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400 cursor-pointer"
              >
                {availableDates.map((date) => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
              <Calendar className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>

          {/* Pump Filter */}
          <div>
            <div className="mb-1 text-sm font-medium text-black">Pump</div>
            <div className="relative">
              <select
                value={selectedPump}
                onChange={(e) => setSelectedPump(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400 cursor-pointer"
              >
                {availablePumps.map((pump) => (
                  <option key={pump} value={pump}>{pump === "All" ? "Select Pumps" : pump}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>

          {/* User Filter */}
          <div>
            <div className="mb-1 text-sm font-medium text-black">User</div>
            <div className="relative">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm text-slate-600 outline-none focus:border-cyan-400 cursor-pointer"
              >
                {availableUsers.map((user) => (
                  <option key={user} value={user}>{user === "All" ? "All Users" : user}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>

        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-base">
            <thead>
              <tr className="border-b border-gray-200 bg-blue-300 text-black">
                <th className="px-3 py-2 font-medium">Transaction ID</th>
                <th className="px-3 py-2 font-medium">Pump</th>
                <th className="px-3 py-2 font-medium">Fuel Type</th>
                <th className="px-3 py-2 font-medium">Liters</th>
                <th className="px-3 py-2 font-medium">Amount (KHR)</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Attendant</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? (
                filteredSales.map((s) => (
                  <tr key={s.id} className="border-b border-gray-200 hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-700">{s.id}</td>
                    <td className="px-3 py-2 text-slate-500">{s.pump}</td>
                    <td className="px-3 py-2 text-slate-500">{s.fuel}</td>
                    <td className="px-3 py-2 text-slate-500">{s.liters}</td>
                    <td className="px-3 py-2 text-slate-600">{s.amount}</td>
                    <td className="px-3 py-2 text-slate-400">{s.time}</td>
                    <td className="px-3 py-2 text-slate-500">{s.attendant}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={s.status === "Refunded" ? "Critical Low" : "Active"} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No sales records found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Return/Refund modal */}
      {isRefundOpen && (
        <Modal title="Return / Refund Products" onClose={() => setIsRefundOpen(false)}>
          {refundDone ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                ✓
              </div>
              <p className="text-sm font-medium text-slate-700">
                Transaction {refundTxnId} marked as refunded.
              </p>
              <p className="text-xs text-slate-400">
                {refundTxn?.amount} KHR — {refundReason}
              </p>
              <button
                onClick={() => setIsRefundOpen(false)}
                className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleProcessRefund} className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Transaction</label>
                <select
                  value={refundTxnId}
                  onChange={(e) => setRefundTxnId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                >
                  {sales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.pump} · {s.fuel} · {s.amount} KHR
                      {s.status === "Refunded" ? " (already refunded)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {refundTxn && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Fuel</span>
                    <span className="font-medium text-slate-700">{refundTxn.fuel} · {refundTxn.liters}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Amount</span>
                    <span className="font-medium text-slate-700">{refundTxn.amount} KHR</span>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Reason</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-cyan-400"
                >
                  {REFUND_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRefundOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundTxn?.status === "Refunded"}
                  className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Process Refund
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Beautiful Enhanced Print Receipt Modal */}
      {isPrintOpen && (
        <Modal wide title="Receipt Preview" onClose={() => setIsPrintOpen(false)}>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-500">Select Transaction to Print</label>
            <select
              value={printTxnId}
              onChange={(e) => setPrintTxnId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400 bg-white"
            >
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.pump} · {s.fuel} ({s.amount} KHR)
                </option>
              ))}
            </select>
          </div>

          {printTxn && (
            <div 
              id="receipt-preview" 
              className="mx-auto max-w-sm rounded-xl bg-gradient-to-b from-amber-50/50 to-white p-6 shadow-sm border border-slate-200 font-mono text-xs text-slate-700 relative overflow-hidden"
            >
              {/* Receipt Header Style Notch Lines */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />
              
              <div className="text-center">
                <h4 className="text-sm font-black tracking-wider text-slate-900">V-SYCHL GAS STATION</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Main Branch · Station #ST-001</p>
                <p className="text-[10px] text-slate-400">VAT Reg: KH100928374</p>
              </div>

              <div className="my-3 border-t border-dashed border-slate-300" />

              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between"><span>Txn ID:</span><span className="font-semibold text-slate-800">{printTxn.id}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{printTxn.date}</span></div>
                <div className="flex justify-between"><span>Time:</span><span>{printTxn.time}</span></div>
                <div className="flex justify-between"><span>Terminal:</span><span>POS-02</span></div>
                <div className="flex justify-between"><span>Attendant:</span><span className="text-slate-800">{printTxn.attendant}</span></div>
              </div>

              <div className="my-3 border-t border-dashed border-slate-300" />

              {/* Itemized Table */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Description</span>
                  <span>Total</span>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-800 block">{printTxn.fuel} Fuel</span>
                    <span className="text-[10px] text-slate-500">{printTxn.liters} @ Pump {printTxn.pump.replace('Pump ', '')}</span>
                  </div>
                  <span className="font-bold text-slate-800">{printTxn.amount}</span>
                </div>
              </div>

              <div className="my-3 border-t border-dashed border-slate-300" />

              {/* Totals Section */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-500 text-[11px]"><span>Subtotal</span><span>{printTxn.amount} KHR</span></div>
                <div className="flex justify-between text-slate-500 text-[11px]"><span>VAT (Included 0%)</span><span>0 KHR</span></div>
                <div className="flex justify-between text-sm font-black text-slate-900 mt-2 pt-2 border-t border-slate-200">
                  <span>TOTAL PAID</span>
                  <span className="text-cyan-600">{printTxn.amount} KHR</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1"><span>Payment Method</span><span className="font-medium text-slate-700">Cash / Standard</span></div>
              </div>

              <div className="my-4 border-t border-dashed border-slate-300" />

              {/* Barcode Mock & Footer */}
              <div className="text-center space-y-2">
                <div className="tracking-widest font-barcode text-lg text-slate-800 select-none">
                  ||| | |||| || | |||| |||
                </div>
                <p className="text-[10px] text-slate-400">*{printTxn.id}*</p>
                <p className="text-[11px] font-medium text-slate-600 pt-1">Thank you for fueling with us!</p>
                <p className="text-[9px] text-slate-400">Please drive safely. Come again.</p>
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setIsPrintOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-600 shadow-sm transition-colors"
            >
              <Printer size={15} /> Print Receipt
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}