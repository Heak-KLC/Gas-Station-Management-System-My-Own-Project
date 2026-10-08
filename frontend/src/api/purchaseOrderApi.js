import api from "./axios";

// =====================================================
// GET ALL PURCHASE ORDERS
// =====================================================
// Get all Purchase Orders from Laravel backend.
export const getPurchaseOrders = async () => {
    const response = await api.get("/purchase-orders");

    return response.data;
};


// =====================================================
// GET ONE PURCHASE ORDER
// =====================================================
// Get details of one Purchase Order by ID.
export const getPurchaseOrder = async (purchaseOrderId) => {
    const response = await api.get(
        `/purchase-orders/${purchaseOrderId}`
    );

    return response.data;
};


// =====================================================
// CREATE PURCHASE ORDER
// =====================================================
// Create a new Purchase Order.
//
// created_by is NOT sent from React.
// Laravel gets created_by from the authenticated user.
export const createPurchaseOrder = async (purchaseOrderData) => {
    const response = await api.post(
        "/purchase-orders",
        purchaseOrderData
    );

    return response.data;
};


// =====================================================
// UPDATE PURCHASE ORDER
// =====================================================
// Update an existing Purchase Order.
export const updatePurchaseOrder = async (
    purchaseOrderId,
    purchaseOrderData
) => {
    const response = await api.put(
        `/purchase-orders/${purchaseOrderId}`,
        purchaseOrderData
    );

    return response.data;
};


// =====================================================
// DELETE PURCHASE ORDER
// =====================================================
// Delete a Purchase Order by ID.
export const deletePurchaseOrder = async (purchaseOrderId) => {
    const response = await api.delete(
        `/purchase-orders/${purchaseOrderId}`
    );

    return response.data;
};