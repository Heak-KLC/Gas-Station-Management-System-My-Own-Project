<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /**
     * Verify that the authenticated user is an Admin.
     */
    private function getAdminId(Request $request): int
    {
        $user = $request->user();

        // Allow only Admin users to access the Notifications menu.
        abort_unless(
            $user && $user->role === 'admin',
            403,
            'Only administrators can access notifications.'
        );

        return (int) $user->user_id;
    }

    /**
     * GET /api/notifications
     * Retrieve active notifications that have not been archived
     * by the currently authenticated Admin.
     */
    public function index(Request $request)
    {
        $adminId = $this->getAdminId($request);

        // Retrieve notifications and join this Admin's read status.
        $query = Notification::query()
            ->leftJoin('notification_reads', function ($join) use ($adminId) {
                $join->on(
                    'notifications.notification_id',
                    '=',
                    'notification_reads.notification_id'
                )->where(
                    'notification_reads.user_id',
                    '=',
                    $adminId
                );
            })
            ->select([
                'notifications.notification_id',
                'notifications.user_id',
                'notifications.notification_type',
                'notifications.title',
                'notifications.message',
                'notifications.reference_id',
                'notifications.created_at',
                'notifications.expires_at',
            ])
            // Determine whether this Admin has read each notification.
            ->selectRaw(
                'CASE
                    WHEN notification_reads.notification_id IS NULL
                    THEN 0
                    ELSE 1
                END AS is_read'
            )
            // Include notifications belonging to this Admin
            // and shared notifications where user_id is NULL.
            ->where(function ($q) use ($adminId) {
                $q->where('notifications.user_id', $adminId)
                  ->orWhereNull('notifications.user_id');
            })
            // Exclude notifications that have already expired.
            ->where(function ($q) {
                $q->whereNull('notifications.expires_at')
                  ->orWhere('notifications.expires_at', '>', now());
            });

        // Map frontend filter labels to database notification types.
        $type = $request->query('type');

        $typeMap = [
            'Low Fuel Stock Alerts' => 'fuel_low_stock',
            'Price Update Notifications' => 'price_update',
            'Maintenance Reminders' => 'maintenance_reminder',
            'Membership Promotion' => 'promotion',
            'System Alerts' => 'system_alert',
            'Monitor Delivery' => 'delivery_reminder',
        ];

        // Apply the selected notification type filter, if provided.
        if ($type && $type !== 'All Notifications') {
            $type = $typeMap[$type] ?? $type;

            $query->where(
                'notifications.notification_type',
                $type
            );
        }

        // IMPORTANT:
        // Exclude archived notifications BEFORE calling get().
        // Archive status is specific to the currently logged-in Admin.
        $query->whereNotExists(function ($archiveQuery) use ($adminId) {
            $archiveQuery
                ->select(DB::raw(1))
                ->from('notification_archives')
                ->whereColumn(
                    'notification_archives.notification_id',
                    'notifications.notification_id'
                )
                ->where(
                    'notification_archives.user_id',
                    $adminId
                );
        });

        // Retrieve only notifications that match all conditions above.
        $notifications = $query
            ->orderByDesc('notifications.created_at')
            ->get();

        // Count unread notifications after archive and type filtering.
        $unreadCount = $notifications
            ->filter(fn ($item) => !(bool) $item->is_read)
            ->count();

        // Return notifications and unread count to the frontend.
        return response()->json([
            'success' => true,
            'data' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * PATCH /api/notifications/{id}/read
     * Mark one notification as read for this Admin.
     */
    public function markAsRead(Request $request, $id)
    {
        $adminId = $this->getAdminId($request);

        // Ensure the notification belongs to this Admin
        // or is shared system-wide.
        $notification = Notification::query()
            ->where('notification_id', $id)
            ->where(function ($q) use ($adminId) {
                $q->where('user_id', $adminId)
                  ->orWhereNull('user_id');
            })
            ->firstOrFail();

        // Save the read status for this Admin without modifying
        // the shared notification's original database record.
        DB::table('notification_reads')->updateOrInsert(
            [
                'user_id' => $adminId,
                'notification_id' => $notification->notification_id,
            ],
            [
                'read_at' => now(),
            ]
        );

        // Return the notification with its updated read status.
        $data = $notification->toArray();
        $data['is_read'] = true;

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'data' => $data,
        ]);
    }

    /**
     * PATCH /api/notifications/read-all
     * Mark all active notifications visible to this Admin as read.
     */
    public function markAllAsRead(Request $request)
    {
        $adminId = $this->getAdminId($request);

        // Find active notifications owned by this Admin
        // or shared system-wide.
        $notificationIds = Notification::query()
            ->where(function ($q) use ($adminId) {
                $q->where('user_id', $adminId)
                  ->orWhereNull('user_id');
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->pluck('notification_id');

        $updatedCount = 0;

        // Insert a read record for each notification.
        // Existing records are not duplicated.
        foreach ($notificationIds as $notificationId) {
            $updatedCount += DB::table('notification_reads')
                ->insertOrIgnore([
                    'user_id' => $adminId,
                    'notification_id' => $notificationId,
                    'read_at' => now(),
                ]);
        }

        // Return the number of newly inserted read records.
        return response()->json([
            'success' => true,
            'message' => 'Notifications marked as read.',
            'updated_count' => $updatedCount,
        ]);
    }

    /**
     * PATCH /api/notifications/archive-all
     * Archive all active notifications visible to this Admin.
     */
    public function archiveAll(Request $request)
    {
        $adminId = $this->getAdminId($request);

        // Find active notifications owned by this Admin
        // or shared system-wide.
        $notificationIds = Notification::query()
            ->where(function ($query) use ($adminId) {
                $query->where('user_id', $adminId)
                      ->orWhereNull('user_id');
            })
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->pluck('notification_id');

        $archivedCount = 0;

        // Store archive status for this Admin.
        // Notifications remain in the notifications table.
        foreach ($notificationIds as $notificationId) {
            $archivedCount += DB::table('notification_archives')
                ->insertOrIgnore([
                    'user_id' => $adminId,
                    'notification_id' => $notificationId,
                    'archived_at' => now(),
                ]);
        }

        // Return the number of newly archived records.
        return response()->json([
            'success' => true,
            'message' => 'Notifications archived successfully.',
            'archived_count' => $archivedCount,
        ]);
    }
}
