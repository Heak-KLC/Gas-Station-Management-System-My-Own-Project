<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FuelPriceHistory extends Model
{
    use HasFactory;

    protected $table = 'fuel_price_history';

    protected $primaryKey = 'price_history_id';

    protected $fillable = [
        'fuel_id',
        'purchase_price',
        'selling_price',
        'effective_date',
        'updated_by',
    ];

    protected $casts = [
        'purchase_price' => 'decimal:3',
        'selling_price' => 'decimal:3',
        'effective_date' => 'datetime',
    ];

    public function fuelType()
    {
        return $this->belongsTo(
            FuelType::class,
            'fuel_id',
            'fuel_id'
        );
    }

    public function updatedBy()
    {
        return $this->belongsTo(
            User::class,
            'updated_by',
            'user_id'
        );
    }
}