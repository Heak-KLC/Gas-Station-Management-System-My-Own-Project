<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeAttendance;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;

class EmployeeAttendanceController extends Controller
{
    /**
     * GET /api/employee-attendances
     * ទាញយកបញ្ជីវត្តមាន រួមជាមួយព័ត៌មានបុគ្គលិក។
     */
    public function index(Request $request)
    {
        $query = EmployeeAttendance::with('employee');

        // ត្រងតាមថ្ងៃ ឧទាហរណ៍ ?date=2026-10-09
        if ($request->filled('date')) {
            $request->validate([
                'date' => ['date'],
            ]);

            $query->whereDate('date', $request->date);
        }

        // ត្រងតាមបុគ្គលិក
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // ត្រងតាមស្ថានភាពវត្តមាន
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
     * បង្កើតកំណត់ត្រាវត្តមានថ្មី (Check-in)។
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

        // តារាងមាន Unique Key លើ employee_id + date។
        // បុគ្គលិកម្នាក់មិនអាចមាន Attendance ពីរជួរនៅថ្ងៃតែមួយបានទេ។
        $alreadyExists = EmployeeAttendance::where(
            'employee_id',
            $validated['employee_id']
        )->whereDate('date', $validated['date'])->exists();

        if ($alreadyExists) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance for this employee and date already exists.',
            ], 422);
        }

        // បើមាន Check-out ត្រូវប្រាកដថាវាមិនមុន Check-in។
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

        // កំណត់ស្ថានភាពលំនាំដើម ប្រសិនបើ Frontend មិនផ្ញើមក។
        $validated['status'] = $validated['status'] ?? 'present';

        $attendance = EmployeeAttendance::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Attendance created successfully.',
            'data' => $attendance->load('employee'),
        ], 201);
    }

    /**
     * GET /api/employee-attendances/{employee_attendance}
     * បង្ហាញកំណត់ត្រាវត្តមានមួយ។
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
     * កែប្រែ Check-in, Check-out, ថ្ងៃ ឬស្ថានភាពវត្តមាន។
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

        // ប្រើតម្លៃថ្មី ប្រសិនបើមាន; បើគ្មាន ប្រើតម្លៃដែលមានស្រាប់។
        $employeeId = $validated['employee_id']
            ?? $attendance->employee_id;

        $date = $validated['date']
            ?? $attendance->date->toDateString();

        // ពិនិត្យថាមិនមាន Attendance ផ្សេងប្រើ employee/date ដូចគ្នា។
        $duplicate = EmployeeAttendance::where(
            'employee_id',
            $employeeId
        )
            ->whereDate('date', $date)
            ->where('attendance_id', '!=', $attendance->attendance_id)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance for this employee and date already exists.',
            ], 422);
        }

        $checkIn = $validated['check_in']
            ?? $attendance->check_in;

        $checkOut = array_key_exists('check_out', $validated)
            ? $validated['check_out']
            : $attendance->check_out;

        // កុំអនុញ្ញាតឱ្យ Check-out មុន Check-in។
        if (
            $checkOut !== null &&
            Carbon::parse($checkOut)->lt(Carbon::parse($checkIn))
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Check-out cannot be earlier than check-in.',
            ], 422);
        }

        $attendance->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Attendance updated successfully.',
            'data' => $attendance->fresh()->load('employee'),
        ]);
    }

    /**
     * DELETE /api/employee-attendances/{employee_attendance}
     * លុបកំណត់ត្រាវត្តមានមួយ។
     */
    public function destroy(string $id)
    {
        $attendance = EmployeeAttendance::findOrFail($id);

        $attendance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Attendance deleted successfully.',
        ]);
    }
}