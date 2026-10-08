<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    // Enable Sanctum API tokens, model factories, and notifications.
    use HasApiTokens, HasFactory, Notifiable;

    // Tell Laravel that the password column in our database
    // is named "password_hash" instead of Laravel's default "password".
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    // This Model is connected to the users table.
    protected $table = 'users';

    // The primary key is user_id, not id.
    protected $primaryKey = 'user_id';

    // Fields allowed for mass assignment.
    protected $fillable = [
        'username',
        'password_hash',
        'email',
        'full_name',
        'role',
        'employee_id',
        'is_active',
        'last_login',
    ];

    // Hide sensitive information from JSON responses.
    protected $hidden = [
        'password_hash',
    ];

    // Convert database values to appropriate PHP types.
    protected $casts = [
        'employee_id' => 'integer',
        'is_active' => 'boolean',
        'last_login' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // A User can belong to an Employee.
    public function employee()
    {
        return $this->belongsTo(
            Employee::class,
            'employee_id',
            'employee_id'
        );
    }

    // A User can have many audit logs.
    public function auditLogs()
    {
        return $this->hasMany(
            AuditLog::class,
            'user_id',
            'user_id'
        );
    }

    // A User can receive many notifications.
    public function notifications()
    {
        return $this->hasMany(
            Notification::class,
            'user_id',
            'user_id'
        );
    }

    // A User can have many sessions.
    public function sessions()
    {
        return $this->hasMany(
            UserSession::class,
            'user_id',
            'user_id'
        );
    }
}