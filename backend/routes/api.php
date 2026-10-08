<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\FuelTankController;
use App\Http\Controllers\FuelTypeController;
use App\Http\Controllers\TankRefillController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\FuelPurchaseOrderController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FuelPumpController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductCategoryController;


// =====================================================
// FUEL PUMP MANAGEMENT
// =====================================================

Route::apiResource(
    'fuel-pumps',
    FuelPumpController::class
);


// =====================================================
// FUEL PURCHASE ORDER MANAGEMENT
// =====================================================
// Purchase Orders require an authenticated user because
// created_by must come from the currently logged-in user.
//
// CRUD routes:
// GET    /api/purchase-orders
// POST   /api/purchase-orders
// GET    /api/purchase-orders/{id}
// PUT    /api/purchase-orders/{id}
// PATCH  /api/purchase-orders/{id}
// DELETE /api/purchase-orders/{id}

Route::middleware('auth:sanctum')->group(function () {

    Route::apiResource(
        'purchase-orders',
        FuelPurchaseOrderController::class
    );
});


// =====================================================
// SUPPLIER MANAGEMENT
// =====================================================
// CRUD routes:
// GET    /api/suppliers
// POST   /api/suppliers
// GET    /api/suppliers/{id}
// PUT    /api/suppliers/{id}
// PATCH  /api/suppliers/{id}
// DELETE /api/suppliers/{id}

Route::apiResource(
    'suppliers',
    SupplierController::class
);


// =====================================================
// PRODUCT CATEGORY MANAGEMENT
// =====================================================
// Convenience Store Product Categories.
//
// CRUD routes:
// GET    /api/product-categories
// POST   /api/product-categories
// GET    /api/product-categories/{id}
// PUT    /api/product-categories/{id}
// PATCH  /api/product-categories/{id}
// DELETE /api/product-categories/{id}

Route::apiResource(
    'product-categories',
    ProductCategoryController::class
);


// =====================================================
// PRODUCT MANAGEMENT
// =====================================================
// Convenience Store Products.
//
// CRUD routes:
// GET    /api/products
// POST   /api/products
// GET    /api/products/{id}
// PUT    /api/products/{id}
// PATCH  /api/products/{id}
// DELETE /api/products/{id}

Route::apiResource(
    'products',
    ProductController::class
);


// =====================================================
// PROTECTED USER API
// =====================================================
// This API requires a valid Sanctum token.
//
// GET /api/user

Route::get('/user', function (Request $request) {

    return $request->user();

})->middleware('auth:sanctum');


// =====================================================
// LOGIN API
// =====================================================
// Public route.
//
// POST /api/login

Route::post(
    '/login',
    [AuthController::class, 'login']
);


// =====================================================
// LOGOUT API
// =====================================================
// Requires a valid Sanctum token.
//
// POST /api/logout

Route::post(
    '/logout',
    [AuthController::class, 'logout']
)->middleware('auth:sanctum');


// =====================================================
// FUEL TANKS API
// =====================================================
// CRUD routes:
// GET    /api/fuel-tanks
// POST   /api/fuel-tanks
// GET    /api/fuel-tanks/{id}
// PUT    /api/fuel-tanks/{id}
// PATCH  /api/fuel-tanks/{id}
// DELETE /api/fuel-tanks/{id}

Route::apiResource(
    'fuel-tanks',
    FuelTankController::class
);


// =====================================================
// FUEL TYPES API
// =====================================================
// Only INDEX and UPDATE routes are enabled.
//
// GET   /api/fuel-types
// PUT   /api/fuel-types/{id}
// PATCH /api/fuel-types/{id}

Route::apiResource(
    'fuel-types',
    FuelTypeController::class
)->only([
    'index',
    'update'
]);


// =====================================================
// TANK REFILL API
// =====================================================
// Both routes require a valid Sanctum token.
//
// GET  /api/tank-refills
// POST /api/tank-refills

Route::middleware('auth:sanctum')->group(function () {

    // -------------------------------------------------
    // Get all tank refill history
    // -------------------------------------------------
    Route::get(
        '/tank-refills',
        [TankRefillController::class, 'index']
    );


    // -------------------------------------------------
    // Create a new tank refill
    // -------------------------------------------------
    Route::post(
        '/tank-refills',
        [TankRefillController::class, 'store']
    );
});