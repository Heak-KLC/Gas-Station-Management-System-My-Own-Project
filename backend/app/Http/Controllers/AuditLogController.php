<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * ទាញយក Activity Logs ពី Database។
     * ទាញយក User ដែលពាក់ព័ន្ធជាមួយ Log នីមួយៗផងដែរ។
     */
    
public function index(Request $request)
{
    $query = AuditLog::with([
        'user:user_id,full_name,username'
    ]);

    if ($request->filled('search')) {
        $search = $request->input('search');

        $query->where(function ($subQuery) use ($search) {
            $subQuery->where('action', 'like', "%{$search}%")
                ->orWhere('entity_type', 'like', "%{$search}%");
        });
    }

    // Filter by entity type, e.g. FuelPump.
    if ($request->filled('entity_type')) {
        $query->where(
            'entity_type',
            $request->input('entity_type')
        );
    }

    // Filter by the selected pump ID.
    if ($request->filled('entity_id')) {
        $query->where(
            'entity_id',
            $request->integer('entity_id')
        );
    }


if ($request->filled('entity_type')) {
    $query->where(
        'entity_type',
        $request->input('entity_type')
    );
}

if ($request->filled('entity_id')) {
    $query->where(
        'entity_id',
        $request->input('entity_id')
    );
}


    $logs = $query
        ->orderByDesc('created_at')
        ->orderByDesc('log_id')
        ->paginate(50);

    return response()->json([
        'success' => true,
        'data' => $logs->items(),
        'pagination' => [
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
        ],
    ]);
}

}
