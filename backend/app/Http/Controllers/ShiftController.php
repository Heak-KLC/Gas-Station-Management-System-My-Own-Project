<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\EmployeeAttendance;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    /**
     * GET /api/shifts/current
     * Get the authenticated user's active shift.
     */
    public function current(Request $request)
    {
        $user = $request->user();

        $shift = Shift::where('user_id', $user->user_id)
            ->where('status', 'active')
            ->latest('shift_id')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $shift,
        ]);
    }

    /**
     * POST /api/shifts/start
     * Start a shift and synchronize employee attendance.
     */
    public function start(Request $request)
    {
        $user = $request->user();

        return DB::transaction(function () use ($request, $user) {

            // Prevent starting another shift while one is active.
            $activeShift = Shift::where('user_id', $user->user_id)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if ($activeShift) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a Shift session running.',
                    'data' => $activeShift,
                ], 409);
            }

            $now = now();

            // Create the shift.
            $shift = Shift::create([
                'user_id' => $user->user_id,
                'start_time' => $now,
                'end_time' => null,
                'status' => 'active',
            ]);

            // Synchronize attendance only when this user
            // is linked to an employee record.
            if ($user->employee_id) {

                $date = $now->toDateString();

                $attendance = EmployeeAttendance::where(
                    'employee_id',
                    $user->employee_id
                )
                    ->whereDate('date', $date)
                    ->lockForUpdate()
                    ->first();

                if (!$attendance) {

                    // Create today's attendance.
                    $attendance = EmployeeAttendance::create([
                        'employee_id' => $user->employee_id,
                        'date' => $date,
                        'check_in' => $now,
                        'check_out' => null,
                        'status' => 'present',
                        'notes' => 'Recorded automatically when starting shift.',
                    ]);

                    $this->recordAttendanceAudit(
                        $request,
                        $attendance,
                        'CREATE',
                        null
                    );

                } elseif ($attendance->check_out !== null) {

                    // A new shift has started on the same day.
                    // Keep the original check-in time.
                    // Clear the previous check-out while working.
                    $oldValues = $this->attendanceValues($attendance);

                    $attendance->update([
                        'check_out' => null,
                    ]);

                    $attendance->refresh();

                    $this->recordAttendanceAudit(
                        $request,
                        $attendance,
                        'UPDATE',
                        $oldValues
                    );
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Successfully started the work shift.',
                'data' => $shift->fresh(),
            ], 201);
        });
    }

    /**
     * POST /api/shifts/end
     * End the active shift and check out the employee.
     */
    public function end(Request $request)
    {
        $user = $request->user();

        return DB::transaction(function () use ($request, $user) {

            $shift = Shift::where('user_id', $user->user_id)
                ->where('status', 'active')
                ->latest('shift_id')
                ->lockForUpdate()
                ->first();

            if (!$shift) {
                return response()->json([
                    'success' => false,
                    'message' => 'No shift is currently in progress.',
                ], 404);
            }

            $endTime = now();

            // Update the employee's attendance first.
            // If this fails, the entire transaction rolls back.
            if ($user->employee_id) {

                // Use the shift's start date so that a shift
                // crossing midnight updates the correct daily record.
                $shiftDate = $shift->start_time->toDateString();

                $attendance = EmployeeAttendance::where(
                    'employee_id',
                    $user->employee_id
                )
                    ->whereDate('date', $shiftDate)
                    ->lockForUpdate()
                    ->first();

                if ($attendance) {

                    $oldValues = $this->attendanceValues($attendance);

                    $attendance->update([
                        'check_out' => $endTime,
                    ]);

                    $attendance->refresh();

                    $this->recordAttendanceAudit(
                        $request,
                        $attendance,
                        'UPDATE',
                        $oldValues
                    );

                } else {

                    // Recover if a shift exists but attendance
                    // was not created when the shift started.
                    $attendance = EmployeeAttendance::create([
                        'employee_id' => $user->employee_id,
                        'date' => $shiftDate,
                        'check_in' => $shift->start_time,
                        'check_out' => $endTime,
                        'status' => 'present',
                        'notes' => 'Recorded automatically when ending shift.',
                    ]);

                    $this->recordAttendanceAudit(
                        $request,
                        $attendance,
                        'CREATE',
                        null
                    );
                }
            }

            // Complete the shift in the same database transaction.
            $shift->update([
                'end_time' => $endTime,
                'status' => 'completed',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Successfully completed the work shift.',
                'data' => $shift->fresh(),
            ]);
        });
    }

    /**
     * Prepare attendance values for audit logging.
     */
    private function attendanceValues(
        EmployeeAttendance $attendance
    ): array {
        return [
            'employee_id' => $attendance->employee_id,
            'date' => $attendance->date?->toDateString(),
            'check_in' => $attendance->check_in?->toDateTimeString(),
            'check_out' => $attendance->check_out?->toDateTimeString(),
            'status' => $attendance->status,
            'notes' => $attendance->notes,
        ];
    }

    /**
     * Record attendance changes made by Start Shift / End Shift.
     */
    private function recordAttendanceAudit(
        Request $request,
        EmployeeAttendance $attendance,
        string $action,
        ?array $oldValues
    ): void {
        AuditLog::create([
            'user_id' => $request->user()?->user_id,
            'action' => $action,
            'entity_type' => 'EmployeeAttendance',
            'entity_id' => $attendance->attendance_id,

            'old_value' => $oldValues === null
                ? null
                : json_encode(
                    $oldValues,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ),

            'new_value' => json_encode(
                $this->attendanceValues($attendance),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),

            'ip_address' => $request->ip(),
        ]);
    }
}
