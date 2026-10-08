<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EquipmentMaintenance extends Model
{
    use HasFactory;

    protected $table = 'equipment_maintenance';

    protected $primaryKey = 'maintenance_id';

    protected $fillable = [
        'performed_by',
        'equipment_type',
        'equipment_id',
        'scheduled_date',
        'performed_date',
        'maintenance_type',
        'description',
        'cost',
        'status',
        'notes',
    ];

    protected $casts = [
        'equipment_id' => 'integer',
        'scheduled_date' => 'date',
        'performed_date' => 'date',
        'cost' => 'decimal:2',
    ];

    public function performedBy()
    {
        return $this->belongsTo(
            Employee::class,
            'performed_by',
            'employee_id'
        );
    }

    /*
     * equipment_id is not linked to one fixed table.
     * The actual table depends on equipment_type:
     * pump, tank, dispenser, security_system, generator, etc.
     *
     * Therefore, we do not create a normal belongsTo relationship here.
     */
}