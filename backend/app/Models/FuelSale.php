<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FuelSale extends Model
{
    use HasFactory;

    protected $table = 'fuel_sales';

    protected $primaryKey = 'sale_id';

    protected $fillable = [
        'sale_number',
        'customer_id',
        'pump_id',
        'fuel_id',
        'quantity',
        'unit_price',
        'subtotal',
        'tax',
        'discount',
        'total_amount',
        'payment_method',
        'payment_status',
        'sold_by',
        'sale_date',
        'receipt_number',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:3',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'sale_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Sale → Customer
    public function customer()
    {
        return $this->belongsTo(
            Customer::class,
            'customer_id',
            'customer_id'
        );
    }

    // Sale → Pump
    public function pump()
    {
        return $this->belongsTo(
            FuelPump::class,
            'pump_id',
            'pump_id'
        );
    }

    // Sale → Fuel Type
    public function fuelType()
    {
        return $this->belongsTo(
            FuelType::class,
            'fuel_id',
            'fuel_id'
        );
    }

    // Sale → User who sold the fuel
    public function soldBy()
    {
        return $this->belongsTo(
            User::class,
            'sold_by',
            'user_id'
        );
    }
}