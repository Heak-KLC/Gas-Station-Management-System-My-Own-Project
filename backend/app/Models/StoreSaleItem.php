<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreSaleItem extends Model
{
    use HasFactory;

    protected $table = 'store_sale_items';

    protected $primaryKey = 'sale_item_id';

    public $timestamps = false;

    protected $fillable = [
        'store_sale_id',
        'product_id',
        'quantity',
        'unit_price',
        'discount',
        'subtotal',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(
            Product::class,
            'product_id',
            'product_id'
        );
    }

    public function storeSale()
    {
        return $this->belongsTo(
            StoreSale::class,
            'store_sale_id',
            'store_sale_id'
        );
    }
}