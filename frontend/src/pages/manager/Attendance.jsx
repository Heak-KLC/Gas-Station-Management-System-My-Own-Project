import React, { useState } from 'react';
import { Stat, Table, Btn, S, PageHeader, FilterBar, Input, Select, Pager } from '../../components/kit';

// ទិន្នន័យដើម (Initial Data)
const initialData = [
  { id: '001', name: 'John Smith', empId: 'EMP-001', date: '07/04/2026 Saturday', checkIn: '7:24AM', checkOut: '4:45PM', status: 'Present', notes: '-', createdAt: '07/04/2026 5:16PM', dept: 'Operations' },
  { id: '002', name: 'Sarah Johnson', empId: 'EMP-002', date: '07/04/2026 Saturday', checkIn: '7:24AM', checkOut: '4:49PM', status: 'Late', notes: 'Late 10 mins', createdAt: '07/04/2026 5:17PM', dept: 'Operations' },
  { id: '003', name: 'Michael Brown', empId: 'EMP-003', date: '07/04/2026 Saturday', checkIn: '7:24AM', checkOut: '5:00PM', status: 'Present', notes: '-', createdAt: '07/04/2026 5:19PM', dept: 'Sales' },
  { id: '004', name: 'David Wilson', empId: 'EMP-004', date: '07/04/2026 Saturday', checkIn: '7:07AM', checkOut: '5:09PM', status: 'Half Day', notes: 'Busy at home', createdAt: '07/04/2026 5:20PM', dept: 'IT' },
  { id: '005', name: 'Emily Davis', empId: 'EMP-005', date: '07/04/2026 Saturday', checkIn: '7:12AM', checkOut: '5:03PM', status: 'Absent', notes: 'Sick leave', createdAt: '07/04/2026 5:21PM', dept: 'HR' },
  { id: '006', name: 'Robert Tylor', empId: 'EMP-006', date: '07/04/2026 Saturday', checkIn: '-', checkOut: '-', status: 'Absent', notes: 'Sick leave', createdAt: '07/04/2026 5:22PM', dept: 'Operations' },
  { id: '007', name: 'Lisa Anderson', empId: 'EMP-007', date: '07/04/2026 Saturday', checkIn: '-', checkOut: '-', status: 'Holiday', notes: 'Weekly Holiday', createdAt: '07/04/2026 5:23PM', dept: 'Finance' },
  { id: '008', name: 'John Smith', empId: 'EMP-008', date: '07/04/2026 Saturday', checkIn: '8:30AM', checkOut: '5:01PM', status: 'Present', notes: '-', createdAt: '07/04/2026 5:10PM', dept: 'Sales' }
];

export default function Attendance() {
  const [attendanceList, setAttendanceList] = useState(initialData);

  // Filter States
  const [filterDate, setFilterDate] = useState('2026-08-08');
  const [filterEmp, setFilterEmp] = useState('All Employees');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterDept, setFilterDept] = useState('All Departments');

  // Modal & Pagination States
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'view' | null
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    id: '',
    empId: '',
    name: '',
    date: '07/04/2026 Saturday',
    checkIn: '',
    checkOut: '',
    status: 'Present',
    notes: '',
    dept: 'Operations'
  });

  // Filter Logic
  const filteredData = attendanceList.filter(item => {
    const matchEmp = filterEmp === 'All Employees' || item.name === filterEmp;
    const matchStatus = filterStatus === 'All Status' || item.status === filterStatus;
    const matchDept = filterDept === 'All Departments' || item.dept === filterDept;
    return matchEmp && matchStatus && matchDept;
  });

  // Calculations for Stats
  const total = filteredData.length || 1;
  const countStatus = (st) => filteredData.filter(i => i.status === st).length;
  const presentCount = countStatus('Present');
  const absentCount = countStatus('Absent');
  const lateCount = countStatus('Late');
  const halfDayCount = countStatus('Half Day');
  const holidayCount = countStatus('Holiday');

  // --- ACTIONS ---

  // បើក Modal បន្ថែមវត្តមានថ្មី
  const handleOpenAdd = () => {
    setFormData({
      id: '',
      empId: `EMP-00${attendanceList.length + 1}`,
      name: '',
      date: '07/04/2026 Saturday',
      checkIn: '',
      checkOut: '',
      status: 'Present',
      notes: '',
      dept: 'Operations'
    });
    setModalMode('add');
  };

  // បើក Modal មើលព័ត៌មានលម្អិត
  const handleView = (item) => {
    setSelectedItem(item);
    setModalMode('view');
  };

  // បើក Modal កែប្រែទិន្នន័យ
  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setModalMode('edit');
  };

  // លុបទិន្នន័យ
  const handleDelete = (id) => {
    if (window.confirm('Do you want to delete this attendant?')) {
      setAttendanceList(prev => prev.filter(item => item.id !== id));
    }
  };

  // រក្សាទុកទិន្នន័យ (Add/Edit)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Input Employee name!');

    if (modalMode === 'add') {
      const newItem = {
        ...formData,
        id: String(attendanceList.length + 1).padStart(3, '0'),
        createdAt: new Date().toLocaleString('en-US', { hour12: true })
      };
      setAttendanceList([newItem, ...attendanceList]);
    } else if (modalMode === 'edit') {
      setAttendanceList(prev =>
        prev.map(item => (item.id === formData.id ? { ...formData } : item))
      );
    }

    setModalMode(null);
  };

  // Reset Filter
  const handleReset = () => {
    setFilterDate('2026-08-08');
    setFilterEmp('All Employees');
    setFilterStatus('All Status');
    setFilterDept('All Departments');
  };

  return (
    <div className='bg-gray-400 p-6'>
      <PageHeader
        title="Employee Attendance"
        sub="Track and manage employee daily attendance"
        action={<Btn v="gold" onClick={handleOpenAdd}>+ Add Attendance</Btn>}
      />

      {/* Summary Cards ទាំង ៥ តម្រៀបស្មើគ្នាក្នុងមួយជួរ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <Stat label="Present Today" value={presentCount} sub={`${((presentCount / total) * 100).toFixed(2)}%`} />
        <Stat label="Absent Today" value={absentCount} sub={`${((absentCount / total) * 100).toFixed(2)}%`} />
        <Stat label="Late Today" value={lateCount} sub={`${((lateCount / total) * 100).toFixed(2)}%`} />
        <Stat label="Half Day Today" value={halfDayCount} sub={`${((halfDayCount / total) * 100).toFixed(2)}%`} />
        <Stat label="On Holiday" value={holidayCount} sub={`${((holidayCount / total) * 100).toFixed(2)}%`} />
      </div>

      {/* Filter Bar */}
      <FilterBar>
        <Input
          label="Date"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <Select
          label="Employee"
          options={['All Employees', 'John Smith', 'Sarah Johnson', 'Michael Brown', 'David Wilson', 'Emily Davis', 'Robert Tylor', 'Lisa Anderson']}
          value={filterEmp}
          onChange={(e) => setFilterEmp(e.target.value)}
        />
        <Select
          label="Status"
          options={['All Status', 'Present', 'Late', 'Half Day', 'Absent', 'Holiday']}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        />
        <Select
          label="Department"
          options={['All Departments', 'Operations', 'Sales', 'IT', 'HR', 'Finance']}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        />
        <Btn v="gold" onClick={() => {}}>Filter</Btn>
        <Btn v="ghost" onClick={handleReset}>Reset</Btn>
      </FilterBar>

      {/* Table */}
      <Table
        head={['ID', 'Employee', 'Date', 'Check_in', 'Check_Out', 'Status', 'Notes', 'Created_At', 'Action']}
        rows={filteredData.map((r) => [
          r.id,
          <div key={`emp-${r.id}`}>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>{r.empId}</div>
          </div>,
          r.date,
          r.checkIn,
          r.checkOut,
          S(r.status),
          r.notes,
          r.createdAt,
          /* Action Buttons: View / Edit / Delete */
          <div key={`act-${r.id}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              title="View"
              onClick={() => handleView(r)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7', fontSize: '16px' }}
            >
              👁️
            </button>
            <button
              title="Edit"
              onClick={() => handleEdit(r)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#eab308', fontSize: '16px' }}
            >
              ✏️️
            </button>
            <button
              title="Delete"
              onClick={() => handleDelete(r.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px' }}
            >
              🗑️
            </button>
          </div>
        ])}
      />

      {/* Pagination */}
      <Pager currentPage={currentPage} onPageChange={(page) => setCurrentPage(page)} />

      {/* Modal មើលព័ត៌មានលម្អិត (View) */}
      {modalMode === 'view' && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '8px', margin: 0 }}>Attendance Details</h3>
            <div><strong>ID:</strong> {selectedItem.id}</div>
            <div><strong>Employee:</strong> {selectedItem.name} ({selectedItem.empId})</div>
            <div><strong>Department:</strong> {selectedItem.dept}</div>
            <div><strong>Date:</strong> {selectedItem.date}</div>
            <div><strong>Check In:</strong> {selectedItem.checkIn}</div>
            <div><strong>Check Out:</strong> {selectedItem.checkOut}</div>
            <div><strong>Status:</strong> {selectedItem.status}</div>
            <div><strong>Notes:</strong> {selectedItem.notes}</div>
            <div><strong>Created At:</strong> {selectedItem.createdAt}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Btn v="ghost" onClick={() => setModalMode(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal បន្ថែម (Add) និង កែប្រែ (Edit) */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>{modalMode === 'add' ? 'Add Employee Attendance' : 'Edit Employee Attendance'}</h3>

            <label>Employee Name:
              <input type="text" required style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="John Smith" />
            </label>

            <label>Employee ID:
              <input type="text" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} value={formData.empId} onChange={e => setFormData({ ...formData, empId: e.target.value })} placeholder="EMP-001" />
            </label>

            <label>Status:
              <select style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Absent">Absent</option>
                <option value="Holiday">Holiday</option>
              </select>
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ flex: 1 }}>Check In:
                <input type="text" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} value={formData.checkIn} onChange={e => setFormData({ ...formData, checkIn: e.target.value })} placeholder="7:24AM" />
              </label>
              <label style={{ flex: 1 }}>Check Out:
                <input type="text" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} value={formData.checkOut} onChange={e => setFormData({ ...formData, checkOut: e.target.value })} placeholder="5:00PM" />
              </label>
            </div>

            <label>Notes:
              <input type="text" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Sick leave / Late 10 mins" />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Btn v="ghost" type="button" onClick={() => setModalMode(null)}>Cancel</Btn>
              <Btn v="gold" type="submit">Save Changes</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}