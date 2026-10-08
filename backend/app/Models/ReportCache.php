<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReportCache extends Model
{
    use HasFactory;

    protected $table = 'report_cache';

    protected $primaryKey = 'report_cache_id';

    protected $fillable = [
        'report_type',
        'report_data',
        'parameters',
        'generated_by',
        'generated_at',
        'expires_at',
    ];

    protected $casts = [
        'report_data' => 'array',
        'parameters' => 'array',
        'generated_by' => 'integer',
        'generated_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function generatedBy()
    {
        return $this->belongsTo(
            User::class,
            'generated_by',
            'user_id'
        );
    }
}