<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\FuelPurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FuelPurchaseOrderController extends Controller
{
    /**
     * =====================================================
     * GET ALL PURCHASE ORDERS
     * =====================================================
     * Load all purchase orders and their relationships.
     */
    public function index()
    {
        $purchaseOrders = FuelPurchaseOrder::with([
            'supplier',
            'fuelType',
            'createdBy',
            'approvedBy',
        ])
        ->orderBy('purchase_order_id', 'desc')
        ->get();

        return response()->json($purchaseOrders);
    }

    /**
     * =====================================================
     * CREATE PURCHASE ORDER
     * =====================================================
     * Create a new Purchase Order and record an audit log.
     */
    public function store(Request $request)
    {
        // Validate the data received from React.
        $validated = $request->validate([
            'po_number' => 'required|string|max:50|unique:fuel_purchase_orders,po_number',
            'supplier_id' => 'required|integer|exists:suppliers,supplier_id',
            'fuel_id' => 'required|integer|exists:fuel_types,fuel_id',
            'quantity' => 'required|numeric|min:0.001',
            'unit_price' => 'required|numeric|min:0',
            'order_date' => 'required|date',
            'delivery_date' => 'nullable|date|after_or_equal:order_date',
            'received_date' => 'nullable|date|after_or_equal:order_date',
            'status' => 'nullable|in:pending,ordered,delivered,received,cancelled',
            'approved_by' => 'nullable|integer|exists:users,user_id',
            'notes' => 'nullable|string',
        ]);

        // Use the authenticated user instead of trusting the frontend.
        $validated['created_by'] = $request->user()->user_id;

        // Set the default status when no status is provided.
        $validated['status'] = $validated['status'] ?? 'pending';

        // Calculate the total amount on the backend.
        $validated['total_amount'] =
            $validated['quantity'] * $validated['unit_price'];

        // Create the Purchase Order and audit log in one transaction.
        $purchaseOrder = DB::transaction(function () use (
            $request,
            $validated
        ) {
            // Save the new Purchase Order.
            $purchaseOrder = FuelPurchaseOrder::create($validated);

            // Record the creation in the audit_logs table.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $purchaseOrder->purchase_order_id,
                null,
                $this->getPurchaseOrderAuditValues($purchaseOrder)
            );

            return $purchaseOrder;
        });

        // Load relationships before returning the response.
        $purchaseOrder->load([
            'supplier',
            'fuelType',
            'createdBy',
            'approvedBy',
        ]);

        return response()->json([
            'message' => 'Purchase Order created successfully.',
            'purchase_order' => $purchaseOrder,
        ], 201);
    }

    /**
     * =====================================================
     * GET ONE PURCHASE ORDER
     * =====================================================
     * Display details of one Purchase Order.
     */
    public function show(FuelPurchaseOrder $fuelPurchaseOrder)
    {
        // Load related supplier, fuel type and users.
        $fuelPurchaseOrder->load([
            'supplier',
            'fuelType',
            'createdBy',
            'approvedBy',
        ]);

        return response()->json($fuelPurchaseOrder);
    }

    /**
     * =====================================================
     * UPDATE PURCHASE ORDER
     * =====================================================
     * Update a Purchase Order and record old/new values.
     */
    public function update(
        Request $request,
        FuelPurchaseOrder $fuelPurchaseOrder
    ) {
        // Validate the updated Purchase Order information.
        $validated = $request->validate([
            'po_number' => [
                'required',
                'string',
                'max:50',
                'unique:fuel_purchase_orders,po_number,' .
                    $fuelPurchaseOrder->purchase_order_id .
                    ',purchase_order_id',
            ],
            'supplier_id' => 'required|integer|exists:suppliers,supplier_id',
            'fuel_id' => 'required|integer|exists:fuel_types,fuel_id',
            'quantity' => 'required|numeric|min:0.001',
            'unit_price' => 'required|numeric|min:0',
            'order_date' => 'required|date',
            'delivery_date' => 'nullable|date|after_or_equal:order_date',
            'received_date' => 'nullable|date|after_or_equal:order_date',
            'status' => 'required|in:pending,ordered,delivered,received,cancelled',
            'approved_by' => 'nullable|integer|exists:users,user_id',
            'notes' => 'nullable|string',
        ]);

        // Recalculate the total amount using the updated values.
        $validated['total_amount'] =
            $validated['quantity'] * $validated['unit_price'];

        // Capture the original values before making any changes.
        $oldValues = $this->getPurchaseOrderAuditValues(
            $fuelPurchaseOrder
        );

        // Update the Purchase Order and record the audit log atomically.
        $fuelPurchaseOrder = DB::transaction(function () use (
            $request,
            $fuelPurchaseOrder,
            $validated,
            $oldValues
        ) {
            // Save the updated Purchase Order.
            $fuelPurchaseOrder->update($validated);

            // Refresh the model so the log contains the saved values.
            $fuelPurchaseOrder->refresh();

            // Record the old and new values in audit_logs.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $fuelPurchaseOrder->purchase_order_id,
                $oldValues,
                $this->getPurchaseOrderAuditValues($fuelPurchaseOrder)
            );

            return $fuelPurchaseOrder;
        });

        // Reload relationships for the React frontend.
        $fuelPurchaseOrder->load([
            'supplier',
            'fuelType',
            'createdBy',
            'approvedBy',
        ]);

        return response()->json([
            'message' => 'Purchase Order updated successfully.',
            'purchase_order' => $fuelPurchaseOrder,
        ]);
    }

    /**
     * =====================================================
     * DELETE PURCHASE ORDER
     * =====================================================
     * Prevent deletion when purchase history exists.
     */
    public function destroy(
        Request $request,
        FuelPurchaseOrder $fuelPurchaseOrder
    ) {
        // Preserve the existing rule that protects purchase history.
        if ($fuelPurchaseOrder->purchaseHistories()->exists()) {
            return response()->json([
                'message' =>
                    'This Purchase Order cannot be deleted because it has purchase history.',
            ], 409);
        }

        // Capture the Purchase Order details before deletion.
        $oldValues = $this->getPurchaseOrderAuditValues(
            $fuelPurchaseOrder
        );

        // Record the deletion and delete the order in one transaction.
        DB::transaction(function () use (
            $request,
            $fuelPurchaseOrder,
            $oldValues
        ) {
            // Record the old values before deleting the record.
            $this->recordAuditLog(
                $request,
                'DELETE',
                $fuelPurchaseOrder->purchase_order_id,
                $oldValues,
                null
            );

            // Delete the Purchase Order.
            $fuelPurchaseOrder->delete();
        });

        return response()->json([
            'message' => 'Purchase Order deleted successfully.',
        ]);
    }

    /**
     * =====================================================
     * GET PURCHASE ORDER AUDIT VALUES
     * =====================================================
     * Select the fields that should be stored in audit_logs.
     */
    private function getPurchaseOrderAuditValues(
        FuelPurchaseOrder $purchaseOrder
    ): array {
        return [
            'po_number' => $purchaseOrder->po_number,
            'supplier_id' => $purchaseOrder->supplier_id,
            'fuel_id' => $purchaseOrder->fuel_id,
            'quantity' => $purchaseOrder->quantity,
            'unit_price' => $purchaseOrder->unit_price,
            'total_amount' => $purchaseOrder->total_amount,
            'order_date' => $purchaseOrder->order_date,
            'delivery_date' => $purchaseOrder->delivery_date,
            'received_date' => $purchaseOrder->received_date,
            'status' => $purchaseOrder->status,
            'created_by' => $purchaseOrder->created_by,
            'approved_by' => $purchaseOrder->approved_by,
            'notes' => $purchaseOrder->notes,
        ];
    }

    /**
     * =====================================================
     * RECORD AUDIT LOG
     * =====================================================
     * Save the action, user, entity, old/new values and IP.
     */
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        AuditLog::create([
            // Identify the user who performed the action.
            'user_id' => $request->user()?->user_id,

            // Store the action, such as CREATE, UPDATE or DELETE.
            'action' => $action,

            // Identify the type and ID of the affected record.
            'entity_type' => 'FuelPurchaseOrder',
            'entity_id' => $entityId,

            // Convert old/new values into JSON for database storage.
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
