<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductInventoryLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    // =========================================================
    // GET ALL PRODUCTS
    // =========================================================
    public function index(Request $request)
    {
        $query = Product::with('category')
            ->orderBy('product_id', 'desc');

        // =====================================================
        // Optional Search
        // Search by:
        // - Product Name
        // - Product Code
        // - Barcode
        // =====================================================
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where(
                    'product_name',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'product_code',
                    'like',
                    "%{$search}%"
                )
                ->orWhere(
                    'barcode',
                    'like',
                    "%{$search}%"
                );
            });
        }

        // =====================================================
        // Optional Category Filter
        // =====================================================
        if ($request->filled('category_id')) {
            $query->where(
                'category_id',
                $request->category_id
            );
        }

        // =====================================================
        // Optional Active Filter
        // =====================================================
        if ($request->has('is_active')) {
            $query->where(
                'is_active',
                $request->boolean('is_active')
            );
        }

        return response()->json(
            $query->get()
        );
    }

    // =========================================================
    // CREATE PRODUCT
    // =========================================================
    public function store(Request $request)
    {
        $validated = $request->validate([
            // -------------------------------------------------
            // Product Code
            // -------------------------------------------------
            'product_code' => [
                'nullable',
                'string',
                'max:50',
                'unique:products,product_code',
            ],

            // -------------------------------------------------
            // Barcode
            // -------------------------------------------------
            'barcode' => [
                'nullable',
                'string',
                'max:50',
                'unique:products,barcode',
            ],

            // -------------------------------------------------
            // Product Name
            // -------------------------------------------------
            'product_name' => [
                'required',
                'string',
                'max:100',
            ],

            // -------------------------------------------------
            // Product Image
            //
            // Allowed:
            // jpg, jpeg, png, webp
            //
            // Maximum size:
            // 2MB
            // -------------------------------------------------
            'image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],

            // -------------------------------------------------
            // Category
            // -------------------------------------------------
            'category_id' => [
                'required',
                'integer',
                'exists:product_categories,category_id',
            ],

            // -------------------------------------------------
            // Purchase Price
            // -------------------------------------------------
            'purchase_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            // -------------------------------------------------
            // Selling Price
            // -------------------------------------------------
            'selling_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            // -------------------------------------------------
            // Stock
            // -------------------------------------------------
            'quantity_in_stock' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            // -------------------------------------------------
            // Minimum Stock
            // -------------------------------------------------
            'min_stock_level' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            // -------------------------------------------------
            // Unit
            // -------------------------------------------------
            'unit' => [
                'nullable',
                'string',
                'max:20',
            ],

            // -------------------------------------------------
            // Tax Rate
            // -------------------------------------------------
            'tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],

            // -------------------------------------------------
            // Active Status
            // -------------------------------------------------
            'is_active' => [
                'nullable',
                'boolean',
            ],
        ]);

        // =====================================================
        // AUTO GENERATE PRODUCT CODE
        //
        // ប្រសិនបើ Frontend មិនផ្ញើ Product Code
        // Backend នឹងបង្កើត Code ដោយស្វ័យប្រវត្តិ។
        // =====================================================
        if (empty($validated['product_code'])) {
            $validated['product_code'] =
                'STORE-' .
                now()->format('YmdHis') .
                '-' .
                rand(100, 999);
        }

        // =====================================================
        // DEFAULT VALUES
        // =====================================================

        $validated['quantity_in_stock'] =
            $validated['quantity_in_stock'] ?? 0;

        $validated['min_stock_level'] =
            $validated['min_stock_level'] ?? 0;

        $validated['unit'] =
            $validated['unit'] ?? 'piece';

        $validated['tax_rate'] =
            $validated['tax_rate'] ?? 0;

        $validated['is_active'] =
            $validated['is_active'] ?? true;

        // =====================================================
        // UPLOAD PRODUCT IMAGE
        //
        // Image will be stored in:
        //
        // storage/app/public/products/
        //
        // Example:
        // products/abc123xyz.png
        //
        // Database stores only:
        // products/abc123xyz.png
        // =====================================================
        if ($request->hasFile('image')) {
            $validated['image'] =
                $request
                    ->file('image')
                    ->store('products', 'public');
        }

        // =====================================================
        // CREATE PRODUCT
        // =====================================================
        $product = Product::create($validated);

        // =====================================================
        // CREATE INVENTORY LOG
        //
        // ប្រសិនបើ Product ថ្មីមាន Stock > 0
        // យើងកត់ត្រា Inventory Log។
        // =====================================================
        if (
            (float) $product->quantity_in_stock > 0
        ) {
            ProductInventoryLog::create([
                'product_id' =>
                    $product->product_id,

                'quantity_change' =>
                    $product->quantity_in_stock,

                'previous_quantity' => 0,

                'new_quantity' =>
                    $product->quantity_in_stock,

                'reason' => 'purchase',

                'reference_id' => null,

                'created_by' =>
                    $request->user()->user_id,
            ]);
        }

        // =====================================================
        // Load Category Relationship
        // =====================================================
        $product->load('category');

        // =====================================================
        // RETURN CREATED PRODUCT
        // =====================================================
        return response()->json([
            'message' =>
                'Product created successfully.',

            'product' => $product,
        ], 201);
    }

    // =========================================================
    // SHOW PRODUCT
    // =========================================================
    public function show(Product $product)
    {
        // =====================================================
        // Load Category
        // =====================================================
        $product->load('category');

        return response()->json(
            $product
        );
    }

    // =========================================================
    // UPDATE PRODUCT
    // =========================================================
    public function update(
        Request $request,
        Product $product
    ) {
        $validated = $request->validate([
            // -------------------------------------------------
            // Product Code
            // Ignore current product when checking unique.
            // -------------------------------------------------
            'product_code' => [
                'required',
                'string',
                'max:50',
                'unique:products,product_code,' .
                    $product->product_id .
                    ',product_id',
            ],

            // -------------------------------------------------
            // Barcode
            // -------------------------------------------------
            'barcode' => [
                'nullable',
                'string',
                'max:50',
                'unique:products,barcode,' .
                    $product->product_id .
                    ',product_id',
            ],

            // -------------------------------------------------
            // Product Name
            // -------------------------------------------------
            'product_name' => [
                'required',
                'string',
                'max:100',
            ],

            // -------------------------------------------------
            // Product Image
            //
            // Optional during update.
            // If no new image is selected,
            // old image will remain.
            // -------------------------------------------------
            'image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],

            // -------------------------------------------------
            // Category
            // -------------------------------------------------
            'category_id' => [
                'required',
                'integer',
                'exists:product_categories,category_id',
            ],

            // -------------------------------------------------
            // Purchase Price
            // -------------------------------------------------
            'purchase_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            // -------------------------------------------------
            // Selling Price
            // -------------------------------------------------
            'selling_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            // -------------------------------------------------
            // Stock
            // -------------------------------------------------
            'quantity_in_stock' => [
                'required',
                'numeric',
                'min:0',
            ],

            // -------------------------------------------------
            // Minimum Stock
            // -------------------------------------------------
            'min_stock_level' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            // -------------------------------------------------
            // Unit
            // -------------------------------------------------
            'unit' => [
                'nullable',
                'string',
                'max:20',
            ],

            // -------------------------------------------------
            // Tax Rate
            // -------------------------------------------------
            'tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],

            // -------------------------------------------------
            // Active Status
            // -------------------------------------------------
            'is_active' => [
                'nullable',
                'boolean',
            ],
        ]);

        // =====================================================
        // SAVE OLD STOCK
        // =====================================================
        $oldQuantity =
            (float) $product->quantity_in_stock;

        $newQuantity =
            (float) $validated['quantity_in_stock'];

        // =====================================================
        // DATABASE TRANSACTION
        //
        // Product update + Inventory Log
        // will succeed or fail together.
        // =====================================================
        DB::transaction(function () use (
            $product,
            $validated,
            $oldQuantity,
            $newQuantity,
            $request
        ) {

            // =================================================
            // HANDLE PRODUCT IMAGE
            //
            // Only execute if Admin selects a new image.
            // =================================================
            if ($request->hasFile('image')) {

                // -------------------------------------------------
                // Delete OLD image
                // -------------------------------------------------
                if (
                    $product->image &&
                    Storage::disk('public')->exists(
                        $product->image
                    )
                ) {
                    Storage::disk('public')->delete(
                        $product->image
                    );
                }

                // -------------------------------------------------
                // Store NEW image
                // -------------------------------------------------
                $validated['image'] =
                    $request
                        ->file('image')
                        ->store(
                            'products',
                            'public'
                        );
            }

            // =================================================
            // UPDATE PRODUCT
            // =================================================
            $product->update(
                $validated
            );

            // =================================================
            // INVENTORY LOG
            //
            // If stock changed, create adjustment log.
            // =================================================
            if (
                $oldQuantity !==
                $newQuantity
            ) {
                ProductInventoryLog::create([
                    'product_id' =>
                        $product->product_id,

                    'quantity_change' =>
                        $newQuantity -
                        $oldQuantity,

                    'previous_quantity' =>
                        $oldQuantity,

                    'new_quantity' =>
                        $newQuantity,

                    'reason' =>
                        'adjustment',

                    'reference_id' =>
                        null,

                    'created_by' =>
                        $request
                            ->user()
                            ->user_id,
                ]);
            }
        });

        // =====================================================
        // Load Category
        // =====================================================
        $product->load('category');

        // =====================================================
        // RETURN UPDATED PRODUCT
        // =====================================================
        return response()->json([
            'message' =>
                'Product updated successfully.',

            'product' =>
                $product->fresh('category'),
        ]);
    }

    // =========================================================
    // DELETE PRODUCT
    // =========================================================
    public function destroy(
        Product $product
    ) {
        // =====================================================
        // CHECK SALES HISTORY
        //
        // Product that has sales history
        // cannot be deleted.
        // =====================================================
        if (
            $product
                ->saleItems()
                ->exists()
        ) {
            return response()->json([
                'message' =>
                    'This product cannot be deleted because it has sales history.',
            ], 409);
        }

        // =====================================================
        // DELETE PRODUCT IMAGE
        //
        // Remove image file from:
        // storage/app/public/products/
        // =====================================================
        if (
            $product->image &&
            Storage::disk('public')->exists(
                $product->image
            )
        ) {
            Storage::disk('public')->delete(
                $product->image
            );
        }

        // =====================================================
        // DELETE PRODUCT FROM DATABASE
        // =====================================================
        $product->delete();

        return response()->json([
            'message' =>
                'Product deleted successfully.',
        ]);
    }

    // =========================================================
    // ADJUST INVENTORY
    // =========================================================
    public function adjustInventory(
        Request $request,
        Product $product
    ) {
        $validated = $request->validate([
            // -------------------------------------------------
            // Quantity Change
            // Cannot be zero.
            // -------------------------------------------------
            'quantity_change' => [
                'required',
                'numeric',
                'not_in:0',
            ],

            // -------------------------------------------------
            // Inventory Reason
            // -------------------------------------------------
            'reason' => [
                'required',
                Rule::in([
                    'purchase',
                    'sale',
                    'return',
                    'adjustment',
                    'damage',
                ]),
            ],

            // -------------------------------------------------
            // Optional Reference ID
            // -------------------------------------------------
            'reference_id' => [
                'nullable',
                'integer',
            ],
        ]);

        // =====================================================
        // DATABASE TRANSACTION
        // =====================================================
        return DB::transaction(function () use (
            $request,
            $product,
            $validated
        ) {

            // =================================================
            // LOCK PRODUCT ROW
            //
            // Prevent stock conflicts when multiple requests
            // happen at the same time.
            // =================================================
            $product = Product::where(
                'product_id',
                $product->product_id
            )
                ->lockForUpdate()
                ->firstOrFail();

            // =================================================
            // Previous Quantity
            // =================================================
            $previousQuantity =
                (float) $product->quantity_in_stock;

            // =================================================
            // Quantity Change
            // =================================================
            $quantityChange =
                (float) $validated['quantity_change'];

            // =================================================
            // Calculate New Quantity
            // =================================================
            $newQuantity =
                $previousQuantity +
                $quantityChange;

            // =================================================
            // STOCK CANNOT BE NEGATIVE
            // =================================================
            if ($newQuantity < 0) {
                return response()->json([
                    'message' =>
                        'Insufficient stock. Quantity cannot be negative.',
                ], 422);
            }

            // =================================================
            // UPDATE STOCK
            // =================================================
            $product->update([
                'quantity_in_stock' =>
                    $newQuantity,
            ]);

            // =================================================
            // CREATE INVENTORY LOG
            // =================================================
            $log =
                ProductInventoryLog::create([
                    'product_id' =>
                        $product->product_id,

                    'quantity_change' =>
                        $quantityChange,

                    'previous_quantity' =>
                        $previousQuantity,

                    'new_quantity' =>
                        $newQuantity,

                    'reason' =>
                        $validated['reason'],

                    'reference_id' =>
                        $validated['reference_id']
                        ?? null,

                    'created_by' =>
                        $request
                            ->user()
                            ->user_id,
                ]);

            // =================================================
            // RETURN RESULT
            // =================================================
            return response()->json([
                'message' =>
                    'Product inventory updated successfully.',

                'product' =>
                    $product->fresh('category'),

                'inventory_log' =>
                    $log,
            ]);
        });
    }

    // =========================================================
    // GET INVENTORY LOGS
    // =========================================================
    public function inventoryLogs(
        Product $product
    ) {
        // =====================================================
        // Get inventory logs
        // Include the user who created each log.
        // =====================================================
        $logs = $product
            ->inventoryLogs()
            ->with('createdBy')
            ->orderByDesc(
                'inventory_log_id'
            )
            ->get();

        return response()->json(
            $logs
        );
    }
}