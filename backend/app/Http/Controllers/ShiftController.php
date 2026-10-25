<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    // 1. បង្ហាញ Shift ដែលកំពុងដំណើរការ
    public function current(Request $request)
    {
        $user = $request->user();

        $shift = Shift::where('user_id', $user->user_id)
            ->where('status', 'active')
            ->latest('shift_id')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $shift,
        ]);
    }

    // 2. ចាប់ផ្ដើម Shift
    public function start(Request $request)
    {
        $user = $request->user();

        return DB::transaction(function () use ($user) {
            $activeShift = Shift::where(
                'user_id',
                $user->user_id
            )
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if ($activeShift) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a Shift session running.',
                    'data' => $activeShift,
                ], 409);
            }

            $shift = Shift::create([
                'user_id' => $user->user_id,
                'start_time' => now(),
                'end_time' => null,
                'status' => 'active',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Successfully started the work shift.',
                'data' => $shift,
            ], 201);
        });
    }

    // 3. បញ្ចប់ Shift
    public function end(Request $request)
    {
        $user = $request->user();

        return DB::transaction(function () use ($user) {
            $shift = Shift::where(
                'user_id',
                $user->user_id
            )
                ->where('status', 'active')
                ->latest('shift_id')
                ->lockForUpdate()
                ->first();

            if (!$shift) {
                return response()->json([
                    'success' => false,
                    'message' => 'No shift is currently in progress.',
                ], 404);
            }

            $shift->update([
                'end_time' => now(),
                'status' => 'completed',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Successfully completed the work shift.',
                'data' => $shift->fresh(),
            ]);
        });
    }
}
