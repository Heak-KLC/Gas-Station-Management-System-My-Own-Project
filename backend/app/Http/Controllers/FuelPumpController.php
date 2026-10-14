<?php

namespace App\Http\Controllers;

use App\Models\FuelPump;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FuelPumpController extends Controller
{
    // =========================================================
    // GET /api/fuel-pumps
    // Get all fuel pumps.
    // =========================================================
    public function index()
    {
        $fuelPumps = FuelPump::with('fuelType')
            ->orderBy('pump_id', 'desc')
            ->get();

        return response()->json($fuelPumps);
    }

    // =========================================================
    // POST /api/fuel-pumps
    // Create a new fuel pump and record its activity.
    // =========================================================
    public function store(Request $request)
    {
        $validated = $request->validate([
            'pump_number' => [
                'required',
                'string',
                'max:20',
                'unique:fuel_pumps,pump_number',
            ],

            'fuel_id' => [
                'required',
                'integer',
                'exists:fuel_types,fuel_id',
            ],

            'status' => [
                'nullable',
                'in:available,in_use,under_maintenance,out_of_service',
            ],

            'model' => 'nullable|string|max:50',
            'serial_number' => 'nullable|string|max:50',
            'installation_date' => 'nullable|date',
            'last_maintenance_date' => 'nullable|date',
            'next_maintenance_date' => 'nullable|date',

            'meter_reading' => [
                'nullable',
                'numeric',
                'min:0',
            ],
        ]);

        // Apply default values when optional values are missing.
        $validated['status'] =
            $validated['status'] ?? 'available';

        $validated['meter_reading'] =
            $validated['meter_reading'] ?? 0;

        // Create the pump and its audit log in one transaction.
        $fuelPump = DB::transaction(function () use ($validated, $request) {

            // Create the new fuel pump.
            $fuelPump = FuelPump::create($validated);

            // Capture the newly created pump information.
            $newValues = $fuelPump->only([
                'pump_id',
                'pump_number',
                'fuel_id',
                'status',
                'model',
                'serial_number',
                'installation_date',
                'last_maintenance_date',
                'next_maintenance_date',
                'meter_reading',
            ]);

            // Record the CREATE activity.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $fuelPump->pump_id,
                null,
                $newValues
            );

            return $fuelPump;
        });

        // Return pump with Fuel Type.
        $fuelPump->load('fuelType');

        return response()->json([
            'message' => 'Fuel pump created successfully.',
            'fuel_pump' => $fuelPump,
        ], 201);
    }

    // =========================================================
    // GET /api/fuel-pumps/{fuel_pump}
    // Get one fuel pump.
    // =========================================================
    public function show(FuelPump $fuelPump)
    {
        $fuelPump->load('fuelType');

        return response()->json($fuelPump);
    }

    // =========================================================
    // PUT/PATCH /api/fuel-pumps/{fuel_pump}
    // Update fuel pump and record old/new values.
    // =========================================================
    public function update(
        Request $request,
        FuelPump $fuelPump
    ) {
        $validated = $request->validate([
            'pump_number' => [
                'required',
                'string',
                'max:20',
                'unique:fuel_pumps,pump_number,' .
                    $fuelPump->pump_id .
                    ',pump_id',
            ],

            'fuel_id' => [
                'required',
                'integer',
                'exists:fuel_types,fuel_id',
            ],

            'status' => [
                'required',
                'in:available,in_use,under_maintenance,out_of_service',
            ],

            'model' => 'nullable|string|max:50',
            'serial_number' => 'nullable|string|max:50',
            'installation_date' => 'nullable|date',
            'last_maintenance_date' => 'nullable|date',
            'next_maintenance_date' => 'nullable|date',

            'meter_reading' => [
                'nullable',
                'numeric',
                'min:0',
            ],
        ]);

        // Update the pump and audit log atomically.
        DB::transaction(function () use (
            $fuelPump,
            $validated,
            $request
        ) {
            // Capture the old values BEFORE updating.
            $oldValues = $fuelPump->only([
                'pump_id',
                'pump_number',
                'fuel_id',
                'status',
                'model',
                'serial_number',
                'installation_date',
                'last_maintenance_date',
                'next_maintenance_date',
                'meter_reading',
            ]);

            // Preserve the existing update logic.
            $fuelPump->update($validated);

            // Refresh the model to get current database values.
            $fuelPump->refresh();

            // Capture the new values AFTER updating.
            $newValues = $fuelPump->only([
                'pump_id',
                'pump_number',
                'fuel_id',
                'status',
                'model',
                'serial_number',
                'installation_date',
                'last_maintenance_date',
                'next_maintenance_date',
                'meter_reading',
            ]);

            // Record the UPDATE activity.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $fuelPump->pump_id,
                $oldValues,
                $newValues
            );
        });

        $fuelPump->load('fuelType');

        return response()->json([
            'message' => 'Fuel pump updated successfully.',
            'fuel_pump' => $fuelPump,
        ]);
    }

    // =========================================================
    // DELETE /api/fuel-pumps/{fuel_pump}
    // Delete fuel pump only when it has no fuel sales.
    // =========================================================
    public function destroy(
        Request $request,
        FuelPump $fuelPump
    ) {
        // Preserve the existing protection for historical sales.
        if ($fuelPump->fuelSales()->exists()) {
            return response()->json([
                'message' =>
                    'This pump cannot be deleted because it has fuel sales.',
            ], 409);
        }

        // Record the old pump information before deletion.
        DB::transaction(function () use ($fuelPump, $request) {

            $oldValues = $fuelPump->only([
                'pump_id',
                'pump_number',
                'fuel_id',
                'status',
                'model',
                'serial_number',
                'installation_date',
                'last_maintenance_date',
                'next_maintenance_date',
                'meter_reading',
            ]);

            // Record the DELETE activity before removing the pump.
            $this->recordAuditLog(
                $request,
                'DELETE',
                $fuelPump->pump_id,
                $oldValues,
                null
            );

            // Delete the pump after recording its information.
            $fuelPump->delete();
        });

        return response()->json([
            'message' => 'Fuel pump deleted successfully.',
        ]);
    }

    // =========================================================
    // Reusable helper for writing audit_logs records.
    // =========================================================
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ) {
        AuditLog::create([
            // ID of the authenticated user performing the action.
            'user_id' => $request->user()?->user_id,

            // CREATE, UPDATE, or DELETE.
            'action' => $action,

            // Identify the affected resource.
            'entity_type' => 'FuelPump',
            'entity_id' => $entityId,

            // Store old/new values as JSON strings.
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

            // Record the request IP address.
            'ip_address' => $request->ip(),
        ]);
    }
}
