import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Card, Input } from '../../components/kit';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = 'http://127.0.0.1:8000/api';

const DENOMINATIONS = [100, 50, 20, 10, 5, 1];

const SHIFT_OPTIONS = [
  { value: 'Morning', label: 'Morning Shift' },
  { value: 'Afternoon', label: 'Afternoon Shift' },
  { value: 'Night', label: 'Night Shift' },
];

const INITIAL_COUNTS = {
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  1: 0,
};

const money = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const today = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const getErrorMessage = (error) =>
  error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        'Your session has expired. Please log in again.'
      );
    }

    if (response.status === 403) {
      throw new Error(
        'You do not have permission to perform this action.'
      );
    }

    if (response.status === 404) {
      throw new Error(
        'API endpoint was not found. Check routes/api.php.'
      );
    }

    if (response.status === 422 && data.errors) {
      const messages = Object.values(data.errors).flat();

      throw new Error(messages.join(' '));
    }

    throw new Error(
      data.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

/**
 * Supports:
 * 1. Laravel: { success: true, data: [...] }
 * 2. Direct array: [...]
 * 3. Paginated Laravel response: { data: { data: [...] } }
 */
function extractArray(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.data?.data)) {
    return responseData.data.data;
  }

  return null;
}

function formatDateTime(value) {
  if (!value) return '-';

  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function getEmployeeName(employeeId, employees) {
  const employee = employees.find(
    (item) =>
      Number(item.employee_id) === Number(employeeId)
  );

  if (employee) {
    return (
      employee.full_name ||
      employee.name ||
      `Employee #${employeeId}`
    );
  }

  return `Employee #${employeeId ?? '-'}`;
}

function getDenominationTotal(counts) {
  return DENOMINATIONS.reduce(
    (sum, denomination) =>
      sum +
      denomination *
        (Number(counts[denomination]) || 0),
    0
  );
}

function getStatusClass(status) {
  switch (status) {
    case 'Approved':
      return 'bg-green-100 text-green-700';

    case 'Flagged':
      return 'bg-red-100 text-red-700';

    case 'Pending':
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

export default function ShiftHandover() {
  // --------------------------------------------------
  // 1. FORM STATE
  // --------------------------------------------------

  const [shiftDate, setShiftDate] = useState(today);
  const [shiftType, setShiftType] = useState('Morning');

  const [preparedBy, setPreparedBy] = useState('');
  const [handoverTo, setHandoverTo] = useState('');

  const [totalFuelLiters, setTotalFuelLiters] = useState('0');
  const [expectedCash, setExpectedCash] = useState('0');

  const [counts, setCounts] = useState({
    ...INITIAL_COUNTS,
  });

  const [note, setNote] = useState('');

  // --------------------------------------------------
  // 2. API DATA STATE
  // --------------------------------------------------

  const [employees, setEmployees] = useState([]);
  const [handovers, setHandovers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = sessionStorage.getItem('gas_station_token');

  // --------------------------------------------------
  // 3. CASH CALCULATION
  // --------------------------------------------------

  const totalCash = useMemo(
    () => getDenominationTotal(counts),
    [counts]
  );

  const cashDifference =
    totalCash - (Number(expectedCash) || 0);

  // --------------------------------------------------
  // 4. API HEADERS
  // --------------------------------------------------

  const requestHeaders = useCallback(
    (json = false) => ({
      Accept: 'application/json',

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(json
        ? {
            'Content-Type': 'application/json',
          }
        : {}),
    }),
    [token]
  );

  // --------------------------------------------------
  // 5. LOAD EMPLOYEES AND HISTORY
  // --------------------------------------------------

  const loadData = useCallback(async () => {
    const currentToken = sessionStorage.getItem(
      'gas_station_token'
    );

    if (!currentToken) {
      setError(
        'Authentication token was not found. Please log in again.'
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${currentToken}`,
    };

    // Load employees and history independently.
    // An employee API failure must not prevent history loading.

    const employeeRequest = fetch(
      `${API_URL}/employees?is_active=1&role=cashier`,
      { headers }
    );

    const historyRequest = fetch(
      `${API_URL}/shift-handovers`,
      { headers }
    );

    const [employeeResult, historyResult] =
      await Promise.allSettled([
        employeeRequest,
        historyRequest,
      ]);

    let historyError = '';

    // --------------------------
    // Load employees
    // --------------------------

    if (employeeResult.status === 'fulfilled') {
      try {
        const response = employeeResult.value;
        const result = await readResponse(response);
        const employeeData = extractArray(result);

        if (!employeeData) {
          throw new Error(
            'Employee API did not return an array.'
          );
        }

        setEmployees(employeeData);

        // Choose defaults only when not already selected.
        setPreparedBy((previous) => {
          if (
            previous &&
            employeeData.some(
              (item) =>
                String(item.employee_id) === String(previous)
            )
          ) {
            return previous;
          }

          return employeeData.length > 0
            ? String(employeeData[0].employee_id)
            : '';
        });

        setHandoverTo((previous) => {
          if (
            previous &&
            employeeData.some(
              (item) =>
                String(item.employee_id) === String(previous)
            )
          ) {
            return previous;
          }

          const otherEmployee = employeeData.find(
            (item) =>
              String(item.employee_id) !==
              String(
                employeeData[0]?.employee_id ?? ''
              )
          );

          return otherEmployee
            ? String(otherEmployee.employee_id)
            : '';
        });
      } catch (employeeError) {
        console.error(
          'Employee API error:',
          employeeError
        );

        setEmployees([]);
      }
    } else {
      console.error(
        'Employee request failed:',
        employeeResult.reason
      );

      setEmployees([]);
    }

    // --------------------------
    // Load Shift Handover History
    // --------------------------

    if (historyResult.status === 'fulfilled') {
      try {
        const response = historyResult.value;
        const result = await readResponse(response);

        console.log(
          'Shift Handover API response:',
          result
        );

        const historyData = extractArray(result);

        if (!historyData) {
          throw new Error(
            'Invalid history response. Expected an array in data.'
          );
        }

        // Newest handover first.
        const sortedHistory = [...historyData].sort(
          (a, b) => {
            const dateA = new Date(
              String(a.handed_over_at || '').replace(
                ' ',
                'T'
              )
            ).getTime();

            const dateB = new Date(
              String(b.handed_over_at || '').replace(
                ' ',
                'T'
              )
            ).getTime();

            const safeA = Number.isNaN(dateA) ? 0 : dateA;
            const safeB = Number.isNaN(dateB) ? 0 : dateB;

            return (
              safeB - safeA ||
              Number(b.handover_id || 0) -
                Number(a.handover_id || 0)
            );
          }
        );

        setHandovers(sortedHistory);
      } catch (historyException) {
        console.error(
          'Shift Handover History error:',
          historyException
        );

        setHandovers([]);
        historyError = getErrorMessage(historyException);
      }
    } else {
      console.error(
        'History request failed:',
        historyResult.reason
      );

      setHandovers([]);
      historyError = getErrorMessage(
        historyResult.reason
      );
    }

    setError(historyError);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --------------------------------------------------
  // 6. CASH DENOMINATION INPUT
  // --------------------------------------------------

  const handleCountChange = (denomination, value) => {
    if (value === '') {
      setCounts((previous) => ({
        ...previous,
        [denomination]: '',
      }));

      return;
    }

    // Accept non-negative whole numbers only.
    if (!/^\d+$/.test(value)) {
      return;
    }

    setCounts((previous) => ({
      ...previous,
      [denomination]: Number(value),
    }));
  };

  // --------------------------------------------------
  // 7. SAVE SHIFT HANDOVER
  // --------------------------------------------------

  const handleSave = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const currentToken = sessionStorage.getItem(
      'gas_station_token'
    );

    if (!currentToken) {
      setError(
        'Please log in again. Authentication token was not found.'
      );

      return;
    }

    if (!shiftDate) {
      setError('Please select the shift date.');
      return;
    }

    if (!preparedBy || !handoverTo) {
      setError(
        'Please select both outgoing and incoming employees.'
      );

      return;
    }

    if (Number(preparedBy) === Number(handoverTo)) {
      setError(
        'Outgoing and incoming employees must be different.'
      );

      return;
    }

    const validCounts = DENOMINATIONS.every(
      (denomination) => {
        const value = counts[denomination];

        return (
          value !== '' &&
          Number.isInteger(Number(value)) &&
          Number(value) >= 0
        );
      }
    );

    if (!validCounts) {
      setError(
        'Cash denomination counts must be non-negative whole numbers.'
      );

      return;
    }

    if (
      totalFuelLiters === '' ||
      !Number.isFinite(Number(totalFuelLiters)) ||
      Number(totalFuelLiters) < 0
    ) {
      setError(
        'Total fuel liters must be zero or greater.'
      );

      return;
    }

    if (
      expectedCash === '' ||
      !Number.isFinite(Number(expectedCash)) ||
      Number(expectedCash) < 0
    ) {
      setError(
        'Expected cash must be zero or greater.'
      );

      return;
    }

    if (note.length > 500) {
      setError('Note cannot exceed 500 characters.');
      return;
    }

    setSaving(true);

    try {
      const now = new Date();

      const currentTime = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join(':');

      const cashDenominations = Object.fromEntries(
        DENOMINATIONS.map((denomination) => [
          String(denomination),
          Number(counts[denomination]) || 0,
        ])
      );

      const payload = {
        shift_type: shiftType,

        outgoing_employee_id: Number(preparedBy),
        incoming_employee_id: Number(handoverTo),

        total_fuel_liters: Number(totalFuelLiters),
        expected_cash: Number(expectedCash),
        actual_cash: totalCash,

        cash_denominations: cashDenominations,

        status: 'Pending',
        reason: note.trim() || null,

        handed_over_at: `${shiftDate} ${currentTime}`,
      };

      const response = await fetch(
        `${API_URL}/shift-handovers`,
        {
          method: 'POST',

          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },

          body: JSON.stringify(payload),
        }
      );

      const result = await readResponse(response);

      setSuccess(
        result.message ||
          'Shift handover saved successfully.'
      );

      // Reset form after successful save.
      setCounts({ ...INITIAL_COUNTS });
      setExpectedCash('0');
      setTotalFuelLiters('0');
      setNote('');

      // Reload saved records from database.
      await loadData();
    } catch (saveError) {
      console.error(
        'Save Shift Handover error:',
        saveError
      );

      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // 8. EMPLOYEE NAMES IN HISTORY
  // --------------------------------------------------

  const getHistoryEmployeeName = (
    handover,
    type
  ) => {
    const isOutgoing = type === 'outgoing';

    const relation = isOutgoing
      ? handover.outgoing_employee
      : handover.incoming_employee;

    const employeeId = isOutgoing
      ? handover.outgoing_employee_id
      : handover.incoming_employee_id;

    // Use relationship data if API includes it.
    if (relation?.full_name) {
      return relation.full_name;
    }

    if (relation?.name) {
      return relation.name;
    }

    return getEmployeeName(employeeId, employees);
  };

  // --------------------------------------------------
  // 9. EXPORT PDF REPORT
  // --------------------------------------------------

  const handleExportReport = () => {
    setError('');

    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text('V-SYCHL GAS STATION', 14, 18);

      doc.setFontSize(14);
      doc.text('SHIFT HANDOVER REPORT', 14, 28);

      doc.setFontSize(10);

      const details = [
        `Shift Date: ${shiftDate}`,
        `Shift Type: ${shiftType}`,
        `Prepared By: ${getEmployeeName(preparedBy, employees)}`,
        `Handover To: ${getEmployeeName(handoverTo, employees)}`,
        `Total Fuel Sold: ${Number(totalFuelLiters || 0).toFixed(2)} L`,
        `Expected Cash: $${money(expectedCash)}`,
        `Actual Cash: $${money(totalCash)}`,
        `Cash Difference: $${money(cashDifference)}`,
        `Generated At: ${new Date().toLocaleString()}`,
      ];

      details.forEach((line, index) => {
        doc.text(line, 14, 39 + index * 6);
      });

      const rows = DENOMINATIONS.map(
        (denomination) => [
          `$${denomination}`,
          String(Number(counts[denomination]) || 0),
          money(
            denomination *
              (Number(counts[denomination]) || 0)
          ),
        ]
      );

      autoTable(doc, {
        startY: 99,

        head: [[
          'Denomination',
          'Count',
          'Amount ($)',
        ]],

        body: rows,

        foot: [
          ['Total Actual Cash', '', money(totalCash)],
          ['Expected Cash', '', money(expectedCash)],
          ['Cash Difference', '', money(cashDifference)],
        ],

        theme: 'grid',

        styles: {
          fontSize: 10,
          cellPadding: 3,
        },

        headStyles: {
          fillColor: [30, 41, 59],
        },
      });

      let finalY = (doc.lastAutoTable?.finalY || 145) + 12;

      if (finalY > 265) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(11);
      doc.text('Note / Remarks:', 14, finalY);

      doc.setFontSize(10);

      const noteLines = doc.splitTextToSize(
        note.trim() || 'No additional note provided.',
        180
      );

      doc.text(noteLines, 14, finalY + 7);

      doc.save(`Shift_Handover_${shiftDate}.pdf`);
    } catch (pdfError) {
      console.error('PDF export error:', pdfError);

      setError(
        `Could not generate PDF: ${getErrorMessage(pdfError)}`
      );
    }
  };

  // --------------------------------------------------
  // 10. RENDER
  // --------------------------------------------------

  return (
    <div className="space-y-5 text-slate-800">
      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="font-bold">Error</div>

          <p className="mt-1">{error}</p>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="mt-2 font-bold underline disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Try again'}
          </button>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* ============================================ */}
      {/* SHIFT INFORMATION AND FORM                   */}
      {/* ============================================ */}

      <Card title="Shift Information">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Shift date */}
            <div>
              <label className="mb-1 block text-sm font-bold text-blue-600">
                Shift Date
              </label>

              <Input
                type="date"
                value={shiftDate}
                onChange={(event) =>
                  setShiftDate(event.target.value)
                }
                className="py-2 text-base"
                required
              />
            </div>

            {/* Shift type */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Shift
              </label>

              <select
                value={shiftType}
                onChange={(event) =>
                  setShiftType(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
                required
              >
                {SHIFT_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Outgoing employee */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Prepared By
              </label>

              <select
                value={preparedBy}
                onChange={(event) =>
                  setPreparedBy(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
                required
                disabled={
                  loading || employees.length === 0
                }
              >
                <option value="">
                  Select outgoing employee
                </option>

                {employees
                  .filter(
                    (employee) =>
                      String(employee.employee_id) !==
                      String(handoverTo)
                  )
                  .map((employee) => (
                    <option
                      key={employee.employee_id}
                      value={employee.employee_id}
                    >
                      {employee.full_name ||
                        employee.name ||
                        `Employee #${employee.employee_id}`}
                      {' ('}
                      {employee.employee_code ||
                        employee.employee_id}
                      {')'}
                    </option>
                  ))}
              </select>
            </div>

            {/* Incoming employee */}
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Handover To
              </label>

              <select
                value={handoverTo}
                onChange={(event) =>
                  setHandoverTo(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
                required
                disabled={
                  loading || employees.length === 0
                }
              >
                <option value="">
                  Select incoming employee
                </option>

                {employees
                  .filter(
                    (employee) =>
                      String(employee.employee_id) !==
                      String(preparedBy)
                  )
                  .map((employee) => (
                    <option
                      key={employee.employee_id}
                      value={employee.employee_id}
                    >
                      {employee.full_name ||
                        employee.name ||
                        `Employee #${employee.employee_id}`}
                      {' ('}
                      {employee.employee_code ||
                        employee.employee_id}
                      {')'}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {!loading && employees.length < 2 && (
            <p className="text-sm text-amber-700">
              At least two active employees are needed to
              complete a shift handover. Check the employee
              API and database records.
            </p>
          )}

          {/* Fuel and expected cash */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Total Fuel Sold (Liters)
              </label>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={totalFuelLiters}
                onChange={(event) =>
                  setTotalFuelLiters(event.target.value)
                }
                className="py-2 text-base"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Expected Cash ($)
              </label>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={expectedCash}
                onChange={(event) =>
                  setExpectedCash(event.target.value)
                }
                className="py-2 text-base"
                required
              />
            </div>
          </div>

          {/* Sale summary and stock */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="border-b pb-2 text-base font-bold text-blue-600">
                Sale Summary
              </h3>

              <p className="text-sm text-slate-500">
                Actual sales totals are not connected to a
                sales API yet.
              </p>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Expected Cash</dt>
                  <dd className="font-bold">
                    ${' '}{money(expectedCash)}
                  </dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt>Actual Cash Counted</dt>
                  <dd className="font-bold">
                    ${' '}{money(totalCash)}
                  </dd>
                </div>

                <div className="flex justify-between gap-3 rounded-xl bg-purple-50 p-3 font-black text-purple-700">
                  <dt>Difference</dt>

                  <dd>
                    {cashDifference < 0 ? '-$ ' : '$ '}
                    {money(Math.abs(cashDifference))}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="border-b pb-2 text-base font-bold text-blue-600">
                Inventory & Stock
              </h3>

              <p className="text-sm text-slate-500">
                Current fuel stock, store stock, and actual
                sales require connection to their respective APIs.
              </p>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Fuel Quantity Entered</dt>

                  <dd className="font-bold">
                    {Number(totalFuelLiters || 0).toFixed(2)} L
                  </dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt>Cash Denomination Total</dt>

                  <dd className="font-bold">
                    ${' '}{money(totalCash)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Cash denomination */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 border-b pb-2 text-base font-bold text-blue-600">
              Cash Denomination
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-base font-bold">
                    <th className="pb-3">Denomination</th>
                    <th className="pb-3 text-center">Count</th>
                    <th className="pb-3 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-bold">
                  {DENOMINATIONS.map((denomination) => (
                    <tr key={denomination}>
                      <td className="py-2.5 text-base">
                        ${' '}{denomination}
                      </td>

                      <td className="py-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={counts[denomination]}
                          onChange={(event) =>
                            handleCountChange(
                              denomination,
                              event.target.value
                            )
                          }
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Count of $${denomination} notes`}
                        />
                      </td>

                      <td className="py-2.5 text-right text-base">
                        ${' '}
                        {money(
                          denomination *
                            (Number(counts[denomination]) || 0)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t pt-4 text-base font-black text-purple-700">
              <span>Total Actual Cash</span>

              <span className="text-xl">
                ${' '}{money(totalCash)}
              </span>
            </div>
          </div>

          {/* Note */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 border-b pb-2 text-base font-bold text-blue-600">
              Note / Remarks
            </h3>

            <textarea
              rows={5}
              maxLength={500}
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Add a note or important handover information..."
              className="w-full resize-none rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mt-1 text-right text-xs text-slate-400">
              {note.length}/500
            </div>

            {/* Form actions */}
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleExportReport}
                className="rounded-xl bg-slate-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                Export Report (PDF)
              </button>

              <button
                type="submit"
                disabled={
                  saving ||
                  loading ||
                  employees.length < 2
                }
                className="rounded-xl bg-emerald-500 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : 'Save Shift Handover'}
              </button>

              <button
                type="button"
                onClick={loadData}
                disabled={loading || saving}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* ============================================ */}
      {/* SHIFT HANDOVER HISTORY                       */}
      {/* ============================================ */}

      <Card title="Shift Handover History">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Total records: {handovers.length}
          </p>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh History'}
          </button>
        </div>

        {loading && handovers.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading shift handover history...
          </div>
        ) : handovers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
            <p className="font-semibold text-slate-600">
              No shift handover records found.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Save a handover or refresh to check the database again.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-700">
                  <th className="p-3">ID</th>
                  <th className="p-3">Date / Time</th>
                  <th className="p-3">Shift</th>
                  <th className="p-3">Prepared By</th>
                  <th className="p-3">Handover To</th>
                  <th className="p-3 text-right">Fuel (L)</th>
                  <th className="p-3 text-right">Expected ($)</th>
                  <th className="p-3 text-right">Actual ($)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {handovers.map((handover, index) => (
                  <tr
                    key={
                      handover.handover_id ??
                      `handover-${index}`
                    }
                    className="hover:bg-slate-50"
                  >
                    <td className="p-3 font-bold">
                      #{handover.handover_id ?? '-'}
                    </td>

                    <td className="whitespace-nowrap p-3">
                      {formatDateTime(
                        handover.handed_over_at
                      )}
                    </td>

                    <td className="p-3">
                      {handover.shift_type || '-'}
                    </td>

                    <td className="p-3">
                      {getHistoryEmployeeName(
                        handover,
                        'outgoing'
                      )}
                    </td>

                    <td className="p-3">
                      {getHistoryEmployeeName(
                        handover,
                        'incoming'
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {money(handover.total_fuel_liters)}
                    </td>

                    <td className="p-3 text-right">
                      {money(handover.expected_cash)}
                    </td>

                    <td className="p-3 text-right">
                      {money(handover.actual_cash)}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                          handover.status
                        )}`}
                      >
                        {handover.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}