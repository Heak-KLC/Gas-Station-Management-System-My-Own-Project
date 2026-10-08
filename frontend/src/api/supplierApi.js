// Import the Axios instance.
// This Axios instance already contains:
// - Laravel API base URL
// - Sanctum authentication token
// - 401 error handling
import api from "./axios";

// =====================================================
// GET ALL SUPPLIERS
// =====================================================
// Used by the Admin Supplier page to load
// all suppliers from the Laravel backend.
export const getSuppliers = async () => {
    const response = await api.get("/suppliers");

    return response.data;
};

// =====================================================
// GET ONE SUPPLIER
// =====================================================
// Used when Admin needs to view
// details of a specific supplier.
export const getSupplier = async (supplierId) => {
    const response = await api.get(
        `/suppliers/${supplierId}`
    );

    return response.data;
};

// =====================================================
// CREATE SUPPLIER
// =====================================================
// Used when Admin creates a new supplier.
export const createSupplier = async (supplierData) => {
    const response = await api.post(
        "/suppliers",
        supplierData
    );

    return response.data;
};

// =====================================================
// UPDATE SUPPLIER
// =====================================================
// Used when Admin edits existing supplier information.
export const updateSupplier = async (
    supplierId,
    supplierData
) => {
    const response = await api.put(
        `/suppliers/${supplierId}`,
        supplierData
    );

    return response.data;
};

// =====================================================
// DELETE SUPPLIER
// =====================================================
// Used when Admin deletes a supplier.
// Laravel will reject the request if the supplier
// already has related purchase orders.
export const deleteSupplier = async (supplierId) => {
    const response = await api.delete(
        `/suppliers/${supplierId}`
    );

    return response.data;
};