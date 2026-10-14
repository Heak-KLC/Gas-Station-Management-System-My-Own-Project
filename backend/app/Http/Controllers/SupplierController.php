<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    /**
     * Display a list of all suppliers.
     */
    public function index()
    {
        $suppliers = Supplier::orderBy('supplier_id', 'desc')->get();

        return response()->json($suppliers);
    }

    /**
     * Store a newly created supplier and record the audit log.
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

        // Create the supplier and audit log in one transaction.
        $supplier = DB::transaction(function () use (
            $request,
            $validated
        ) {
            $supplier = Supplier::create($validated);

            // Record the new supplier information.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $supplier->supplier_id,
                null,
                $this->getSupplierAuditValues($supplier)
            );

            return $supplier;
        });

        return response()->json([
            'message' => 'Supplier created successfully.',
            'supplier' => $supplier,
        ], 201);
    }

    /**
     * Display one specific supplier.
     */
    public function show(Supplier $supplier)
    {
        return response()->json($supplier);
    }

    /**
     * Update an existing supplier and record the changes.
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

        // Capture the old values before updating the supplier.
        $oldValues = $this->getSupplierAuditValues($supplier);

        // Update the supplier and audit log atomically.
        $updatedSupplier = DB::transaction(function () use (
            $request,
            $supplier,
            $validated,
            $oldValues
        ) {
            $supplier->update($validated);
            $supplier->refresh();

            // Save the old and new supplier information.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $supplier->supplier_id,
                $oldValues,
                $this->getSupplierAuditValues($supplier)
            );

            return $supplier;
        });

        return response()->json([
            'message' => 'Supplier updated successfully.',
            'supplier' => $updatedSupplier,
        ]);
    }

    /**
     * Remove a supplier and record the deletion.
     */
    public function destroy(Request $request, Supplier $supplier)
    {
        // Preserve the existing rule that protects suppliers
        // associated with purchase orders.
        if ($supplier->purchaseOrders()->exists()) {
            return response()->json([
                'message' => 'This supplier cannot be deleted because it has purchase orders.',
            ], 409);
        }

        // Capture supplier information before deleting it.
        $oldValues = $this->getSupplierAuditValues($supplier);

        // Delete the supplier and save its audit log together.
        DB::transaction(function () use (
            $request,
            $supplier,
            $oldValues
        ) {
            $this->recordAuditLog(
                $request,
                'DELETE',
                $supplier->supplier_id,
                $oldValues,
                null
            );

            $supplier->delete();
        });

        return response()->json([
            'message' => 'Supplier deleted successfully.',
        ]);
    }

    /**
     * Prepare supplier fields for audit logging.
     * Store the important supplier information before and after changes.
     */
    private function getSupplierAuditValues(Supplier $supplier): array
    {
        return [
            'supplier_name' => $supplier->supplier_name,
            'contact_person' => $supplier->contact_person,
            'phone' => $supplier->phone,
            'email' => $supplier->email,
            'address' => $supplier->address,
            'tax_id' => $supplier->tax_id,
            'payment_terms' => $supplier->payment_terms,
            'is_active' => $supplier->is_active,
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
            'entity_type' => 'Supplier',
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
