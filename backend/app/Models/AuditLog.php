<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    // កំណត់ឈ្មោះតារាងក្នុង MySQL
    protected $table = 'audit_logs';

    // កំណត់ Primary Key តាម Database
    protected $primaryKey = 'log_id';

    // តារាងនេះមាន created_at ប៉ុន្តែគ្មាន updated_at
    // ដូច្នេះបិទ timestamps ស្វ័យប្រវត្តិរបស់ Eloquent
    public $timestamps = false;

    // Fields ដែលអនុញ្ញាតឱ្យបញ្ចូលទិន្នន័យតាម Eloquent
    protected $fillable = [
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'old_value',
        'new_value',
        'ip_address',
    ];

    // បម្លែង created_at ទៅជាកាលបរិច្ឆេទ
    protected $casts = [
        'user_id' => 'integer',
        'entity_id' => 'integer',
        'created_at' => 'datetime',
    ];

    // Activity Log មួយអាចភ្ជាប់ជាមួយ User ម្នាក់
    public function user()
    {
        return $this->belongsTo(
            User::class,
            'user_id',
            'user_id'
        );
    }
}
