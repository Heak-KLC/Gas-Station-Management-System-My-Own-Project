<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    /**
     * GET /api/employees
     * ទាញយកបញ្ជីបុគ្គលិក និងអាចស្វែងរកតាមឈ្មោះ ឬលេខកូដ។
     */
    public function index(Request $request)
    {
        $query = Employee::query();

        // ស្វែងរកតាម employee_code, full_name, email ឬ phone
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // អាចត្រងតាម role ឬស្ថានភាពសកម្ម
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('employee_id', 'desc')->get(),
        ]);
    }

    /**
     * POST /api/employees
     * បង្កើតបុគ្គលិកថ្មី។
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_code' => [
                'nullable',
                'string',
                'max:20',
                'unique:employees,employee_code',
            ],
            'full_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'role' => [
                'required',
                Rule::in([
                    'manager',
                    'cashier',
                    'fuel_attendant',
                    'store_staff',
                    'maintenance_tech',
                ]),
            ],
            'hire_date' => ['nullable', 'date'],
            'termination_date' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // បង្កើត employee_code ប្រសិនបើ Frontend មិនបានផ្ញើមក។
        // ឧទាហរណ៍ EMP001, EMP002...
        if (empty($validated['employee_code'])) {
            do {
                $nextId = (Employee::max('employee_id') ?? 0) + 1;
                $code = 'EMP' . str_pad(
                    (string) $nextId,
                    3,
                    '0',
                    STR_PAD_LEFT
                );

                // បើកូដមានរួច បន្តរកលេខបន្ទាប់។
                if (Employee::where('employee_code', $code)->exists()) {
                    $nextId++;
                    $code = 'EMP' . str_pad(
                        (string) $nextId,
                        3,
                        '0',
                        STR_PAD_LEFT
                    );
                }
            } while (Employee::where('employee_code', $code)->exists());

            $validated['employee_code'] = $code;
        }

        // បើមិនបានផ្ញើ hire_date មក ប្រើថ្ងៃបច្ចុប្បន្ន។
        $validated['hire_date'] = $validated['hire_date']
            ?? now()->toDateString();

        $employee = Employee::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Employee created successfully.',
            'data' => $employee,
        ], 201);
    }

    /**
     * GET /api/employees/{employee}
     * បង្ហាញព័ត៌មានបុគ្គលិកម្នាក់។
     */
    public function show(string $id)
    {
        $employee = Employee::with([
            'attendances',
            'salaryInfos',
            'workSchedules',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $employee,
        ]);
    }

    /**
     * PUT/PATCH /api/employees/{employee}
     * កែប្រែព័ត៌មានបុគ្គលិក។
     */
    public function update(Request $request, string $id)
    {
        $employee = Employee::findOrFail($id);

        $validated = $request->validate([
            'employee_code' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('employees', 'employee_code')
                    ->ignore($employee->employee_id, 'employee_id'),
            ],
            'full_name' => ['sometimes', 'required', 'string', 'max:100'],
            'email' => ['sometimes', 'nullable', 'email', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string'],
            'role' => [
                'sometimes',
                'required',
                Rule::in([
                    'manager',
                    'cashier',
                    'fuel_attendant',
                    'store_staff',
                    'maintenance_tech',
                ]),
            ],
            'hire_date' => ['sometimes', 'required', 'date'],
            'termination_date' => ['sometimes', 'nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $employee->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Employee updated successfully.',
            'data' => $employee->fresh(),
        ]);
    }

    /**
     * DELETE /api/employees/{employee}
     * លុបបុគ្គលិក។
     */
    public function destroy(string $id)
    {
        $employee = Employee::findOrFail($id);

        try {
            $employee->delete();

            return response()->json([
                'success' => true,
                'message' => 'Employee deleted successfully.',
            ]);
        } catch (QueryException $e) {
            // ករណីមានតារាងផ្សេងកំពុងយោងទៅបុគ្គលិកនេះ។
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this employee because related records exist. Consider deactivating the employee instead.',
            ], 409);
        }
    }
}