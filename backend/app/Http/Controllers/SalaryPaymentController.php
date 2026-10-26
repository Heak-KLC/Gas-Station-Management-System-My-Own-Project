<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\SalaryInfo;
use App\Models\SalaryPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SalaryPaymentController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        $user = $request->user();

        abort_unless(
            $user &&
            strtolower(trim((string) $user->role)) === 'admin',
            403,
            'Only Admin can manage salary records.'
        );
    }

    private function calculateNetSalary(array $data): string
    {
        $net =
            (float) ($data['basic_salary'] ?? 0) +
            (float) ($data['allowance'] ?? 0) +
            (float) ($data['bonus'] ?? 0) -
            (float) ($data['tax_deduction'] ?? 0) -
            (float) ($data['other_deductions'] ?? 0);

        if ($net < 0) {
            throw ValidationException::withMessages([
                'other_deductions' =>
                    'Total deductions cannot exceed total earnings.',
            ]);
        }

        return number_format($net, 2, '.', '');
    }

    public function index(Request $request)
    {
        $this->authorizeAdmin($request);

        $query = SalaryPayment::with([
            'employee:employee_id,employee_code,full_name,role',
            'salaryInfo:salary_id,employee_id,effective_date',
            'creator:user_id,username,full_name',
            'approver:user_id,username,full_name',
        ]);

        if ($request->filled('month')) {
            $query->where(
                'salary_month',
                $request->integer('month')
            );
        }

        if ($request->filled('year')) {
            $query->where(
                'salary_year',
                $request->integer('year')
            );
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('employee_id')) {
            $query->where(
                'employee_id',
                $request->integer('employee_id')
            );
        }

        return response()->json(
            $query
                ->orderByDesc('salary_year')
                ->orderByDesc('salary_month')
                ->orderByDesc('salary_payment_id')
                ->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'employee_id' => [
                'required',
                'integer',
                'exists:employees,employee_id',
            ],
            'salary_id' => [
                'nullable',
                'integer',
                'exists:salary_info,salary_id',
            ],
            'salary_month' => [
                'required',
                'integer',
                'between:1,12',
            ],
            'salary_year' => [
                'required',
                'integer',
                'between:2000,2100',
            ],
            'basic_salary' => [
                'sometimes',
                'numeric',
                'min:0',
            ],
            'allowance' => [
                'sometimes',
                'numeric',
                'min:0',
            ],
            'bonus' => [
                'sometimes',
                'numeric',
                'min:0',
            ],
            'tax_deduction' => [
                'sometimes',
                'numeric',
                'min:0',
            ],
            'other_deductions' => [
                'sometimes',
                'numeric',
                'min:0',
            ],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $employee = Employee::findOrFail($data['employee_id']);

        if (!$employee->is_active) {
            throw ValidationException::withMessages([
                'employee_id' =>
                    'Cannot create salary for an inactive employee.',
            ]);
        }

        $periodStart = sprintf(
            '%04d-%02d-01',
            $data['salary_year'],
            $data['salary_month']
        );

        return DB::transaction(function () use (
            $request,
            $data,
            $periodStart
        ) {
            $salaryInfo = null;

            if (!empty($data['salary_id'])) {
                $salaryInfo = SalaryInfo::where(
                    'salary_id',
                    $data['salary_id']
                )
                    ->where('employee_id', $data['employee_id'])
                    ->where('effective_date', '<=', $periodStart)
                    ->first();

                if (!$salaryInfo) {
                    throw ValidationException::withMessages([
                        'salary_id' =>
                            'The selected salary information does not belong to this employee or is not effective for this month.',
                    ]);
                }
            } else {
                $salaryInfo = SalaryInfo::where(
                    'employee_id',
                    $data['employee_id']
                )
                    ->where('effective_date', '<=', $periodStart)
                    ->orderByDesc('effective_date')
                    ->orderByDesc('salary_id')
                    ->first();
            }

            $amounts = [
                'basic_salary' => $data['basic_salary']
                    ?? $salaryInfo?->basic_salary
                    ?? 0,
                'allowance' => $data['allowance']
                    ?? $salaryInfo?->allowance
                    ?? 0,
                'bonus' => $data['bonus']
                    ?? $salaryInfo?->bonus
                    ?? 0,
                'tax_deduction' => $data['tax_deduction']
                    ?? $salaryInfo?->tax_deduction
                    ?? 0,
                'other_deductions' => $data['other_deductions']
                    ?? $salaryInfo?->other_deductions
                    ?? 0,
            ];

            $duplicate = SalaryPayment::where(
                'employee_id',
                $data['employee_id']
            )
                ->where('salary_month', $data['salary_month'])
                ->where('salary_year', $data['salary_year'])
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'employee_id' =>
                        'A salary record already exists for this employee and month.',
                ]);
            }

            $salary = SalaryPayment::create([
                'employee_id' => $data['employee_id'],
                'salary_id' => $salaryInfo?->salary_id,
                'salary_month' => $data['salary_month'],
                'salary_year' => $data['salary_year'],
                ...$amounts,
                'net_salary' => $this->calculateNetSalary($amounts),
                'status' => 'Pending',
                'created_by' => $request->user()->user_id,
                'notes' => $data['notes'] ?? null,
            ]);

            return response()->json([
                'message' => 'Salary record created successfully.',
                'data' => $salary->load('employee'),
            ], 201);
        });
    }

    public function show(Request $request, int $salaryPaymentId)
    {
        $this->authorizeAdmin($request);

        $salary = SalaryPayment::with([
            'employee',
            'salaryInfo',
            'creator',
            'approver',
        ])->findOrFail($salaryPaymentId);

        return response()->json(['data' => $salary]);
    }

    public function update(
        Request $request,
        int $salaryPaymentId
    ) {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'basic_salary' => ['sometimes', 'numeric', 'min:0'],
            'allowance' => ['sometimes', 'numeric', 'min:0'],
            'bonus' => ['sometimes', 'numeric', 'min:0'],
            'tax_deduction' => ['sometimes', 'numeric', 'min:0'],
            'other_deductions' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        return DB::transaction(function () use (
            $salaryPaymentId,
            $data
        ) {
            $salary = SalaryPayment::where(
                'salary_payment_id',
                $salaryPaymentId
            )->lockForUpdate()->firstOrFail();

            if (!in_array($salary->status, ['Pending', 'Rejected'], true)) {
                throw ValidationException::withMessages([
                    'status' =>
                        'Only Pending or Rejected salary records can be edited.',
                ]);
            }

            $amounts = [
                'basic_salary' => $data['basic_salary']
                    ?? $salary->basic_salary,
                'allowance' => $data['allowance']
                    ?? $salary->allowance,
                'bonus' => $data['bonus']
                    ?? $salary->bonus,
                'tax_deduction' => $data['tax_deduction']
                    ?? $salary->tax_deduction,
                'other_deductions' => $data['other_deductions']
                    ?? $salary->other_deductions,
            ];

            $salary->fill($amounts);
            $salary->net_salary = $this->calculateNetSalary($amounts);

            if (array_key_exists('notes', $data)) {
                $salary->notes = $data['notes'];
            }

            if ($salary->status === 'Rejected') {
                $salary->status = 'Pending';
                $salary->approved_by = null;
                $salary->approved_at = null;
            }

            $salary->save();

            return response()->json([
                'message' => 'Salary record updated successfully.',
                'data' => $salary->fresh()->load('employee'),
            ]);
        });
    }

    public function approve(Request $request, int $salaryPaymentId)
    {
        $this->authorizeAdmin($request);

        return DB::transaction(function () use (
            $request,
            $salaryPaymentId
        ) {
            $salary = SalaryPayment::where(
                'salary_payment_id',
                $salaryPaymentId
            )->lockForUpdate()->firstOrFail();

            if ($salary->status !== 'Pending') {
                throw ValidationException::withMessages([
                    'status' =>
                        'Only Pending salary records can be approved.',
                ]);
            }

            $salary->status = 'Approved';
            $salary->approved_by = $request->user()->user_id;
            $salary->approved_at = now();
            $salary->save();

            return response()->json([
                'message' => 'Salary approved successfully.',
                'data' => $salary->fresh()->load('employee', 'approver'),
            ]);
        });
    }

    public function reject(Request $request, int $salaryPaymentId)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'notes' => ['required', 'string', 'max:5000'],
        ]);

        $salary = SalaryPayment::where(
            'salary_payment_id',
            $salaryPaymentId
        )->firstOrFail();

        if ($salary->status !== 'Pending') {
            throw ValidationException::withMessages([
                'status' =>
                    'Only Pending salary records can be rejected.',
            ]);
        }

        $salary->status = 'Rejected';
        $salary->notes = $data['notes'];
        $salary->save();

        return response()->json([
            'message' => 'Salary record rejected.',
            'data' => $salary->fresh()->load('employee'),
        ]);
    }

    public function markPaid(Request $request, int $salaryPaymentId)
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'payment_date' => ['required', 'date'],
            'payment_method' => [
                'required',
                Rule::in(['Cash', 'ABA', 'Wing', 'Bank Transfer']),
            ],
            'payment_reference' => [
                'nullable',
                'string',
                'max:100',
            ],
        ]);

        return DB::transaction(function () use (
            $salaryPaymentId,
            $data
        ) {
            $salary = SalaryPayment::where(
                'salary_payment_id',
                $salaryPaymentId
            )->lockForUpdate()->firstOrFail();

            if ($salary->status !== 'Approved') {
                throw ValidationException::withMessages([
                    'status' =>
                        'Only Approved salary records can be marked as Paid.',
                ]);
            }

            $salary->status = 'Paid';
            $salary->payment_date = $data['payment_date'];
            $salary->payment_method = $data['payment_method'];
            $salary->payment_reference =
                $data['payment_reference'] ?? null;

            $salary->save();

            return response()->json([
                'message' => 'Salary payment recorded successfully.',
                'data' => $salary->fresh()->load('employee'),
            ]);
        });
    }
}
