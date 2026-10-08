<?php

namespace App\Http\Controllers;

use App\Models\FuelPurchaseOrder;
use App\Models\Supplier;
use App\Models\FuelType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class FuelPurchaseOrderController extends Controller
{
    /**
     * =====================================================
     * GET ALL PURCHASE ORDERS
     * =====================================================
     * Load all purchase orders from the database.
     *
     * We also load:
     * - supplier
     * - fuel type
     * - user who created the PO
     * - user who approved the PO
     *
     * This allows the React frontend to display
     * complete Purchase Order information.
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
     * Create a new Purchase Order.
     *
     * The current logged-in user becomes created_by.
     */
    public function store(Request $request)
    {
        // Validate the data sent from React.
        $validated = $request->validate([
            'po_number' => 'required|string|max:50|unique:fuel_purchase_orders,po_number',

            'supplier_id' => 'required|integer|exists:suppliers,supplier_id',

            'fuel_id' => 'required|integer|exists:fuel_types,fuel_id',

            'quantity' => 'required|numeric|min:0.001',

            'unit_price' => 'required|numeric|min:0',

            // 'total_amount' => 'required|numeric|min:0',

            'order_date' => 'required|date',

            'delivery_date' => 'nullable|date|after_or_equal:order_date',

            'received_date' => 'nullable|date|after_or_equal:order_date',

            'status' => 'nullable|in:pending,ordered,delivered,received,cancelled',

            'approved_by' => 'nullable|integer|exists:users,user_id',

            'notes' => 'nullable|string',
        ]);

        /*
         * created_by must come from the logged-in user.
         *
         * We do NOT allow React to decide who created
         * the Purchase Order.
         */
        $validated['created_by'] = $request->user()->user_id;

        /*
         * If status is not provided,
         * MySQL will use "pending".
         *
         * Setting it here makes the API response predictable.
         */
        $validated['status'] = $validated['status'] ?? 'pending';

        /*
         * Make sure total_amount is calculated correctly.
         *
         * quantity × unit_price = total_amount
         *
         * We calculate it on the backend instead of trusting
         * the value sent by the frontend.
         */
        $validated['total_amount'] =
            $validated['quantity'] * $validated['unit_price'];

        // Create the Purchase Order.
        $purchaseOrder = FuelPurchaseOrder::create($validated);

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
     * Update an existing Purchase Order.
     */
    public function update(
        Request $request,
        FuelPurchaseOrder $fuelPurchaseOrder
    ) {
        // Validate updated Purchase Order information.
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

        /*
         * Recalculate total amount when quantity
         * or unit price changes.
         */
        $validated['total_amount'] =
            $validated['quantity'] * $validated['unit_price'];

        // Update the Purchase Order.
        $fuelPurchaseOrder->update($validated);

        // Reload relationships.
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
     * Delete a Purchase Order.
     *
     * We prevent deletion if it already has
     * Purchase History records.
     */
    public function destroy(FuelPurchaseOrder $fuelPurchaseOrder)
    {
        /*
         * Check whether this Purchase Order already has
         * related purchase history.
         *
         * We should not delete an order that is already
         * connected to delivery/receiving records.
         */
        if ($fuelPurchaseOrder->purchaseHistories()->exists()) {
            return response()->json([
                'message' =>
                    'This Purchase Order cannot be deleted because it has purchase history.',
            ], 409);
        }

        // Delete the Purchase Order.
        $fuelPurchaseOrder->delete();

        return response()->json([
            'message' => 'Purchase Order deleted successfully.',
        ]);
    }
}