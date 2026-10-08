<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TankRefill extends Model
{
    use HasFactory;

    protected $table = 'tank_refills';

    protected $primaryKey = 'refill_id';

    // This table does not contain created_at and updated_at.
    public $timestamps = false;

    protected $fillable = [
        'tank_id',
        'fuel_id',
        'quantity',
        'refill_date',
        'refilled_by',
        'source',
        'purchase_order_id',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'refill_date' => 'datetime',
    ];

    // Refill → Tank
    public function tank()
    {
        return $this->belongsTo(
            FuelTank::class,
            'tank_id',
            'tank_id'
        );
    }

    // Refill → Fuel Type
    public function fuelType()
    {
        return $this->belongsTo(
            FuelType::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // Refill → User who performed the refill
    public function refilledBy()
    {
        return $this->belongsTo(
            User::class,
            'refilled_by',
            'user_id'
        );
    }
}