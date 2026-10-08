import api from "./axios";

// =========================================================
// GET ALL PRODUCT CATEGORIES
// =========================================================
export const getProductCategories = async () => {
    const response = await api.get(
        "/product-categories"
    );

    return response.data;
};

// =========================================================
// GET ONE CATEGORY
// =========================================================
export const getProductCategory = async (
    categoryId
) => {
    const response = await api.get(
        `/product-categories/${categoryId}`
    );

    return response.data;
};

// =========================================================
// CREATE CATEGORY
// =========================================================
export const createProductCategory = async (
    categoryData
) => {
    const response = await api.post(
        "/product-categories",
        categoryData
    );

    return response.data;
};

// =========================================================
// UPDATE CATEGORY
// =========================================================
export const updateProductCategory = async (
    categoryId,
    categoryData
) => {
    const response = await api.put(
        `/product-categories/${categoryId}`,
        categoryData
    );

    return response.data;
};

// =========================================================
// DELETE CATEGORY
// =========================================================
export const deleteProductCategory = async (
    categoryId
) => {
    const response = await api.delete(
        `/product-categories/${categoryId}`
    );

    return response.data;
};