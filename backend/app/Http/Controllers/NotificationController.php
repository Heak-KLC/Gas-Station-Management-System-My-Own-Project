<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Builder;

class NotificationController extends Controller
{
    /**
     * Allow Admin and Manager to access notifications.
     */
    private function getAuthorizedUser(Request $request)
{
    $user = $request->user();

    abort_unless(
        $user && in_array(
            strtolower(trim($user->role)),
            ['admin', 'manager', 'fuel_attendant'],
            true
        ),
        403,
        'You are not authorized to access notifications.'
    );

    return $user;
}

    /**
     * Apply notification visibility rules according to user role.
     *
     * Admin:
     * - Can view personal notifications.
     * - Can view all shared notifications.
     *
     * Manager:
     * - Can view personal notifications.
     * - Can view shared fuel, maintenance, and delivery alerts.
     */
    private function applyNotificationVisibility(
        Builder $query,
        $user
    ): Builder {
        $userId = (int) $user->user_id;

        $managerSharedTypes = [
            'fuel_low_stock',
            'maintenance_reminder',
            'delivery_reminder',
        ];

$normalizedRole = strtolower(trim($user->role));

if ($normalizedRole === 'fuel_attendant') {
    return $query->where(
        'notifications.user_id',
        (int) $user->user_id
    );
}

        return $query->where(function ($q) use (
            $user,
            $userId,
            $managerSharedTypes
        ) {
            // Notifications created specifically for this user.
            $q->where('notifications.user_id', $userId);

            // Shared notifications have a NULL user_id.
            $q->orWhere(function ($sharedQuery) use (
                $user,
                $managerSharedTypes
            ) {
                $sharedQuery->whereNull('notifications.user_id');

                // Admin can see all shared notification types.
                if ($user->role === 'admin') {
                    return;
                }

                // Manager can see only relevant shared alerts.
                $sharedQuery->whereIn(
                    'notifications.notification_type',
                    $managerSharedTypes
                );
            });
        });
    }

    /**
     * Apply the expiration condition.
     */
    private function applyActiveCondition(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereNull('notifications.expires_at')
              ->orWhere('notifications.expires_at', '>', now());
        });
    }

    /**
     * GET /api/notifications
     *
     * Retrieve active notifications visible to the current user.
     */
    public function index(Request $request)
    {
        $user = $this->getAuthorizedUser($request);
        $userId = (int) $user->user_id;

        $query = Notification::query()
            ->leftJoin('notification_reads', function ($join) use ($userId) {
                $join->on(
                    'notifications.notification_id',
                    '=',
                    'notification_reads.notification_id'
                )->where(
                    'notification_reads.user_id',
                    '=',
                    $userId
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
            ->selectRaw(
                'CASE
                    WHEN notification_reads.notification_id IS NULL
                    THEN 0
                    ELSE 1
                END AS is_read'
            );

        // Apply role-based visibility and expiration rules.
        $this->applyNotificationVisibility($query, $user);
        $this->applyActiveCondition($query);

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

        if ($type && $type !== 'All Notifications') {
            $type = $typeMap[$type] ?? $type;

            $query->where(
                'notifications.notification_type',
                $type
            );
        }

        // Exclude notifications archived by this user only.
        $query->whereNotExists(function ($archiveQuery) use ($userId) {
            $archiveQuery
                ->select(DB::raw(1))
                ->from('notification_archives')
                ->whereColumn(
                    'notification_archives.notification_id',
                    'notifications.notification_id'
                )
                ->where(
                    'notification_archives.user_id',
                    $userId
                );
        });

        $notifications = $query
            ->orderByDesc('notifications.created_at')
            ->get();

        $unreadCount = $notifications
            ->filter(fn ($item) => !(bool) $item->is_read)
            ->count();

        return response()->json([
            'success' => true,
            'data' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * PATCH /api/notifications/{id}/read
     *
     * Mark one visible notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $user = $this->getAuthorizedUser($request);
        $userId = (int) $user->user_id;

        $query = Notification::query()
            ->where('notifications.notification_id', $id);

        $this->applyNotificationVisibility($query, $user);
        $this->applyActiveCondition($query);

        $notification = $query->firstOrFail();

        // Record read status separately for each user.
        DB::table('notification_reads')->updateOrInsert(
            [
                'user_id' => $userId,
                'notification_id' => $notification->notification_id,
            ],
            [
                'read_at' => now(),
            ]
        );

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
     *
     * Mark all active, visible, non-archived notifications as read.
     */
    public function markAllAsRead(Request $request)
    {
        $user = $this->getAuthorizedUser($request);
        $userId = (int) $user->user_id;

        $query = Notification::query();

        $this->applyNotificationVisibility($query, $user);
        $this->applyActiveCondition($query);

        // Do not mark archived notifications as read through this action.
        $query->whereNotExists(function ($archiveQuery) use ($userId) {
            $archiveQuery
                ->select(DB::raw(1))
                ->from('notification_archives')
                ->whereColumn(
                    'notification_archives.notification_id',
                    'notifications.notification_id'
                )
                ->where(
                    'notification_archives.user_id',
                    $userId
                );
        });

        $notificationIds = $query->pluck(
            'notifications.notification_id'
        );

        $updatedCount = 0;
        $readAt = now();

        foreach ($notificationIds as $notificationId) {
            $updatedCount += DB::table('notification_reads')
                ->insertOrIgnore([
                    'user_id' => $userId,
                    'notification_id' => $notificationId,
                    'read_at' => $readAt,
                ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notifications marked as read.',
            'updated_count' => $updatedCount,
        ]);
    }

    /**
     * PATCH /api/notifications/archive-all
     *
     * Archive all active notifications visible to this user.
     */
    public function archiveAll(Request $request)
    {
        $user = $this->getAuthorizedUser($request);
        $userId = (int) $user->user_id;

        $query = Notification::query();

        $this->applyNotificationVisibility($query, $user);
        $this->applyActiveCondition($query);

        $notificationIds = $query->pluck(
            'notifications.notification_id'
        );

        $archivedCount = 0;
        $archivedAt = now();

        foreach ($notificationIds as $notificationId) {
            $archivedCount += DB::table('notification_archives')
                ->insertOrIgnore([
                    'user_id' => $userId,
                    'notification_id' => $notificationId,
                    'archived_at' => $archivedAt,
                ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notifications archived successfully.',
            'archived_count' => $archivedCount,
        ]);
    }

    /**
 * PATCH /api/notifications/{id}/unread
 */
public function markAsUnread(Request $request, $id)
{
    $user = $this->getAuthorizedUser($request);
    $userId = (int) $user->user_id;

    $query = Notification::query()
        ->where('notifications.notification_id', $id);

    $this->applyNotificationVisibility($query, $user);
    $this->applyActiveCondition($query);

    $notification = $query->firstOrFail();

    DB::table('notification_reads')
        ->where('user_id', $userId)
        ->where('notification_id', $notification->notification_id)
        ->delete();

    return response()->json([
        'success' => true,
        'message' => 'Notification marked as unread.',
        'data' => [
            'notification_id' => $notification->notification_id,
            'is_read' => false,
        ],
    ]);
}

/**
 * PATCH /api/notifications/{id}/archive
 */
public function archiveOne(Request $request, $id)
{
    $user = $this->getAuthorizedUser($request);
    $userId = (int) $user->user_id;

    $query = Notification::query()
        ->where('notifications.notification_id', $id);

    $this->applyNotificationVisibility($query, $user);

    $notification = $query->firstOrFail();

    DB::table('notification_archives')->insertOrIgnore([
        'user_id' => $userId,
        'notification_id' => $notification->notification_id,
        'archived_at' => now(),
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Notification archived successfully.',
        'data' => [
            'notification_id' => $notification->notification_id,
        ],
    ]);
}
}
