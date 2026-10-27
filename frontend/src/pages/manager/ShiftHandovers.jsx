
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Table, Btn, S, PageHeader, Input, Select } from '../../components/kit';
import { Eye, Pencil, Trash2, RefreshCw } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api';

const SHIFT_TYPES = ['Morning', 'Afternoon', 'Night'];
const STATUSES = ['Pending', 'Approved', 'Flagged'];

const EMPTY_FORM = {
  id: null,
  shiftType: 'Morning',
  outgoingUser: '',
  incomingUser: '',
  totalFuel: '0',
  expectedCash: '0',
  actualCash: '0',
  status: 'Pending',
  reason: '',
  dateTime: '',
};

const getToken = () => sessionStorage.getItem('gas_station_token');

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error('Please log in again. Authentication token was not found.');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your session has expired. Please log in again.');
    }

    if (response.status === 422 && result.errors) {
      throw new Error(
        Object.values(result.errors).flat().join('\n')
      );
    }

    throw new Error(
      result.message || `Request failed (${response.status})`
    );
  }

  return result;
}

// Handle API responses that return either { data: [...] }
// or a direct array.
function getArray(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

// Adapt employee fields to the names shown in the UI.
// Adjust the name fields if your employees table uses different columns.
function getEmployeeName(employee) {
  const relatedUser = employee.user || employee.users || {};

  const fullName =
    employee.employee_name ||
    employee.full_name ||
    employee.name ||
    relatedUser.name ||
    [
      employee.first_name || relatedUser.first_name,
      employee.last_name || relatedUser.last_name,
    ]
      .filter(Boolean)
      .join(' ');

  return fullName || `Employee #${employee.employee_id}`;
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Convert a database record into the fields used by the UI.
function mapHandover(item, employees) {
  const outgoing = employees.find(
    employee =>
      Number(employee.employee_id) === Number(item.outgoing_employee_id)
  );

  const incoming = employees.find(
    employee =>
      Number(employee.employee_id) === Number(item.incoming_employee_id)
  );

  return {
    id: item.handover_id,
    shiftType: item.shift_type,
    outgoingEmployeeId: item.outgoing_employee_id,
    incomingEmployeeId: item.incoming_employee_id,
    outgoingUser: outgoing
      ? getEmployeeName(outgoing)
      : `Employee #${item.outgoing_employee_id}`,
    incomingUser: incoming
      ? getEmployeeName(incoming)
      : `Employee #${item.incoming_employee_id}`,
    totalFuel: item.total_fuel_liters ?? 0,
    expectedCash: Number(item.expected_cash ?? 0),
    actualCash: Number(item.actual_cash ?? 0),
    status: item.status,
    reason: item.reason || '',
    dateTime: formatDate(item.handed_over_at),
  };
}

export default function ShiftHandovers() {
  const [list, setList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [showForm, setShowForm] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const discrepancy = (
    Number(formData.actualCash || 0) -
    Number(formData.expectedCash || 0)
  ).toFixed(2);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [handoverResult, employeeResult] = await Promise.all([
        apiRequest('/shift-handovers'),
        apiRequest('/employees'),
      ]);

      const employeeList = getArray(employeeResult);
      const handoverList = getArray(handoverResult);

      setEmployees(employeeList);
      setList(
        handoverList.map(item => mapHandover(item, employeeList))
      );
    } catch (err) {
      setError(err.message || 'Unable to load shift handovers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = (field, value) => {
    setFormData(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleReset = () => {
    setFormData({
      ...EMPTY_FORM,
      outgoingUser: employees[0]
        ? String(employees[0].employee_id)
        : '',
      incomingUser: employees[1]
        ? String(employees[1].employee_id)
        : '',
    });
  };

  const handleSave = async event => {
    event.preventDefault();

    if (saving) return;

    if (employees.length < 2) {
      setError('At least two employees are required for a shift handover.');
      return;
    }

    if (
      !formData.outgoingUser ||
      !formData.incomingUser ||
      formData.outgoingUser === formData.incomingUser
    ) {
      setError('Please select two different employees.');
      return;
    }

    if (
      !Number.isFinite(Number(formData.totalFuel)) ||
      Number(formData.totalFuel) < 0 ||
      !Number.isFinite(Number(formData.expectedCash)) ||
      Number(formData.expectedCash) < 0 ||
      !Number.isFinite(Number(formData.actualCash)) ||
      Number(formData.actualCash) < 0
    ) {
      setError('Fuel volume and cash amounts must be valid non-negative numbers.');
      return;
    }

    const payload = {
      shift_type: formData.shiftType,
      outgoing_employee_id: Number(formData.outgoingUser),
      incoming_employee_id: Number(formData.incomingUser),
      total_fuel_liters: Number(formData.totalFuel),
      expected_cash: Number(formData.expectedCash),
      actual_cash: Number(formData.actualCash),
      status: formData.status,
      reason: formData.reason.trim() || null,
    };

    if (formData.dateTime && formData.id) {
      // The date is not editable in this form.
      // Keep the database's original handed_over_at value.
    }

    setSaving(true);
    setError('');

    try {
      if (formData.id) {
        await apiRequest(`/shift-handovers/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/shift-handovers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      await loadData();

      setFormData(EMPTY_FORM);
      setShowForm(false);

      window.alert(
        formData.id
          ? 'Shift handover updated successfully!'
          : 'Shift handover created successfully!'
      );
    } catch (err) {
      setError(err.message || 'Unable to save shift handover.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = item => {
    setFormData({
      id: item.id,
      shiftType: item.shiftType,
      outgoingUser: String(item.outgoingEmployeeId ?? ''),
      incomingUser: String(item.incomingEmployeeId ?? ''),
      totalFuel: String(item.totalFuel ?? 0),
      expectedCash: String(item.expectedCash ?? 0),
      actualCash: String(item.actualCash ?? 0),
      status: item.status,
      reason: item.reason || '',
      dateTime: item.dateTime,
    });

    setError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this handover?')) {
      return;
    }

    setError('');

    try {
      await apiRequest(`/shift-handovers/${id}`, {
        method: 'DELETE',
      });

      setList(previous => previous.filter(item => item.id !== id));

      if (viewItem?.id === id) {
        setViewItem(null);
      }

      window.alert('Shift handover deleted successfully!');
    } catch (err) {
      setError(err.message || 'Unable to delete shift handover.');
    }
  };

  const filteredList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return list;

    return list.filter(item =>
      [
        item.shiftType,
        item.outgoingUser,
        item.incomingUser,
        item.status,
        item.reason,
      ].some(value =>
        String(value || '').toLowerCase().includes(term)
      )
    );
  }, [list, searchTerm]);

  const totalPages = Math.ceil(filteredList.length / entriesPerPage);

  const safePage = Math.min(
    currentPage,
    Math.max(totalPages, 1)
  );

  const indexOfFirstItem = (safePage - 1) * entriesPerPage;

  const currentEntries = filteredList.slice(
    indexOfFirstItem,
    indexOfFirstItem + entriesPerPage
  );

  const employeeOptions = employees.map(employee => ({
    id: String(employee.employee_id),
    name: getEmployeeName(employee),
  }));

  return (
    <div className="bg-slate-300 -m-6 p-6">
      <PageHeader
        title="Shift Handover"
        action={
          <div className="flex gap-2">
            <Btn v="ghost" onClick={loadData}>
              <RefreshCw size={15} className="inline mr-1" />
              Refresh
            </Btn>

            <Btn
              v="gold"
              onClick={() => {
                if (!showForm) handleReset();
                setShowForm(!showForm);
              }}
            >
              {showForm
                ? 'Hide Form'
                : 'Create New Shift Handover'}
            </Btn>
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl p-4 mb-4 grid md:grid-cols-4 gap-3 shadow-sm border border-slate-100"
        >
          <Select
            label="Shift Type *"
            options={SHIFT_TYPES}
            value={formData.shiftType}
            onChange={event =>
              updateField('shiftType', event.target.value)
            }
          />

          <label className="block text-sm text-slate-600">
            Outgoing Employee *
            <select
              required
              value={formData.outgoingUser}
              onChange={event =>
                updateField('outgoingUser', event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5"
            >
              <option value="">Select employee</option>
              {employeeOptions.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-600">
            Incoming Employee *
            <select
              required
              value={formData.incomingUser}
              onChange={event =>
                updateField('incomingUser', event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5"
            >
              <option value="">Select employee</option>
              {employeeOptions.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Total Fuel Volume (L) *"
            type="number"
            value={formData.totalFuel}
            onChange={event =>
              updateField('totalFuel', event.target.value)
            }
          />

          <Input
            label="Expected Cash ($) *"
            type="number"
            value={formData.expectedCash}
            onChange={event =>
              updateField('expectedCash', event.target.value)
            }
          />

          <Input
            label="Actual Cash ($) *"
            type="number"
            value={formData.actualCash}
            onChange={event =>
              updateField('actualCash', event.target.value)
            }
          />

          <Input
            label="Discrepancy ($)"
            readOnly
            value={discrepancy}
            className={
              Number(discrepancy) < 0
                ? 'text-red-500 font-semibold'
                : 'text-slate-700'
            }
          />

          <Select
            label="Status *"
            options={STATUSES}
            value={formData.status}
            onChange={event =>
              updateField('status', event.target.value)
            }
          />

          <label className="md:col-span-4 text-sm text-slate-600">
            Discrepancy Reason
            <textarea
              className="w-full border rounded-lg p-2 mt-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
              rows="2"
              placeholder="Enter reason for discrepancy..."
              value={formData.reason}
              onChange={event =>
                updateField('reason', event.target.value)
              }
            />
          </label>

          <div className="md:col-span-4 flex justify-end gap-2">
            <Btn
              type="button"
              v="ghost"
              onClick={handleReset}
            >
              Reset
            </Btn>

            <Btn type="submit" v="gold">
              {saving
                ? 'Saving...'
                : formData.id
                  ? 'Update Handover'
                  : 'Save Handover'}
            </Btn>
          </div>
        </form>
      )}

      <div className="bg-white rounded-t-xl p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Show</span>

          <select
            className="border rounded p-1 text-sm bg-slate-50"
            value={entriesPerPage}
            onChange={event => {
              setEntriesPerPage(Number(event.target.value));
              setCurrentPage(1);
            }}
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
            onChange={event => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-8 text-center text-slate-500">
          Loading shift handovers...
        </div>
      ) : (
        <Table
          head={[
            '#',
            'Shift Type',
            'Outgoing User',
            'Incoming User',
            'Total Fuel (L)',
            'Expected Cash ($)',
            'Actual Cash ($)',
            'Discrepancy ($)',
            'Status',
            'Date & Time',
            'Actions',
          ]}
          rows={currentEntries.map((item, index) => {
            const difference = (
              Number(item.actualCash) -
              Number(item.expectedCash)
            ).toFixed(2);

            return [
              indexOfFirstItem + index + 1,
              item.shiftType,
              item.outgoingUser,
              item.incomingUser,
              Number(item.totalFuel).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
              `$${Number(item.expectedCash).toFixed(2)}`,
              `$${Number(item.actualCash).toFixed(2)}`,

              <span
                key={`diff-${item.id}`}
                className={
                  Number(difference) < 0
                    ? 'text-red-500 font-medium'
                    : Number(difference) > 0
                      ? 'text-amber-600 font-medium'
                      : ''
                }
              >
                {difference}
              </span>,

              S(item.status),
              item.dateTime,

              <div
                key={`actions-${item.id}`}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  title="View"
                  onClick={() => setViewItem(item)}
                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                >
                  <Eye size={17} />
                </button>

                <button
                  type="button"
                  title="Edit"
                  onClick={() => handleEdit(item)}
                  className="p-1 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded"
                >
                  <Pencil size={17} />
                </button>

                <button
                  type="button"
                  title="Delete"
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded"
                >
                  <Trash2 size={17} />
                </button>
              </div>,
            ];
          })}
        />
      )}

      {!loading && filteredList.length === 0 && (
        <div className="bg-white p-6 text-center text-slate-500">
          No shift handovers found.
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="bg-white rounded-b-xl p-3 border-t border-slate-100 flex justify-end items-center gap-1 flex-wrap">
          <button
            disabled={safePage === 1}
            onClick={() =>
              setCurrentPage(page => Math.max(page - 1, 1))
            }
            className="px-3 py-1 border rounded text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            « Prev
          </button>

          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index + 1)}
              className={`px-3 py-1 border rounded text-sm ${
                safePage === index + 1
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'hover:bg-slate-50'
              }`}
            >
              {index + 1}
            </button>
          ))}

          <button
            disabled={safePage === totalPages}
            onClick={() =>
              setCurrentPage(page =>
                Math.min(page + 1, totalPages)
              )
            }
            className="px-3 py-1 border rounded text-sm disabled:opacity-40 hover:bg-slate-50"
          >
            Next »
          </button>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-lg">
            <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">
              Shift Handover Details
            </h3>

            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <strong>Shift:</strong> {viewItem.shiftType}
              </p>
              <p>
                <strong>Outgoing Employee:</strong> {viewItem.outgoingUser}
              </p>
              <p>
                <strong>Incoming Employee:</strong> {viewItem.incomingUser}
              </p>
              <p>
                <strong>Total Fuel Volume:</strong>{' '}
                {Number(viewItem.totalFuel).toFixed(2)} L
              </p>
              <p>
                <strong>Expected Cash:</strong>{' '}
                ${Number(viewItem.expectedCash).toFixed(2)}
              </p>
              <p>
                <strong>Actual Cash:</strong>{' '}
                ${Number(viewItem.actualCash).toFixed(2)}
              </p>
              <p>
                <strong>Discrepancy:</strong>{' '}
                <span
                  className={
                    Number(viewItem.actualCash) -
                      Number(viewItem.expectedCash) <
                    0
                      ? 'text-red-500 font-bold'
                      : ''
                  }
                >
                  $
                  {(
                    Number(viewItem.actualCash) -
                    Number(viewItem.expectedCash)
                  ).toFixed(2)}
                </span>
              </p>
              <p>
                <strong>Status:</strong> {viewItem.status}
              </p>
              <p>
                <strong>Date & Time:</strong> {viewItem.dateTime}
              </p>

              {viewItem.reason && (
                <p className="bg-slate-50 p-2 rounded border">
                  <strong>Reason:</strong> {viewItem.reason}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Btn v="gold" onClick={() => setViewItem(null)}>
                Close
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
