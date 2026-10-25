<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\FuelPurchaseOrder;
use App\Models\FuelTank;
use App\Models\TankRefill;
use App\Models\FuelType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TankRefillController extends Controller
{
    /**
     * GET /api/tank-refills
     * Get refill history with related information.
     */
    public function index()
    {
        $refills = TankRefill::with([
            'tank',
            'fuelType',
            'refilledBy',
            'purchaseOrder.supplier',
        ])
            ->orderByDesc('refill_date')
            ->get();

        return response()->json($refills);
    }

    /**
     * POST /api/tank-refills
     * Refill a tank and, when linked to a purchase order,
     * receive the order in the same database transaction.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'tank_id' => [
                'required',
                'integer',
                'exists:fuel_tanks,tank_id',
            ],
            'quantity' => [
                'required',
                'numeric',
                'min:0.001',
            ],
            'source' => 'nullable|string|max:50',
            'purchase_order_id' => [
                'nullable',
                'integer',
                'exists:fuel_purchase_orders,purchase_order_id',
            ],
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $quantity = (float) $validated['quantity'];

        $result = DB::transaction(function () use (
            $validated,
            $quantity,
            $user
        ) {
            /*
             * Lock the tank to prevent concurrent refills
             * from exceeding its capacity.
             */
            $tank = FuelTank::where(
                'tank_id',
                $validated['tank_id']
            )
                ->lockForUpdate()
                ->firstOrFail();

            // Only active tanks can receive fuel.
            if ($tank->status !== 'active') {
                throw ValidationException::withMessages([
                    'tank_id' =>
                        'The selected tank is not active.',
                ]);
            }

            $purchaseOrder = null;
            $oldOrderValues = null;

            /*
             * If this refill belongs to a Purchase Order,
             * lock and validate that order as well.
             */
            if (!empty($validated['purchase_order_id'])) {
                $purchaseOrder = FuelPurchaseOrder::where(
                    'purchase_order_id',
                    $validated['purchase_order_id']
                )
                    ->lockForUpdate()
                    ->firstOrFail();

                if (!in_array(
                    $purchaseOrder->status,
                    ['pending', 'ordered', 'delivered'],
                    true
                )) {
                    throw ValidationException::withMessages([
                        'purchase_order_id' =>
                            'This Purchase Order cannot be received because its status is ' .
                            $purchaseOrder->status . '.',
                    ]);
                }

                // Tank fuel must match the ordered fuel.
                if ((int) $tank->fuel_id !==
                    (int) $purchaseOrder->fuel_id) {
                    throw ValidationException::withMessages([
                        'tank_id' =>
                            'The selected tank uses a different fuel type from the Purchase Order.',
                    ]);
                }

                /*
                 * The current schema has no received_quantity
                 * column, so partial receipts cannot be tracked
                 * safely. Require the full ordered quantity.
                 */
                if (abs(
                    $quantity -
                    (float) $purchaseOrder->quantity
                ) > 0.0005) {
                    throw ValidationException::withMessages([
                        'quantity' =>
                            'The received quantity must equal the full Purchase Order quantity. Partial receipts are not supported by the current database schema.',
                    ]);
                }

                $oldOrderValues = [
                    'status' => $purchaseOrder->status,
                    'received_date' => $purchaseOrder->received_date,
                ];
            }

            $currentVolume = (float) $tank->current_volume;
            $capacity = (float) $tank->capacity;
            $newVolume = $currentVolume + $quantity;

            // Prevent the tank from exceeding its capacity.
            if ($newVolume > $capacity + 0.0005) {
                throw ValidationException::withMessages([
                    'quantity' =>
                        'Refill quantity exceeds the tank capacity. Available capacity: ' .
                        max(0, $capacity - $currentVolume),
                ]);
            }

            // Create the refill record.
            $refill = TankRefill::create([
                'tank_id' => $tank->tank_id,
                'fuel_id' => $tank->fuel_id,
                'quantity' => $quantity,
                'refill_date' => now(),
                'refilled_by' => $user->user_id,
                'source' => $validated['source'] ??
                    ($purchaseOrder ? 'Purchase Order' : null),
                'purchase_order_id' =>
                    $purchaseOrder?->purchase_order_id,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Update the tank volume.
            $tank->current_volume = $newVolume;
            $tank->save();


// Update the fuel stock used by POS.
$fuelType = FuelType::where(
    'fuel_id',
    $tank->fuel_id
)->lockForUpdate()->firstOrFail();

$fuelType->available_quantity =
    (float) $fuelType->available_quantity + $quantity;

$fuelType->save();

            /*
             * Receive the Purchase Order in this same
             * transaction, so both changes succeed or fail
             * together.
             */
            if ($purchaseOrder) {
                $purchaseOrder->status = 'received';
                $purchaseOrder->received_date = now()->toDateString();
                $purchaseOrder->save();

                AuditLog::create([
                    'user_id' => $user->user_id,
                    'action' => 'UPDATE',
                    'entity_type' => 'FuelPurchaseOrder',
                    'entity_id' =>
                        $purchaseOrder->purchase_order_id,
                    'old_value' => json_encode(
                        $oldOrderValues,
                        JSON_UNESCAPED_UNICODE |
                        JSON_UNESCAPED_SLASHES
                    ),
                    'new_value' => json_encode([
                        'status' => $purchaseOrder->status,
                        'received_date' =>
                            $purchaseOrder->received_date,
                    ], JSON_UNESCAPED_UNICODE |
                        JSON_UNESCAPED_SLASHES),
                    'ip_address' => request()->ip(),
                ]);
            }

            return [
                'refill' => $refill,
                'tank' => $tank,
                'purchase_order' => $purchaseOrder,
            ];
        });

        $result['refill']->load([
            'tank',
            'fuelType',
            'refilledBy',
            'purchaseOrder.supplier',
        ]);

        $result['tank']->load('fuelType');

        if ($result['purchase_order']) {
            $result['purchase_order']->load([
                'supplier',
                'fuelType',
                'createdBy',
                'approvedBy',
            ]);
        }

        return response()->json([
            'message' => $result['purchase_order']
                ? 'Fuel received and Purchase Order updated successfully.'
                : 'Tank refilled successfully.',
            'refill' => $result['refill'],
            'tank' => $result['tank'],
            'purchase_order' => $result['purchase_order'],
        ], 201);
    }
}
