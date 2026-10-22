<?php

namespace App\Http\Controllers;

use App\Models\FuelPump;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Validator;

class FuelPumpController extends Controller
{
    /**
     * GET /api/fuel-pumps
     * Get all fuel pumps with their fuel types.
     */
    
public function index()
{
    $fuelPumps = FuelPump::with([
        'fuelType',
        'tank',
        'attendant',
    ])
        ->orderByDesc('pump_id')
        ->get();

    return response()->json($fuelPumps);
}


    /**
     * POST /api/fuel-pumps
     * Create a fuel pump and record its activity.
     */
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
            'tank_id' => [
                'nullable',
                'integer',
                'exists:fuel_tanks,tank_id',
            ],
            'employee_id' => [
                'nullable',
                'integer',
                'exists:employees,employee_id',
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
            'status_reason' => 'nullable|string|max:500',
        ]);

        // status_reason belongs in the audit log, not fuel_pumps.
        $statusReason = $validated['status_reason'] ?? null;
        unset($validated['status_reason']);

        // Apply defaults.
        $validated['status'] =
            $validated['status'] ?? 'available';

        $validated['meter_reading'] =
            $validated['meter_reading'] ?? 0;

        $fuelPump = DB::transaction(function () use (
            $validated,
            $statusReason,
            $request
        ) {
            $fuelPump = FuelPump::create($validated);

            $newValues = $this->getPumpValues($fuelPump);

            if ($statusReason !== null && trim($statusReason) !== '') {
                $newValues['status_reason'] = trim($statusReason);
            }

            $this->recordAuditLog(
                $request,
                'CREATE',
                $fuelPump->pump_id,
                null,
                $newValues
            );

            return $fuelPump;
        });

        $fuelPump->load([
    'fuelType',
    'tank',
    'attendant',
]);

        return response()->json([
            'message' => 'Fuel pump created successfully.',
            'fuel_pump' => $fuelPump,
        ], 201);
    }

    /**
     * GET /api/fuel-pumps/{fuel_pump}
     * Get one fuel pump.
     */
    public function show(FuelPump $fuelPump)
    {
        $fuelPump->load([
            'fuelType',
            'tank',
            'attendant',
        ]);

        return response()->json($fuelPump);
    }

    /**
     * PUT/PATCH /api/fuel-pumps/{fuel_pump}
     * Update a fuel pump and record old/new values.
     */
    public function update(Request $request, FuelPump $fuelPump)
    {
        $validated = $request->validate([
            'pump_number' => [
                'required',
                'string',
                'max:20',
                'unique:fuel_pumps,pump_number,'
                    . $fuelPump->pump_id . ',pump_id',
            ],
            'fuel_id' => [
                'required',
                'integer',
                'exists:fuel_types,fuel_id',
            ],
            'tank_id' => [
    'nullable',
    'integer',
    'exists:fuel_tanks,tank_id',
],

'employee_id' => [
    'nullable',
    'integer',
    \Illuminate\Validation\Rule::exists(
        'employees',
        'employee_id'
    )->where(function ($query) {
        $query->where('role', 'fuel_attendant')
              ->where('is_active', 1);
    }),
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
            'status_reason' => 'nullable|string|max:500',
        ]);

        // Extract reason before updating the fuel_pumps table.
        $statusReason = $validated['status_reason'] ?? null;
        unset($validated['status_reason']);

        $result = DB::transaction(function () use (
            $fuelPump,
            $validated,
            $statusReason,
            $request
        ) {
            // Capture old values before making changes.
            $oldValues = $this->getPumpValues($fuelPump);

            $oldStatus = $fuelPump->status;
            $newStatus = $validated['status'];

            // Update the pump.
            $fuelPump->update($validated);
            $fuelPump->refresh();

            // Capture actual values saved in the database.
            $newValues = $this->getPumpValues($fuelPump);

            // Store a reason only when one was supplied.
            if ($statusReason !== null && trim($statusReason) !== '') {
                $newValues['status_reason'] = trim($statusReason);
            }

            // Record all updates, including status changes.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $fuelPump->pump_id,
                $oldValues,
                $newValues
            );

            return [
                'fuel_pump' => $fuelPump,
                'status_changed' => $oldStatus !== $newStatus,
            ];
        });

        $fuelPump->load([
    'fuelType',
    'tank',
    'attendant',
]);

        return response()->json([
            'message' => 'Fuel pump updated successfully.',
            'fuel_pump' => $result['fuel_pump'],
            'status_changed' => $result['status_changed'],
        ]);
    }

    /**
     * DELETE /api/fuel-pumps/{fuel_pump}
     * Prevent deleting pumps that have fuel sales.
     */
    public function destroy(Request $request, FuelPump $fuelPump)
    {
        $deletedPumpId = $fuelPump->pump_id;

        DB::transaction(function () use ($fuelPump, $request) {
            // Lock the pump row while checking and deleting.
            $lockedPump = FuelPump::where(
                'pump_id',
                $fuelPump->pump_id
            )->lockForUpdate()->firstOrFail();

            // Keep historical sales safe.
            if ($lockedPump->fuelSales()->exists()) {
                abort(
                    response()->json([
                        'message' =>
                            'This pump cannot be deleted because it has fuel sales.',
                    ], 409)
                );
            }

            $oldValues = $this->getPumpValues($lockedPump);

            // Record deletion before removing the pump.
            $this->recordAuditLog(
                $request,
                'DELETE',
                $lockedPump->pump_id,
                $oldValues,
                null
            );

            $lockedPump->delete();
        });

        return response()->json([
            'message' => 'Fuel pump deleted successfully.',
            'pump_id' => $deletedPumpId,
        ]);
    }

    /**
     * GET /api/fuel-pumps-sales-today
     * Return today's paid sales grouped by pump.
     */
    public function salesToday()
    {
        $startOfDay = now()->startOfDay();
        $startOfTomorrow = $startOfDay->copy()->addDay();

        $sales = DB::table('fuel_sales')
            ->select('pump_id')
            ->selectRaw(
                'COALESCE(SUM(quantity), 0) AS liters_today'
            )
            ->selectRaw(
                'COALESCE(SUM(total_amount), 0) AS sales_today'
            )
            ->where('payment_status', 'paid')
            ->where('sale_date', '>=', $startOfDay)
            ->where('sale_date', '<', $startOfTomorrow)
            ->groupBy('pump_id')
            ->get();

        return response()->json($sales);
    }

    /**
     * Get the fields that should be saved in the audit log.
     */
    private function getPumpValues(FuelPump $fuelPump): array
    {
        return $fuelPump->only([
            'pump_id',
            'pump_number',
            'fuel_id',
            'tank_id',
            'employee_id',
            'status',
            'model',
            'serial_number',
            'installation_date',
            'last_maintenance_date',
            'next_maintenance_date',
            'meter_reading',
        ]);
    }

    /**
     * Write an audit log record.
     */
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        AuditLog::create([
            'user_id' => $request->user()?->user_id,
            'action' => $action,
            'entity_type' => 'FuelPump',
            'entity_id' => $entityId,

            'old_value' => $oldValues === null
                ? null
                : json_encode(
                    $oldValues,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                ),

            'new_value' => $newValues === null
                ? null
                : json_encode(
                    $newValues,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                ),

            'ip_address' => $request->ip(),
        ]);
    }
}
