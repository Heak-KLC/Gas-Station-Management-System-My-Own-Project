<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FuelPump extends Model
{
    use HasFactory;

    protected $table = 'fuel_pumps';

    protected $primaryKey = 'pump_id';

    protected $fillable = [
        'pump_number',
        'fuel_id',
        'status',
        'model',
        'serial_number',
        'installation_date',
        'last_maintenance_date',
        'next_maintenance_date',
        'meter_reading',
    ];

    protected $casts = [
        'installation_date' => 'date',
        'last_maintenance_date' => 'date',
        'next_maintenance_date' => 'date',
        'meter_reading' => 'decimal:3',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // =========================================================
    // Fuel Pump → Fuel Type
    // One pump belongs to one fuel type.
    // =========================================================
    public function fuelType()
    {
        return $this->belongsTo(
            FuelType::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // =========================================================
    // Fuel Pump → Fuel Sales
    // One pump can have many fuel sales.
    // =========================================================
    public function fuelSales()
    {
        return $this->hasMany(
            FuelSale::class,
            'pump_id',
            'pump_id'
        );
    }

    // =========================================================
    // Fuel Pump → Maintenance
    // Keep this relationship only if PumpMaintenance model/table
    // exists in your project.
    // =========================================================
    public function maintenances()
    {
        return $this->hasMany(
            PumpMaintenance::class,
            'pump_id',
            'pump_id'
        );
    }
}