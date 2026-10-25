<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Refund;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query();

        // Search by customer name or phone
        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter by loyalty tier
        if (
            $request->filled('tier') &&
            strtolower($request->tier) !== 'all'
        ) {
            $query->where(
                'loyalty_membership',
                strtolower($request->tier)
            );
        }

        $customers = $query
            ->orderBy('customer_id')
            ->get();

        $data = $customers->map(function ($customer) {

            // Paid fuel sales
            $fuelSales = $customer->fuelSales()
                ->where('payment_status', 'paid');

            // Paid convenience-store sales
            $storeSales = $customer->storeSales()
                ->where('payment_status', 'paid');

            $fuelCount = (clone $fuelSales)->count();
            $storeCount = (clone $storeSales)->count();

            $fuelSpent = (float) (clone $fuelSales)
                ->sum('total_amount');

            $storeSpent = (float) (clone $storeSales)
                ->sum('total_amount');

            // Latest paid sale dates
            $fuelLastVisit = (clone $fuelSales)
                ->max('sale_date');

            $storeLastVisit = (clone $storeSales)
                ->max('sale_date');

            $dates = collect([
                $fuelLastVisit,
                $storeLastVisit,
            ])->filter();

            $lastVisit = $dates->isEmpty()
                ? null
                : $dates->sortDesc()->first();

            // Loyalty points history
            $pointsEarned = (int) $customer
                ->loyaltyTransactions()
                ->sum('points_earned');

            $pointsRedeemed = (int) $customer
                ->loyaltyTransactions()
                ->sum('points_used');

            // Refunds associated with this customer's sales
            $fuelSaleIds = $customer->fuelSales()
                ->select('sale_id');

            $storeSaleIds = $customer->storeSales()
                ->select('store_sale_id');

            $totalRefund = (float) Refund::query()
                ->where('status', 'approved')
                ->where(function ($q) use (
                    $fuelSaleIds,
                    $storeSaleIds
                ) {
                    $q->whereIn(
                        'original_sale_id',
                        $fuelSaleIds
                    )->orWhereIn(
                        'original_store_sale_id',
                        $storeSaleIds
                    );
                })
                ->sum('refund_amount');

            return [
                'date_of_birth' => $customer->date_of_birth,
                'id' => $customer->customer_id,
                'customer_id' => $customer->customer_id,
                'full_name' => $customer->full_name,
                'customer_code' => $customer->customer_code,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'address' => $customer->address,

                'tier' => strtoupper(
                    $customer->loyalty_membership ?? 'none'
                ),
                'loyalty_membership' =>
                    $customer->loyalty_membership,

                'points' => (int) $customer->loyalty_points,
                'loyalty_points' =>
                    (int) $customer->loyalty_points,

                'lastVisit' => $lastVisit,
                'lastPurchase' => $lastVisit,

                'totalPurchases' => $fuelCount + $storeCount,
                'totalSpent' => round(
                    $fuelSpent + $storeSpent,
                    2
                ),

                'memberSince' => $customer->registered_at,

                // Requires a DOB column in the database
                'dob' => $customer->date_of_birth,

                'pointsEarned' => $pointsEarned,
                'pointsRedeemed' => $pointsRedeemed,

                'active' => $customer->is_active ? 'Yes' : 'No',
                'is_active' => $customer->is_active,

                'totalRefund' => round($totalRefund, 2),
            ];
        });

        return response()->json([
            'message' => 'Loyalty customers retrieved successfully.',
            'data' => $data,
        ]);
    }
}
