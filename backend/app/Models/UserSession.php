<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserSession extends Model
{
    use HasFactory;

    protected $table = 'user_sessions';

    protected $primaryKey = 'session_id';

    // This table does not use Laravel timestamps.
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'token',
        'ip_address',
        'user_agent',
        'expires_at',
        'created_at',
    ];

    // Session token should not appear in JSON.
    protected $hidden = [
        'token',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(
            User::class,
            'user_id',
            'user_id'
        );
    }
}