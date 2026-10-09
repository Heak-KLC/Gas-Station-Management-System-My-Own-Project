<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FuelSale extends Model
{
    use HasFactory;

    // Specify the database table.
    protected $table = 'fuel_sales';

    // The primary key is sale_id, not the default id.
    protected $primaryKey = 'sale_id';

    // The fuel_sales table does not contain created_at and updated_at.
    public $timestamps = false;

    // Columns that can be mass-assigned.
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

    // Convert database values to appropriate PHP data types.
    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'sale_date' => 'datetime',
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

    // Sale → Fuel Pump
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