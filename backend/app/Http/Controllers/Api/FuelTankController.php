<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FuelTank;
use Illuminate\Http\Request;

class FuelTankController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // ดึงទិន្នន័យស្តុកប្រេងទាំងអស់ពី Database មកបង្ហាញ
        return response()->json(FuelTank::all(), 200);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // ពិនិត្យទិន្នន័យមុននឹងរក្សាទុក
        $validated = $request->validate([
            'tank_number' => 'required|string|unique:fuel_tanks,tank_number',
            'fuel_type' => 'required|string',
            'capacity' => 'required|numeric',
            'current_volume' => 'required|numeric',
            'min_volume' => 'required|numeric',
            'location' => 'nullable|string',
        ]);

        // រក្សាទុកចូល Database
        $tank = FuelTank::create($validated);
        return response()->json($tank, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(FuelTank $fuelTank)
    {
        // បង្ហាញព័ត៌មានលម្អិតតាម Tank នីមួយៗ
        return response()->json($fuelTank, 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, FuelTank $fuelTank)
    {
        // កែសម្រួលទិន្នន័យ
        $validated = $request->validate([
            'tank_number' => 'sometimes|string|unique:fuel_tanks,tank_number,' . $fuelTank->id,
            'fuel_type' => 'sometimes|string',
            'capacity' => 'sometimes|numeric',
            'current_volume' => 'sometimes|numeric',
            'min_volume' => 'sometimes|numeric',
            'status' => 'sometimes|string',
            'location' => 'nullable|string',
        ]);

        $fuelTank->update($validated);
        return response()->json($fuelTank, 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FuelTank $fuelTank)
    {
        // លុបទិន្នន័យចេញពី Database
        $fuelTank->delete();
        return response()->json(['message' => 'Fuel tank deleted successfully'], 200);
    }
}