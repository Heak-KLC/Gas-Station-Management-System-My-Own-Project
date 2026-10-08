// Import the Axios instance that already contains
// the Laravel API URL and Sanctum authentication token.
import api from "./axios";


// =========================================================
// GET TANK REFILLS
// =========================================================
// Get all tank refill history from Laravel.
//
// Laravel endpoint:
// GET /api/tank-refills
//
// The Axios instance automatically sends:
// Authorization: Bearer <token>
export const getTankRefills = async () => {
  const response = await api.get("/tank-refills");

  return response.data;
};


// =========================================================
// CREATE TANK REFILL
// =========================================================
// Create a new tank refill.
//
// Laravel endpoint:
// POST /api/tank-refills
//
// refillData example:
//
// {
//   tank_id: 1,
//   quantity: 1000,
//   source: "Caltex"
// }
export const createTankRefill = async (
  refillData
) => {
  const response = await api.post(
    "/tank-refills",
    refillData
  );

  return response.data;
};