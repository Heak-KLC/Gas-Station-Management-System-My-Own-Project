<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryPayment extends Model
{
    use HasFactory;

    protected $table = 'salary_payments';

    protected $primaryKey = 'salary_payment_id';

    protected $fillable = [
        'employee_id',
        'salary_id',
        'salary_month',
        'salary_year',
        'basic_salary',
        'allowance',
        'bonus',
        'tax_deduction',
        'other_deductions',
        'net_salary',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'payment_date',
        'payment_method',
        'payment_reference',
        'notes',
    ];

    protected $casts = [
        'salary_month' => 'integer',
        'salary_year' => 'integer',
        'basic_salary' => 'decimal:2',
        'allowance' => 'decimal:2',
        'bonus' => 'decimal:2',
        'tax_deduction' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'approved_at' => 'datetime',
        'payment_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(
            Employee::class,
            'employee_id',
            'employee_id'
        );
    }

    public function salaryInfo()
    {
        return $this->belongsTo(
            SalaryInfo::class,
            'salary_id',
            'salary_id'
        );
    }

    public function creator()
    {
        return $this->belongsTo(
            User::class,
            'created_by',
            'user_id'
        );
    }

    public function approver()
    {
        return $this->belongsTo(
            User::class,
            'approved_by',
            'user_id'
        );
    }
}
