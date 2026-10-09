<?php

namespace App\Http\Controllers;

use App\Models\EquipmentMaintenance;
use Illuminate\Http\Request;

class EquipmentMaintenanceController extends Controller
{
    /**
     * GET /api/equipment-maintenance
     * Retrieve all maintenance records.
     */
    public function index(Request $request)
    {
        // Start the query and include the employee who performed maintenance.
        $query = EquipmentMaintenance::with('performedBy');

        // Filter records by equipment type when requested.
        if ($request->filled('equipment_type')) {
            $query->where('equipment_type', $request->equipment_type);
        }

        // Filter records by status when requested.
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Return the newest scheduled maintenance first.
        $records = $query
            ->orderByDesc('scheduled_date')
            ->orderByDesc('maintenance_id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $records,
        ]);
    }

    /**
     * POST /api/equipment-maintenance
     * Create a maintenance record.
     */
    public function store(Request $request)
    {
        // Validate input against the enum values in the MySQL table.
        $validated = $request->validate([
            'equipment_type' => [
                'required',
                'in:pump,tank,dispenser,security_system,generator,other',
            ],
            'equipment_id' => 'required|integer|min:1',
            'scheduled_date' => 'required|date',
            'performed_date' => 'nullable|date',
            'maintenance_type' => [
                'required',
                'in:routine,repair,inspection,emergency',
            ],
            'description' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'status' => [
                'sometimes',
                'nullable',
                'in:scheduled,in_progress,completed,cancelled',
            ],
            'performed_by' => 'nullable|integer|exists:employees,employee_id',
            'notes' => 'nullable|string',
        ]);

        // Create the record using only validated fields.
        $record = EquipmentMaintenance::create($validated);

        // Return the newly created record, including employee details.
        return response()->json([
            'success' => true,
            'message' => 'Maintenance record created successfully.',
            'data' => $record->load('performedBy'),
        ], 201);
    }

    /**
     * GET /api/equipment-maintenance/{equipment_maintenance}
     * Retrieve one maintenance record.
     */
    public function show($id)
    {
        $record = EquipmentMaintenance::with('performedBy')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $record,
        ]);
    }

    /**
     * PUT/PATCH /api/equipment-maintenance/{equipment_maintenance}
     * Update an existing maintenance record.
     */
    public function update(Request $request, $id)
    {
        $record = EquipmentMaintenance::findOrFail($id);

        // Validate only the fields supplied for this update.
        $validated = $request->validate([
            'equipment_type' => [
                'sometimes',
                'required',
                'in:pump,tank,dispenser,security_system,generator,other',
            ],
            'equipment_id' => 'sometimes|required|integer|min:1',
            'scheduled_date' => 'sometimes|required|date',
            'performed_date' => 'sometimes|nullable|date',
            'maintenance_type' => [
                'sometimes',
                'required',
                'in:routine,repair,inspection,emergency',
            ],
            'description' => 'sometimes|nullable|string',
            'cost' => 'sometimes|nullable|numeric|min:0',
            'status' => [
                'sometimes',
                'nullable',
                'in:scheduled,in_progress,completed,cancelled',
            ],
            'performed_by' => 'sometimes|nullable|integer|exists:employees,employee_id',
            'notes' => 'sometimes|nullable|string',
        ]);

        // Apply validated changes and save the record.
        $record->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record updated successfully.',
            'data' => $record->fresh()->load('performedBy'),
        ]);
    }

    /**
     * DELETE /api/equipment-maintenance/{equipment_maintenance}
     * Delete a maintenance record.
     */
    public function destroy($id)
    {
        $record = EquipmentMaintenance::findOrFail($id);

        $record->delete();

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record deleted successfully.',
        ]);
    }
}