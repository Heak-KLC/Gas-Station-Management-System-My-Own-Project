<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * Return the authenticated user's profile.
     */
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => $this->profileData($user),
        ]);
    }

    /**
     * Update profile information and optionally upload an avatar.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'username' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('users', 'username')
                    ->ignore($user->user_id, 'user_id'),
            ],
            'full_name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
            ],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:100',
                Rule::unique('users', 'email')
                    ->ignore($user->user_id, 'user_id'),
            ],
            'avatar' => [
                'sometimes',
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        // Update text fields only.
        $user->fill(collect($validated)->only([
            'username',
            'full_name',
            'email',
        ])->all());

        // Store a new avatar if one was uploaded.
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')
                ->store('profile-photos', 'public');

            if (!$path) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to store profile photo.',
                ], 500);
            }

            // Delete the old photo after the new one is stored.
            $oldPath = $user->avatar_path;

            $user->avatar_path = $path;
            $user->save();

            if ($oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
        } else {
            $user->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => $this->profileData($user->fresh()),
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

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

        $user->password_hash = Hash::make(
            $validated['new_password']
        );

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }

    /**
     * Format profile data for the frontend.
     */
    private function profileData($user)
    {
        return [
            'user_id' => $user->user_id,
            'username' => $user->username,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role,
            'employee_id' => $user->employee_id,
            'is_active' => $user->is_active,
            'last_login' => $user->last_login,
            'avatar_path' => $user->avatar_path,
            'avatar_url' => $user->avatar_path
                ? url(Storage::url($user->avatar_path))
                : null,
        ];
    }
}
