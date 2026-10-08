<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyTransaction extends Model
{
    use HasFactory;

    protected $table = 'loyalty_transactions';

    protected $primaryKey = 'transaction_id';

    protected $fillable = [
        'customer_id',
        'transaction_type',
        'points',
        'balance_after',
        'sale_id',
        'store_sale_id',
        'description',
    ];

    protected $casts = [
        'points' => 'integer',
        'balance_after' => 'integer',
        'sale_id' => 'integer',
        'store_sale_id' => 'integer',
        'created_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(
            Customer::class,
            'customer_id',
            'customer_id'
        );
    }
}