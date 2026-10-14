<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemSettingController extends Controller
{
    /**
     * ទាញយក System Settings ទាំងអស់ដែល Settings page ត្រូវការ។
     * រក្សា lateBuffer និង otRate សម្រាប់ Employee & Attendance។
     */
    public function index()
    {
        $settings = SystemSetting::pluck('setting_value', 'setting_key');

        // បម្លែង JSON ដែលបានរក្សាទុកក្នុង Database ទៅជា Array។
        $decodeJson = function ($key, $default) use ($settings) {
            $value = $settings->get($key);

            if (!$value) {
                return $default;
            }

            $decoded = json_decode($value, true);

            return json_last_error() === JSON_ERROR_NONE
                ? $decoded
                : $default;
        };

        return response()->json([
            'success' => true,
            'data' => [
                // Settings ចាស់៖ កុំលុប ព្រោះ Employee & Attendance ប្រើវា។
                'lateBuffer' => $settings->get('late_buffer_minutes', '15'),
                'otRate' => $settings->get('overtime_rate', '1.5'),

                // Settings សម្រាប់ Station Info page។
                'stationInfo' => $decodeJson('station_info', [
                    'name' => 'V-SYCHL Gas Station - Main Branch',
                    'id' => '#ST-001',
                    'phone' => '0100 155-7899',
                    'email' => 'email@v-sychl.com',
                    'address' => 'National Road 6, Phnom Penh, Cambodia',
                ]),

                'businessHours' => $decodeJson('business_hours', [
                    ['day' => 'Mon', 'open' => '06:00', 'close' => '22:00'],
                    ['day' => 'Tue', 'open' => '06:00', 'close' => '22:00'],
                    ['day' => 'Wed', 'open' => '06:00', 'close' => '22:00'],
                    ['day' => 'Thu', 'open' => '06:00', 'close' => '22:00'],
                    ['day' => 'Fri', 'open' => '06:00', 'close' => '22:00'],
                    ['day' => 'Sat', 'open' => '06:00', 'close' => '22:00'],
                    ['day' => 'Sun', 'open' => '06:00', 'close' => '22:00'],
                ]),

                'taxSettings' => $decodeJson('tax_settings', [
                    'vat' => '10',
                    'otherTax' => '2',
                    'envTax' => '1',
                    'calculateOnPOS' => true,
                ]),
            ],
        ]);
    }

    /**
     * រក្សាទុក Settings ដែលបានផ្ញើមក។
     * updateOrCreate ប្រើ setting_key ដើម្បីជៀសវាងបង្កើត Row ស្ទួន។
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            // Settings ចាស់សម្រាប់ Employee & Attendance។
            'lateBuffer' => 'sometimes|required|integer|min:0|max:1440',
            'otRate' => 'sometimes|required|numeric|min:0|max:100',

            // Station information។
            'stationInfo' => 'sometimes|required|array',
            'stationInfo.name' => 'required_with:stationInfo|string|max:255',
            'stationInfo.id' => 'required_with:stationInfo|string|max:50',
            'stationInfo.phone' => 'required_with:stationInfo|string|max:50',
            'stationInfo.email' => 'required_with:stationInfo|email|max:255',
            'stationInfo.address' => 'required_with:stationInfo|string|max:1000',

            // Business hours ត្រូវមាន Array នៃថ្ងៃនីមួយៗ។
            'businessHours' => 'sometimes|required|array|size:7',
            'businessHours.*.day' => 'required|string|in:Mon,Tue,Wed,Thu,Fri,Sat,Sun',
            'businessHours.*.open' => 'required|date_format:H:i',
            'businessHours.*.close' => 'required|date_format:H:i',

            // Tax configuration។
            'taxSettings' => 'sometimes|required|array',
            'taxSettings.vat' => 'required_with:taxSettings|numeric|min:0|max:100',
            'taxSettings.otherTax' => 'required_with:taxSettings|numeric|min:0|max:100',
            'taxSettings.envTax' => 'required_with:taxSettings|numeric|min:0|max:100',
            'taxSettings.calculateOnPOS' => 'required_with:taxSettings|boolean',
        ]);

        $userId = $request->user()?->getAuthIdentifier();

        DB::transaction(function () use ($validated, $userId) {
            // រក្សាទុក Settings ចាស់ ប្រសិនបើមានផ្ញើមក។
            if (array_key_exists('lateBuffer', $validated)) {
                $this->saveSetting(
                    'late_buffer_minutes',
                    (string) $validated['lateBuffer'],
                    'Allowed late arrival buffer in minutes.',
                    $userId
                );
            }

            if (array_key_exists('otRate', $validated)) {
                $this->saveSetting(
                    'overtime_rate',
                    (string) $validated['otRate'],
                    'Overtime pay multiplier.',
                    $userId
                );
            }

            // រក្សាទុក Station Info ជា JSON។
            if (array_key_exists('stationInfo', $validated)) {
                $this->saveSetting(
                    'station_info',
                    json_encode(
                        $validated['stationInfo'],
                        JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
                    ),
                    'Gas station profile information.',
                    $userId
                );
            }

            // រក្សាទុក Business Hours ជា JSON។
            if (array_key_exists('businessHours', $validated)) {
                $this->saveSetting(
                    'business_hours',
                    json_encode(
                        $validated['businessHours'],
                        JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
                    ),
                    'Opening and closing hours for each day.',
                    $userId
                );
            }

            // រក្សាទុក Tax Settings ជា JSON។
            if (array_key_exists('taxSettings', $validated)) {
                $this->saveSetting(
                    'tax_settings',
                    json_encode(
                        $validated['taxSettings'],
                        JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
                    ),
                    'Tax and POS invoice settings.',
                    $userId
                );
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'System settings saved successfully.',
        ]);
    }

    /**
     * រក្សាទុក Setting មួយតាម Key។
     * ប្រើ Helper នេះ ដើម្បីកុំឱ្យសរសេរ updateOrCreate ដដែលៗ។
     */
    private function saveSetting(
        string $key,
        string $value,
        string $description,
        ?int $userId
    ): void {
        SystemSetting::updateOrCreate(
            ['setting_key' => $key],
            [
                'setting_value' => $value,
                'description' => $description,
                'updated_by' => $userId,
                'updated_at' => now(),
            ]
        );
    }
}
