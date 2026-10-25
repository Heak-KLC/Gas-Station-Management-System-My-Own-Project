<?php

namespace App\Http\Controllers;

use App\Models\ShiftHandover;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShiftHandoverController extends Controller
{
    public function index()
    {
        $handovers = ShiftHandover::with([
            'outgoingEmployee:employee_id,full_name',
            'incomingEmployee:employee_id,full_name',
        ])
            ->orderByDesc('handed_over_at')
            ->orderByDesc('handover_id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $handovers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shift_type' => [
                'required',
                Rule::in(['Morning', 'Afternoon', 'Night']),
            ],

            'outgoing_employee_id' => [
                'required',
                'integer',
                'different:incoming_employee_id',
                'exists:employees,employee_id',
            ],

            'incoming_employee_id' => [
                'required',
                'integer',
                'exists:employees,employee_id',
            ],

            'total_fuel_liters' => [
                'required', 'numeric', 'min:0',
            ],

            'expected_cash' => [
                'required', 'numeric', 'min:0',
            ],

            'actual_cash' => [
                'required', 'numeric', 'min:0',
            ],

            'cash_denominations' => [
                'nullable', 'array',
            ],

            'cash_denominations.*' => [
                'required', 'integer', 'min:0',
            ],

            'status' => [
                'sometimes',
                Rule::in(['Pending', 'Approved', 'Flagged']),
            ],

            'reason' => [
                'nullable', 'string',
            ],

            'handed_over_at' => [
                'sometimes', 'date',
            ],
        ]);

        $validated['created_by'] =
            $request->user()->getAuthIdentifier();

        $handover = ShiftHandover::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Shift handover created successfully.',
            'data' => $handover->load([
                'outgoingEmployee:employee_id,full_name',
                'incomingEmployee:employee_id,full_name',
            ]),
        ], 201);
    }

    public function show(string $id)
    {
        $handover = ShiftHandover::with([
            'outgoingEmployee:employee_id,full_name',
            'incomingEmployee:employee_id,full_name',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $handover,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $handover = ShiftHandover::findOrFail($id);

        $validated = $request->validate([
            'shift_type' => [
                'sometimes',
                Rule::in(['Morning', 'Afternoon', 'Night']),
            ],

            'outgoing_employee_id' => [
                'sometimes', 'required', 'integer',
                'different:incoming_employee_id',
                'exists:employees,employee_id',
            ],

            'incoming_employee_id' => [
                'sometimes', 'required', 'integer',
                'exists:employees,employee_id',
            ],

            'total_fuel_liters' => [
                'sometimes', 'required', 'numeric', 'min:0',
            ],

            'expected_cash' => [
                'sometimes', 'required', 'numeric', 'min:0',
            ],

            'actual_cash' => [
                'sometimes', 'required', 'numeric', 'min:0',
            ],

            'cash_denominations' => [
                'sometimes', 'nullable', 'array',
            ],

            'cash_denominations.*' => [
                'required', 'integer', 'min:0',
            ],

            'status' => [
                'sometimes',
                Rule::in(['Pending', 'Approved', 'Flagged']),
            ],

            'reason' => [
                'sometimes', 'nullable', 'string',
            ],

            'handed_over_at' => [
                'sometimes', 'date',
            ],
        ]);

        $handover->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Shift handover updated successfully.',
            'data' => $handover->fresh()->load([
                'outgoingEmployee:employee_id,full_name',
                'incomingEmployee:employee_id,full_name',
            ]),
        ]);
    }

    public function destroy(string $id)
    {
        $handover = ShiftHandover::findOrFail($id);

        $handover->delete();

        return response()->json([
            'success' => true,
            'message' => 'Shift handover deleted successfully.',
        ]);
    }
}
