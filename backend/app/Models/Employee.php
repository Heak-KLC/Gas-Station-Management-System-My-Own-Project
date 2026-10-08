<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;


class Employee extends Model
{
    use HasFactory;

    protected $table = 'employees';

    protected $primaryKey = 'employee_id';

    protected $fillable = [
        'employee_code',
        'full_name',
        'email',
        'phone',
        'address',
        'role',
        'hire_date',
        'termination_date',
        'is_active',
    ];

    protected $casts = [
        'hire_date' => 'date',
        'termination_date' => 'date',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Employee → Attendance
    public function attendances()
    {
        return $this->hasMany(
            EmployeeAttendance::class,
            'employee_id',
            'employee_id'
        );
    }

    // Employee → Salary
    public function salaryInfos()
    {
        return $this->hasMany(
            SalaryInfo::class,
            'employee_id',
            'employee_id'
        );
    }

    // Employee → Work Schedules
    public function workSchedules()
    {
        return $this->hasMany(
            WorkSchedule::class,
            'employee_id',
            'employee_id'
        );
    }

    // Employee → Pump Maintenance
    public function pumpMaintenances()
    {
        return $this->hasMany(
            PumpMaintenance::class,
            'performed_by',
            'employee_id'
        );
    }

    // Employee → Equipment Maintenance
    public function equipmentMaintenances()
    {
        return $this->hasMany(
            EquipmentMaintenance::class,
            'performed_by',
            'employee_id'
        );
    }
}