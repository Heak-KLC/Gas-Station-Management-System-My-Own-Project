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
use App\Http\Controllers\StoreSaleController;
use App\Http\Controllers\FuelSaleController;
use App\Http\Controllers\RefundController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EmployeeAttendanceController;
use App\Http\Controllers\WorkScheduleController;
use App\Http\Controllers\SystemSettingController;
use App\Http\Controllers\EquipmentMaintenanceController;
// use App\Http\Controllers\EquipmentMaintenance;


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

    // =========================================================
    // Fuel Purchase Orders
    // =========================================================
    Route::apiResource(
        'purchase-orders',
        FuelPurchaseOrderController::class
    );

    // =========================================================
    // Store Sales
    // Used by Store POS and Store Sales History
    // =========================================================

    // Get Store Sales History
    Route::get(
        'store-sales',
        [StoreSaleController::class, 'index']
    );

    // Complete a new Store Sale
    Route::post(
        'store-sales',
        [StoreSaleController::class, 'store']
    );

    // Get one Store Sale with its items
    Route::get(
        'store-sales/{storeSale}',
        [StoreSaleController::class, 'show']
    );
    // Work Schedule API
Route::apiResource('work-schedules', WorkScheduleController::class);

// System Settings API
Route::get('system-settings', [SystemSettingController::class, 'index']);
Route::put('system-settings', [SystemSettingController::class, 'update']);
});



Route::middleware('auth:sanctum')->group(function () {

    // =========================================================
    // Fuel Purchase Orders
    // =========================================================
    Route::apiResource(
        'purchase-orders',
        FuelPurchaseOrderController::class
    );

    // =========================================================
    // Store Sales
    // =========================================================
    Route::get(
        'store-sales',
        [StoreSaleController::class, 'index']
    );

    Route::post(
        'store-sales',
        [StoreSaleController::class, 'store']
    );

    Route::get(
        'store-sales/{storeSale}',
        [StoreSaleController::class, 'show']
    );

    // =========================================================
    // Fuel Sale History
    // =========================================================

    // Get Fuel Sales History
    Route::get(
        'fuel-sales',
        [FuelSaleController::class, 'index']
    );

    // Get details of one Fuel Sale
    Route::get(
        'fuel-sales/{fuelSale}',
        [FuelSaleController::class, 'show']
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
// These routes require authentication because
// ProductController uses:
// $request->user()->user_id
//
// CRUD routes:
// GET    /api/products
// POST   /api/products
// GET    /api/products/{id}
// PUT    /api/products/{id}
// PATCH  /api/products/{id}
// DELETE /api/products/{id}
//
// Additional routes:
// POST   /api/products/{id}/adjust-inventory
// GET    /api/products/{id}/inventory-logs

Route::middleware('auth:sanctum')->group(function () {

    // -------------------------------------------------
    // Product CRUD
    // -------------------------------------------------
    Route::apiResource(
        'products',
        ProductController::class
    );


    // -------------------------------------------------
    // Adjust Product Inventory
    // -------------------------------------------------
    // Example:
    // +10 = Add 10 items
    // -5  = Remove 5 items
    //
    // POST /api/products/{id}/adjust-inventory
    // -------------------------------------------------
    Route::post(
        'products/{product}/adjust-inventory',
        [ProductController::class, 'adjustInventory']
    );


    // -------------------------------------------------
    // Get Product Inventory Logs
    // -------------------------------------------------
    //
    // GET /api/products/{id}/inventory-logs
    // -------------------------------------------------
    Route::get(
        'products/{product}/inventory-logs',
        [ProductController::class, 'inventoryLogs']
    );
});


// =====================================================
// PROTECTED USER API
// =====================================================
// This API requires a valid Sanctum token.
//
// GET /api/user

Route::get(
    '/user',
    function (Request $request) {

        return $request->user();

    }
)->middleware('auth:sanctum');


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



    // =====================================================
    // REFUND API
    // All refund routes require an authenticated user.
    // =====================================================

    // Get Refund History
    Route::get(
        '/refunds',
        [RefundController::class, 'index']
    );

    // Create a Refund Request
    Route::post(
        '/refunds',
        [RefundController::class, 'store']
    );

    // Get details of one Refund
    Route::get(
        '/refunds/{refund}',
        [RefundController::class, 'show']
    );

    // Approve a pending Refund Request
    Route::patch(
        '/refunds/{refundId}/approve',
        [RefundController::class, 'approve']
    );

    // Reject a pending Refund Request
    Route::patch(
        '/refunds/{refundId}/reject',
        [RefundController::class, 'reject']
    );


    // =====================================================
    // CUSTOMER MANAGEMENT API
    // All customer routes require authentication.
    // =====================================================

    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource(
            'customers',
            CustomerController::class
        );
    });



// =====================================================
// EMPLOYEE & ATTENDANCE MANAGEMENT API
// All routes require a valid Sanctum token.
// =====================================================

Route::middleware('auth:sanctum')->group(function () {

    // -------------------------------------------------
    // Employee Management
    // GET    /api/employees
    // POST   /api/employees
    // GET    /api/employees/{employee}
    // PUT    /api/employees/{employee}
    // PATCH  /api/employees/{employee}
    // DELETE /api/employees/{employee}
    // -------------------------------------------------
    Route::apiResource(
        'employees',
        EmployeeController::class
    );

    // -------------------------------------------------
    // Employee Attendance Management
    // GET    /api/employee-attendances
    // POST   /api/employee-attendances
    // GET    /api/employee-attendances/{employee_attendance}
    // PUT    /api/employee-attendances/{employee_attendance}
    // PATCH  /api/employee-attendances/{employee_attendance}
    // DELETE /api/employee-attendances/{employee_attendance}
    // -------------------------------------------------
    Route::apiResource(
        'employee-attendances',
        EmployeeAttendanceController::class
    );
    });

    // =====================================================
// EQUIPMENT MAINTENANCE API
// All routes require a valid Sanctum token.
// =====================================================

Route::middleware('auth:sanctum')->group(function () {

    // List, create, view, update, and delete maintenance records.
    Route::apiResource(
        'equipment-maintenance',
        EquipmentMaintenanceController::class
    );

});
});