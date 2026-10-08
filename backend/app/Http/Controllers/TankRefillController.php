<?php

namespace App\Http\Controllers;

use App\Models\TankRefill;
use App\Models\FuelTank;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TankRefillController extends Controller
{
    // =========================================================
    // GET /api/tank-refills
    // =========================================================
    // Get all tank refill records from the database.
    //
    // We also load:
    // 1. tank      -> information about the fuel tank
    // 2. fuelType  -> information about the fuel type
    // 3. refilledBy -> user who performed the refill
    //
    // This data will be used by React for
    // the "Recent Refills Log".
    public function index()
    {
        $refills = TankRefill::with([
            'tank',
            'fuelType',
            'refilledBy',
        ])
        ->orderByDesc('refill_date')
        ->get();

        return response()->json($refills);
    }


    // =========================================================
    // POST /api/tank-refills
    // =========================================================
    // Create a new tank refill and increase
    // the tank's current volume.
    public function store(Request $request)
    {
        // Validate the data received from React.
        $validated = $request->validate([
            'tank_id' => 'required|integer|exists:fuel_tanks,tank_id',
            'quantity' => 'required|numeric|min:0.001',
            'source' => 'nullable|string|max:50',
            'purchase_order_id' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        // Find the selected tank.
        $tank = FuelTank::findOrFail(
            $validated['tank_id']
        );

        // Calculate the new volume after refill.
        $newVolume =
            $tank->current_volume +
            $validated['quantity'];

        // Prevent the tank from exceeding its capacity.
        if ($newVolume > $tank->capacity) {
            return response()->json([
                'message' =>
                    'Refill quantity exceeds tank capacity.',

                'current_volume' =>
                    $tank->current_volume,

                'capacity' =>
                    $tank->capacity,

                'available_capacity' =>
                    $tank->capacity -
                    $tank->current_volume,
            ], 422);
        }

        // Use the fuel type already assigned to this tank.
        $fuelId = $tank->fuel_id;

        // Get the currently authenticated user.
        $userId =
            $request->user()->user_id;

        // Start database transaction.
        DB::beginTransaction();

        try {

            // Create refill record.
            $refill = TankRefill::create([
                'tank_id' =>
                    $tank->tank_id,

                'fuel_id' =>
                    $fuelId,

                'quantity' =>
                    $validated['quantity'],

                'refill_date' =>
                    now(),

                'refilled_by' =>
                    $userId,

                'source' =>
                    $validated['source'] ??
                    null,

                'purchase_order_id' =>
                    $validated['purchase_order_id'] ??
                    null,

                'notes' =>
                    $validated['notes'] ??
                    null,
            ]);

            // Increase the tank's current volume.
            $tank->current_volume =
                $newVolume;

            $tank->save();

            // Save both changes.
            DB::commit();

            return response()->json([
                'message' =>
                    'Tank refilled successfully.',

                'refill' =>
                    $refill->load([
                        'tank',
                        'fuelType',
                        'refilledBy',
                    ]),

                'tank' =>
                    $tank->load(
                        'fuelType'
                    ),
            ], 201);

        } catch (\Throwable $e) {

            // Undo database changes if an error occurs.
            DB::rollBack();

            return response()->json([
                'message' =>
                    'Failed to refill tank.',

                'error' =>
                    $e->getMessage(),
            ], 500);
        }
    }
}