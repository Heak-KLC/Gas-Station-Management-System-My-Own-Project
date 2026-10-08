<?php

namespace App\Http\Controllers;

use App\Models\ProductCategory;
use Illuminate\Http\Request;

class ProductCategoryController extends Controller
{
    // =========================================================
    // GET ALL CATEGORIES
    // =========================================================
    public function index()
    {
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
        $validated = $request->validate([
            'category_name' => 'required|string|max:50',
            'category_code' => 'required|string|max:20|unique:product_categories,category_code',
            'description' => 'nullable|string',
        ]);

        $category = ProductCategory::create($validated);

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
        $validated = $request->validate([
            'category_name' => 'required|string|max:50',

            'category_code' => [
                'required',
                'string',
                'max:20',
                'unique:product_categories,category_code,' .
                    $productCategory->category_id .
                    ',category_id',
            ],

            'description' => 'nullable|string',
        ]);

        $productCategory->update($validated);

        return response()->json([
            'message' => 'Product category updated successfully.',
            'category' => $productCategory->fresh(),
        ]);
    }

    // =========================================================
    // DELETE CATEGORY
    // =========================================================
    public function destroy(ProductCategory $productCategory)
    {
        // =====================================================
        // កុំអនុញ្ញាតឱ្យ Delete Category
        // ប្រសិនបើ Category នេះមាន Product នៅក្នុងវា។
        // =====================================================
        if ($productCategory->products()->exists()) {
            return response()->json([
                'message' =>
                    'This category cannot be deleted because it contains products.',
            ], 409);
        }

        $productCategory->delete();

        return response()->json([
            'message' => 'Product category deleted successfully.',
        ]);
    }
}