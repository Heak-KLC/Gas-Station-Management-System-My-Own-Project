<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $table = 'customers';

    protected $primaryKey = 'customer_id';

    protected $fillable = [
        'customer_code',
        'full_name',
        'email',
        'phone',
        'address',
        'loyalty_membership',
        'loyalty_points',
        'total_purchases',
        'is_active',
        'registered_at',
        'updated_at',
    ];

    protected $casts = [
        'loyalty_points' => 'integer',
        'total_purchases' => 'decimal:2',
        'is_active' => 'boolean',
        'registered_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Customer → Fuel Sales
    public function fuelSales()
    {
        return $this->hasMany(
            FuelSale::class,
            'customer_id',
            'customer_id'
        );
    }

    // Customer → Store Sales
    public function storeSales()
    {
        return $this->hasMany(
            StoreSale::class,
            'customer_id',
            'customer_id'
        );
    }

    // Customer → Loyalty Transactions
    public function loyaltyTransactions()
    {
        return $this->hasMany(
            LoyaltyTransaction::class,
            'customer_id',
            'customer_id'
        );
    }
}