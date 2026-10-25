<?php

namespace App\Http\Controllers;

use App\Models\EquipmentMaintenance;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Notification;

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
 * Create maintenance record, update pump status,
 * record audit log, and notify the relevant users.
 */
public function store(Request $request)
{
    $validated = $request->validate([
        'equipment_type' => [
            'required',
            'in:pump,tank,dispenser,security_system,generator,other',
        ],
        'equipment_id' => $request->input('equipment_type') === 'pump'
            ? 'required|integer|min:1|exists:fuel_pumps,pump_id'
            : 'required|integer|min:1',
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

    $record = DB::transaction(function () use (
        $request,
        $validated
    ) {
        // 1. Create the maintenance record.
        $record = EquipmentMaintenance::create($validated);

        // 2. Update the pump status when the issue concerns a pump.
        if ($validated['equipment_type'] === 'pump') {
            DB::table('fuel_pumps')
                ->where('pump_id', $validated['equipment_id'])
                ->update([
                    'status' => 'under_maintenance',
                    'updated_at' => now(),
                ]);
        }

        // 3. Record the audit log.
        $this->recordAuditLog(
            $request,
            'CREATE',
            $record->maintenance_id,
            null,
            $this->getMaintenanceAuditValues($record)
        );


        // 4. Find all Manager accounts.
        $managerIds = DB::table('users')
            ->whereRaw('LOWER(TRIM(role)) = ?', ['manager'])
            ->pluck('user_id');

        // 5. Get the authenticated user who reported the issue.
        $reporter = $request->user();

        // 6. Send a personal notification to each Manager
        // and to the reporting user.
        $recipientIds = $managerIds
            ->merge(
                $reporter ? [$reporter->user_id] : []
            )
            ->unique()
            ->values();

        foreach ($recipientIds as $recipientId) {
            Notification::create([
                'user_id' => $recipientId,
                'notification_type' => 'maintenance_reminder',
                'title' => 'New Equipment Issue Reported',
                'message' => sprintf(
                    'A %s issue has been reported for equipment ID %s. Type: %s. Description: %s',
                    $validated['equipment_type'],
                    $validated['equipment_id'],
                    $validated['maintenance_type'],
                    $validated['description'] ?? 'No description provided'
                ),
                'reference_id' => $record->maintenance_id,
                'is_read' => 0,
                'expires_at' => null,
            ]);
        }



        return $record;
    });

    return response()->json([
        'success' => true,
        'message' => 'Issue reported successfully. Pump status updated to Maintenance and notifications created.',
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
    
/**
 * PUT/PATCH /api/equipment-maintenance/{equipment_maintenance}
 * Update a maintenance record, save the audit log,
 * and notify the original reporter when a Manager responds.
 */
public function update(Request $request, $id)
{
    $record = EquipmentMaintenance::findOrFail($id);

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

    $oldValues = $this->getMaintenanceAuditValues($record);

    $updatedRecord = DB::transaction(function () use (
        $request,
        $record,
        $validated,
        $oldValues
    ) {
        // 1. Keep the previous response before updating.
        $oldNotes = trim((string) ($record->notes ?? ''));

        // 2. Update and reload the maintenance record.
        $record->update($validated);
        $record->refresh();

        // 3. Record the maintenance update in the audit log.
        $this->recordAuditLog(
            $request,
            'UPDATE',
            $record->maintenance_id,
            $oldValues,
            $this->getMaintenanceAuditValues($record)
        );


            
        // 4. Restore the pump when a completed maintenance
        // update is submitted.
        if (
            $record->equipment_type === 'pump' &&
            array_key_exists('status', $validated) &&
            $record->status === 'completed'
        ) {
            $pump = DB::table('fuel_pumps')
                ->where('pump_id', $record->equipment_id)
                ->where('status', 'under_maintenance')
                ->lockForUpdate()
                ->first();

            if ($pump) {
                DB::table('fuel_pumps')
                    ->where('pump_id', $record->equipment_id)
                    ->where('status', 'under_maintenance')
                    ->update([
                        'status' => 'available',
                        'updated_at' => now(),
                    ]);

                AuditLog::create([
                    'user_id' => $request->user()?->user_id,
                    'action' => 'UPDATE',
                    'entity_type' => 'FuelPump',
                    'entity_id' => $record->equipment_id,
                    'old_value' => json_encode([
                        'status' => 'under_maintenance',
                    ]),
                    'new_value' => json_encode([
                        'status' => 'available',
                    ]),
                    'ip_address' => $request->ip(),
                ]);
            }
        }



        // 4. Identify the authenticated user.
        $user = $request->user();

        $isManager = $user
            && strtolower(trim((string) $user->role)) === 'manager';

        $newResponse = trim((string) ($record->notes ?? ''));

        // 5. Notify the original reporter only when a Manager
        // changes the response to a non-empty value.
        $responseChanged = array_key_exists('notes', $validated)
            && $newResponse !== ''
            && $newResponse !== $oldNotes;

        if ($isManager && $responseChanged) {
            // Find the user who created the original report.
            $reporterId = AuditLog::where(
                'entity_type',
                'EquipmentMaintenance'
            )
                ->where('entity_id', $record->maintenance_id)
                ->where('action', 'CREATE')
                ->whereNotNull('user_id')
                ->orderBy('created_at')
                ->value('user_id');

            // Do not notify the Manager who submitted the response.
            if (
                $reporterId
                && (int) $reporterId !== (int) $user->user_id
            ) {
                Notification::create([
                    'user_id' => $reporterId,
                    'notification_type' => 'maintenance_reminder',
                    'title' => 'Manager Responded to Equipment Issue',
                    'message' => sprintf(
                        'The Manager has responded to your equipment issue (Maintenance ID: %d). Response: %s',
                        $record->maintenance_id,
                        $newResponse
                    ),
                    'reference_id' => $record->maintenance_id,
                    'is_read' => 0,
                    'expires_at' => null,
                ]);
            }
        }

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
