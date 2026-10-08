<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PumpMaintenance extends Model
{
    use HasFactory;

    protected $table = 'pump_maintenance';

    protected $primaryKey = 'maintenance_id';

    protected $fillable = [
        'pump_id',
        'performed_by',
        'scheduled_date',
        'performed_date',
        'maintenance_type',
        'description',
        'cost',
        'status',
        'notes',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'performed_date' => 'date',
        'cost' => 'decimal:2',
    ];

    public function pump()
    {
        return $this->belongsTo(
            FuelPump::class,
            'pump_id',
            'pump_id'
        );
    }

    public function performedBy()
    {
        return $this->belongsTo(
            Employee::class,
            'performed_by',
            'employee_id'
        );
    }
}