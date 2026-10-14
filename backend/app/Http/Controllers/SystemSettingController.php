<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SystemSettingController extends Controller
{
    /**
     * GET /api/system-settings
     *
     * ទាញយក Settings ទាំងអស់ដែល Frontend ត្រូវការ។
     * រក្សា lateBuffer និង otRate សម្រាប់ Employee & Attendance។
     */
    public function index()
    {
        // ទាញយក Setting ទាំងអស់ ដោយប្រើ setting_key ជា Key។
        $settings = SystemSetting::pluck('setting_value', 'setting_key');

        // បម្លែង JSON ពី Database ទៅជា PHP Array។
        $decodeJson = function (string $key, array $default) use ($settings): array {
            $value = $settings->get($key);

            if ($value === null || $value === '') {
                return $default;
            }

            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : $default;
        };

        return response()->json([
            'success' => true,
            'data' => [
                // Settings សម្រាប់ Employee & Attendance។
                'lateBuffer' => $settings->get('late_buffer_minutes', '15'),
                'otRate' => $settings->get('overtime_rate', '1.5'),

                // ព័ត៌មានស្ថានីយ៍។
                'stationInfo' => $decodeJson('station_info', [
                    'name' => 'V-SYCHL Gas Station - Main Branch',
                    'id' => '#ST-001',
                    'phone' => '0100 155-7899',
                    'email' => 'email@v-sychl.com',
                    'address' => 'National Road 6, Phnom Penh, Cambodia',
                ]),

                // ម៉ោងបើកបិទសម្រាប់ថ្ងៃនីមួយៗ។
                // day ប្រើ Mon, Tue, Wed... ឱ្យត្រូវនឹង Validation ខាងក្រោម។
                'businessHours' => $decodeJson('business_hours', [
                    [
                        'day' => 'Mon',
                        'open' => '06:00',
                        'close' => '22:00',
                        'closed' => false,
                    ],
                    [
                        'day' => 'Tue',
                        'open' => '06:00',
                        'close' => '22:00',
                        'closed' => false,
                    ],
                    [
                        'day' => 'Wed',
                        'open' => '06:00',
                        'close' => '22:00',
                        'closed' => false,
                    ],
                    [
                        'day' => 'Thu',
                        'open' => '06:00',
                        'close' => '22:00',
                        'closed' => false,
                    ],
                    [
                        'day' => 'Fri',
                        'open' => '06:00',
                        'close' => '22:00',
                        'closed' => false,
                    ],
                    [
                        'day' => 'Sat',
                        'open' => '06:00',
                        'close' => '22:00',
                        'closed' => false,
                    ],
                    [
                        'day' => 'Sun',
                        'open' => '06:00',
                        'close' => '22:00',
                        'closed' => false,
                    ],
                ]),

                // ការកំណត់ពន្ធ។
                'taxSettings' => $decodeJson('tax_settings', [
                    'vat' => 10,
                    'otherTax' => 2,
                    'envTax' => 1,
                    'calculateOnPOS' => true,
                ]),
            ],
        ]);
    }

    /**
     * PUT /api/system-settings
     *
     * រក្សាទុក Settings ដែល Frontend ផ្ញើមក។
     * អនុញ្ញាតឱ្យរក្សាទុក Settings មួយផ្នែកបាន ដោយមិនប៉ះពាល់ Settings ផ្សេង។
     */
    public function update(Request $request)
    {
        // Validate ទិន្នន័យមុនពេលរក្សាទុក។
        $validated = $request->validate([
            // Settings ចាស់សម្រាប់ Employee & Attendance។
            'lateBuffer' => 'sometimes|required|integer|min:0|max:1440',
            'otRate' => 'sometimes|required|numeric|min:0|max:100',

            // Station Information។
            'stationInfo' => 'sometimes|required|array',
            'stationInfo.name' => 'required_with:stationInfo|string|max:255',
            'stationInfo.id' => 'required_with:stationInfo|string|max:50',
            'stationInfo.phone' => 'required_with:stationInfo|string|max:50',
            'stationInfo.email' => 'required_with:stationInfo|email|max:255',
            'stationInfo.address' => 'required_with:stationInfo|string|max:1000',

            // Business Hours ត្រូវមាន 7 ថ្ងៃ។
            'businessHours' => 'sometimes|required|array|size:7',
            'businessHours.*.day' => [
                'required',
                'string',
                'in:Mon,Tue,Wed,Thu,Fri,Sat,Sun',
            ],
            'businessHours.*.open' => 'required|date_format:H:i',
            'businessHours.*.close' => 'required|date_format:H:i',
            'businessHours.*.closed' => 'sometimes|boolean',

            // Tax Settings។
            'taxSettings' => 'sometimes|required|array',
            'taxSettings.vat' => 'required_with:taxSettings|numeric|min:0|max:100',
            'taxSettings.otherTax' => 'required_with:taxSettings|numeric|min:0|max:100',
            'taxSettings.envTax' => 'required_with:taxSettings|numeric|min:0|max:100',
            'taxSettings.calculateOnPOS' => 'required_with:taxSettings|boolean',
        ]);

        // ការពារកុំឱ្យរក្សាទុក Business Hours ដែលមានថ្ងៃស្ទួន ឬខ្វះថ្ងៃ។
        if (array_key_exists('businessHours', $validated)) {
            $days = array_column($validated['businessHours'], 'day');

            if (
                count(array_unique($days)) !== 7 ||
                count($days) !== count(array_unique($days))
            ) {
                throw ValidationException::withMessages([
                    'businessHours' => [
                        'Business Hours ត្រូវមានថ្ងៃ Mon ដល់ Sun ដោយមិនស្ទួន។',
                    ],
                ]);
            }

            // បំពេញ closed=false ប្រសិនបើ Frontend មិនបានផ្ញើ field នេះ។
            $validated['businessHours'] = array_map(
                function (array $hour): array {
                    $hour['closed'] = (bool) ($hour['closed'] ?? false);

                    return $hour;
                },
                $validated['businessHours']
            );
        }

        // យក ID អ្នកប្រើដែលបាន Login ដើម្បីកត់ត្រាអ្នកកែប្រែ។
        $userId = $request->user()?->getAuthIdentifier();

        // ប្រើ Transaction ដើម្បីឱ្យ Settings ទាំងអស់ក្នុង Request រក្សាទុកជាក្រុម។
        DB::transaction(function () use ($validated, $userId) {
            // រក្សាទុក late buffer។
            if (array_key_exists('lateBuffer', $validated)) {
                $this->saveSetting(
                    'late_buffer_minutes',
                    (string) $validated['lateBuffer'],
                    'Allowed late arrival buffer in minutes.',
                    $userId
                );
            }

            // រក្សាទុក overtime rate។
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

        // ត្រឡប់ទិន្នន័យដែលបានរក្សាទុកទៅ Frontend។
        return response()->json([
            'success' => true,
            'message' => 'System settings saved successfully.',
            'data' => [
                'lateBuffer' => $validated['lateBuffer'] ?? null,
                'otRate' => $validated['otRate'] ?? null,
                'stationInfo' => $validated['stationInfo'] ?? null,
                'businessHours' => $validated['businessHours'] ?? null,
                'taxSettings' => $validated['taxSettings'] ?? null,
            ],
        ]);
    }

    /**
     * រក្សាទុក Setting មួយតាម setting_key។
     * updateOrCreate ជៀសវាងការបង្កើត Row ស្ទួន។
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
