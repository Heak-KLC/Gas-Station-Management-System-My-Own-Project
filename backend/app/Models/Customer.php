<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    // Use the existing MySQL table.
    protected $table = 'customers';

    // Set the primary key.
    protected $primaryKey = 'customer_id';

    // Tell Laravel to use registered_at instead of created_at.
    const CREATED_AT = 'registered_at';

    // The database already has an updated_at column.
    const UPDATED_AT = 'updated_at';

    // Columns allowed for mass assignment.
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
    ];

    // Convert database values to the correct PHP types.
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