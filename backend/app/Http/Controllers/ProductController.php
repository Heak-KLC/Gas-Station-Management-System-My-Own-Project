<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
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

        // Search by product name, code, or barcode.
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        // Filter by category.
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by active status.
        if ($request->has('is_active')) {
            $query->where(
                'is_active',
                $request->boolean('is_active')
            );
        }

        return response()->json($query->get());
    }

    // =========================================================
    // CREATE PRODUCT
    // =========================================================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_code' => [
                'nullable',
                'string',
                'max:50',
                'unique:products,product_code',
            ],
            'barcode' => [
                'nullable',
                'string',
                'max:50',
                'unique:products,barcode',
            ],
            'product_name' => [
                'required',
                'string',
                'max:100',
            ],
            'image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
            'category_id' => [
                'required',
                'integer',
                'exists:product_categories,category_id',
            ],
            'purchase_price' => [
                'required',
                'numeric',
                'min:0',
            ],
            'selling_price' => [
                'required',
                'numeric',
                'min:0',
            ],
            'quantity_in_stock' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'min_stock_level' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'unit' => [
                'nullable',
                'string',
                'max:20',
            ],
            'tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],
            'is_active' => [
                'nullable',
                'boolean',
            ],
        ]);

        // Automatically generate a product code if none is supplied.
        if (empty($validated['product_code'])) {
            $validated['product_code'] =
                'STORE-' . now()->format('YmdHis') . '-' . rand(100, 999);
        }

        // Set default values.
        $validated['quantity_in_stock'] =
            $validated['quantity_in_stock'] ?? 0;

        $validated['min_stock_level'] =
            $validated['min_stock_level'] ?? 0;

        $validated['unit'] = $validated['unit'] ?? 'piece';
        $validated['tax_rate'] = $validated['tax_rate'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;

        // Upload the product image to the public storage disk.
        if ($request->hasFile('image')) {
            $validated['image'] = $request
                ->file('image')
                ->store('products', 'public');
        }

        // Create the product, initial inventory log, and audit log
        // in one transaction so the database records stay consistent.
        $product = DB::transaction(function () use (
            $validated,
            $request
        ) {
            // Create the product.
            $product = Product::create($validated);

            // Record initial stock if the product starts with stock.
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

            // Record product creation in audit_logs.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $product->product_id,
                null,
                $this->getProductAuditValues($product)
            );

            return $product;
        });

        // Load the category relationship for the response.
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
        // Load the category relationship.
        $product->load('category');

        return response()->json($product);
    }

    // =========================================================
    // UPDATE PRODUCT
    // =========================================================
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'product_code' => [
                'required',
                'string',
                'max:50',
                'unique:products,product_code,'
                    . $product->product_id . ',product_id',
            ],
            'barcode' => [
                'nullable',
                'string',
                'max:50',
                'unique:products,barcode,'
                    . $product->product_id . ',product_id',
            ],
            'product_name' => [
                'required',
                'string',
                'max:100',
            ],
            'image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
            'category_id' => [
                'required',
                'integer',
                'exists:product_categories,category_id',
            ],
            'purchase_price' => [
                'required',
                'numeric',
                'min:0',
            ],
            'selling_price' => [
                'required',
                'numeric',
                'min:0',
            ],
            'quantity_in_stock' => [
                'required',
                'numeric',
                'min:0',
            ],
            'min_stock_level' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'unit' => [
                'nullable',
                'string',
                'max:20',
            ],
            'tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],
            'is_active' => [
                'nullable',
                'boolean',
            ],
        ]);

        // Save the old product values before updating.
        $oldValues = $this->getProductAuditValues($product);

        // Save the old stock quantity for inventory tracking.
        $oldQuantity = (float) $product->quantity_in_stock;
        $newQuantity = (float) $validated['quantity_in_stock'];

        // Keep the old image path so it can be deleted only after
        // the database transaction succeeds.
        $oldImagePath = $product->image;
        $newImagePath = null;

        // Update the product, inventory log, and audit log together.
        DB::transaction(function () use (
            $request,
            $product,
            &$validated,
            $oldValues,
            $oldQuantity,
            $newQuantity,
            &$newImagePath
        ) {
            // Upload a new image only when one is provided.
            if ($request->hasFile('image')) {
                $newImagePath = $request
                    ->file('image')
                    ->store('products', 'public');

                $validated['image'] = $newImagePath;
            }

            // Update product details.
            $product->update($validated);

            // Reload the updated product values from the database.
            $product->refresh();

            // Record stock adjustment if the quantity changed.
            if ($oldQuantity !== $newQuantity) {
                ProductInventoryLog::create([
                    'product_id' => $product->product_id,
                    'quantity_change' => $newQuantity - $oldQuantity,
                    'previous_quantity' => $oldQuantity,
                    'new_quantity' => $newQuantity,
                    'reason' => 'adjustment',
                    'reference_id' => null,
                    'created_by' => $request->user()->user_id,
                ]);
            }

            // Record old and new product values in audit_logs.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $product->product_id,
                $oldValues,
                $this->getProductAuditValues($product)
            );
        });

        // Delete the old image only after the database transaction
        // has completed successfully and a replacement was uploaded.
        if (
            $newImagePath !== null &&
            $oldImagePath &&
            Storage::disk('public')->exists($oldImagePath)
        ) {
            Storage::disk('public')->delete($oldImagePath);
        }

        // Return the updated product with its category.
        return response()->json([
            'message' => 'Product updated successfully.',
            'product' => $product->fresh('category'),
        ]);
    }

    // =========================================================
    // DELETE PRODUCT
    // =========================================================
    public function destroy(Request $request, Product $product)
    {
        // Prevent deleting a product that has sales history.
        if ($product->saleItems()->exists()) {
            return response()->json([
                'message' =>
                    'This product cannot be deleted because it has sales history.',
            ], 409);
        }

        // Save product information before deletion.
        $oldValues = $this->getProductAuditValues($product);
        $imagePath = $product->image;

        // Record the deletion and delete the database record together.
        DB::transaction(function () use (
            $request,
            $product,
            $oldValues
        ) {
            // Save the audit log before deleting the product.
            $this->recordAuditLog(
                $request,
                'DELETE',
                $product->product_id,
                $oldValues,
                null
            );

            // Delete the product from the database.
            $product->delete();
        });

        // Delete the image file only after the database transaction
        // succeeds.
        if (
            $imagePath &&
            Storage::disk('public')->exists($imagePath)
        ) {
            Storage::disk('public')->delete($imagePath);
        }

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
            'quantity_change' => [
                'required',
                'numeric',
                'not_in:0',
            ],
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
            'reference_id' => [
                'nullable',
                'integer',
            ],
        ]);

        // Lock the product row and update stock safely.
        return DB::transaction(function () use (
            $request,
            $product,
            $validated
        ) {
            $product = Product::where(
                'product_id',
                $product->product_id
            )
                ->lockForUpdate()
                ->firstOrFail();

            // Store the previous quantity.
            $previousQuantity =
                (float) $product->quantity_in_stock;

            // Calculate the stock change and new quantity.
            $quantityChange =
                (float) $validated['quantity_change'];

            $newQuantity =
                $previousQuantity + $quantityChange;

            // Stock must never become negative.
            if ($newQuantity < 0) {
                return response()->json([
                    'message' =>
                        'Insufficient stock. Quantity cannot be negative.',
                ], 422);
            }

            // Update the product stock.
            $product->update([
                'quantity_in_stock' => $newQuantity,
            ]);

            // Create the inventory history record.
            $log = ProductInventoryLog::create([
                'product_id' => $product->product_id,
                'quantity_change' => $quantityChange,
                'previous_quantity' => $previousQuantity,
                'new_quantity' => $newQuantity,
                'reason' => $validated['reason'],
                'reference_id' => $validated['reference_id'] ?? null,
                'created_by' => $request->user()->user_id,
            ]);

            // Record the stock adjustment in audit_logs.
            $this->recordAuditLog(
                $request,
                'ADJUST_INVENTORY',
                $product->product_id,
                [
                    'quantity_in_stock' => $previousQuantity,
                ],
                [
                    'quantity_in_stock' => $newQuantity,
                    'quantity_change' => $quantityChange,
                    'reason' => $validated['reason'],
                    'reference_id' => $validated['reference_id'] ?? null,
                ]
            );

            return response()->json([
                'message' =>
                    'Product inventory updated successfully.',
                'product' => $product->fresh('category'),
                'inventory_log' => $log,
            ]);
        });
    }

    // =========================================================
    // GET INVENTORY LOGS
    // =========================================================
    public function inventoryLogs(Product $product)
    {
        // Retrieve stock history and the user who created each log.
        $logs = $product
            ->inventoryLogs()
            ->with('createdBy')
            ->orderByDesc('inventory_log_id')
            ->get();

        return response()->json($logs);
    }

    // =========================================================
    // HELPER: GET PRODUCT VALUES FOR AUDIT LOGS
    // =========================================================
    private function getProductAuditValues(Product $product): array
    {
        // Return only the product fields needed for activity history.
        return $product->only([
            'product_code',
            'barcode',
            'product_name',
            'image',
            'category_id',
            'purchase_price',
            'selling_price',
            'quantity_in_stock',
            'min_stock_level',
            'unit',
            'tax_rate',
            'is_active',
        ]);
    }

    // =========================================================
    // HELPER: SAVE AN AUDIT LOG
    // =========================================================
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        // Store the activity and before/after values as JSON.
        AuditLog::create([
            'user_id' => $request->user()?->user_id,
            'action' => $action,
            'entity_type' => 'Product',
            'entity_id' => $entityId,
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
            'ip_address' => $request->ip(),
        ]);
    }
}
