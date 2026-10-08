<?php

namespace App\Http\Controllers;

use App\Models\FuelType;
use Illuminate\Http\Request;

class FuelTypeController extends Controller
{
    // =========================================================
    // GET /api/fuel-types
    // Get all fuel types.
    // Used by frontend when it needs fuel type information.
    // =========================================================
    public function index()
    {
        $fuelTypes = FuelType::orderBy('fuel_id')->get();

        return response()->json($fuelTypes);
    }

    // =========================================================
    // PUT /api/fuel-types/{id}
    // Update the selling price of a fuel type.
    // =========================================================
    public function update(Request $request, $id)
    {
        // Find the fuel type by fuel_id.
        // Return 404 automatically if it does not exist.
        $fuelType = FuelType::findOrFail($id);

        // Validate the new selling price.
        $validated = $request->validate([
            'selling_price' => 'required|numeric|min:0',
        ]);

        // Update selling price.
        $fuelType->selling_price =
            $validated['selling_price'];

        // Save changes.
        // Laravel will automatically update updated_at
        // if the table uses the standard Laravel timestamps.
        $fuelType->save();

        return response()->json([
            'message' => 'Fuel price updated successfully.',
            'data' => $fuelType,
        ]);
    }
}