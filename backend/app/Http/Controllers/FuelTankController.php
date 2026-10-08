<?php

namespace App\Http\Controllers;

use App\Models\FuelTank;
use Illuminate\Http\Request;

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
    // Create a new fuel tank.
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

        // Return the newly created tank with its fuel type.
        return response()->json(
            $tank->load('fuelType'),
            201
        );
    }


    // =========================================================
    // PUT/PATCH /api/fuel-tanks/{id}
    // Update an existing fuel tank.
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
                'message' => 'Current volume cannot be greater than tank capacity.'
            ], 422);
        }

        // Prevent minimum volume from being greater than capacity.
        if ($validated['min_volume'] > $validated['capacity']) {
            return response()->json([
                'message' => 'Minimum volume cannot be greater than tank capacity.'
            ], 422);
        }

        // Update the tank information.
        $tank->update([
            'fuel_id' => $validated['fuel_id'],
            'capacity' => $validated['capacity'],
            'current_volume' => $validated['current_volume'],
            'min_volume' => $validated['min_volume'],
            'location' => $validated['location'],
        ]);

        // Return the updated tank with its fuel type.
        return response()->json(
            $tank->load('fuelType')
        );
    }


    // =========================================================
    // DELETE /api/fuel-tanks/{id}
    // Delete a fuel tank.
    // =========================================================
    public function destroy($id)
    {
        // Find the tank by its primary key.
        $tank = FuelTank::findOrFail($id);

        // Delete the tank.
        $tank->delete();

        // Return success message.
        return response()->json([
            'message' => 'Tank deleted successfully.'
        ]);
    }
}