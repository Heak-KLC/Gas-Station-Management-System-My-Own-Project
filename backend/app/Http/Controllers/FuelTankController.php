<?php

namespace App\Http\Controllers;

use App\Models\FuelTank;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FuelTankController extends Controller
{
    // =========================================================
    // GET /api/fuel-tanks
    // Get all fuel tanks with their related fuel type.
    // =========================================================
    public function index()
    {
        $tanks = FuelTank::with('fuelType')->get();

        return response()->json($tanks);
    }


    // =========================================================
    // POST /api/fuel-tanks
    // Create a new fuel tank and record the activity.
    // =========================================================
    public function store(Request $request)
    {
        // Validate data received from React frontend.
        $validated = $request->validate([
            'tank_number' => 'required|string|max:20|unique:fuel_tanks,tank_number',
            'fuel_id' => 'required|integer|exists:fuel_types,fuel_id',
            'capacity' => 'required|numeric|min:0',
            'current_volume' => 'required|numeric|min:0',
            'min_volume' => 'required|numeric|min:0',
            'location' => 'required|string|max:100',
        ]);

        // Prevent current volume from being greater than tank capacity.
        if ($validated['current_volume'] > $validated['capacity']) {
            return response()->json([
                'message' => 'Current volume cannot be greater than tank capacity.'
            ], 422);
        }

        // Prevent minimum volume from being greater than tank capacity.
        if ($validated['min_volume'] > $validated['capacity']) {
            return response()->json([
                'message' => 'Minimum volume cannot be greater than tank capacity.'
            ], 422);
        }

        // Create the tank and its audit log in one transaction.
        // If logging fails, the tank creation is rolled back too.
        $tank = DB::transaction(function () use ($validated, $request) {

            // Create the new fuel tank.
            $tank = FuelTank::create([
                'tank_number' => $validated['tank_number'],
                'fuel_id' => $validated['fuel_id'],
                'capacity' => $validated['capacity'],
                'current_volume' => $validated['current_volume'],
                'min_volume' => $validated['min_volume'],

                // New tanks are active by default.
                'status' => 'active',

                'location' => $validated['location'],

                // Set the inspection date to today's date.
                'last_inspection' => now()->toDateString(),
            ]);

            // Capture the new tank information for the audit log.
            $newValues = $tank->only([
                'tank_number',
                'fuel_id',
                'capacity',
                'current_volume',
                'min_volume',
                'status',
                'location',
                'last_inspection',
            ]);

            // Record the CREATE activity.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $tank->getKey(),
                null,
                $newValues
            );

            return $tank;
        });

        // Return the newly created tank with its fuel type.
        return response()->json(
            $tank->load('fuelType'),
            201
        );
    }


    // =========================================================
    // PUT/PATCH /api/fuel-tanks/{id}
    // Update a fuel tank and record old/new values.
    // =========================================================
    public function update(Request $request, $id)
    {
        // Find the tank by its primary key.
        // If the tank does not exist, Laravel returns 404.
        $tank = FuelTank::findOrFail($id);

        // Validate updated data.
        $validated = $request->validate([
            'fuel_id' => 'required|integer|exists:fuel_types,fuel_id',
            'capacity' => 'required|numeric|min:0',
            'current_volume' => 'required|numeric|min:0',
            'min_volume' => 'required|numeric|min:0',
            'location' => 'required|string|max:100',
        ]);

        // Prevent current volume from being greater than capacity.
        if ($validated['current_volume'] > $validated['capacity']) {
            return response()->json([
                'message' => 'Current volume cannot be greater than capacity.'
            ], 422);
        }

        // Prevent minimum volume from being greater than capacity.
        if ($validated['min_volume'] > $validated['capacity']) {
            return response()->json([
                'message' => 'Minimum volume cannot be greater than capacity.'
            ], 422);
        }

        // Update the tank and record the activity atomically.
        $tank = DB::transaction(function () use ($tank, $validated, $request) {

            // Save the old values BEFORE updating the tank.
            $oldValues = $tank->only([
                'tank_number',
                'fuel_id',
                'capacity',
                'current_volume',
                'min_volume',
                'status',
                'location',
                'last_inspection',
            ]);

            // Update the existing tank information.
            $tank->update([
                'fuel_id' => $validated['fuel_id'],
                'capacity' => $validated['capacity'],
                'current_volume' => $validated['current_volume'],
                'min_volume' => $validated['min_volume'],
                'location' => $validated['location'],
            ]);

            // Refresh the model to get the latest database values.
            $tank->refresh();

            // Capture the new values AFTER updating the tank.
            $newValues = $tank->only([
                'tank_number',
                'fuel_id',
                'capacity',
                'current_volume',
                'min_volume',
                'status',
                'location',
                'last_inspection',
            ]);

            // Record the UPDATE activity with old and new values.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $tank->getKey(),
                $oldValues,
                $newValues
            );

            return $tank;
        });

        // Return the updated tank with its fuel type.
        return response()->json(
            $tank->load('fuelType')
        );
    }


    // =========================================================
    // DELETE /api/fuel-tanks/{id}
    // Record the tank information before deleting it.
    // =========================================================
    public function destroy(Request $request, $id)
    {
        // Find the tank by its primary key.
        $tank = FuelTank::findOrFail($id);

        // Delete the tank and record its previous information.
        DB::transaction(function () use ($tank, $request) {

            // Capture the tank information BEFORE deletion.
            $oldValues = $tank->only([
                'tank_number',
                'fuel_id',
                'capacity',
                'current_volume',
                'min_volume',
                'status',
                'location',
                'last_inspection',
            ]);

            // Record the DELETE activity before deleting the tank.
            $this->recordAuditLog(
                $request,
                'DELETE',
                $tank->getKey(),
                $oldValues,
                null
            );

            // Delete the tank.
            $tank->delete();
        });

        // Return the existing success message.
        return response()->json([
            'message' => 'Tank deleted successfully.'
        ]);
    }


    // =========================================================
    // Reusable helper for writing audit_logs records.
    // This avoids repeating the same logging code in each method.
    // =========================================================
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ) {
        AuditLog::create([
            // Store the ID of the currently authenticated user.
            'user_id' => $request->user()?->user_id,

            // CREATE, UPDATE, or DELETE.
            'action' => $action,

            // Identify the type of record being changed.
            'entity_type' => 'FuelTank',

            // Identify the affected tank.
            'entity_id' => $entityId,

            // Convert arrays to JSON strings for MySQL LONGTEXT columns.
            'old_value' => $oldValues === null
                ? null
                : json_encode($oldValues, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),

            'new_value' => $newValues === null
                ? null
                : json_encode($newValues, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),

            // Record the request IP address.
            'ip_address' => $request->ip(),
        ]);
    }
}
