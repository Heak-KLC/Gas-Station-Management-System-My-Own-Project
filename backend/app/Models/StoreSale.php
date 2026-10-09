<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreSale extends Model
{
    use HasFactory;

    protected $table = 'store_sales';

    protected $primaryKey = 'store_sale_id';

    // The store_sales table does not have created_at and updated_at.
    public $timestamps = false;

    protected $fillable = [
        'sale_number',
        'customer_id',
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
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'sale_date' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(
            Customer::class,
            'customer_id',
            'customer_id'
        );
    }

    public function soldBy()
    {
        return $this->belongsTo(
            User::class,
            'sold_by',
            'user_id'
        );
    }

    public function items()
    {
        return $this->hasMany(
            StoreSaleItem::class,
            'store_sale_id',
            'store_sale_id'
        );
    }
}