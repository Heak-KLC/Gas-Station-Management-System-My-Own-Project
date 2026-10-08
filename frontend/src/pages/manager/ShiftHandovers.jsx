import React, { useState } from 'react';
import { Table, Btn, S, PageHeader, Input, Select } from '../../components/kit';
import { Eye, Pencil, Trash2 } from 'lucide-react'; // ឬប្រើ SVG / Image Icon ដែលមានស្រាប់ក្នុងគម្រោង

export default function ShiftHandovers() {
  const initialData = [
    { id: 1, shiftType: 'Morning', outgoingUser: 'John Doe', incomingUser: 'Jane Smith', totalFuel: '2,450.50', expectedCash: 1250, actualCash: 1240, status: 'Pending', reason: 'Minor cash discrepancy', dateTime: '07 May 2025 08:00 AM' },
    { id: 2, shiftType: 'Afternoon', outgoingUser: 'Jane Smith', incomingUser: 'Michael Brown', totalFuel: '2,890.75', expectedCash: 1560, actualCash: 1560, status: 'Approved', reason: '', dateTime: '06 May 2025 04:00 PM' },
    { id: 3, shiftType: 'Night', outgoingUser: 'Michael Brown', incomingUser: 'John Doe', totalFuel: '2,150.25', expectedCash: 1100, actualCash: 1090, status: 'Flagged', reason: 'Unaccounted difference', dateTime: '06 May 2025 11:59 PM' },
    { id: 4, shiftType: 'Morning', outgoingUser: 'John Doe', incomingUser: 'Jane Smith', totalFuel: '2,300.00', expectedCash: 1200, actualCash: 1200, status: 'Approved', reason: '', dateTime: '06 May 2025 08:00 AM' },
    { id: 5, shiftType: 'Afternoon', outgoingUser: 'Jane Smith', incomingUser: 'Michael Brown', totalFuel: '2,680.40', expectedCash: 1450, actualCash: 1445, status: 'Pending', reason: 'Register balance mismatch', dateTime: '05 May 2025 04:00 PM' },
  ];

  const defaultFormState = {
    id: null,
    shiftType: 'Morning',
    outgoingUser: 'John Doe (Cashier)',
    incomingUser: 'Jane Smith (Cashier)',
    totalFuel: '2,450.50',
    expectedCash: 1250,
    actualCash: 1240,
    status: 'Pending',
    reason: ''
  };

  const [list, setList] = useState(initialData);
  const [formData, setFormData] = useState(defaultFormState);
  const [showForm, setShowForm] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState(null);

  const discrepancy = (Number(formData.actualCash) - Number(formData.expectedCash)).toFixed(2);

  const handleReset = () => {
    setFormData(defaultFormState);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (formData.id) {
      setList(list.map(item => item.id === formData.id ? {
        ...item,
        shiftType: formData.shiftType,
        outgoingUser: formData.outgoingUser.replace(' (Cashier)', ''),
        incomingUser: formData.incomingUser.replace(' (Cashier)', ''),
        totalFuel: formData.totalFuel,
        expectedCash: Number(formData.expectedCash),
        actualCash: Number(formData.actualCash),
        status: formData.status,
        reason: formData.reason
      } : item));
      alert('Changed Shift Handover Successful!');
    } else {
      const newItem = {
        id: Date.now(),
        shiftType: formData.shiftType,
        outgoingUser: formData.outgoingUser.replace(' (Cashier)', ''),
        incomingUser: formData.incomingUser.replace(' (Cashier)', ''),
        totalFuel: formData.totalFuel,
        expectedCash: Number(formData.expectedCash),
        actualCash: Number(formData.actualCash),
        status: formData.status,
        reason: formData.reason,
        dateTime: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
      };
      setList([newItem, ...list]);
      alert('Make new Shift Handover Successful!');
    }
    handleReset();
  };

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      shiftType: item.shiftType,
      outgoingUser: item.outgoingUser.includes('(') ? item.outgoingUser : `${item.outgoingUser} (Cashier)`,
      incomingUser: item.incomingUser.includes('(') ? item.incomingUser : `${item.incomingUser} (Cashier)`,
      totalFuel: item.totalFuel,
      expectedCash: item.expectedCash,
      actualCash: item.actualCash,
      status: item.status,
      reason: item.reason || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure, want to delete?')) {
      setList(list.filter(item => item.id !== id));
    }
  };

  const filteredList = list.filter(item => 
    item.shiftType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.outgoingUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.incomingUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentEntries = filteredList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredList.length / entriesPerPage);

  return (
    <div className='bg-gray-400 p-6'>
      <PageHeader 
        title="Shift Handover" 
        action={
          <Btn v="gold" onClick={() => { handleReset(); setShowForm(!showForm); }}>
            {showForm ? 'Hide Form' : 'Create New Shift Handover'}
          </Btn>
        } 
      />

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-xl p-4 mb-4 grid md:grid-cols-4 gap-3 shadow-sm border border-slate-100">
          <Select 
            label="Shift Type *" 
            options={['Morning', 'Afternoon', 'Night']} 
            value={formData.shiftType}
            onChange={(e) => setFormData({ ...formData, shiftType: e.target.value })}
          />
          <Input 
            label="Outgoing User *" 
            value={formData.outgoingUser}
            onChange={(e) => setFormData({ ...formData, outgoingUser: e.target.value })}
          />
          <Input 
            label="Incoming User *" 
            value={formData.incomingUser}
            onChange={(e) => setFormData({ ...formData, incomingUser: e.target.value })}
          />
          <Input 
            label="Total Fuel Volume (L) *" 
            value={formData.totalFuel}
            onChange={(e) => setFormData({ ...formData, totalFuel: e.target.value })}
          />
          <Input 
            label="Expected Cash ($) *" 
            type="number" 
            value={formData.expectedCash} 
            onChange={(e) => setFormData({ ...formData, expectedCash: e.target.value })} 
          />
          <Input 
            label="Actual Cash ($) *" 
            type="number" 
            value={formData.actualCash} 
            onChange={(e) => setFormData({ ...formData, actualCash: e.target.value })} 
          />
          <Input 
            label="Discrepancy ($)" 
            readOnly 
            value={discrepancy} 
            className={Number(discrepancy) < 0 ? 'text-red-500 font-semibold' : 'text-slate-700'} 
          />
          <Select 
            label="Status *" 
            options={['Pending', 'Approved', 'Flagged']} 
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          />
          
          <label className="md:col-span-4 text-sm text-slate-600">
            Discrepancy Reason
            <textarea 
              className="w-full border rounded-lg p-2 mt-1 focus:outline-none focus:ring-1 focus:ring-amber-500" 
              rows="2" 
              placeholder="Enter reason for discrepancy..." 
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </label>

          <div className="md:col-span-4 flex justify-end gap-2">
            <Btn type="button" v="ghost" onClick={handleReset}>Reset</Btn>
            <Btn type="submit" v="gold">
              {formData.id ? 'Update Handover' : 'Save Handover'}
            </Btn>
          </div>
        </form>
      )}

      {/* Search Header */}
      <div className="bg-white rounded-t-xl p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Show</span>
          <select 
            className="border rounded p-1 text-sm bg-slate-50"
            value={entriesPerPage}
            onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <span>entries</span>
        </div>

        <div className="w-full md:w-64">
          <Input 
            placeholder="Search handovers..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Table ជាមួយ Actions Button ដែលដំណើរការ */}
      <Table 
        head={['#', 'Shift Type', 'Outgoing User', 'Incoming User', 'Total Fuel (L)', 'Expected Cash ($)', 'Actual Cash ($)', 'Discrepancy ($)', 'Status', 'Date & Time', 'Actions']}
        rows={currentEntries.map((r, i) => {
          const diffVal = (r.actualCash - r.expectedCash).toFixed(2);
          return [
            indexOfFirstItem + i + 1,
            r.shiftType,
            r.outgoingUser,
            r.incomingUser,
            r.totalFuel,
            `$${Number(r.expectedCash).toFixed(2)}`,
            `$${Number(r.actualCash).toFixed(2)}`,
            <span key={`diff-${r.id}`} className={diffVal < 0 ? 'text-red-500 font-medium' : ''}>
              {diffVal}
            </span>,
            S(r.status),
            r.dateTime,
            /* ផ្នែកប៊ូតុង Actions ដោយផ្ទាល់ */
            <div key={`act-${r.id}`} className="flex items-center gap-2">
              <button 
                type="button"
                title="View" 
                onClick={() => setViewItem(r)} 
                className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition"
              >
                👀
              </button>
              <button 
                type="button"
                title="Edit" 
                onClick={() => handleEdit(r)} 
                className="p-1 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded transition"
              >
                ✏️
              </button>
              <button 
                type="button"
                title="Delete" 
                onClick={() => handleDelete(r.id)} 
                className="p-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded transition"
              >
                🗑️
              </button>
            </div>
          ];
        })} 
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-b-xl p-3 border-t border-slate-100 flex justify-end items-center gap-1">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            « Prev
          </button>
          {[...Array(totalPages)].map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx + 1)}
              className={`px-3 py-1 border rounded text-sm ${currentPage === idx + 1 ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-slate-50'}`}
            >
              {idx + 1}
            </button>
          ))}
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            Next »
          </button>
        </div>
      )}

      {/* View Detail Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Shift Handover Details</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Shift:</strong> {viewItem.shiftType}</p>
              <p><strong>Outgoing User:</strong> {viewItem.outgoingUser}</p>
              <p><strong>Incoming User:</strong> {viewItem.incomingUser}</p>
              <p><strong>Total Fuel Volume:</strong> {viewItem.totalFuel} L</p>
              <p><strong>Expected Cash:</strong> ${Number(viewItem.expectedCash).toFixed(2)}</p>
              <p><strong>Actual Cash:</strong> ${Number(viewItem.actualCash).toFixed(2)}</p>
              <p><strong>Discrepancy:</strong> <span className={(viewItem.actualCash - viewItem.expectedCash) < 0 ? 'text-red-500 font-bold' : ''}>${(viewItem.actualCash - viewItem.expectedCash).toFixed(2)}</span></p>
              <p><strong>Status:</strong> {viewItem.status}</p>
              <p><strong>Date & Time:</strong> {viewItem.dateTime}</p>
              {viewItem.reason && <p className="bg-slate-50 p-2 rounded border"><strong>Reason:</strong> {viewItem.reason}</p>}
            </div>
            <div className="mt-5 flex justify-end">
              <Btn v="gold" onClick={() => setViewItem(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}