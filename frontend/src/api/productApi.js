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
// productData can be:
// - Normal JSON object
// - FormData when uploading product image
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
// productData can be:
// - Normal JSON object
// - FormData when uploading/replacing product image
//
// We use POST + _method=PUT when FormData is used.
// This helps Laravel correctly process multipart/form-data.
// =========================================================
export const updateProduct = async (
    productId,
    productData
) => {
    // =====================================================
    // If productData is FormData
    // =====================================================
    if (productData instanceof FormData) {
        productData.append("_method", "PUT");

        const response = await api.post(
            `/products/${productId}`,
            productData
        );

        return response.data;
    }

    // =====================================================
    // If productData is normal JSON
    // Keep the original PUT request.
    // =====================================================
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
//
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