<?php

namespace App\Http\Controllers;

use App\Models\FuelSale;
use App\Models\Refund; // Added to retrieve refund status.
use Illuminate\Http\Request;
use App\Models\FuelType;
use App\Models\FuelPump;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use App\Models\Shift;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\FuelTank;

class FuelSaleController extends Controller
{
    /**
     * Display Fuel Sales History.
     *
     * Returns fuel sales with their related customer, pump,
     * fuel type, seller and latest refund status.
     */
    public function index(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | Load Fuel Sales + Relationships
        |--------------------------------------------------------------------------
        */
        $query = FuelSale::with([
    'customer',
    'pump',
    'fuelType',
    'seller',
]);

        /*
        |--------------------------------------------------------------------------
        | Add Latest Refund Status
        |--------------------------------------------------------------------------
        | This adds a refund_status field to each sale.
        | It does not delete or modify any sale records.
        |
        | Possible values:
        | pending, approved, rejected, or null (no refund request).
        |--------------------------------------------------------------------------
        */
        $query->addSelect([
            'refund_status' => Refund::select('status')
                ->whereColumn(
                    'refunds.original_sale_id',
                    'fuel_sales.sale_id'
                )
                ->orderByDesc('refund_id')
                ->limit(1),
        ]);

        /*
        |--------------------------------------------------------------------------
        | Search by Sale Number or Receipt Number
        |--------------------------------------------------------------------------
        */
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where(
                    'sale_number',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'receipt_number',
                    'like',
                    "%{$search}%"
                );
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Payment Status Filter
        |--------------------------------------------------------------------------
        */
        if ($request->filled('payment_status')) {
            $query->where(
                'payment_status',
                $request->payment_status
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Payment Method Filter
        |--------------------------------------------------------------------------
        */
        if ($request->filled('payment_method')) {
            $query->where(
                'payment_method',
                $request->payment_method
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Pump Filter
        |--------------------------------------------------------------------------
        */
        if ($request->filled('pump_id')) {
            $query->where(
                'pump_id',
                $request->pump_id
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Seller Filter
        |--------------------------------------------------------------------------
        */
        if ($request->filled('sold_by')) {
            $query->where(
                'sold_by',
                $request->sold_by
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Date Filter
        |--------------------------------------------------------------------------
        */
        if ($request->filled('date')) {
            $query->whereDate(
                'sale_date',
                $request->date
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Return Latest Sales First
        |--------------------------------------------------------------------------
        | Existing pagination is preserved.
        |--------------------------------------------------------------------------
        */
        $sales = $query
            ->orderBy('sale_date', 'desc')
            ->orderBy('sale_id', 'desc')
            ->paginate(15);

        /*
        |--------------------------------------------------------------------------
        | Return JSON Response
        |--------------------------------------------------------------------------
        */
        return response()->json($sales);
    }

    /**
     * Display one Fuel Sale.
     */
    public function show(FuelSale $fuelSale)
    {
        /*
        |--------------------------------------------------------------------------
        | Load Relationships
        |--------------------------------------------------------------------------
        */
        $fuelSale->load([
            'customer',
            'pump',
            'fuelType',
            'soldBy',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Attach Latest Refund Status
        |--------------------------------------------------------------------------
        | Keep the original sale record intact.
        |--------------------------------------------------------------------------
        */
        $fuelSale->setAttribute(
            'refund_status',
            Refund::where(
                'original_sale_id',
                $fuelSale->sale_id
            )
                ->orderByDesc('refund_id')
                ->value('status')
        );

        return response()->json([
            'data' => $fuelSale,
        ]);
    }

    
public function store(Request $request)
{
    $validated = $request->validate([
        'items' => ['required', 'array', 'min:1'],
        'items.*.fuel_id' => [
            'required',
            'integer',
            'exists:fuel_types,fuel_id',
        ],
        'items.*.pump_id' => [
            'required',
            'integer',
            'exists:fuel_pumps,pump_id',
        ],
        'items.*.quantity' => [
            'required',
            'numeric',
            'gt:0',
            'max:999999999999.999',
        ],
        'payment_method' => [
            'required',
            'in:cash,credit_card,debit_card,bank_transfer,qr_payment',
        ],
        'customer_id' => [
            'nullable',
            'integer',
            'exists:customers,customer_id',
        ],
    ]);

    $user = $request->user();

    if (!$user || !$user->user_id) {
        return response()->json([
            'message' => 'Authentication required.',
        ], 401);
    }

    // Only Cashier and Fuel Attendant can sell fuel.
    $role = strtolower(trim((string) $user->role));

    $allowedRoles = [
        'cashier',
        'fuel attendant',
        'fuel_attendant',
        'fuel-attendant',
    ];

    if (!in_array($role, $allowedRoles, true)) {
        return response()->json([
            'message' =>
                'Only Cashier or Fuel Attendant can sell fuel.',
        ], 403);
    }

    $sales = DB::transaction(function () use ($validated, $user) {

        // Find and lock the active shift.
        $shift = Shift::where('user_id', $user->user_id)
            ->where('status', 'active')
            ->latest('shift_id')
            ->lockForUpdate()
            ->first();

        if (!$shift) {
            throw ValidationException::withMessages([
                'shift' => [
                    'Please start the shift before selling fuel.',
                ],
            ]);
        }

        $createdSales = [];
        $totalSpentForPoints = 0;

        foreach ($validated['items'] as $item) {

            // Lock the pump first.
            $pump = FuelPump::where(
                'pump_id',
                $item['pump_id']
            )
                ->lockForUpdate()
                ->firstOrFail();

            if (!in_array(
                $pump->status,
                ['available', 'in_use'],
                true
            )) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Pump {$pump->pump_number} is not available for sales.",
                    ],
                ]);
            }

            // A pump must be assigned to a tank.
            if (empty($pump->tank_id)) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Pump {$pump->pump_number} has no assigned tank.",
                    ],
                ]);
            }

            // Lock the selected tank.
            $tank = FuelTank::where(
                'tank_id',
                $pump->tank_id
            )
                ->lockForUpdate()
                ->firstOrFail();

            // Lock the fuel type.
            $fuel = FuelType::where(
                'fuel_id',
                $item['fuel_id']
            )
                ->lockForUpdate()
                ->firstOrFail();

            // The selected fuel must match the pump.
            if ((int) $pump->fuel_id !== (int) $fuel->fuel_id) {
                throw ValidationException::withMessages([
                    'items' => [
                        'The selected pump does not match the fuel type.',
                    ],
                ]);
            }

            // The pump's assigned tank must contain that fuel type.
            if ((int) $tank->fuel_id !== (int) $pump->fuel_id) {
                throw ValidationException::withMessages([
                    'items' => [
                        "The fuel type in tank {$tank->tank_number} "
                        . 'does not match the selected pump.',
                    ],
                ]);
            }

            // Only active tanks can supply fuel.
            if ($tank->status !== 'active') {
                throw ValidationException::withMessages([
                    'items' => [
                        "Tank {$tank->tank_number} is not active.",
                    ],
                ]);
            }

            if ($fuel->status !== 'available') {
                throw ValidationException::withMessages([
                    'items' => [
                        'The selected fuel type is not available.',
                    ],
                ]);
            }

            $quantity = round((float) $item['quantity'], 3);

            $tankStock = (float) $tank->current_volume;
            $fuelStock = (float) $fuel->available_quantity;

            // Check the actual stock in the assigned tank.
            if ($quantity <= 0 || $quantity > $tankStock) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Insufficient stock in tank {$tank->tank_number}.",
                    ],
                ]);
            }

            // Also preserve the existing fuel-type stock check.
            if ($quantity > $fuelStock) {
                throw ValidationException::withMessages([
                    'items' => [
                        'Insufficient fuel-type stock.',
                    ],
                ]);
            }

            $unitPrice = (float) $fuel->selling_price;
            $subtotal = round($quantity * $unitPrice, 2);

            // Create the sale inside the same transaction.
            $sale = FuelSale::create([
                'sale_number' =>
                    'FUEL-' . Str::upper(Str::random(16)),

                'customer_id' =>
                    $validated['customer_id'] ?? null,

                'pump_id' => $pump->pump_id,
                'fuel_id' => $fuel->fuel_id,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'subtotal' => $subtotal,
                'tax' => 0,
                'discount' => 0,
                'total_amount' => $subtotal,
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'paid',
                'sold_by' => $user->user_id,
                'shift_id' => $shift->shift_id,
                'sale_date' => now(),

                'receipt_number' =>
                    'RCT-' . Str::upper(Str::random(16)),
            ]);

            // Deduct the sold quantity from the assigned tank.
            $tank->current_volume = round(
                $tankStock - $quantity,
                3
            );
            $tank->save();

            // Deduct the same quantity from the fuel-type stock.
            $fuel->available_quantity = round(
                $fuelStock - $quantity,
                3
            );
            $fuel->save();

            $createdSales[] = $sale;

            // Accumulate checkout total for loyalty points.
            $totalSpentForPoints += (float) $sale->total_amount;
        }

        // Award loyalty points once per checkout.
        $customerId = $validated['customer_id'] ?? null;

        if ($customerId !== null) {
            $customer = Customer::where(
                'customer_id',
                $customerId
            )
                ->lockForUpdate()
                ->firstOrFail();

            // $1 spent earns 1 point; ignore fractional dollars.
            $pointsEarned = (int) floor($totalSpentForPoints);

            if ($pointsEarned > 0) {
                $customer->loyalty_points =
                    (int) $customer->loyalty_points
                    + $pointsEarned;

                $customer->save();

                LoyaltyTransaction::create([
                    'customer_id' => $customer->customer_id,
                    'points_earned' => $pointsEarned,
                    'points_used' => 0,
                    'transaction_type' => 'earned',
                    'sale_id' => $createdSales[0]->sale_id,
                    'store_sale_id' => null,
                ]);
            }
        }

        return $createdSales;
    });

    return response()->json([
        'message' => 'Sale completed successfully.',
        'data' => $sales,
    ], 201);
}

}