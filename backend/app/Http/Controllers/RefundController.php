<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
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
     * Create a new Refund Request and record an audit log.
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
                $request,
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
                 * Step 3: Create the refund request as pending.
                 */
                $refund = Refund::create([
                    'original_sale_id' => $fuelSaleId,
                    'original_store_sale_id' => $storeSaleId,
                    'refund_amount' => $refundAmount,
                    'refund_date' => now(),
                    'reason' => $validated['reason'] ?? null,
                    'processed_by' => $user->user_id,
                    'status' => 'pending',
                ]);

                // Record the creation in the same transaction.
                $this->recordAuditLog(
                    $request,
                    'CREATE',
                    $refund->refund_id,
                    null,
                    $this->getRefundAuditValues($refund)
                );

                return $refund;
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
            $refund = DB::transaction(function () use (
                $request,
                $refundId
            ) {
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

                // Capture the original values before the update.
                $oldValues = $this->getRefundAuditValues($refund);

                // Update the request status.
                $refund->status = 'approved';
                $refund->save();

                // Record the approval with old and new values.
                $this->recordAuditLog(
                    $request,
                    'APPROVE',
                    $refund->refund_id,
                    $oldValues,
                    $this->getRefundAuditValues($refund)
                );

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
            $refund = DB::transaction(function () use (
                $request,
                $refundId
            ) {
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

                // Capture the original values before the update.
                $oldValues = $this->getRefundAuditValues($refund);

                // Update the request status.
                $refund->status = 'rejected';
                $refund->save();

                // Record the rejection with old and new values.
                $this->recordAuditLog(
                    $request,
                    'REJECT',
                    $refund->refund_id,
                    $oldValues,
                    $this->getRefundAuditValues($refund)
                );

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

    /**
     * Return the refund fields that should be recorded in audit logs.
     */
    private function getRefundAuditValues(Refund $refund): array
    {
        return [
            'original_sale_id' => $refund->original_sale_id,
            'original_store_sale_id' => $refund->original_store_sale_id,
            'refund_amount' => $refund->refund_amount,
            'refund_date' => $refund->refund_date,
            'reason' => $refund->reason,
            'processed_by' => $refund->processed_by,
            'status' => $refund->status,
        ];
    }

    /**
     * Save an audit log for a refund action.
     */
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        AuditLog::create([
            // Store the ID of the authenticated user performing the action.
            'user_id' => $request->user()?->user_id,

            // Store the action and the affected entity.
            'action' => $action,
            'entity_type' => 'Refund',
            'entity_id' => $entityId,

            // Encode old and new values as JSON.
            'old_value' => $oldValues === null
                ? null
                : json_encode(
                    $oldValues,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ),

            'new_value' => $newValues === null
                ? null
                : json_encode(
                    $newValues,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ),

            // Store the request IP address.
            'ip_address' => $request->ip(),
        ]);
    }
}
