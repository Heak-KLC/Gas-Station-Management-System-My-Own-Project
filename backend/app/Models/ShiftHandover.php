<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShiftHandover extends Model
{
    protected $table = 'shift_handovers';

    protected $primaryKey = 'handover_id';

    protected $fillable = [
        'shift_type',
        'outgoing_employee_id',
        'incoming_employee_id',
        'total_fuel_liters',
        'expected_cash',
        'actual_cash',
        'status',
        'reason',
        'handed_over_at',
        'created_by',
    ];

    protected $casts = [
        'total_fuel_liters' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'actual_cash' => 'decimal:2',
        'handed_over_at' => 'datetime',
    ];
}
