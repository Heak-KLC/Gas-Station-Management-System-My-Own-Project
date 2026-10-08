import api from "./axios";

// =========================================================
// GET ALL FUEL PUMPS
// =========================================================
export const getFuelPumps = async () => {
    const response = await api.get("/fuel-pumps");

    return response.data;
};

// =========================================================
// GET ONE FUEL PUMP
// =========================================================
export const getFuelPump = async (pumpId) => {
    const response = await api.get(
        `/fuel-pumps/${pumpId}`
    );

    return response.data;
};

// =========================================================
// CREATE FUEL PUMP
// =========================================================
export const createFuelPump = async (fuelPumpData) => {
    const response = await api.post(
        "/fuel-pumps",
        fuelPumpData
    );

    return response.data;
};

// =========================================================
// UPDATE FUEL PUMP
// =========================================================
export const updateFuelPump = async (
    pumpId,
    fuelPumpData
) => {
    const response = await api.put(
        `/fuel-pumps/${pumpId}`,
        fuelPumpData
    );

    return response.data;
};

// =========================================================
// DELETE FUEL PUMP
// =========================================================
export const deleteFuelPump = async (pumpId) => {
    const response = await api.delete(
        `/fuel-pumps/${pumpId}`
    );

    return response.data;
};