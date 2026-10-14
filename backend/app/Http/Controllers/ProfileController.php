<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * GET /api/profile
     * បង្ហាញព័ត៌មានរបស់អ្នកប្រើប្រាស់ដែលបាន Login។
     */
    public function show(Request $request)
    {
        // ទាញយកតែ User ដែលបានផ្ទៀងផ្ទាត់ដោយ Sanctum។
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $user->user_id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
                'employee_id' => $user->employee_id,
                'is_active' => $user->is_active,
                'last_login' => $user->last_login,
            ],
        ]);
    }

    /**
     * PUT /api/profile
     * កែព័ត៌មានរបស់គណនីដែលបាន Login។
     */
    public function update(Request $request)
    {
        // កំណត់ User បច្ចុប្បន្ន មិនទទួល user_id ពី Frontend ទេ។
        $user = $request->user();

        // Validate តែព័ត៌មានដែលអនុញ្ញាតឱ្យកែ។
        $validated = $request->validate([
            'username' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('users', 'username')
                    ->ignore($user->user_id, 'user_id'),
            ],
            'full_name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->ignore($user->user_id, 'user_id'),
            ],
        ]);

        // រក្សាទុកតែ fields ដែលបាន Validate។
        $user->fill($validated);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => [
                'user_id' => $user->user_id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * POST /api/change-password
     * ប្ដូរពាក្យសម្ងាត់របស់គណនីដែលបាន Login។
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        // Validate ពាក្យសម្ងាត់ចាស់ និងពាក្យសម្ងាត់ថ្មី។
        $validated = $request->validate([
            'current_password' => [
                'required',
                'string',
            ],
            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'different:current_password',
            ],
        ]);

        // ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ចាស់ជាមួយ password_hash។
        if (!Hash::check(
            $validated['current_password'],
            $user->password_hash
        )) {
            return response()->json([
                'success' => false,
                'message' => 'The current password is incorrect.',
                'errors' => [
                    'current_password' => [
                        'The current password is incorrect.',
                    ],
                ],
            ], 422);
        }

        // Hash ពាក្យសម្ងាត់ថ្មី មុនរក្សាទុកក្នុង Database។
        $user->password_hash = Hash::make(
            $validated['new_password']
        );

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }
}
