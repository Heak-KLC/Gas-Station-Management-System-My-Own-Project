<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use HasFactory;

    protected $table = 'system_settings';

    protected $primaryKey = 'setting_id';

    // This table has updated_at but no created_at in the supplied schema.
    const CREATED_AT = null;

    protected $fillable = [
        'setting_key',
        'setting_value',
        'description',
        'updated_by',
        'updated_at',
    ];

    protected $casts = [
        'updated_by' => 'integer',
        'updated_at' => 'datetime',
    ];

    public function updatedBy()
    {
        return $this->belongsTo(
            User::class,
            'updated_by',
            'user_id'
        );
    }
    public $timestamps = false;
}