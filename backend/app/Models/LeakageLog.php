<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeakageLog extends Model
{
    use HasFactory;

    protected $table = 'leakage_logs';

    protected $primaryKey = 'leakage_id';

    protected $fillable = [
        'tank_id',
        'reported_by',
        'leakage_amount',
        'reported_date',
        'reason',
        'status',
        'notes',
    ];

    protected $casts = [
        'leakage_amount' => 'decimal:3',
        'reported_date' => 'datetime',
    ];

    public function tank()
    {
        return $this->belongsTo(
            FuelTank::class,
            'tank_id',
            'tank_id'
        );
    }

    public function reportedBy()
    {
        return $this->belongsTo(
            User::class,
            'reported_by',
            'user_id'
        );
    }
}