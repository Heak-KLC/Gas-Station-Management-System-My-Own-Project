<?php

namespace App\Http\Controllers;

use App\Models\WorkSchedule;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkScheduleController extends Controller
{
    /**
     * GET /api/work-schedules
     * ទាញយកកាលវិភាគការងារទាំងអស់ និងព័ត៌មានបុគ្គលិក។
     */
    public function index(Request $request)
    {
        $query = WorkSchedule::with('employee');

        // ស្វែងរកកាលវិភាគតាមបុគ្គលិក។
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter តាមថ្ងៃក្នុងសប្ដាហ៍ (0 = Sunday, 6 = Saturday)។
        if ($request->filled('day_of_week')) {
            $query->where('day_of_week', $request->day_of_week);
        }

        // បង្ហាញតែកាលវិភាគដែលកំពុងដំណើរការ ប្រសិនបើបានស្នើសុំ។
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('employee_id')
                ->orderBy('day_of_week')
                ->get(),
        ]);
    }

    /**
     * POST /api/work-schedules
     * បង្កើតកាលវិភាគការងារថ្មី។
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => [
                'required',
                'integer',
                Rule::exists('employees', 'employee_id'),
            ],
            'day_of_week' => 'required|integer|between:0,6',
            'shift_start' => 'required|date_format:H:i',
            'shift_end' => 'required|date_format:H:i',
            'is_active' => 'sometimes|boolean',
        ]);

        // ការពារការរក្សាទុកកាលវិភាគដដែលសម្រាប់បុគ្គលិក
        // នៅថ្ងៃដដែល និងម៉ោងដូចគ្នា។
        $duplicate = WorkSchedule::where(
            'employee_id',
            $validated['employee_id']
        )
            ->where('day_of_week', $validated['day_of_week'])
            ->where('shift_start', $validated['shift_start'])
            ->where('shift_end', $validated['shift_end'])
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => 'This work schedule already exists.',
            ], 422);
        }

        $schedule = WorkSchedule::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Work schedule created successfully.',
            'data' => $schedule->load('employee'),
        ], 201);
    }

    /**
     * GET /api/work-schedules/{id}
     * មើលព័ត៌មានកាលវិភាគមួយ។
     */
    public function show($id)
    {
        $schedule = WorkSchedule::with('employee')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $schedule,
        ]);
    }

    /**
     * PUT/PATCH /api/work-schedules/{id}
     * កែប្រែកាលវិភាគដែលមានស្រាប់។
     */
    public function update(Request $request, $id)
    {
        $schedule = WorkSchedule::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('employees', 'employee_id'),
            ],
            'day_of_week' => 'sometimes|required|integer|between:0,6',
            'shift_start' => 'sometimes|required|date_format:H:i',
            'shift_end' => 'sometimes|required|date_format:H:i',
            'is_active' => 'sometimes|boolean',
        ]);

        // ពិនិត្យតម្លៃថ្មីរួមជាមួយតម្លៃចាស់ មុនកែប្រែ។
        $employeeId = $validated['employee_id'] ?? $schedule->employee_id;
        $dayOfWeek = $validated['day_of_week'] ?? $schedule->day_of_week;
        $shiftStart = $validated['shift_start'] ?? $schedule->shift_start;
        $shiftEnd = $validated['shift_end'] ?? $schedule->shift_end;

        $duplicate = WorkSchedule::where('employee_id', $employeeId)
            ->where('day_of_week', $dayOfWeek)
            ->where('shift_start', $shiftStart)
            ->where('shift_end', $shiftEnd)
            ->where('schedule_id', '!=', $schedule->schedule_id)
            ->exists();

        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => 'This work schedule already exists.',
            ], 422);
        }

        $schedule->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Work schedule updated successfully.',
            'data' => $schedule->fresh()->load('employee'),
        ]);
    }

    /**
     * DELETE /api/work-schedules/{id}
     * លុបកាលវិភាគ។
     */
    public function destroy($id)
    {
        $schedule = WorkSchedule::findOrFail($id);
        $schedule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Work schedule deleted successfully.',
        ]);
    }
}