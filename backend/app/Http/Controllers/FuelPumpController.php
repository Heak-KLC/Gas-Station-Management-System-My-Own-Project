<?php

namespace App\Http\Controllers;

use App\Models\FuelPump;
use Illuminate\Http\Request;

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
    // Create a new fuel pump.
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

        // Default status.
        $validated['status'] =
            $validated['status'] ?? 'available';

        // Default meter reading.
        $validated['meter_reading'] =
            $validated['meter_reading'] ?? 0;

        // Create pump.
        $fuelPump = FuelPump::create($validated);

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
    // Update fuel pump.
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

        $fuelPump->update($validated);

        $fuelPump->load('fuelType');

        return response()->json([
            'message' => 'Fuel pump updated successfully.',
            'fuel_pump' => $fuelPump,
        ]);
    }

    // =========================================================
    // DELETE /api/fuel-pumps/{fuel_pump}
    // Delete fuel pump.
    // =========================================================
    public function destroy(FuelPump $fuelPump)
    {
        // -----------------------------------------------------
        // Do not delete a pump if it already has fuel sales.
        // This protects historical sales data.
        // -----------------------------------------------------
        if ($fuelPump->fuelSales()->exists()) {
            return response()->json([
                'message' =>
                    'This pump cannot be deleted because it has fuel sales.',
            ], 409);
        }

        $fuelPump->delete();

        return response()->json([
            'message' => 'Fuel pump deleted successfully.',
        ]);
    }
}