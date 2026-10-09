<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\FuelSale;
use App\Models\StoreSale;

class Refund extends Model
{
    use HasFactory;

    protected $table = 'refunds';

    protected $primaryKey = 'refund_id';

    protected $fillable = [
        'original_sale_id',
        'original_store_sale_id',
        'processed_by',
        'refund_amount',
        'refund_date',
        'reason',
        'status',
    ];

    protected $casts = [
        'original_sale_id' => 'integer',
        'original_store_sale_id' => 'integer',
        'refund_amount' => 'decimal:2',
        'refund_date' => 'datetime',
    ];

    public function processedBy()
    {
        return $this->belongsTo(
            User::class,
            'processed_by',
            'user_id'
        );
    }

    /*
     * original_sale_id and original_store_sale_id
     * are not foreign keys in the supplied database schema.
     */

    // Get the original fuel sale associated with this refund.
public function fuelSale()
{
    return $this->belongsTo(
        FuelSale::class,
        'original_sale_id',
        'sale_id'
    );
}

// Get the original store sale associated with this refund.
public function storeSale()
{
    return $this->belongsTo(
        StoreSale::class,
        'original_store_sale_id',
        'store_sale_id'
    );
}
}