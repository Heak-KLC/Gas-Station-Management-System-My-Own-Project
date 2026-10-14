<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    /**
     * GET /api/employees
     * Retrieve employees and support search and filtering.
     */
    public function index(Request $request)
    {
        $query = Employee::query();

        // Search by employee code, name, email, or phone.
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter employees by role.
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        // Filter employees by active status.
        if ($request->filled('is_active')) {
            $query->where(
                'is_active',
                $request->boolean('is_active')
            );
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('employee_id', 'desc')->get(),
        ]);
    }

    /**
     * POST /api/employees
     * Create a new employee and record the audit log.
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

        // Generate an employee code if the frontend did not provide one.
        if (empty($validated['employee_code'])) {
            do {
                $nextId = (Employee::max('employee_id') ?? 0) + 1;

                $code = 'EMP' . str_pad(
                    (string) $nextId,
                    3,
                    '0',
                    STR_PAD_LEFT
                );

                // Check that the generated code is not already used.
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

        // Use today's date when hire_date is not provided.
        $validated['hire_date'] = $validated['hire_date']
            ?? now()->toDateString();

        // Create the employee and audit log in one transaction.
        $employee = DB::transaction(function () use (
            $request,
            $validated
        ) {
            $employee = Employee::create($validated);

            $this->recordAuditLog(
                $request,
                'CREATE',
                $employee->employee_id,
                null,
                $this->getEmployeeAuditValues($employee)
            );

            return $employee;
        });

        return response()->json([
            'success' => true,
            'message' => 'Employee created successfully.',
            'data' => $employee,
        ], 201);
    }

    /**
     * GET /api/employees/{employee}
     * Retrieve one employee with related records.
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
     * Update an employee and record the old and new values.
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

        // Capture the old values before changing the employee.
        $oldValues = $this->getEmployeeAuditValues($employee);

        // Update the employee and record the audit log atomically.
        $updatedEmployee = DB::transaction(function () use (
            $request,
            $employee,
            $validated,
            $oldValues
        ) {
            $employee->update($validated);
            $employee->refresh();

            $this->recordAuditLog(
                $request,
                'UPDATE',
                $employee->employee_id,
                $oldValues,
                $this->getEmployeeAuditValues($employee)
            );

            return $employee;
        });

        return response()->json([
            'success' => true,
            'message' => 'Employee updated successfully.',
            'data' => $updatedEmployee,
        ]);
    }

    /**
     * DELETE /api/employees/{employee}
     * Delete an employee and record the deletion.
     */
    public function destroy(Request $request, string $id)
    {
        $employee = Employee::findOrFail($id);

        // Save employee information before deleting the record.
        $oldValues = $this->getEmployeeAuditValues($employee);

        try {
            DB::transaction(function () use (
                $request,
                $employee,
                $oldValues
            ) {
                // Record the deletion before removing the employee.
                $this->recordAuditLog(
                    $request,
                    'DELETE',
                    $employee->employee_id,
                    $oldValues,
                    null
                );

                $employee->delete();
            });

            return response()->json([
                'success' => true,
                'message' => 'Employee deleted successfully.',
            ]);
        } catch (QueryException $e) {
            // Related records may prevent deletion through foreign keys.
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this employee because related records exist. Consider deactivating the employee instead.',
            ], 409);
        }
    }

    /**
     * Prepare employee fields for audit logging.
     * Avoid recording unrelated or sensitive information.
     */
    private function getEmployeeAuditValues(Employee $employee): array
    {
        return [
            'employee_code' => $employee->employee_code,
            'full_name' => $employee->full_name,
            'email' => $employee->email,
            'phone' => $employee->phone,
            'address' => $employee->address,
            'role' => $employee->role,
            'hire_date' => $employee->hire_date,
            'termination_date' => $employee->termination_date,
            'is_active' => $employee->is_active,
        ];
    }

    /**
     * Save an activity record to the audit_logs table.
     */
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        AuditLog::create([
            // Identify the authenticated user who performed the action.
            'user_id' => $request->user()?->user_id,

            'action' => $action,
            'entity_type' => 'Employee',
            'entity_id' => $entityId,

            // Store old and new values as JSON.
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

            // Store the IP address of the request.
            'ip_address' => $request->ip(),
        ]);
    }
}
