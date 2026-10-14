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
        // ចាប់ផ្ដើម Query និងទាញយកព័ត៌មាន User
        $query = AuditLog::with([
            'user:user_id,full_name,username'
        ]);

        // អនុញ្ញាតឱ្យស្វែងរកតាម Action ឬ Entity Type
        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('action', 'like', "%{$search}%")
                    ->orWhere(
                        'entity_type',
                        'like',
                        "%{$search}%"
                    );
            });
        }

        // បង្ហាញ Log ថ្មីៗនៅខាងលើ
        $logs = $query
            ->orderByDesc('created_at')
            ->orderByDesc('log_id')
            ->paginate(50);

        // បញ្ជូនទិន្នន័យទៅ Frontend ជា JSON
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
