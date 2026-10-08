<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductCategory extends Model
{
    use HasFactory;

    protected $table = 'product_categories';

    protected $primaryKey = 'category_id';

    // =========================================================
    // product_categories មាន created_at តែគ្មាន updated_at
    // ដូច្នេះ Laravel មិនគួរព្យាយាម update updated_at ទេ។
    // =========================================================
    public $timestamps = false;

    protected $fillable = [
        'category_name',
        'category_code',
        'description',
    ];

    // =========================================================
    // Category → Products
    // Category មួយអាចមាន Products ច្រើន
    // =========================================================
    public function products()
    {
        return $this->hasMany(
            Product::class,
            'category_id',
            'category_id'
        );
    }
}