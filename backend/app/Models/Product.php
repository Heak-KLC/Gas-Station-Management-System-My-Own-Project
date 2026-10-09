<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';

    protected $primaryKey = 'product_id';

    protected $fillable = [
        'product_code',
        'barcode',
        'product_name',
        'image',
        'category_id',
        'purchase_price',
        'selling_price',
        'quantity_in_stock',
        'min_stock_level',
        'unit',
        'tax_rate',
        'is_active',
    ];

    protected $casts = [
        'purchase_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'quantity_in_stock' => 'decimal:2',
        'min_stock_level' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // =========================================================
    // Product → Category
    // Product មួយស្ថិតនៅក្នុង Category មួយ
    // =========================================================
    public function category()
    {
        return $this->belongsTo(
            ProductCategory::class,
            'category_id',
            'category_id'
        );
    }

    // =========================================================
    // Product → Inventory Logs
    // Product មួយអាចមាន Inventory Log ច្រើន
    // =========================================================
    public function inventoryLogs()
    {
        return $this->hasMany(
            ProductInventoryLog::class,
            'product_id',
            'product_id'
        );
    }

    // =========================================================
    // Product → Store Sale Items
    // ប្រើសម្រាប់ពិនិត្យមុន Delete Product
    // =========================================================
    public function saleItems()
    {
        return $this->hasMany(
            StoreSaleItem::class,
            'product_id',
            'product_id'
        );
    }
}