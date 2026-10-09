<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeAttendance extends Model
{
    use HasFactory;

    // ឈ្មោះតារាងនៅក្នុង Database
    protected $table = 'employee_attendance';

    // Primary Key របស់តារាង
    protected $primaryKey = 'attendance_id';

    // អនុញ្ញាតឱ្យ Laravel គ្រប់គ្រង created_at និង updated_at
    public $timestamps = true;

    // Fields ដែលអាចបញ្ចូល ឬកែប្រែតាម Eloquent
    protected $fillable = [
        'employee_id',
        'date',
        'check_in',
        'check_out',
        'status',
        'notes',
    ];

    // បម្លែងប្រភេទទិន្នន័យឱ្យបានត្រឹមត្រូវ
    protected $casts = [
        'date' => 'date',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Attendance មួយជាកម្មសិទ្ធិរបស់ Employee ម្នាក់
    public function employee()
    {
        return $this->belongsTo(
            Employee::class,
            'employee_id',
            'employee_id'
        );
    }
}