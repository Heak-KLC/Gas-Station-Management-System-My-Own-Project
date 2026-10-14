<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductCategoryController extends Controller
{
    // =========================================================
    // GET ALL CATEGORIES
    // =========================================================
    public function index()
    {
        // Get all categories and count their related products.
        $categories = ProductCategory::withCount('products')
            ->orderBy('category_id', 'asc')
            ->get();

        return response()->json($categories);
    }

    // =========================================================
    // CREATE CATEGORY
    // =========================================================
    public function store(Request $request)
    {
        // Validate category information.
        $validated = $request->validate([
            'category_name' => 'required|string|max:50',
            'category_code' => [
                'required',
                'string',
                'max:20',
                'unique:product_categories,category_code',
            ],
            'description' => 'nullable|string',
        ]);

        // Create the category and audit log in one transaction.
        $category = DB::transaction(function () use (
            $request,
            $validated
        ) {
            // Create a new product category.
            $category = ProductCategory::create($validated);

            // Record the category creation.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $category->category_id,
                null,
                $this->getCategoryAuditValues($category)
            );

            return $category;
        });

        return response()->json([
            'message' => 'Product category created successfully.',
            'category' => $category,
        ], 201);
    }

    // =========================================================
    // SHOW CATEGORY
    // =========================================================
    public function show(ProductCategory $productCategory)
    {
        // Include the number of products in this category.
        $productCategory->loadCount('products');

        return response()->json($productCategory);
    }

    // =========================================================
    // UPDATE CATEGORY
    // =========================================================
    public function update(
        Request $request,
        ProductCategory $productCategory
    ) {
        // Validate the updated category information.
        $validated = $request->validate([
            'category_name' => 'required|string|max:50',

            'category_code' => [
                'required',
                'string',
                'max:20',
                'unique:product_categories,category_code,'
                    . $productCategory->category_id
                    . ',category_id',
            ],

            'description' => 'nullable|string',
        ]);

        // Save the old values before updating the category.
        $oldValues = $this->getCategoryAuditValues(
            $productCategory
        );

        // Update the category and record the audit log together.
        $category = DB::transaction(function () use (
            $request,
            $productCategory,
            $validated,
            $oldValues
        ) {
            // Update the category information.
            $productCategory->update($validated);

            // Reload the updated category from the database.
            $productCategory->refresh();

            // Record both old and new values.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $productCategory->category_id,
                $oldValues,
                $this->getCategoryAuditValues($productCategory)
            );

            return $productCategory;
        });

        return response()->json([
            'message' => 'Product category updated successfully.',
            'category' => $category->fresh(),
        ]);
    }

    // =========================================================
    // DELETE CATEGORY
    // =========================================================
    public function destroy(
        Request $request,
        ProductCategory $productCategory
    ) {
        // Prevent deleting a category that still contains products.
        if ($productCategory->products()->exists()) {
            return response()->json([
                'message' =>
                    'This category cannot be deleted because it contains products.',
            ], 409);
        }

        // Save the category information before deletion.
        $oldValues = $this->getCategoryAuditValues(
            $productCategory
        );

        // Record the deletion and delete the category together.
        DB::transaction(function () use (
            $request,
            $productCategory,
            $oldValues
        ) {
            // Save the audit log before deleting the category.
            $this->recordAuditLog(
                $request,
                'DELETE',
                $productCategory->category_id,
                $oldValues,
                null
            );

            // Delete the category from the database.
            $productCategory->delete();
        });

        return response()->json([
            'message' => 'Product category deleted successfully.',
        ]);
    }

    // =========================================================
    // HELPER: GET CATEGORY VALUES FOR AUDIT LOGS
    // =========================================================
    private function getCategoryAuditValues(
        ProductCategory $category
    ): array {
        // Return only the fields relevant to category activity.
        return $category->only([
            'category_name',
            'category_code',
            'description',
        ]);
    }

    // =========================================================
    // HELPER: RECORD CATEGORY ACTIVITY
    // =========================================================
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        // Store activity details and before/after values in audit_logs.
        AuditLog::create([
            'user_id' => $request->user()?->user_id,
            'action' => $action,
            'entity_type' => 'ProductCategory',
            'entity_id' => $entityId,

            'old_value' => $oldValues === null
                ? null
                : json_encode(
                    $oldValues,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                ),

            'new_value' => $newValues === null
                ? null
                : json_encode(
                    $newValues,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                ),

            'ip_address' => $request->ip(),
        ]);
    }
}
