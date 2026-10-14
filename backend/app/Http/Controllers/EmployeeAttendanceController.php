<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeAttendance;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EmployeeAttendanceController extends Controller
{
    /**
     * GET /api/employee-attendances
     * Retrieve attendance records with employee information.
     */
    public function index(Request $request)
    {
        $query = EmployeeAttendance::with('employee');

        // Filter attendance by date.
        if ($request->filled('date')) {
            $request->validate([
                'date' => ['date'],
            ]);

            $query->whereDate('date', $request->date);
        }

        // Filter attendance by employee.
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter attendance by status.
        if ($request->filled('status')) {
            $request->validate([
                'status' => [
                    Rule::in([
                        'present',
                        'absent',
                        'late',
                        'half_day',
                        'holiday',
                    ]),
                ],
            ]);

            $query->where('status', $request->status);
        }

        return response()->json([
            'success' => true,
            'data' => $query
                ->orderBy('date', 'desc')
                ->orderBy('check_in', 'desc')
                ->get(),
        ]);
    }

    /**
     * POST /api/employee-attendances
     * Create an attendance record and record the audit log.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => [
                'required',
                'integer',
                'exists:employees,employee_id',
            ],
            'date' => ['required', 'date'],
            'check_in' => ['required', 'date'],
            'check_out' => ['nullable', 'date'],
            'status' => [
                'sometimes',
                Rule::in([
                    'present',
                    'absent',
                    'late',
                    'half_day',
                    'holiday',
                ]),
            ],
            'notes' => ['nullable', 'string'],
        ]);

        // Prevent duplicate attendance for the same employee and date.
        $alreadyExists = EmployeeAttendance::where(
            'employee_id',
            $validated['employee_id']
        )
            ->whereDate('date', $validated['date'])
            ->exists();

        if ($alreadyExists) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance for this employee and date already exists.',
            ], 422);
        }

        // Check-out must not be earlier than check-in.
        if (
            !empty($validated['check_out']) &&
            Carbon::parse($validated['check_out'])
                ->lt(Carbon::parse($validated['check_in']))
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Check-out cannot be earlier than check-in.',
            ], 422);
        }

        // Set the default attendance status.
        $validated['status'] = $validated['status'] ?? 'present';

        // Create attendance and its audit log in one transaction.
        $attendance = DB::transaction(function () use (
            $request,
            $validated
        ) {
            $attendance = EmployeeAttendance::create($validated);

            // Record the newly created attendance.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $attendance->attendance_id,
                null,
                $this->getAttendanceAuditValues($attendance)
            );

            return $attendance;
        });

        return response()->json([
            'success' => true,
            'message' => 'Attendance created successfully.',
            'data' => $attendance->load('employee'),
        ], 201);
    }

    /**
     * GET /api/employee-attendances/{employee_attendance}
     * Retrieve one attendance record.
     */
    public function show(string $id)
    {
        $attendance = EmployeeAttendance::with('employee')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $attendance,
        ]);
    }

    /**
     * PUT/PATCH /api/employee-attendances/{employee_attendance}
     * Update attendance and record old and new values.
     */
    public function update(Request $request, string $id)
    {
        $attendance = EmployeeAttendance::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:employees,employee_id',
            ],
            'date' => ['sometimes', 'required', 'date'],
            'check_in' => ['sometimes', 'required', 'date'],
            'check_out' => ['sometimes', 'nullable', 'date'],
            'status' => [
                'sometimes',
                Rule::in([
                    'present',
                    'absent',
                    'late',
                    'half_day',
                    'holiday',
                ]),
            ],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);

        // Determine the employee and date after the requested update.
        $employeeId = $validated['employee_id']
            ?? $attendance->employee_id;

        $date = $validated['date']
            ?? Carbon::parse($attendance->date)->toDateString();

        // Prevent duplicate attendance when employee or date changes.
        $duplicate = EmployeeAttendance::where(
            'employee_id',
            $employeeId
        )
            ->whereDate('date', $date)
            ->where(
                'attendance_id',
                '!=',
                $attendance->attendance_id
            )
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance for this employee and date already exists.',
            ], 422);
        }

        // Use the submitted values or keep the existing values.
        $checkIn = $validated['check_in']
            ?? $attendance->check_in;

        $checkOut = array_key_exists('check_out', $validated)
            ? $validated['check_out']
            : $attendance->check_out;

        // Check-out must not be earlier than check-in.
        if (
            $checkOut !== null &&
            Carbon::parse($checkOut)->lt(Carbon::parse($checkIn))
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Check-out cannot be earlier than check-in.',
            ], 422);
        }

        // Capture the old values before updating the record.
        $oldValues = $this->getAttendanceAuditValues($attendance);

        // Update attendance and audit log atomically.
        $updatedAttendance = DB::transaction(function () use (
            $request,
            $attendance,
            $validated,
            $oldValues
        ) {
            $attendance->update($validated);
            $attendance->refresh();

            // Record the old values and the updated values.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $attendance->attendance_id,
                $oldValues,
                $this->getAttendanceAuditValues($attendance)
            );

            return $attendance;
        });

        return response()->json([
            'success' => true,
            'message' => 'Attendance updated successfully.',
            'data' => $updatedAttendance->load('employee'),
        ]);
    }

    /**
     * DELETE /api/employee-attendances/{employee_attendance}
     * Delete an attendance record and record the deletion.
     */
    public function destroy(Request $request, string $id)
    {
        $attendance = EmployeeAttendance::findOrFail($id);

        // Save attendance information before deleting it.
        $oldValues = $this->getAttendanceAuditValues($attendance);

        // Delete attendance and create its audit log together.
        DB::transaction(function () use (
            $request,
            $attendance,
            $oldValues
        ) {
            $this->recordAuditLog(
                $request,
                'DELETE',
                $attendance->attendance_id,
                $oldValues,
                null
            );

            $attendance->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Attendance deleted successfully.',
        ]);
    }

    /**
     * Prepare attendance fields for audit logging.
     * Store only the fields needed to track attendance changes.
     */
    private function getAttendanceAuditValues(
        EmployeeAttendance $attendance
    ): array {
        return [
            'employee_id' => $attendance->employee_id,
            'date' => $attendance->date,
            'check_in' => $attendance->check_in,
            'check_out' => $attendance->check_out,
            'status' => $attendance->status,
            'notes' => $attendance->notes,
        ];
    }

    /**
     * Insert an activity record into the audit_logs table.
     */
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        AuditLog::create([
            // Identify the authenticated user performing the action.
            'user_id' => $request->user()?->user_id,

            'action' => $action,
            'entity_type' => 'EmployeeAttendance',
            'entity_id' => $entityId,

            // Store old and new values as JSON strings.
            'old_value' => $oldValues === null
                ? null
                : json_encode(
                    $oldValues,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ),

            'new_value' => $newValues === null
                ? null
                : json_encode(
                    $newValues,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ),

            // Record the IP address of the request.
            'ip_address' => $request->ip(),
        ]);
    }
}
