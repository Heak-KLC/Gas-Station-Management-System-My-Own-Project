import api from "./axios";

// =========================================================
// GET ALL PRODUCTS
// =========================================================
export const getProducts = async (params = {}) => {
    const response = await api.get("/products", {
        params,
    });

    return response.data;
};

// =========================================================
// GET ONE PRODUCT
// =========================================================
export const getProduct = async (productId) => {
    const response = await api.get(
        `/products/${productId}`
    );

    return response.data;
};

// =========================================================
// CREATE PRODUCT
// =========================================================
export const createProduct = async (productData) => {
    const response = await api.post(
        "/products",
        productData
    );

    return response.data;
};

// =========================================================
// UPDATE PRODUCT
// =========================================================
export const updateProduct = async (
    productId,
    productData
) => {
    const response = await api.put(
        `/products/${productId}`,
        productData
    );

    return response.data;
};

// =========================================================
// DELETE PRODUCT
// =========================================================
export const deleteProduct = async (productId) => {
    const response = await api.delete(
        `/products/${productId}`
    );

    return response.data;
};

// =========================================================
// ADJUST INVENTORY
// quantityChange:
// +10 = Add 10 items
// -5  = Remove 5 items
// =========================================================
export const adjustProductInventory = async (
    productId,
    inventoryData
) => {
    const response = await api.post(
        `/products/${productId}/adjust-inventory`,
        inventoryData
    );

    return response.data;
};

// =========================================================
// GET INVENTORY LOGS
// =========================================================
export const getProductInventoryLogs = async (
    productId
) => {
    const response = await api.get(
        `/products/${productId}/inventory-logs`
    );

    return response.data;
};