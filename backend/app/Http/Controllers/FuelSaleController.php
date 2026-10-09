<?php

namespace App\Http\Controllers;

use App\Models\FuelSale;
use App\Models\Refund; // Added to retrieve refund status.
use Illuminate\Http\Request;

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
            'soldBy',
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
}