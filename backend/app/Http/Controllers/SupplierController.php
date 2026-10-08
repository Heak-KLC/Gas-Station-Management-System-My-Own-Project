<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * Display a list of all suppliers.
     *
     * This is used by the Admin Supplier Management page
     * to load supplier data from the database.
     */
    public function index()
    {
        $suppliers = Supplier::orderBy('supplier_id', 'desc')->get();

        return response()->json($suppliers);
    }

    /**
     * Store a newly created supplier.
     *
     * This is used when Admin creates a new supplier.
     */
    public function store(Request $request)
    {
        // Validate the supplier information before saving.
        $validated = $request->validate([
            'supplier_name' => 'required|string|max:100',
            'contact_person' => 'nullable|string|max:100',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'tax_id' => 'nullable|string|max:50',
            'payment_terms' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        // Create the supplier using the validated data.
        $supplier = Supplier::create($validated);

        return response()->json([
            'message' => 'Supplier created successfully.',
            'supplier' => $supplier,
        ], 201);
    }

    /**
     * Display one specific supplier.
     *
     * This can be used when Admin wants to view
     * detailed information about a supplier.
     */
    public function show(Supplier $supplier)
    {
        return response()->json($supplier);
    }

    /**
     * Update an existing supplier.
     *
     * This is used when Admin edits supplier information.
     */
    public function update(Request $request, Supplier $supplier)
    {
        // Validate the updated supplier information.
        $validated = $request->validate([
            'supplier_name' => 'required|string|max:100',
            'contact_person' => 'nullable|string|max:100',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string',
            'tax_id' => 'nullable|string|max:50',
            'payment_terms' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        // Update the supplier.
        $supplier->update($validated);

        return response()->json([
            'message' => 'Supplier updated successfully.',
            'supplier' => $supplier->fresh(),
        ]);
    }

    /**
     * Remove a supplier.
     *
     * Before using this method in production,
     * we should check whether the supplier is already
     * connected to purchase orders.
     */
    public function destroy(Supplier $supplier)
    {
        // Prevent deleting a supplier that already has purchase orders.
        if ($supplier->purchaseOrders()->exists()) {
            return response()->json([
                'message' => 'This supplier cannot be deleted because it has purchase orders.',
            ], 409);
        }

        $supplier->delete();

        return response()->json([
            'message' => 'Supplier deleted successfully.',
        ]);
    }
}