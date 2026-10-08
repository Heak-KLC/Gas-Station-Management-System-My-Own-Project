<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductInventoryLog extends Model
{
    use HasFactory;

    protected $table = 'product_inventory_log';

    protected $primaryKey = 'inventory_log_id';

    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'quantity_change',
        'previous_quantity',
        'new_quantity',
        'reason',
        'reference_id',
        'created_by',
    ];

    protected $casts = [
        'quantity_change' => 'decimal:2',
        'previous_quantity' => 'decimal:2',
        'new_quantity' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    // =========================================================
    // Inventory Log → Product
    // =========================================================
    public function product()
    {
        return $this->belongsTo(
            Product::class,
            'product_id',
            'product_id'
        );
    }

    // =========================================================
    // Inventory Log → User
    // អ្នកដែលធ្វើការកែ Stock
    // =========================================================
    public function createdBy()
    {
        return $this->belongsTo(
            User::class,
            'created_by',
            'user_id'
        );
    }
}