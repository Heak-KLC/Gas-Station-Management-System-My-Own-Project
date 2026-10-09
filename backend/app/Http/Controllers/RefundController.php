<?php

namespace App\Http\Controllers;

use App\Models\Refund;
use App\Models\FuelSale;
use App\Models\StoreSale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class RefundController extends Controller
{
    /**
     * Get Refund History.
     */
    public function index(Request $request)
    {
        $query = Refund::with('processedBy');

        // Filter by refund status, if provided.
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Return newest refund requests first.
        return response()->json(
            $query->orderBy('refund_id', 'desc')->paginate(15)
        );
    }

    /**
     * Create a new Refund Request.
     */
    public function store(Request $request)
    {
        // Validate the submitted refund information.
        $validated = $request->validate([
            'original_sale_id' => [
                'nullable',
                'integer',
                'exists:fuel_sales,sale_id',
            ],

            'original_store_sale_id' => [
                'nullable',
                'integer',
                'exists:store_sales,store_sale_id',
            ],

            'refund_amount' => [
                'required',
                'numeric',
                'gt:0',
            ],

            'reason' => [
                'nullable',
                'string',
            ],
        ]);

        $fuelSaleId = $validated['original_sale_id'] ?? null;
        $storeSaleId = $validated['original_store_sale_id'] ?? null;

        // A refund must refer to exactly one sale.
        if (($fuelSaleId === null) === ($storeSaleId === null)) {
            return response()->json([
                'message' =>
                    'Provide exactly one Fuel Sale ID or Store Sale ID.',
            ], 422);
        }

        // The authenticated user creates the request.
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        try {
            $refund = DB::transaction(function () use (
                $validated,
                $fuelSaleId,
                $storeSaleId,
                $user
            ) {
                $saleTotal = 0;

                /*
                 * Step 1: Lock the original sale and verify
                 * that its payment has been completed.
                 */
                if ($fuelSaleId !== null) {
                    $sale = FuelSale::where(
                        'sale_id',
                        $fuelSaleId
                    )->lockForUpdate()->firstOrFail();

                    if ($sale->payment_status !== 'paid') {
                        throw ValidationException::withMessages([
                            'sale' =>
                                'Only paid fuel sales can be refunded.',
                        ]);
                    }

                    $saleTotal = (float) $sale->total_amount;

                    $existingRefunds = Refund::where(
                        'original_sale_id',
                        $fuelSaleId
                    )->whereIn('status', [
                        'pending',
                        'approved',
                    ])->sum('refund_amount');
                } else {
                    $sale = StoreSale::where(
                        'store_sale_id',
                        $storeSaleId
                    )->lockForUpdate()->firstOrFail();

                    if ($sale->payment_status !== 'paid') {
                        throw ValidationException::withMessages([
                            'sale' =>
                                'Only paid store sales can be refunded.',
                        ]);
                    }

                    $saleTotal = (float) $sale->total_amount;

                    $existingRefunds = Refund::where(
                        'original_store_sale_id',
                        $storeSaleId
                    )->whereIn('status', [
                        'pending',
                        'approved',
                    ])->sum('refund_amount');
                }

                /*
                 * Step 2: Calculate the remaining refundable amount.
                 */
                $remainingAmount = round(
                    $saleTotal - (float) $existingRefunds,
                    2
                );

                $refundAmount = round(
                    (float) $validated['refund_amount'],
                    2
                );

                if (
                    $refundAmount <= 0 ||
                    $refundAmount > $remainingAmount
                ) {
                    throw ValidationException::withMessages([
                        'refund_amount' =>
                            'Refund amount exceeds the remaining refundable amount: '
                            . number_format($remainingAmount, 2, '.', ''),
                    ]);
                }

                /*
                 * Step 3: Save the new request as pending.
                 */
                return Refund::create([
                    'original_sale_id' => $fuelSaleId,
                    'original_store_sale_id' => $storeSaleId,
                    'refund_amount' => $refundAmount,
                    'refund_date' => now(),
                    'reason' => $validated['reason'] ?? null,
                    'processed_by' => $user->user_id,
                    'status' => 'pending',
                ]);
            });

            return response()->json([
                'message' => 'Refund request created successfully.',
                'data' => $refund->load('processedBy'),
            ], 201);

        } catch (ValidationException $e) {
            throw $e;

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'The original sale was not found.',
            ], 404);
        }
    }

    /**
     * Get details of one Refund.
     */
    public function show($refundId)
    {
        $refund = Refund::with('processedBy')
            ->where('refund_id', $refundId)
            ->first();

        if (!$refund) {
            return response()->json([
                'message' => 'Refund request not found.',
            ], 404);
        }

        return response()->json([
            'data' => $refund,
        ]);
    }

    /**
     * Approve a pending refund request.
     * Only Admin and Manager can approve.
     */
    public function approve(Request $request, $refundId)
    {
        // Check that the user is authenticated.
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Only Admin and Manager can approve refunds.
        $role = strtolower(trim((string) $user->role));

        if (!in_array($role, ['admin', 'manager'], true)) {
            return response()->json([
                'message' => 'Only Admin or Manager can approve refunds.',
            ], 403);
        }

        try {
            $refund = DB::transaction(function () use ($refundId) {
                // Find and lock the refund request.
                $refund = Refund::where(
                    'refund_id',
                    $refundId
                )->lockForUpdate()->firstOrFail();

                // A refund can only be approved while pending.
                if ($refund->status !== 'pending') {
                    throw ValidationException::withMessages([
                        'status' =>
                            'Only pending refund requests can be approved.',
                    ]);
                }

                // Update the request status.
                $refund->status = 'approved';
                $refund->save();

                return $refund;
            });

            return response()->json([
                'message' => 'Refund request approved successfully.',
                'data' => $refund->load('processedBy'),
            ]);

        } catch (ValidationException $e) {
            throw $e;

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Refund request not found.',
            ], 404);
        }
    }

    /**
     * Reject a pending refund request.
     * Only Admin and Manager can reject.
     */
    public function reject(Request $request, $refundId)
    {
        // Check that the user is authenticated.
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Only Admin and Manager can reject refunds.
        $role = strtolower(trim((string) $user->role));

        if (!in_array($role, ['admin', 'manager'], true)) {
            return response()->json([
                'message' => 'Only Admin or Manager can reject refunds.',
            ], 403);
        }

        try {
            $refund = DB::transaction(function () use ($refundId) {
                // Find and lock the refund request.
                $refund = Refund::where(
                    'refund_id',
                    $refundId
                )->lockForUpdate()->firstOrFail();

                // A refund can only be rejected while pending.
                if ($refund->status !== 'pending') {
                    throw ValidationException::withMessages([
                        'status' =>
                            'Only pending refund requests can be rejected.',
                    ]);
                }

                // Update the request status.
                $refund->status = 'rejected';
                $refund->save();

                return $refund;
            });

            return response()->json([
                'message' => 'Refund request rejected successfully.',
                'data' => $refund->load('processedBy'),
            ]);

        } catch (ValidationException $e) {
            throw $e;

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Refund request not found.',
            ], 404);
        }
    }
}