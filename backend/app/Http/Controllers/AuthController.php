<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // --------------------------------------------------
    // Handle user login request
    // --------------------------------------------------
    // This method checks the user's email, password,
    // and account status.
    //
    // If everything is correct, Laravel Sanctum
    // creates a new API token for this login session.
    // --------------------------------------------------
    public function login(Request $request)
    {
        // --------------------------------------------------
        // Validate the data sent from React.
        // React Login form sends "email" and "password".
        // --------------------------------------------------
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // --------------------------------------------------
        // Find the user by email.
        // --------------------------------------------------
        $user = User::where('email', $request->email)->first();

        // --------------------------------------------------
        // Check whether:
        // 1. The email exists.
        // 2. The password is correct.
        //
        // password_hash is the column used by our database.
        // --------------------------------------------------
        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401);
        }

        // --------------------------------------------------
        // Check whether the user account is active.
        // --------------------------------------------------
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Your account is inactive.'
            ], 403);
        }

        // --------------------------------------------------
        // Create a NEW Sanctum token for this login session.
        //
        // Important:
        // We do NOT delete tokens from other users or roles.
        //
        // Example:
        // Admin login    → Admin token
        // Manager login  → Manager token
        // Cashier login  → Cashier token
        // Attendant login → Attendant token
        // --------------------------------------------------
        $token = $user->createToken('gas-station-token')->plainTextToken;

        // --------------------------------------------------
        // Update the user's last login time.
        // --------------------------------------------------
        $user->update([
            'last_login' => now(),
        ]);

        // --------------------------------------------------
        // Return login information to React.
        // --------------------------------------------------
        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => [
                'user_id' => $user->user_id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ], 200);
    }


    // --------------------------------------------------
    // Handle user logout
    // --------------------------------------------------
    // This method logs out the user from ALL active
    // sessions/tokens belonging to THIS USER.
    //
    // It does NOT delete tokens belonging to other users.
    //
    // Example:
    //
    // Admin has:
    //   Chrome     → Token A
    //   Edge       → Token B
    //
    // Admin logs out:
    //   Token A ❌
    //   Token B ❌
    //
    // But:
    //   Manager token   → ✅ Still valid
    //   Cashier token   → ✅ Still valid
    //   Attendant token → ✅ Still valid
    // --------------------------------------------------
    public function logout(Request $request)
    {
        // --------------------------------------------------
        // Delete ALL Sanctum tokens belonging to the
        // currently authenticated USER.
        //
        // We use tokens()->delete() instead of
        // currentAccessToken()->delete() because the
        // requirement is to logout this user from
        // all active browser sessions.
        // --------------------------------------------------
        $request->user()->tokens()->delete();

        // --------------------------------------------------
        // Return a successful response to React.
        // --------------------------------------------------
        return response()->json([
            'message' => 'Logout successful from all sessions.'
        ], 200);
    }
}