<?php

namespace App\Http\Controllers;

use App\Models\StoreSale;
use App\Models\StoreSaleItem;
use App\Models\Product;
use App\Models\ProductInventoryLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Refund;

class StoreSaleController extends Controller
{
/**
 * Display Store Sales History.
 *
 * Returns store sales with their relationships and latest
 * refund status, while preserving existing filters and pagination.
 */
public function index(Request $request)
{
    // Load the existing sale relationships.
    $query = StoreSale::with([
        'customer',
        'soldBy',
        'items.product',
    ]);

    /*
    |--------------------------------------------------------------------------
    | Add Latest Refund Status
    |--------------------------------------------------------------------------
    | pending  = waiting for approval
    | approved = refund approved
    | rejected = refund rejected
    | null     = no refund request
    |
    | This does not delete or modify the original store sale.
    |--------------------------------------------------------------------------
    */
    $query->addSelect([
        'refund_status' => Refund::select('status')
            ->whereColumn(
                'refunds.original_store_sale_id',
                'store_sales.store_sale_id'
            )
            ->orderByDesc('refund_id')
            ->limit(1),
    ]);

    // Search by sale number or receipt number.
    if ($request->filled('search')) {
        $search = $request->search;

        $query->where(function ($q) use ($search) {
            $q->where('sale_number', 'like', "%{$search}%")
              ->orWhere('receipt_number', 'like', "%{$search}%");
        });
    }

    // Filter by payment status.
    if ($request->filled('payment_status')) {
        $query->where(
            'payment_status',
            $request->payment_status
        );
    }

    // Filter by payment method.
    if ($request->filled('payment_method')) {
        $query->where(
            'payment_method',
            $request->payment_method
        );
    }

    // Filter by cashier/user.
    if ($request->filled('sold_by')) {
        $query->where(
            'sold_by',
            $request->sold_by
        );
    }

    // Filter sales from a specific date.
    if ($request->filled('date')) {
        $query->whereDate(
            'sale_date',
            $request->date
        );
    }

    // Return newest sales first, keeping pagination unchanged.
    $sales = $query
        ->orderBy('sale_date', 'desc')
        ->orderBy('store_sale_id', 'desc')
        ->paginate(15);

    return response()->json($sales);
}

    /**
     * Store a new Store Sale.
     *
     * This is the main method used by Store POS when
     * the cashier clicks "Complete Sale".
     *
     * The whole operation is handled inside one database
     * transaction so that if any step fails, everything
     * is rolled back.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => [
                'nullable',
                'integer',
                'exists:customers,customer_id',
            ],

            

            'discount' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'payment_method' => [
                'required',
                'in:cash,credit_card,debit_card,bank_transfer,qr_payment',
            ],

            'payment_status' => [
                'nullable',
                'in:paid,pending,failed',
            ],

            'receipt_number' => [
                'nullable',
                'string',
                'max:50',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
            ],

            'items.*.product_id' => [
                'required',
                'integer',
                'exists:products,product_id',
            ],

            'items.*.quantity' => [
                'required',
                'numeric',
                'gt:0',
            ],

            'items.*.discount' => [
                'nullable',
                'numeric',
                'min:0',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Get the currently logged-in user
        |--------------------------------------------------------------------------
        |
        | sold_by in store_sales points to users.user_id.
        |
        */
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        try {
            $sale = DB::transaction(function () use (
                $validated,
                $user
            ) {

                /*
                |--------------------------------------------------------------------------
                | Step 1: Prepare sale totals
                |--------------------------------------------------------------------------
                */

                $subtotal = 0;

                // =========================================================
                // Total Tax
                // Backend calculates this from products.tax_rate.
                // =========================================================
                $tax = 0;

                $preparedItems = [];

                foreach ($validated['items'] as $itemData) {

                    /*
                    |--------------------------------------------------------------------------
                    | Lock the product row.
                    |--------------------------------------------------------------------------
                    |
                    | This prevents two sales from modifying the same
                    | product stock at the same time.
                    |
                    */
                    $product = Product::where(
                        'product_id',
                        $itemData['product_id']
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                    $quantity = (float) $itemData['quantity'];

                    $unitPrice = (float) $product->selling_price;

                    $itemDiscount = (float) (
                        $itemData['discount'] ?? 0
                    );

                    /*
                    |--------------------------------------------------------------------------
                    | Check stock before selling.
                    |--------------------------------------------------------------------------
                    */

                    if ((float) $product->quantity_in_stock < $quantity) {
                        throw new \Exception(
                            "Insufficient stock for product: {$product->product_name}"
                        );
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Calculate item subtotal.
                    |--------------------------------------------------------------------------
                    */

                    $itemSubtotal =
                        ($quantity * $unitPrice)
                        - $itemDiscount;

                    if ($itemSubtotal < 0) {
                        throw new \Exception(
                            "Item discount cannot be greater than item total."
                        );
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | Calculate Tax from Product Tax Rate
                    |--------------------------------------------------------------------------
                    |
                    | Example:
                    | Product price = 10,000 KHR
                    | Quantity      = 2
                    | Discount      = 0
                    | Tax Rate      = 10%
                    |
                    | Item Subtotal = 20,000
                    | Item Tax      = 20,000 × 10% = 2,000
                    |
                    | The frontend does NOT send tax.
                    | Backend calculates tax using the product's tax_rate.
                    |
                    */
                    $taxRate = (float) ($product->tax_rate ?? 0);

                    $itemTax =
                        $itemSubtotal * ($taxRate / 100);

                    // Add this item's tax to total tax.
                    $tax += $itemTax;

                    $subtotal += $itemSubtotal;

                    $preparedItems[] = [
                        'product' => $product,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'discount' => $itemDiscount,
                        'subtotal' => $itemSubtotal,
                    ];
                }

                /*
                |--------------------------------------------------------------------------
                | Step 2: Calculate sale totals
                |--------------------------------------------------------------------------
                */

                
                $discount = (float) (
                    $validated['discount'] ?? 0
                );

                $totalAmount =
                    $subtotal
                    + $tax
                    - $discount;

                if ($totalAmount < 0) {
                    throw new \Exception(
                        'Sale total cannot be negative.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Step 3: Generate Sale Number
                |--------------------------------------------------------------------------
                |
                | Example:
                | STORE-20261008-0001
                |
                */
                $saleNumber = $this->generateSaleNumber();

                /*
                |--------------------------------------------------------------------------
                | Step 4: Create Store Sale
                |--------------------------------------------------------------------------
                */

                $sale = StoreSale::create([
                    'sale_number' => $saleNumber,
                    'customer_id' => $validated['customer_id'] ?? null,
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'discount' => $discount,
                    'total_amount' => $totalAmount,
                    'payment_method' => $validated['payment_method'],
                    'payment_status' =>
                        $validated['payment_status'] ?? 'paid',
                    'sold_by' => $user->user_id,
                    'sale_date' => now(),
                    'receipt_number' =>
                        $validated['receipt_number'] ?? null,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Step 5: Create Sale Items
                |--------------------------------------------------------------------------
                */

                foreach ($preparedItems as $item) {

                    $product = $item['product'];

                    $previousQuantity =
                        (float) $product->quantity_in_stock;

                    $newQuantity =
                        $previousQuantity - $item['quantity'];

                    /*
                    |--------------------------------------------------------------------------
                    | Create store_sale_items record.
                    |--------------------------------------------------------------------------
                    */

                    StoreSaleItem::create([
                        'store_sale_id' => $sale->store_sale_id,
                        'product_id' => $product->product_id,
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'discount' => $item['discount'],
                        'subtotal' => $item['subtotal'],
                    ]);

                    /*
                    |--------------------------------------------------------------------------
                    | Update Product Stock
                    |--------------------------------------------------------------------------
                    */

                    $product->quantity_in_stock = $newQuantity;
                    $product->save();

                    /*
                    |--------------------------------------------------------------------------
                    | Create Inventory Log
                    |--------------------------------------------------------------------------
                    |
                    | reason = sale
                    |
                    | Negative quantity_change means stock decreased.
                    |
                    */
                    ProductInventoryLog::create([
                        'product_id' => $product->product_id,
                        'quantity_change' => -$item['quantity'],
                        'previous_quantity' => $previousQuantity,
                        'new_quantity' => $newQuantity,
                        'reason' => 'sale',
                        'reference_id' => $sale->store_sale_id,
                        'created_by' => $user->user_id,
                    ]);
                }

                return $sale;
            });

            /*
            |--------------------------------------------------------------------------
            | Step 6: Return completed sale
            |--------------------------------------------------------------------------
            */

            $sale->load([
                'customer',
                'soldBy',
                'items.product',
            ]);

            return response()->json([
                'message' => 'Store sale completed successfully.',
                'data' => $sale,
            ], 201);

        } catch (\Exception $e) {

            /*
            |--------------------------------------------------------------------------
            | If any step fails, DB::transaction() automatically
            | rolls back the Store Sale, Sale Items, Stock update,
            | and Inventory Logs.
            |--------------------------------------------------------------------------
            */

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
 * Display one Store Sale with complete details and refund status.
 */
public function show(StoreSale $storeSale)
{
    // Load the existing relationships.
    $storeSale->load([
        'customer',
        'soldBy',
        'items.product',
    ]);

    // Attach the latest refund status without changing the sale.
    $storeSale->setAttribute(
        'refund_status',
        Refund::where(
            'original_store_sale_id',
            $storeSale->store_sale_id
        )
            ->orderByDesc('refund_id')
            ->value('status')
    );

    return response()->json([
        'data' => $storeSale,
    ]);
}

    /**
     * Generate a unique Store Sale Number.
     *
     * Example:
     * STORE-20261008-0001
     */
    private function generateSaleNumber()
    {
        $date = now()->format('Ymd');

        $lastSale = StoreSale::where(
            'sale_number',
            'like',
            "STORE-{$date}-%"
        )
        ->orderBy('store_sale_id', 'desc')
        ->first();

        if ($lastSale) {

            $lastNumber = (int) substr(
                $lastSale->sale_number,
                -4
            );

            $nextNumber = $lastNumber + 1;

        } else {

            $nextNumber = 1;
        }

        return sprintf(
            'STORE-%s-%04d',
            $date,
            $nextNumber
        );
    }
}