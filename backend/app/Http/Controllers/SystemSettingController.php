<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemSettingController extends Controller
{
    /**
     * GET /api/system-settings
     * ទាញយកការកំណត់ប្រព័ន្ធ។
     */
    public function index()
    {
        $settings = SystemSetting::whereIn('setting_key', [
            'late_buffer_minutes',
            'overtime_rate',
        ])->pluck('setting_value', 'setting_key');

        // ប្រើតម្លៃ Default បើមិនទាន់មាន Setting ក្នុង Database។
        return response()->json([
            'success' => true,
            'data' => [
                'lateBuffer' => $settings->get(
                    'late_buffer_minutes',
                    '15'
                ),
                'otRate' => $settings->get(
                    'overtime_rate',
                    '1.5'
                ),
            ],
        ]);
    }

    /**
     * PUT /api/system-settings
     * រក្សាទុកការកំណត់ប្រព័ន្ធ។
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'lateBuffer' => 'required|integer|min:0|max:1440',
            'otRate' => 'required|numeric|min:0|max:100',
        ]);

        // ទាញយក ID របស់អ្នកប្រើប្រាស់ដែលបាន Login។
        $userId = $request->user()?->getAuthIdentifier();

        DB::transaction(function () use ($validated, $userId) {
            // រក្សាទុកចំនួននាទីអនុគ្រោះសម្រាប់ការមកយឺត។
            SystemSetting::updateOrCreate(
                ['setting_key' => 'late_buffer_minutes'],
                [
                    'setting_value' => (string) $validated['lateBuffer'],
                    'description' => 'Allowed late arrival buffer in minutes.',
                    'updated_by' => $userId,
                    'updated_at' => now(),
                ]
            );

            // រក្សាទុកអត្រាគណនាប្រាក់ OT។
            SystemSetting::updateOrCreate(
                ['setting_key' => 'overtime_rate'],
                [
                    'setting_value' => (string) $validated['otRate'],
                    'description' => 'Overtime pay multiplier.',
                    'updated_by' => $userId,
                    'updated_at' => now(),
                ]
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'System settings saved successfully.',
            'data' => [
                'lateBuffer' => (string) $validated['lateBuffer'],
                'otRate' => (string) $validated['otRate'],
            ],
        ]);
    }
}