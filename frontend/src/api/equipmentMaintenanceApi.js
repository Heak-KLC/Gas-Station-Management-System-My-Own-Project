// Import the shared Axios instance.
// It already contains the Laravel API URL and Sanctum token.
import api from "./axios";

// --------------------------------------------------
// GET: Retrieve all equipment maintenance records
// API: GET /api/equipment-maintenance
// --------------------------------------------------
export const getEquipmentMaintenance = async (filters = {}) => {
  const response = await api.get("/equipment-maintenance", {
    params: filters,
  });

  return response.data;
};

// --------------------------------------------------
// GET: Retrieve one maintenance record by its ID
// API: GET /api/equipment-maintenance/{id}
// --------------------------------------------------
export const getEquipmentMaintenanceById = async (id) => {
  const response = await api.get(`/equipment-maintenance/${id}`);

  return response.data;
};

// --------------------------------------------------
// POST: Create a new maintenance record
// API: POST /api/equipment-maintenance
// --------------------------------------------------
export const createEquipmentMaintenance = async (data) => {
  const response = await api.post("/equipment-maintenance", data);

  return response.data;
};

// --------------------------------------------------
// PUT: Update an existing maintenance record
// API: PUT /api/equipment-maintenance/{id}
// --------------------------------------------------
export const updateEquipmentMaintenance = async (id, data) => {
  const response = await api.put(`/equipment-maintenance/${id}`, data);

  return response.data;
};

// --------------------------------------------------
// DELETE: Delete a maintenance record
// API: DELETE /api/equipment-maintenance/{id}
// --------------------------------------------------
export const deleteEquipmentMaintenance = async (id) => {
  const response = await api.delete(`/equipment-maintenance/${id}`);

  return response.data;
};