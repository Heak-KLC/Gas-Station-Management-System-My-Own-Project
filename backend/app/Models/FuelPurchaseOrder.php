<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FuelPurchaseOrder extends Model
{
    use HasFactory;

    protected $table = 'fuel_purchase_orders';

    protected $primaryKey = 'purchase_order_id';

    protected $fillable = [
        'po_number',
        'supplier_id',
        'fuel_id',
        'quantity',
        'unit_price',
        'total_amount',
        'order_date',
        'delivery_date',
        'received_date',
        'status',
        'created_by',
        'approved_by',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:3',
        'total_amount' => 'decimal:2',
        'order_date' => 'datetime',
        'delivery_date' => 'datetime',
        'received_date' => 'datetime',
    ];

    public function supplier()
    {
        return $this->belongsTo(
            Supplier::class,
            'supplier_id',
            'supplier_id'
        );
    }

    public function fuelType()
    {
        return $this->belongsTo(
            FuelType::class,
            'fuel_id',
            'fuel_id'
        );
    }

    public function createdBy()
    {
        return $this->belongsTo(
            User::class,
            'created_by',
            'user_id'
        );
    }

    public function approvedBy()
    {
        return $this->belongsTo(
            User::class,
            'approved_by',
            'user_id'
        );
    }

    public function purchaseHistories()
    {
        return $this->hasMany(
            FuelPurchaseHistory::class,
            'purchase_order_id',
            'purchase_order_id'
        );
    }
}