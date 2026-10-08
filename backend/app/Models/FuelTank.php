<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FuelTank extends Model
{
    use HasFactory;

    protected $table = 'fuel_tanks';

    protected $primaryKey = 'tank_id';

    protected $fillable = [
        'tank_number',
        'fuel_id',
        'capacity',
        'current_volume',
        'min_volume',
        'status',
        'location',
        'last_inspection',
    ];

    protected $casts = [
        'capacity' => 'decimal:3',
        'current_volume' => 'decimal:3',
        'min_volume' => 'decimal:3',
        'last_inspection' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Fuel Tank → Fuel Type
    public function fuelType()
    {
        return $this->belongsTo(
            FuelType::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // Fuel Tank → Tank Refills
    public function refills()
    {
        return $this->hasMany(
            TankRefill::class,
            'tank_id',
            'tank_id'
        );
    }

    // Fuel Tank → Leakage Logs
    public function leakageLogs()
    {
        return $this->hasMany(
            LeakageLog::class,
            'tank_id',
            'tank_id'
        );
    }
}