<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductInventoryLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
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
            'product_code' => 'nullable|string|max:50|unique:products,product_code',

            'barcode' => [
                'nullable',
                'string',
                'max:50',
                'unique:products,barcode',
            ],

            'product_name' => 'required|string|max:100',

            'category_id' => [
                'required',
                'integer',
                'exists:product_categories,category_id',
            ],

            'purchase_price' => 'required|numeric|min:0',

            'selling_price' => 'required|numeric|min:0',

            'quantity_in_stock' => 'nullable|numeric|min:0',

            'min_stock_level' => 'nullable|numeric|min:0',

            'unit' => 'nullable|string|max:20',

            'tax_rate' => 'nullable|numeric|min:0|max:100',

            'is_active' => 'nullable|boolean',
        ]);

        // =====================================================
        // ប្រសិនបើ Frontend មិនផ្ញើ Product Code
        // Backend នឹងបង្កើត Code ឱ្យដោយស្វ័យប្រវត្តិ។
        // =====================================================
        if (empty($validated['product_code'])) {
            $validated['product_code'] =
                'STORE-' . now()->format('YmdHis') . '-' . rand(100, 999);
        }

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

        $product = Product::create($validated);

        // =====================================================
        // ប្រសិនបើ Product ត្រូវបានបង្កើតជាមួយ Stock > 0
        // យើងកត់ត្រា Inventory Log ផងដែរ។
        // =====================================================
        if ((float) $product->quantity_in_stock > 0) {
            ProductInventoryLog::create([
                'product_id' => $product->product_id,
                'quantity_change' => $product->quantity_in_stock,
                'previous_quantity' => 0,
                'new_quantity' => $product->quantity_in_stock,
                'reason' => 'purchase',
                'reference_id' => null,
                'created_by' => $request->user()->user_id,
            ]);
        }

        $product->load('category');

        return response()->json([
            'message' => 'Product created successfully.',
            'product' => $product,
        ], 201);
    }

    // =========================================================
    // SHOW PRODUCT
    // =========================================================
    public function show(Product $product)
    {
        $product->load('category');

        return response()->json($product);
    }

    // =========================================================
    // UPDATE PRODUCT
    // =========================================================
    public function update(
        Request $request,
        Product $product
    ) {
        $validated = $request->validate([
            'product_code' => [
                'required',
                'string',
                'max:50',
                'unique:products,product_code,' .
                    $product->product_id .
                    ',product_id',
            ],

            'barcode' => [
                'nullable',
                'string',
                'max:50',
                'unique:products,barcode,' .
                    $product->product_id .
                    ',product_id',
            ],

            'product_name' => 'required|string|max:100',

            'category_id' => [
                'required',
                'integer',
                'exists:product_categories,category_id',
            ],

            'purchase_price' => 'required|numeric|min:0',

            'selling_price' => 'required|numeric|min:0',

            'quantity_in_stock' => 'required|numeric|min:0',

            'min_stock_level' => 'nullable|numeric|min:0',

            'unit' => 'nullable|string|max:20',

            'tax_rate' => 'nullable|numeric|min:0|max:100',

            'is_active' => 'nullable|boolean',
        ]);

        // =====================================================
        // Save old stock before update
        // =====================================================
        $oldQuantity = (float) $product->quantity_in_stock;
        $newQuantity = (float) $validated['quantity_in_stock'];

        DB::transaction(function () use (
            $product,
            $validated,
            $oldQuantity,
            $newQuantity,
            $request
        ) {
            $product->update($validated);

            // =================================================
            // ប្រសិនបើ Stock ត្រូវបានផ្លាស់ប្តូរ
            // បង្កើត Inventory Log
            // =================================================
            if ($oldQuantity !== $newQuantity) {
                ProductInventoryLog::create([
                    'product_id' => $product->product_id,

                    'quantity_change' =>
                        $newQuantity - $oldQuantity,

                    'previous_quantity' =>
                        $oldQuantity,

                    'new_quantity' =>
                        $newQuantity,

                    'reason' => 'adjustment',

                    'reference_id' => null,

                    'created_by' =>
                        $request->user()->user_id,
                ]);
            }
        });

        $product->load('category');

        return response()->json([
            'message' => 'Product updated successfully.',
            'product' => $product->fresh('category'),
        ]);
    }

    // =========================================================
    // DELETE PRODUCT
    // =========================================================
    public function destroy(Product $product)
    {
        // =====================================================
        // Product ដែលធ្លាប់មាន Sale
        // មិនអនុញ្ញាតឱ្យ Delete ដើម្បីរក្សា Data Integrity។
        // =====================================================
        if ($product->saleItems()->exists()) {
            return response()->json([
                'message' =>
                    'This product cannot be deleted because it has sales history.',
            ], 409);
        }

        $product->delete();

        return response()->json([
            'message' => 'Product deleted successfully.',
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
            'quantity_change' => 'required|numeric|not_in:0',

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

            'reference_id' => 'nullable|integer',
        ]);

        return DB::transaction(function () use (
            $request,
            $product,
            $validated
        ) {
            // =================================================
            // Lock Product Row
            // ការពារ Stock ខូចពេលមាន Request ច្រើនក្នុងពេលតែមួយ។
            // =================================================
            $product = Product::where(
                'product_id',
                $product->product_id
            )
                ->lockForUpdate()
                ->firstOrFail();

            $previousQuantity =
                (float) $product->quantity_in_stock;

            $quantityChange =
                (float) $validated['quantity_change'];

            $newQuantity =
                $previousQuantity + $quantityChange;

            // =================================================
            // Stock មិនអាចតិចជាង 0
            // =================================================
            if ($newQuantity < 0) {
                return response()->json([
                    'message' =>
                        'Insufficient stock. Quantity cannot be negative.',
                ], 422);
            }

            $product->update([
                'quantity_in_stock' => $newQuantity,
            ]);

            $log = ProductInventoryLog::create([
                'product_id' => $product->product_id,

                'quantity_change' => $quantityChange,

                'previous_quantity' => $previousQuantity,

                'new_quantity' => $newQuantity,

                'reason' => $validated['reason'],

                'reference_id' =>
                    $validated['reference_id'] ?? null,

                'created_by' =>
                    $request->user()->user_id,
            ]);

            return response()->json([
                'message' =>
                    'Product inventory updated successfully.',

                'product' =>
                    $product->fresh('category'),

                'inventory_log' => $log,
            ]);
        });
    }

    // =========================================================
    // GET INVENTORY LOGS
    // =========================================================
    public function inventoryLogs(Product $product)
    {
        $logs = $product->inventoryLogs()
            ->with('createdBy')
            ->orderByDesc('inventory_log_id')
            ->get();

        return response()->json($logs);
    }
}