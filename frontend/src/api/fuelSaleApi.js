
import api from "./axios";

// Get Fuel Sale History with optional search and filter parameters.
export const getFuelSales = async (params = {}) => {
    const response = await api.get("/fuel-sales", { params });
    return response.data;
};

// Get details of one Fuel Sale by sale_id.
export const getFuelSale = async (saleId) => {
    const response = await api.get(`/fuel-sales/${saleId}`);
    return response.data;
};