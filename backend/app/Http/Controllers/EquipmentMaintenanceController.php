<?php

namespace App\Http\Controllers;

use App\Models\EquipmentMaintenance;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentMaintenanceController extends Controller
{
    /**
     * GET /api/equipment-maintenance
     * Retrieve all maintenance records.
     */
    public function index(Request $request)
    {
        // Include the employee who performed the maintenance.
        $query = EquipmentMaintenance::with('performedBy');

        // Filter by equipment type.
        if ($request->filled('equipment_type')) {
            $query->where('equipment_type', $request->equipment_type);
        }

        // Filter by maintenance status.
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
     * Create a maintenance record and audit log.
     */
    public function store(Request $request)
    {
        // Validate input against the database enum values.
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

        // Create the maintenance record and audit log atomically.
        $record = DB::transaction(function () use (
            $request,
            $validated
        ) {
            $record = EquipmentMaintenance::create($validated);

            // Record the newly created maintenance information.
            $this->recordAuditLog(
                $request,
                'CREATE',
                $record->maintenance_id,
                null,
                $this->getMaintenanceAuditValues($record)
            );

            return $record;
        });

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
     * Update a maintenance record and audit the changes.
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

        // Capture the existing values before making changes.
        $oldValues = $this->getMaintenanceAuditValues($record);

        // Update the record and audit log in the same transaction.
        $updatedRecord = DB::transaction(function () use (
            $request,
            $record,
            $validated,
            $oldValues
        ) {
            $record->update($validated);
            $record->refresh();

            // Save both the old and updated maintenance values.
            $this->recordAuditLog(
                $request,
                'UPDATE',
                $record->maintenance_id,
                $oldValues,
                $this->getMaintenanceAuditValues($record)
            );

            return $record;
        });

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record updated successfully.',
            'data' => $updatedRecord->load('performedBy'),
        ]);
    }

    /**
     * DELETE /api/equipment-maintenance/{equipment_maintenance}
     * Delete a maintenance record and audit the deletion.
     */
    public function destroy(Request $request, $id)
    {
        $record = EquipmentMaintenance::findOrFail($id);

        // Preserve the maintenance information before deleting it.
        $oldValues = $this->getMaintenanceAuditValues($record);

        // Delete the record and write its audit log atomically.
        DB::transaction(function () use (
            $request,
            $record,
            $oldValues
        ) {
            $this->recordAuditLog(
                $request,
                'DELETE',
                $record->maintenance_id,
                $oldValues,
                null
            );

            $record->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record deleted successfully.',
        ]);
    }

    /**
     * Prepare maintenance fields for audit logging.
     * Keep a snapshot of the important maintenance information.
     */
    private function getMaintenanceAuditValues(
        EquipmentMaintenance $record
    ): array {
        return [
            'equipment_type' => $record->equipment_type,
            'equipment_id' => $record->equipment_id,
            'scheduled_date' => $record->scheduled_date,
            'performed_date' => $record->performed_date,
            'maintenance_type' => $record->maintenance_type,
            'description' => $record->description,
            'cost' => $record->cost,
            'status' => $record->status,
            'performed_by' => $record->performed_by,
            'notes' => $record->notes,
        ];
    }

    /**
     * Create an audit log entry in the audit_logs table.
     */
    private function recordAuditLog(
        Request $request,
        string $action,
        $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        AuditLog::create([
            // Identify the authenticated user performing the action.
            'user_id' => $request->user()?->user_id,

            'action' => $action,
            'entity_type' => 'EquipmentMaintenance',
            'entity_id' => $entityId,

            // Encode snapshots as JSON for storage in the database.
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
