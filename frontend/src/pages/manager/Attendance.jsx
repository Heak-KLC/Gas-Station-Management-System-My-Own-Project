
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Stat,
  Table,
  Btn,
  S,
  PageHeader,
  FilterBar,
  Input,
  Select,
  Pager,
} from '../../components/kit';

const API_URL = 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'gas_station_token';

const STATUS_OPTIONS = [
  'All Status',
  'Present',
  'Late',
  'Half Day',
  'Absent',
  'Holiday',
];

const STATUS_TO_API = {
  Present: 'present',
  Absent: 'absent',
  Late: 'late',
  'Half Day': 'half_day',
  Holiday: 'holiday',
};

const STATUS_FROM_API = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  holiday: 'Holiday',
};

const ROLE_OPTIONS = [
  'All Departments',
  'manager',
  'cashier',
  'fuel_attendant',
  'store_staff',
  'maintenance_tech',
];

const todayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return '-';

  const datePart = String(value).slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);

  if (Number.isNaN(date.getTime())) return datePart;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    weekday: 'long',
  });
};

const formatDateTime = (value) => {
  if (!value) return '-';

  const date = new Date(String(value).replace(' ', 'T'));

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatTime = (value) => {
  if (!value) return '-';

  const date = new Date(String(value).replace(' ', 'T'));

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};


const toDateTimeInput = (value) => {
  if (!value) return '';

  const text = String(value);

  // ប្រសិនបើ API ផ្ញើម៉ោងជា ISO ដែលមាន Timezone
  if (text.includes('Z') || /[+-]\d{2}:\d{2}$/.test(text)) {
    const date = new Date(text);

    if (Number.isNaN(date.getTime())) return '';

    const pad = (number) => String(number).padStart(2, '0');

    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())}T${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}`
    );
  }

  // ប្រសិនបើ API ផ្ញើ datetime ដោយគ្មាន Timezone
  // រក្សាថ្ងៃ និងម៉ោងដើម មិនបម្លែង Timezone
  const normalized = text.replace(' ', 'T');

  return normalized.length >= 16
    ? normalized.slice(0, 16)
    : normalized;
};


const getErrorMessage = (error, fallback) => {
  const data = error?.responseData;

  if (data?.errors) {
    return Object.values(data.errors).flat().join('\n');
  }

  return data?.message || error?.message || fallback;
};

const apiRequest = async (path, options = {}) => {
  const token = sessionStorage.getItem(TOKEN_KEY);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed (${response.status})`
    );

    error.responseData = data;
    error.status = response.status;

    throw error;
  }

  return data;
};

const unwrapList = (response) => {
  const data = response?.data ?? response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const mapEmployee = (employee) => ({
  id: Number(employee.employee_id),
  code: employee.employee_code || `EMP${employee.employee_id}`,
  name: employee.full_name || 'Unknown Employee',
  role: employee.role || '-',
  active: Boolean(employee.is_active),
});

const mapAttendance = (record) => {
  const employee = record.employee || {};

  return {
    id: Number(record.attendance_id),
    empId: Number(record.employee_id),
    employeeCode:
      employee.employee_code || `EMP${record.employee_id}`,
    name: employee.full_name || 'Unknown Employee',
    dept: employee.role || '-',
    date: String(record.date || '').slice(0, 10),
    checkIn: record.check_in || '',
    checkOut: record.check_out || '',
    status: STATUS_FROM_API[record.status] || 'Present',
    notes: record.notes || '',
    createdAt: record.created_at || '',
  };
};

const createEmptyForm = () => ({
  empId: '',
  date: todayString(),
  checkIn: '',
  checkOut: '',
  status: 'Present',
  notes: '',
});

export default function Attendance() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [filterDate, setFilterDate] = useState(todayString());
  const [filterEmp, setFilterEmp] = useState('All Employees');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterDept, setFilterDept] = useState('All Departments');
  const [appliedFilters, setAppliedFilters] = useState({
    date: todayString(),
    employee: 'All Employees',
    status: 'All Status',
    dept: 'All Departments',
  });

  const [modalMode, setModalMode] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);

  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadEmployees = useCallback(async () => {
    const response = await apiRequest('/employees');

    setEmployees(
      unwrapList(response)
        .map(mapEmployee)
        .filter((employee) => employee.active)
    );
  }, []);

  const loadAttendance = useCallback(async (filters = appliedFilters) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const params = new URLSearchParams();

      if (filters.date) {
        params.set('date', filters.date);
      }

      if (filters.employee !== 'All Employees') {
  params.set('employee_id', String(filters.employee));
}

      if (filters.status !== 'All Status') {
        params.set('status', STATUS_TO_API[filters.status]);
      }

      const query = params.toString();
      const response = await apiRequest(
        `/employee-attendances${query ? `?${query}` : ''}`
      );

      let rows = unwrapList(response).map(mapAttendance);

      if (filters.dept !== 'All Departments') {
        rows = rows.filter((row) => row.dept === filters.dept);
      }

      setAttendanceList(rows);
      setCurrentPage(1);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          'Unable to load attendance. Please check the API connection.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, employees]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      try {
        const employeeResponse = await apiRequest('/employees');

        const activeEmployees = unwrapList(employeeResponse)
          .map(mapEmployee)
          .filter((employee) => employee.active);

        setEmployees(activeEmployees);

        const params = new URLSearchParams();

        if (filterDate) params.set('date', filterDate);

        const attendanceResponse = await apiRequest(
          `/employee-attendances?${params.toString()}`
        );

        setAttendanceList(
          unwrapList(attendanceResponse).map(mapAttendance)
        );
      } catch (error) {
        setErrorMessage(
          getErrorMessage(
            error,
            'Unable to load attendance or employees.'
          )
        );
      } finally {
        setLoading(false);
      }
    };

    initialize();
    // Initial loading only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    return attendanceList.filter((item) => {
      const matchEmp =
        appliedFilters.employee === 'All Employees' ||
        item.name === appliedFilters.employee;

      const matchStatus =
        appliedFilters.status === 'All Status' ||
        item.status === appliedFilters.status;

      const matchDept =
        appliedFilters.dept === 'All Departments' ||
        item.dept === appliedFilters.dept;

      return matchEmp && matchStatus && matchDept;
    });
  }, [attendanceList, appliedFilters]);

  const presentCount = filteredData.filter(
    (item) => item.status === 'Present'
  ).length;

  const absentCount = filteredData.filter(
    (item) => item.status === 'Absent'
  ).length;

  const lateCount = filteredData.filter(
    (item) => item.status === 'Late'
  ).length;

  const halfDayCount = filteredData.filter(
    (item) => item.status === 'Half Day'
  ).length;

  const holidayCount = filteredData.filter(
    (item) => item.status === 'Holiday'
  ).length;

  const total = filteredData.length;

  const percentage = (count) =>
    `${total ? ((count / total) * 100).toFixed(2) : '0.00'}%`;

  const handleOpenAdd = () => {
    setFormData(createEmptyForm());
    setSelectedItem(null);
    setErrorMessage('');
    setSuccessMessage('');
    setModalMode('add');
  };

  const handleView = (item) => {
    setSelectedItem(item);
    setErrorMessage('');
    setModalMode('view');
  };

  const handleEdit = (item) => {
    setSelectedItem(item);

    setFormData({
      empId: String(item.empId),
      date: item.date,
      checkIn: toDateTimeInput(item.checkIn),
      checkOut: toDateTimeInput(item.checkOut),
      status: item.status,
      notes: item.notes === '-' ? '' : item.notes,
    });

    setErrorMessage('');
    setSuccessMessage('');
    setModalMode('edit');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Do you want to delete this attendance record?')) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      await apiRequest(`/employee-attendances/${id}`, {
        method: 'DELETE',
      });

      setAttendanceList((previous) =>
        previous.filter((item) => item.id !== id)
      );

      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }

      setSuccessMessage('Attendance deleted successfully.');
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Unable to delete attendance.')
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.empId) {
      setErrorMessage('Please select an employee.');
      return;
    }

    if (!formData.date) {
      setErrorMessage('Please select an attendance date.');
      return;
    }

    if (
      formData.status !== 'Absent' &&
      formData.status !== 'Holiday' &&
      !formData.checkIn
    ) {
      setErrorMessage('Check-in date and time are required.');
      return;
    }

    const checkIn = formData.checkIn
      ? formData.checkIn.replace('T', ' ') + ':00'
      : `${formData.date} 00:00:00`;

    const checkOut = formData.checkOut
      ? formData.checkOut.replace('T', ' ') + ':00'
      : null;

    if (checkOut && new Date(checkOut) < new Date(checkIn)) {
      setErrorMessage('Check-out cannot be earlier than check-in.');
      return;
    }

    const payload = {
      employee_id: Number(formData.empId),
      date: formData.date,
      check_in: checkIn,
      check_out: checkOut,
      status: STATUS_TO_API[formData.status],
      notes: formData.notes.trim() || null,
    };

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (modalMode === 'add') {
        await apiRequest('/employee-attendances', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setSuccessMessage('Attendance created successfully.');
      } else if (modalMode === 'edit' && selectedItem) {
        await apiRequest(
          `/employee-attendances/${selectedItem.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );

        setSuccessMessage('Attendance updated successfully.');
      }

      setModalMode(null);
      setSelectedItem(null);

      await loadAttendance(appliedFilters);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Unable to save attendance.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFilter = async () => {
    const filters = {
      date: filterDate,
      employee: filterEmp,
      status: filterStatus,
      dept: filterDept,
    };

    setAppliedFilters(filters);
    await loadAttendance(filters);
  };

  
const handleReset = async () => {
  const today = todayString();

  const filters = {
    date: today,
    employee: 'All Employees',
    status: 'All Status',
    dept: 'All Departments',
  };

  setFilterDate(today);
  setFilterEmp('All Employees');
  setFilterStatus('All Status');
  setFilterDept('All Departments');
  setAppliedFilters(filters);

  await loadAttendance(filters);
};

const handleRefresh = async () => {
  setSuccessMessage('');
  await loadAttendance(appliedFilters);
};


  const employeeOptions = [
    'All Employees',
    ...employees.map((employee) => employee.name),
  ];

  const currentEmployee = employees.find(
    (employee) => employee.id === Number(formData.empId)
  );

  return (
    <div className="bg-gray-400 p-6">
      
<PageHeader
  title="Employee Attendance"
  sub="Track and manage employee daily attendance"
  action={
    <div style={{ display: 'flex', gap: '8px' }}>
      <Btn
        v="ghost"
        onClick={handleRefresh}
        disabled={loading}
      >
        <RefreshCw
          size={16}
          style={{ marginRight: '6px' }}
        />
        Refresh
      </Btn>

      <Btn v="gold" onClick={handleOpenAdd}>
        + Add Attendance
      </Btn>
    </div>
  }
/>


      {errorMessage && (
        <div
          role="alert"
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '12px',
            whiteSpace: 'pre-line',
          }}
        >
          {errorMessage}
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            background: '#dcfce7',
            color: '#166534',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '12px',
          }}
        >
          {successMessage}
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <Stat label="Present Today" value={presentCount} sub={percentage(presentCount)} />
        <Stat label="Absent Today" value={absentCount} sub={percentage(absentCount)} />
        <Stat label="Late Today" value={lateCount} sub={percentage(lateCount)} />
        <Stat label="Half Day Today" value={halfDayCount} sub={percentage(halfDayCount)} />
        <Stat label="On Holiday" value={holidayCount} sub={percentage(holidayCount)} />
      </div>

      <FilterBar>
        <Input
          label="Date"
          type="date"
          value={filterDate}
          onChange={(event) => setFilterDate(event.target.value)}
        />

        <Select
          label="Employee"
          options={employeeOptions}
          value={filterEmp}
          onChange={(event) => setFilterEmp(event.target.value)}
        />

        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
        />

        <Select
          label="Department / Role"
          options={ROLE_OPTIONS}
          value={filterDept}
          onChange={(event) => setFilterDept(event.target.value)}
        />

        <Btn v="gold" onClick={handleFilter}>
          Filter
        </Btn>

        <Btn v="ghost" onClick={handleReset}>
          Reset
        </Btn>
      </FilterBar>

      {loading && (
        <div style={{ padding: '12px 0', color: '#555' }}>
          Loading attendance data...
        </div>
      )}

      <Table
        head={[
          'ID',
          'Employee',
          'Date',
          'Check_in',
          'Check_Out',
          'Status',
          'Notes',
          'Created_At',
          'Action',
        ]}
        rows={filteredData.map((row) => [
          row.id,
          <div key={`emp-${row.id}`}>
            <div style={{ fontWeight: 600 }}>{row.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              {row.employeeCode}
            </div>
          </div>,
          formatDate(row.date),
          formatTime(row.checkIn),
          formatTime(row.checkOut),
          S(row.status),
          row.notes || '-',
          formatDateTime(row.createdAt),
          <div
            key={`act-${row.id}`}
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              title="View"
              onClick={() => handleView(row)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#0284c7',
                fontSize: '16px',
              }}
            >
              👁️
            </button>

            <button
              type="button"
              title="Edit"
              onClick={() => handleEdit(row)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#eab308',
                fontSize: '16px',
              }}
            >
              ✏️
            </button>

            <button
              type="button"
              title="Delete"
              onClick={() => handleDelete(row.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                fontSize: '16px',
              }}
            >
              🗑️
            </button>
          </div>,
        ])}
      />

      {!loading && filteredData.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
          No attendance records found.
        </div>
      )}

      <Pager
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
      />

      {modalMode === 'view' && selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '8px', margin: 0 }}>
              Attendance Details
            </h3>

            <div><strong>ID:</strong> {selectedItem.id}</div>
            <div>
              <strong>Employee:</strong> {selectedItem.name} ({selectedItem.employeeCode})
            </div>
            <div><strong>Role:</strong> {selectedItem.dept}</div>
            <div><strong>Date:</strong> {formatDate(selectedItem.date)}</div>
            <div><strong>Check In:</strong> {formatDateTime(selectedItem.checkIn)}</div>
            <div><strong>Check Out:</strong> {formatDateTime(selectedItem.checkOut)}</div>
            <div><strong>Status:</strong> {selectedItem.status}</div>
            <div><strong>Notes:</strong> {selectedItem.notes || '-'}</div>
            <div><strong>Created At:</strong> {formatDateTime(selectedItem.createdAt)}</div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Btn v="ghost" onClick={() => setModalMode(null)}>
                Close
              </Btn>
            </div>
          </div>
        </div>
      )}

      {(modalMode === 'add' || modalMode === 'edit') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              width: '420px',
              maxWidth: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h3 style={{ margin: 0 }}>
              {modalMode === 'add'
                ? 'Add Employee Attendance'
                : 'Edit Employee Attendance'}
            </h3>

            {errorMessage && (
              <div
                role="alert"
                style={{
                  color: '#991b1b',
                  background: '#fee2e2',
                  padding: '10px',
                  borderRadius: '4px',
                  whiteSpace: 'pre-line',
                }}
              >
                {errorMessage}
              </div>
            )}

            <label>
              Employee:
              <select
                required
                disabled={saving}
                value={formData.empId}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    empId: event.target.value,
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.code} - {employee.name}
                  </option>
                ))}
              </select>
            </label>

            {currentEmployee && (
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                Role: {currentEmployee.role}
              </div>
            )}

            <label>
              Date:
              <input
                type="date"
                required
                disabled={saving}
                value={formData.date}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    date: event.target.value,
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </label>

            <label>
              Status:
              <select
                required
                disabled={saving}
                value={formData.status}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    status: event.target.value,
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              >
                {STATUS_OPTIONS.filter(
                  (status) => status !== 'All Status'
                ).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ flex: 1 }}>
                Check In:
                <input
                  type="datetime-local"
                  disabled={saving}
                  required={
                    formData.status !== 'Absent' &&
                    formData.status !== 'Holiday'
                  }
                  value={formData.checkIn}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      checkIn: event.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                  }}
                />
              </label>

              <label style={{ flex: 1 }}>
                Check Out:
                <input
                  type="datetime-local"
                  disabled={saving}
                  value={formData.checkOut}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      checkOut: event.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                  }}
                />
              </label>
            </div>

            <label>
              Notes:
              <input
                type="text"
                disabled={saving}
                value={formData.notes}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    notes: event.target.value,
                  })
                }
                placeholder="Sick leave / Late 10 mins"
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Btn
                v="ghost"
                type="button"
                onClick={() => {
                  setModalMode(null);
                  setErrorMessage('');
                }}
              >
                Cancel
              </Btn>

              <Btn v="gold" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
