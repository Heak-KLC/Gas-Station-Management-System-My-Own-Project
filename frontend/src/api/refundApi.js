
/**
 * Refund API
 *
 * Connect React Frontend to Laravel RefundController.
 * The configured Axios instance already attaches
 * the authentication token.
 */
import api from "./axios";

// =====================================================
// 1. GET REFUND HISTORY
// =====================================================
// Optional filters:
// getRefunds({ status: "pending" })
// getRefunds({ status: "approved" })
// getRefunds({ status: "rejected" })
export const getRefunds = async (params = {}) => {
  const response = await api.get("/refunds", {
    params,
  });

  return response.data;
};

// =====================================================
// 2. CREATE REFUND REQUEST
// =====================================================
export const createRefund = async (refundData) => {
  const response = await api.post("/refunds", refundData);

  return response.data;
};

// =====================================================
// 3. GET ONE REFUND
// =====================================================
export const getRefundById = async (refundId) => {
  const response = await api.get(`/refunds/${refundId}`);

  return response.data;
};

// =====================================================
// 4. APPROVE REFUND
// Only Admin or Manager should perform this action.
// Laravel Controller also checks the user's role.
// =====================================================
export const approveRefund = async (refundId) => {
  const response = await api.patch(
    `/refunds/${refundId}/approve`
  );

  return response.data;
};

// =====================================================
// 5. REJECT REFUND
// Only Admin or Manager should perform this action.
// =====================================================
export const rejectRefund = async (refundId) => {
  const response = await api.patch(
    `/refunds/${refundId}/reject`
  );

  return response.data;
};