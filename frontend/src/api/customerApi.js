// Import the existing Axios instance.
// It already handles the Laravel API URL and Sanctum token.
import api from "./axios";

// Get all customers, with optional search/filter parameters.
export const getCustomers = async (params = {}) => {
  const response = await api.get("/customers", { params });
  return response.data;
};

// Get one customer by ID.
export const getCustomerById = async (customerId) => {
  const response = await api.get(`/customers/${customerId}`);
  return response.data;
};

// Register a new customer.
export const createCustomer = async (customerData) => {
  const response = await api.post("/customers", customerData);
  return response.data;
};

// Update customer information.
export const updateCustomer = async (customerId, customerData) => {
  const response = await api.put(
    `/customers/${customerId}`,
    customerData
  );
  return response.data;
};

// Deactivate a customer.
// The Laravel controller uses DELETE to set is_active = false.
export const deactivateCustomer = async (customerId) => {
  const response = await api.delete(`/customers/${customerId}`);
  return response.data;
};