<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;


class FuelType extends Model
{
    use HasFactory;

    protected $table = 'fuel_types';

    protected $primaryKey = 'fuel_id';

    protected $fillable = [
        'fuel_code',
        'fuel_name',
        'fuel_category',
        'purchase_price',
        'selling_price',
        'available_quantity',
        'tank_capacity',
        'minimum_stock_level',
        'status',
    ];

    protected $casts = [
        'purchase_price' => 'decimal:3',
        'selling_price' => 'decimal:3',
        'available_quantity' => 'decimal:3',
        'tank_capacity' => 'decimal:3',
        'minimum_stock_level' => 'decimal:3',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // One Fuel Type can have many tanks.
    public function fuelTanks()
    {
        return $this->hasMany(
            FuelTank::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // One Fuel Type can have many pumps.
    public function fuelPumps()
    {
        return $this->hasMany(
            FuelPump::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // One Fuel Type can have many fuel sales.
    public function fuelSales()
    {
        return $this->hasMany(
            FuelSale::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // One Fuel Type can have many refills.
    public function tankRefills()
    {
        return $this->hasMany(
            TankRefill::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // One Fuel Type can have many price history records.
    public function priceHistories()
    {
        return $this->hasMany(
            FuelPriceHistory::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // One Fuel Type can have many purchase histories.
    public function purchaseHistories()
    {
        return $this->hasMany(
            FuelPurchaseHistory::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // One Fuel Type can have many purchase orders.
    public function purchaseOrders()
    {
        return $this->hasMany(
            FuelPurchaseOrder::class,
            'fuel_id',
            'fuel_id'
        );
    }
}