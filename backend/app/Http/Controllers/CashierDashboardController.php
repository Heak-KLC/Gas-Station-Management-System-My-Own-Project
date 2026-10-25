<?php

namespace App\Http\Controllers;

use App\Models\FuelSale;
use App\Models\StoreSale;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CashierDashboardController extends Controller
{
    /**
     * Get today's cashier dashboard summary.
     */
    public function summary(Request $request)
    {
        $user = $request->user();
        $userId = $user->user_id;

        // Today's date based on Laravel timezone.
        $today = Carbon::today()->toDateString();

        // Paid fuel sales belonging to the logged-in cashier.
        $fuelQuery = FuelSale::query()
            ->where('sold_by', $userId)
            ->whereDate('sale_date', $today)
            ->where('payment_status', 'paid');

        // Paid store sales belonging to the logged-in cashier.
        $storeQuery = StoreSale::query()
            ->where('sold_by', $userId)
            ->whereDate('sale_date', $today)
            ->where('payment_status', 'paid');

        // Sales totals.
        $fuelSales = (float) (clone $fuelQuery)
            ->sum('total_amount');

        $storeSales = (float) (clone $storeQuery)
            ->sum('total_amount');

        $totalSales = $fuelSales + $storeSales;

        // Transaction counts.
        $fuelCount = (clone $fuelQuery)->count();
        $storeCount = (clone $storeQuery)->count();

        $totalTransactions = $fuelCount + $storeCount;

        // Average fuel transaction amount.
        $averageFuelSale = $fuelCount > 0
            ? $fuelSales / $fuelCount
            : 0;

        // Total discounts and taxes for paid transactions.
        $fuelDiscount = (float) (clone $fuelQuery)
            ->sum('discount');

        $storeDiscount = (float) (clone $storeQuery)
            ->sum('discount');

        $fuelTax = (float) (clone $fuelQuery)
            ->sum('tax');

        $storeTax = (float) (clone $storeQuery)
            ->sum('tax');

        $totalDiscount = $fuelDiscount + $storeDiscount;
        $totalTax = $fuelTax + $storeTax;

        // Hourly sales grouped into two-hour intervals.
        // Fuel and store sales must be returned separately
        // because Dashboard.jsx displays two different series.
        $hourlyFuel = (clone $fuelQuery)
            ->selectRaw(
                'FLOOR(HOUR(sale_date) / 2) AS bucket'
            )
            ->selectRaw('SUM(total_amount) AS total')
            ->groupBy('bucket')
            ->pluck('total', 'bucket');

        $hourlyStore = (clone $storeQuery)
            ->selectRaw(
                'FLOOR(HOUR(sale_date) / 2) AS bucket'
            )
            ->selectRaw('SUM(total_amount) AS total')
            ->groupBy('bucket')
            ->pluck('total', 'bucket');

        $hourlySales = [];

        for ($i = 0; $i < 12; $i++) {
            $hourlySales[] = [
                'label' => sprintf('%02d:00', $i * 2),
                'fuel' => round(
                    (float) ($hourlyFuel[$i] ?? 0),
                    2
                ),
                'store' => round(
                    (float) ($hourlyStore[$i] ?? 0),
                    2
                ),
            ];
        }

        // Fuel payments grouped by payment method.
        $fuelPayments = (clone $fuelQuery)
            ->select('payment_method')
            ->selectRaw('SUM(total_amount) AS total_sales')
            ->selectRaw('COUNT(*) AS transaction_count')
            ->groupBy('payment_method')
            ->get();

        // Store payments grouped by payment method.
        $storePayments = (clone $storeQuery)
            ->select('payment_method')
            ->selectRaw('SUM(total_amount) AS total_sales')
            ->selectRaw('COUNT(*) AS transaction_count')
            ->groupBy('payment_method')
            ->get();

        // Merge fuel and store payment totals.
        $paymentMap = [];

        foreach (
            $fuelPayments->concat($storePayments)
            as $payment
        ) {
            $method = $payment->payment_method ?: 'Unknown';

            if (!isset($paymentMap[$method])) {
                $paymentMap[$method] = [
                    'payment_method' => $method,
                    'total_sales' => 0,
                    'transaction_count' => 0,
                ];
            }

            $paymentMap[$method]['total_sales'] +=
                (float) $payment->total_sales;

            $paymentMap[$method]['transaction_count'] +=
                (int) $payment->transaction_count;
        }

        $paymentBreakdown = array_values($paymentMap);

        // Recent paid fuel sales.
        $recentFuelSales = (clone $fuelQuery)
            ->with([
                'customer',
                'pump',
                'fuelType',
            ])
            ->orderByDesc('sale_date')
            ->orderByDesc('sale_id')
            ->limit(5)
            ->get();

        // Recent paid store sales.
        $recentStoreSales = (clone $storeQuery)
            ->with([
                'customer',
                'items.product',
            ])
            ->orderByDesc('sale_date')
            ->orderByDesc('store_sale_id')
            ->limit(5)
            ->get();

        // Best-selling fuel types by quantity sold.
        $bestSellingFuel = (clone $fuelQuery)
            ->join(
                'fuel_types',
                'fuel_sales.fuel_id',
                '=',
                'fuel_types.fuel_id'
            )
            ->select(
                'fuel_sales.fuel_id',
                'fuel_types.fuel_name'
            )
            ->selectRaw(
                'SUM(fuel_sales.quantity) AS total_quantity'
            )
            ->selectRaw(
                'SUM(fuel_sales.total_amount) AS total_amount'
            )
            ->groupBy(
                'fuel_sales.fuel_id',
                'fuel_types.fuel_name'
            )
            ->orderByDesc('total_quantity')
            ->limit(5)
            ->get();

        // Return dashboard data.
        return response()->json([
            'success' => true,

            'data' => [
                'date' => $today,

                'stats' => [
                    'fuel_sales' => round($fuelSales, 2),
                    'store_sales' => round($storeSales, 2),
                    'total_sales' => round($totalSales, 2),

                    'average_fuel_sale' => round(
                        $averageFuelSale,
                        2
                    ),

                    'fuel_transactions' => $fuelCount,
                    'store_transactions' => $storeCount,
                    'total_transactions' => $totalTransactions,

                    'total_discount' => round(
                        $totalDiscount,
                        2
                    ),

                    'total_tax' => round(
                        $totalTax,
                        2
                    ),
                ],

                'hourly_sales' => $hourlySales,

                'payment_breakdown' => $paymentBreakdown,

                'recent_fuel_sales' => $recentFuelSales,

                'recent_store_sales' => $recentStoreSales,

                'best_selling_fuel' => $bestSellingFuel,
            ],
        ]);
    }

    /**
     * Export today's sales for the logged-in cashier.
     */
    public function exportSales(Request $request)
    {
        $user = $request->user();
        $userId = $user->user_id;

        $today = Carbon::today()->toDateString();

        // All fuel sales today, including unpaid transactions.
        $fuelSales = FuelSale::query()
            ->with([
                'pump',
                'fuelType',
            ])
            ->where('sold_by', $userId)
            ->whereDate('sale_date', $today)
            ->orderByDesc('sale_date')
            ->orderByDesc('sale_id')
            ->get();

        // All store sales today, including unpaid transactions.
        $storeSales = StoreSale::query()
            ->with([
                'items.product',
            ])
            ->where('sold_by', $userId)
            ->whereDate('sale_date', $today)
            ->orderByDesc('sale_date')
            ->orderByDesc('store_sale_id')
            ->get();

        return response()->json([
            'success' => true,

            'data' => [
                'fuel_sales' => $fuelSales,
                'store_sales' => $storeSales,
            ],
        ]);
    }
}
