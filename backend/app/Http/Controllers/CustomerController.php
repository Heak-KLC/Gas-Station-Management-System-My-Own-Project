<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    /**
     * GET /api/customers
     *
     * Retrieve customers and optionally filter by:
     * search, loyalty_membership, and is_active.
     */
    public function index(Request $request)
    {
        $query = Customer::query();

        // Search by customer name, phone, email, or customer code.
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('customer_code', 'like', "%{$search}%");
            });
        }

        // Filter by loyalty membership.
        if ($request->filled('loyalty_membership')) {
            $query->where(
                'loyalty_membership',
                strtolower($request->loyalty_membership)
            );
        }

        // Filter active or inactive customers.
        if ($request->has('is_active') && $request->is_active !== '') {
            $request->validate([
                'is_active' => ['required', 'boolean'],
            ]);

            $query->where(
                'is_active',
                $request->boolean('is_active')
            );
        }

        $customers = $query
            ->orderByDesc('customer_id')
            ->get();

        return response()->json([
            'message' => 'Customers retrieved successfully.',
            'data' => $customers,
        ]);
    }

    /**
     * POST /api/customers
     *
     * Register a new customer and record the activity.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],

            'email' => [
                'nullable',
                'email',
                'max:100',
                'unique:customers,email',
            ],

            'phone' => ['required', 'string', 'max:20'],

            'address' => ['nullable', 'string'],

            'loyalty_membership' => [
                'nullable',
                Rule::in([
                    'none',
                    'bronze',
                    'silver',
                    'gold',
                    'platinum',
                ]),
            ],
        ]);

        // Generate a unique customer code automatically.
        do {
            $customerCode = 'CUS-' . Str::upper(Str::random(8));
        } while (
            Customer::where('customer_code', $customerCode)->exists()
        );

        // Create the customer and audit log in one transaction.
        $customer = DB::transaction(function () use (
            $request,
            $validated,
            $customerCode
        ) {
            // New customers start with zero points and purchases.
            $customer = Customer::create([
                'customer_code' => $customerCode,
                'full_name' => $validated['full_name'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'],
                'address' => $validated['address'] ?? null,
                'loyalty_membership' =>
                    $validated['loyalty_membership'] ?? 'none',
                'loyalty_points' => 0,
                'total_purchases' => 0,
                'is_active' => true,
            ]);

            // Record customer creation in audit_logs.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $customer->customer_id,
                null,
                $this->getCustomerAuditValues($customer)
            );

            return $customer;
        });

        return response()->json([
            'message' => 'Customer registered successfully.',
            'data' => $customer->fresh(),
        ], 201);
    }

    /**
     * GET /api/customers/{customer}
     *
     * Retrieve one customer.
     */
    public function show(Customer $customer)
    {
        return response()->json([
            'data' => $customer,
        ]);
    }

    /**
     * PUT/PATCH /api/customers/{customer}
     *
     * Update customer contact details and membership.
     */
    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'full_name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:100',
                Rule::unique('customers', 'email')
                    ->ignore($customer->customer_id, 'customer_id'),
            ],

            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:20',
            ],

            'address' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'loyalty_membership' => [
                'sometimes',
                'nullable',
                Rule::in([
                    'none',
                    'bronze',
                    'silver',
                    'gold',
                    'platinum',
                ]),
            ],

            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Keep the original customer values before updating.
        $oldValues = $this->getCustomerAuditValues($customer);

        // Update the customer and save the audit record together.
        $updatedCustomer = DB::transaction(function () use (
            $request,
            $customer,
            $validated,
            $oldValues
        ) {
            // Do not accept loyalty points or total purchases directly.
            $customer->update($validated);

            // Reload the latest customer data.
            $customer->refresh();

            // Record the before-and-after values.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $customer->customer_id,
                $oldValues,
                $this->getCustomerAuditValues($customer)
            );

            return $customer;
        });

        return response()->json([
            'message' => 'Customer updated successfully.',
            'data' => $updatedCustomer->fresh(),
        ]);
    }

    /**
     * DELETE /api/customers/{customer}
     *
     * Deactivate the customer instead of permanently deleting it.
     * This preserves existing sales history.
     */
    public function destroy(Request $request, Customer $customer)
    {
        // Keep the old values before deactivation.
        $oldValues = $this->getCustomerAuditValues($customer);

        // Deactivate the customer and record the activity together.
        $deactivatedCustomer = DB::transaction(function () use (
            $request,
            $customer,
            $oldValues
        ) {
            // Mark the customer as inactive.
            $customer->update([
                'is_active' => false,
            ]);

            // Reload the customer after the update.
            $customer->refresh();

            // Record deactivation rather than DELETE because
            // the customer record remains in the database.
            $this->recordAuditLog(
                $request,
                'DEACTIVATE',
                $customer->customer_id,
                $oldValues,
                $this->getCustomerAuditValues($customer)
            );

            return $customer;
        });

        return response()->json([
            'message' => 'Customer deactivated successfully.',
            'data' => $deactivatedCustomer->fresh(),
        ]);
    }

    // =========================================================
    // HELPER: GET CUSTOMER VALUES FOR AUDIT LOGS
    // =========================================================
    private function getCustomerAuditValues(
        Customer $customer
    ): array {
        // Capture the relevant customer information.
        return $customer->only([
            'customer_code',
            'full_name',
            'email',
            'phone',
            'address',
            'loyalty_membership',
            'loyalty_points',
            'total_purchases',
            'is_active',
        ]);
    }

    // =========================================================
    // HELPER: RECORD CUSTOMER ACTIVITY
    // =========================================================
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        // Store the activity and before/after values in audit_logs.
        AuditLog::create([
            'user_id' => $request->user()?->user_id,
            'action' => $action,
            'entity_type' => 'Customer',
            'entity_id' => $entityId,

            'old_value' => $oldValues === null
                ? null
                : json_encode(
                    $oldValues,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                ),

            'new_value' => $newValues === null
                ? null
                : json_encode(
                    $newValues,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                ),

            'ip_address' => $request->ip(),
        ]);
    }
}
