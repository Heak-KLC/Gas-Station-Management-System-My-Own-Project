<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyTransaction extends Model
{
    use HasFactory;

    protected $table = 'loyalty_transactions';

    protected $primaryKey = 'loyalty_id';

    // This table has created_at but no updated_at.
    public $timestamps = false;

    protected $fillable = [
        'customer_id',
        'points_earned',
        'points_used',
        'transaction_type',
        'sale_id',
        'store_sale_id',
        'created_at',
    ];

    protected $casts = [
        'customer_id' => 'integer',
        'points_earned' => 'integer',
        'points_used' => 'integer',
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
