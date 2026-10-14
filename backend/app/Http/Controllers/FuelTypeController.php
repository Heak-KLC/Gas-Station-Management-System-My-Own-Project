<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\FuelType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FuelTypeController extends Controller
{
    // =========================================================
    // GET /api/fuel-types
    // Get all fuel types.
    // =========================================================
    public function index()
    {
        // Keep the existing query and response unchanged.
        $fuelTypes = FuelType::orderBy('fuel_id')->get();

        return response()->json($fuelTypes);
    }

    // =========================================================
    // PUT /api/fuel-types/{id}
    // Update selling price and record an audit log.
    // =========================================================
    public function update(Request $request, $id)
    {
        // Validate the new selling price.
        $validated = $request->validate([
            'selling_price' => 'required|numeric|min:0',
        ]);

        // Update the fuel price and audit log atomically.
        $fuelType = DB::transaction(function () use (
            $request,
            $id,
            $validated
        ) {
            // Find and lock the fuel type before updating.
            $fuelType = FuelType::where('fuel_id', $id)
                ->lockForUpdate()
                ->firstOrFail();

            // Capture the original selling price.
            $oldValues = [
                'selling_price' => $fuelType->selling_price,
            ];

            // Update the selling price.
            $fuelType->selling_price = $validated['selling_price'];

            // Save the updated fuel type.
            $fuelType->save();

            // Record the change in the audit_logs table.
            AuditLog::create([
                // Identify the authenticated user.
                'user_id' => $request->user()?->user_id,

                // Record the action and affected fuel type.
                'action' => 'UPDATE',
                'entity_type' => 'FuelType',
                'entity_id' => $fuelType->fuel_id,

                // Store the previous selling price as JSON.
                'old_value' => json_encode(
                    $oldValues,
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ),

                // Store the new selling price as JSON.
                'new_value' => json_encode(
                    [
                        'selling_price' => $fuelType->selling_price,
                    ],
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ),

                // Record the request IP address.
                'ip_address' => $request->ip(),
            ]);

            return $fuelType;
        });

        return response()->json([
            'message' => 'Fuel price updated successfully.',
            'data' => $fuelType,
        ]);
    }
}
