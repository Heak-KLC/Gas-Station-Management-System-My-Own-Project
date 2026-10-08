<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetToken extends Model
{
    protected $table = 'password_reset_tokens';

    // This table does not use Laravel timestamps.
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
        'created_at',
    ];

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