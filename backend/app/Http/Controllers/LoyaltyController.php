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

        // 1. Search by customer name or phone
        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // 2. Filter by loyalty tier (case-insensitive)
        if (
            $request->filled('tier') &&
            strtolower(trim($request->input('tier'))) !== 'all'
        ) {
            $tier = strtolower(trim($request->input('tier')));

            $query->whereRaw(
                'LOWER(loyalty_membership) = ?',
                [$tier]
            );
        }

        $customers = $query
            ->orderBy('customer_id')
            ->get();

        $data = $customers->map(function ($customer) {

            // 3. Paid fuel sales
            $fuelSales = $customer->fuelSales()
                ->where('payment_status', 'paid');

            // 4. Paid convenience-store sales
            $storeSales = $customer->storeSales()
                ->where('payment_status', 'paid');

            $fuelCount = (clone $fuelSales)->count();
            $storeCount = (clone $storeSales)->count();

            $fuelSpent = (float) (clone $fuelSales)
                ->sum('total_amount');

            $storeSpent = (float) (clone $storeSales)
                ->sum('total_amount');

            // 5. Latest paid fuel/store sale dates
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

            // 6. Loyalty transaction history
            $transactions = $customer->loyaltyTransactions();

            $pointsEarned = (int) (clone $transactions)
                ->sum('points_earned');

            $pointsRedeemed = (int) (clone $transactions)
                ->sum('points_used');

            // Current balance is stored in customers.loyalty_points
            $pointsBalance = (int) ($customer->loyalty_points ?? 0);

            // 7. Find approved refunds linked to customer sales
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

            // 8. Total paid sales amount (before refunds)
            $totalSpent = round(
                $fuelSpent + $storeSpent,
                2
            );

            // 9. Return data for Loyalty.jsx
            return [
                'id' => $customer->customer_id,
                'customer_id' => $customer->customer_id,

                'customer_code' => $customer->customer_code,
                'full_name' => $customer->full_name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'address' => $customer->address,

                'date_of_birth' => $customer->date_of_birth,
                'dob' => $customer->date_of_birth,
                'memberSince' => $customer->registered_at,

                'tier' => strtoupper(
                    $customer->loyalty_membership ?? 'none'
                ),

                'loyalty_membership' =>
                    $customer->loyalty_membership,

                // Current points balance
                'points' => $pointsBalance,
                'loyalty_points' => $pointsBalance,

                // Historical points totals
                'pointsEarned' => $pointsEarned,
                'pointsRedeemed' => $pointsRedeemed,

                // Purchase information
                'lastVisit' => $lastVisit,
                'lastPurchase' => $lastVisit,
                'totalPurchases' => $fuelCount + $storeCount,
                'totalSpent' => $totalSpent,
                'totalRefund' => round($totalRefund, 2),

                // Customer status
                'active' => $customer->is_active ? 'Yes' : 'No',
                'is_active' => (bool) $customer->is_active,
            ];
        });

        return response()->json([
            'message' => 'Loyalty customers retrieved successfully.',
            'data' => $data,
        ]);
    }
}