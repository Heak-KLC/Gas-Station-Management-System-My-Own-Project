<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FuelPurchaseHistory extends Model
{
    use HasFactory;

    protected $table = 'fuel_purchase_history';

    protected $primaryKey = 'purchase_history_id';

    protected $fillable = [
        'purchase_order_id',
        'fuel_id',
        'quantity',
        'unit_price',
        'total_amount',
        'received_date',
        'received_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:3',
        'total_amount' => 'decimal:2',
        'received_date' => 'datetime',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(
            FuelPurchaseOrder::class,
            'purchase_order_id',
            'purchase_order_id'
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

    public function receivedBy()
    {
        return $this->belongsTo(
            User::class,
            'received_by',
            'user_id'
        );
    }
}