<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReportCache extends Model
{
    use HasFactory;

    // ប្រើ Table ដែលមានស្រាប់ក្នុង MySQL
    protected $table = 'report_cache';

    // កំណត់ Primary Key ឱ្យត្រូវនឹង Database
    protected $primaryKey = 'report_id';

    // Table នេះមិនមាន created_at និង updated_at ទេ
    public $timestamps = false;

    // Columns ដែល Laravel អនុញ្ញាតឱ្យបញ្ចូល ឬកែប្រែតាម Model
    protected $fillable = [
        'report_type',
        'report_data',
        'parameters',
        'generated_date',
        'generated_by',
    ];

    // បម្លែងទិន្នន័យទៅជាប្រភេទដែលងាយប្រើក្នុង PHP
    protected $casts = [
        'report_data' => 'array',
        'parameters' => 'array',
        'generated_date' => 'datetime',
        'generated_by' => 'integer',
    ];

    // ភ្ជាប់ទៅ User ដែលបានបង្កើត Report
    public function generatedBy()
    {
        return $this->belongsTo(
            User::class,
            'generated_by',
            'user_id'
        );
    }
}