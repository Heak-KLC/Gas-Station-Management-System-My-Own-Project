// Import the Axios instance that already contains
// our Laravel API URL and authentication token logic.
import api from './axios';


// =========================================================
// GET ALL FUEL TANKS
// =========================================================
// This function gets all fuel tanks from Laravel.
export const getFuelTanks = async () => {
    const response = await api.get('/fuel-tanks');

    return response.data;
};


// =========================================================
// CREATE FUEL TANK
// =========================================================
// This function sends a new fuel tank to Laravel.
export const createFuelTank = async (tankData) => {
    const response = await api.post('/fuel-tanks', tankData);

    return response.data;
};


// =========================================================
// UPDATE FUEL TANK
// =========================================================
// This function updates an existing fuel tank.
export const updateFuelTank = async (id, tankData) => {
    const response = await api.put(`/fuel-tanks/${id}`, tankData);

    return response.data;
};


// =========================================================
// DELETE FUEL TANK
// =========================================================
// This function deletes a fuel tank by its ID.
export const deleteFuelTank = async (id) => {
    const response = await api.delete(`/fuel-tanks/${id}`);

    return response.data;
};