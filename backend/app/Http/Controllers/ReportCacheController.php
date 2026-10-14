<?php

namespace App\Http\Controllers;

use App\Models\ReportCache;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class ReportCacheController extends Controller
{
    /**
     * បង្ហាញប្រវត្តិ Reports ទាំងអស់
     * GET /api/reports
     */
    public function index()
    {
        $reports = ReportCache::with('generatedBy')
            ->orderByDesc('generated_date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $reports,
        ]);
    }

    /**
     * បង្កើត និងរក្សាទុក Report ថ្មី
     * POST /api/reports
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'report_type' => [
                'required',
                Rule::in([
                    'daily_fuel_sales',
                    'monthly_revenue',
                    'fuel_inventory',
                    'fuel_purchase',
                    'customer',
                    'supplier',
                    'employee',
                    'store_sales',
                    'profit_loss',
                    'equipment_maintenance',
                ]),
            ],

            'report_data' => 'required|array',
            'parameters' => 'nullable|array',
            'generated_by' => 'nullable|integer|exists:users,user_id',
        ]);

        $report = ReportCache::create([
            'report_type' => $validated['report_type'],
            'report_data' => $validated['report_data'],
            'parameters' => $validated['parameters'] ?? [],
            'generated_by' => $validated['generated_by'] ?? null,
            'generated_date' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Report saved successfully.',
            'data' => $report->load('generatedBy'),
        ], 201);
    }

    /**
     * បង្ហាញព័ត៌មាន Report តាម ID
     * GET /api/reports/{id}
     */
    public function show(string $id)
    {
        $report = ReportCache::with('generatedBy')->find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }


    /**
     * ទាញយកទិន្នន័យ Summary ពី Database ពិត
     * GET /api/reports/summary
     */
    public function summary()
    {
        // 1. ចំណូលពីការលក់ប្រេងដែលបានបង់ប្រាក់រួច
        $fuelSales = DB::table('fuel_sales')
            ->where('payment_status', 'paid')
            ->sum('total_amount');

        // 2. ចំណូលពីការលក់ទំនិញដែលបានបង់ប្រាក់រួច
        $storeSales = DB::table('store_sales')
            ->where('payment_status', 'paid')
            ->sum('total_amount');

        // 3. រាប់តែ Refund ដែលបានអនុម័ត
        $approvedRefunds = DB::table('refunds')
            ->where('status', 'approved')
            ->sum('refund_amount');

        // 4. ចំណាយថែទាំដែលបានបញ្ចប់
        $maintenanceCost = DB::table('equipment_maintenance')
            ->where('status', 'completed')
            ->sum('cost');

        // ចំណូលសរុបក្រោយដក Refund
        // នេះមិនមែនជា Net Profit ទេ
        $revenueAfterRefunds =
            (float) $fuelSales
            + (float) $storeSales
            - (float) $approvedRefunds;

        return response()->json([
            'success' => true,
            'data' => [
                'fuel_sales' => (float) $fuelSales,
                'store_sales' => (float) $storeSales,
                'approved_refunds' => (float) $approvedRefunds,
                'maintenance_cost' => (float) $maintenanceCost,
                'revenue_after_refunds' => $revenueAfterRefunds,
            ],
        ]);
    }


/**
 * GET /api/reports/integrated-overview
 * បង្ហាញ Revenue និង Expenses តាមសប្ដាហ៍។
 */
public function integratedOverview()
{
    // ចាប់ពីថ្ងៃចន្ទនៃសប្ដាហ៍មុន 6 សប្ដាហ៍
    $startDate = Carbon::now()
        ->startOfWeek()
        ->subWeeks(6);

    $endDate = Carbon::now()->endOfWeek();

    // ចំណូលពីការលក់ប្រេងដែលបានបង់ប្រាក់
    $fuelSales = DB::table('fuel_sales')
        ->selectRaw(
            'YEARWEEK(sale_date, 3) AS week_key,
             SUM(total_amount) AS total'
        )
        ->where('payment_status', 'paid')
        ->whereBetween('sale_date', [$startDate, $endDate])
        ->groupBy('week_key')
        ->pluck('total', 'week_key');

    // ចំណូលពីការលក់ទំនិញដែលបានបង់ប្រាក់
    $storeSales = DB::table('store_sales')
        ->selectRaw(
            'YEARWEEK(sale_date, 3) AS week_key,
             SUM(total_amount) AS total'
        )
        ->where('payment_status', 'paid')
        ->whereBetween('sale_date', [$startDate, $endDate])
        ->groupBy('week_key')
        ->pluck('total', 'week_key');

    // Refund ដែលបានអនុម័ត
    $refunds = DB::table('refunds')
        ->selectRaw(
            'YEARWEEK(refund_date, 3) AS week_key,
             SUM(refund_amount) AS total'
        )
        ->where('status', 'approved')
        ->whereBetween('refund_date', [$startDate, $endDate])
        ->groupBy('week_key')
        ->pluck('total', 'week_key');

    // ចំណាយទិញប្រេងដែលបានទទួលរួច
    $fuelExpenses = DB::table('fuel_purchase_history')
        ->selectRaw(
            'YEARWEEK(received_date, 3) AS week_key,
             SUM(total_cost) AS total'
        )
        ->where('status', 'completed')
        ->whereNotNull('received_date')
        ->whereBetween('received_date', [$startDate, $endDate])
        ->groupBy('week_key')
        ->pluck('total', 'week_key');

    // ចំណាយថែទាំឧបករណ៍ដែលបានបញ្ចប់
    $equipmentCosts = DB::table('equipment_maintenance')
        ->selectRaw(
            'YEARWEEK(performed_date, 3) AS week_key,
             SUM(cost) AS total'
        )
        ->where('status', 'completed')
        ->whereNotNull('performed_date')
        ->whereBetween('performed_date', [$startDate, $endDate])
        ->groupBy('week_key')
        ->pluck('total', 'week_key');

    // ចំណាយថែទាំ Fuel Pumps ដែលបានបញ្ចប់
    $pumpCosts = DB::table('pump_maintenance')
        ->selectRaw(
            'YEARWEEK(performed_date, 3) AS week_key,
             SUM(cost) AS total'
        )
        ->where('status', 'completed')
        ->whereNotNull('performed_date')
        ->whereBetween('performed_date', [$startDate, $endDate])
        ->groupBy('week_key')
        ->pluck('total', 'week_key');

    $data = [];

    // បង្កើតទិន្នន័យ 7 សប្ដាហ៍ រួមទាំងសប្ដាហ៍បច្ចុប្បន្ន
    for ($i = 0; $i < 7; $i++) {
        $weekStart = $startDate->copy()->addWeeks($i);
        $weekEnd = $weekStart->copy()->endOfWeek();

        $weekKey = (int) $weekStart->format('oW');

        $revenue =
            (float) ($fuelSales[$weekKey] ?? 0)
            + (float) ($storeSales[$weekKey] ?? 0)
            - (float) ($refunds[$weekKey] ?? 0);

        $expenses =
            (float) ($fuelExpenses[$weekKey] ?? 0)
            + (float) ($equipmentCosts[$weekKey] ?? 0)
            + (float) ($pumpCosts[$weekKey] ?? 0);

        $data[] = [
            'week' => $weekStart->format('d M'),
            'week_end' => $weekEnd->format('d M'),
            'revenue' => round($revenue, 2),
            'expenses' => round($expenses, 2),
        ];
    }

    return response()->json([
        'success' => true,
        'data' => $data,
    ]);
}


/**
 * GET /api/reports/sales-by-payment-method
 * បង្ហាញចំណូល និងចំនួនប្រតិបត្តិការតាមវិធីបង់ប្រាក់។
 */
public function salesByPaymentMethod()
{
    // ប្រមូលការលក់ប្រេងតាមវិធីបង់ប្រាក់
    $fuelSales = DB::table('fuel_sales')
        ->selectRaw(
            "payment_method,
             SUM(total_amount) AS total_sales,
             COUNT(*) AS transaction_count"
        )
        ->where('payment_status', 'paid')
        ->groupBy('payment_method')
        ->get();

    // ប្រមូលការលក់ទំនិញតាមវិធីបង់ប្រាក់
    $storeSales = DB::table('store_sales')
        ->selectRaw(
            "payment_method,
             SUM(total_amount) AS total_sales,
             COUNT(*) AS transaction_count"
        )
        ->where('payment_status', 'paid')
        ->groupBy('payment_method')
        ->get();

    // បូកលទ្ធផលទាំងពីរតាម payment_method
    $data = $fuelSales
        ->concat($storeSales)
        ->groupBy('payment_method')
        ->map(function ($items, $method) {
            return [
                'payment_method' => $method,
                'total_sales' => round(
                    (float) $items->sum('total_sales'),
                    2
                ),
                'transaction_count' => (int) $items
                    ->sum('transaction_count'),
            ];
        })
        ->values();

    return response()->json([
        'success' => true,
        'data' => $data,
    ]);
}


/**
 * GET /api/reports/store-categories
 * បង្ហាញចំណូលតាមប្រភេទទំនិញដែលបានលក់។
 */
public function storeCategories()
{
    $data = DB::table('store_sale_items as items')
        ->join(
            'store_sales as sales',
            'items.store_sale_id',
            '=',
            'sales.store_sale_id'
        )
        ->join(
            'products',
            'items.product_id',
            '=',
            'products.product_id'
        )
        ->join(
            'product_categories as categories',
            'products.category_id',
            '=',
            'categories.category_id'
        )
        ->where('sales.payment_status', 'paid')
        ->selectRaw(
            'categories.category_id,
             categories.category_name,
             SUM(items.quantity) AS units_sold,
             SUM(items.subtotal - COALESCE(items.discount, 0))
                AS total_sales'
        )
        ->groupBy(
            'categories.category_id',
            'categories.category_name'
        )
        ->orderByDesc('total_sales')
        ->limit(10)
        ->get()
        ->map(function ($item) {
            return [
                'category_id' => (int) $item->category_id,
                'category_name' => $item->category_name,
                'units_sold' => (float) $item->units_sold,
                'total_sales' => round(
                    (float) $item->total_sales,
                    2
                ),
            ];
        });

    return response()->json([
        'success' => true,
        'data' => $data,
    ]);
}


}