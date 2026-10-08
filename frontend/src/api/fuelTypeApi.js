import api from "./axios";

// =========================================================
// GET ALL FUEL TYPES
// Get all fuel types from Laravel API.
// This will be used by FuelPumps.jsx
// to display the Fuel Type dropdown.
// =========================================================
export const getFuelTypes = async () => {
    const response = await api.get("/fuel-types");

    return response.data;
};

// =========================================================
// UPDATE FUEL TYPE PRICE
// Update selling price of a fuel type.
// This function can be used later by
// Fuel Management / Fuel Price UI.
// =========================================================
export const updateFuelType = async (
    fuelId,
    fuelTypeData
) => {
    const response = await api.put(
        `/fuel-types/${fuelId}`,
        fuelTypeData
    );

    return response.data;
};