<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryInfo extends Model
{
    use HasFactory;

    protected $table = 'salary_info';

    protected $primaryKey = 'salary_id';

    protected $fillable = [
        'employee_id',
        'basic_salary',
        'allowance',
        'bonus',
        'tax_deduction',
        'other_deductions',
        'effective_date',
    ];

    protected $casts = [
        'basic_salary' => 'decimal:2',
        'allowance' => 'decimal:2',
        'bonus' => 'decimal:2',
        'tax_deduction' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'effective_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(
            Employee::class,
            'employee_id',
            'employee_id'
        );
    }
}