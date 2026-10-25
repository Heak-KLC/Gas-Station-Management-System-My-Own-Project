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

$user = $request->user();

if (!$user || !$user->user_id) {
    return response()->json([
        'message' => 'Authentication required.',
    ], 401);
}

// Allow Cashier and Fuel Attendant to sell fuel.
$role = strtolower(trim((string) $user->role));

$allowedRoles = [
    'cashier',
    'fuel attendant',
    'fuel_attendant',
    'fuel-attendant',
];

if (!in_array($role, $allowedRoles, true)) {
    return response()->json([
        'message' => 'Only Cashier or Fuel Attendant can sell fuel.',
    ], 403);
}

    $sales = DB::transaction(function () use ($validated, $user) {

    // Find the active shift of the logged-in Cashier.
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

        foreach ($validated['items'] as $item) {
            $fuel = FuelType::where(
                'fuel_id',
                $item['fuel_id']
            )->lockForUpdate()->firstOrFail();

            $pump = FuelPump::where(
                'pump_id',
                $item['pump_id']
            )->lockForUpdate()->firstOrFail();

            if ((int) $pump->fuel_id !== (int) $fuel->fuel_id) {
                throw ValidationException::withMessages([
                    'items' => ['The selected pump does not match the fuel type.'],
                ]);
            }

            if (!in_array($pump->status, ['available', 'in_use'], true)) {
                throw ValidationException::withMessages([
                    'items' => ['The selected pump is not available for sales.'],
                ]);
            }

            if ($fuel->status !== 'available') {
                throw ValidationException::withMessages([
                    'items' => ['The selected fuel type is not available.'],
                ]);
            }

            $quantity = round((float) $item['quantity'], 3);
            $stock = (float) $fuel->available_quantity;

            if ($quantity <= 0 || $quantity > $stock) {
                throw ValidationException::withMessages([
                    'items' => ['Insufficient fuel stock.'],
                ]);
            }

            $unitPrice = (float) $fuel->selling_price;
            $subtotal = round($quantity * $unitPrice, 2);

            $sale = FuelSale::create([
                'sale_number' => 'FUEL-' . Str::upper(Str::random(16)),
                'customer_id' => $validated['customer_id'] ?? null,
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
                'receipt_number' => 'RCT-' . Str::upper(Str::random(16)),
            ]);

            $fuel->available_quantity = round(
                $stock - $quantity,
                3
            );

            $fuel->save();

            $createdSales[] = $sale;
        }

        return $createdSales;
    });

    return response()->json([
        'message' => 'Sale completed successfully.',
        'data' => $sales,
    ], 201);
}
}