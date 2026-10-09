<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
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

            $query->where('is_active', $request->boolean('is_active'));
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
     * Register a new customer.
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
                Rule::in(['none', 'bronze', 'silver', 'gold', 'platinum']),
            ],
        ]);

        // Generate a unique customer code automatically.
        do {
            $customerCode = 'CUS-' . Str::upper(Str::random(8));
        } while (
            Customer::where('customer_code', $customerCode)->exists()
        );

        // New customers start with zero points and purchases.
        $customer = Customer::create([
            'customer_code' => $customerCode,
            'full_name' => $validated['full_name'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'],
            'address' => $validated['address'] ?? null,
            'loyalty_membership' => $validated['loyalty_membership'] ?? 'none',
            'loyalty_points' => 0,
            'total_purchases' => 0,
            'is_active' => true,
        ]);

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
            'full_name' => ['sometimes', 'required', 'string', 'max:100'],
            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:100',
                Rule::unique('customers', 'email')
                    ->ignore($customer->customer_id, 'customer_id'),
            ],
            'phone' => ['sometimes', 'required', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string'],
            'loyalty_membership' => [
                'sometimes',
                'nullable',
                Rule::in(['none', 'bronze', 'silver', 'gold', 'platinum']),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Do not accept loyalty points or total purchases directly here.
        $customer->update($validated);

        return response()->json([
            'message' => 'Customer updated successfully.',
            'data' => $customer->fresh(),
        ]);
    }

    /**
     * DELETE /api/customers/{customer}
     *
     * Deactivate instead of permanently deleting a customer,
     * so existing sales history can be preserved.
     */
    public function destroy(Customer $customer)
    {
        $customer->update([
            'is_active' => false,
        ]);

        return response()->json([
            'message' => 'Customer deactivated successfully.',
            'data' => $customer->fresh(),
        ]);
    }
}