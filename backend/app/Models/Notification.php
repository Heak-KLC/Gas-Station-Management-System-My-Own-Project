<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasFactory;

    // Connect this Model to the notifications table.
    protected $table = 'notifications';

    // Use notification_id as the primary key.
    protected $primaryKey = 'notification_id';

    // The database table does not contain updated_at.
    public const UPDATED_AT = null;

    // Define the fields that can be inserted or updated using mass assignment.
    protected $fillable = [
        'user_id',
        'notification_type',
        'title',
        'message',
        'reference_id',
        'is_read',
        'expires_at',
    ];

    // Convert database values to the appropriate PHP data types.
    protected $casts = [
        'reference_id' => 'integer',
        'is_read' => 'boolean',
        'created_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    // A notification belongs to one user.
    public function user()
    {
        return $this->belongsTo(
            User::class,
            'user_id',
            'user_id'
        );
    }
}
