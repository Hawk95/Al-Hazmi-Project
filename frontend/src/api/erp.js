import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8003/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Suppliers
export const getSuppliers    = ()         => api.get('/suppliers').then(r => r.data);
export const createSupplier  = (data)     => api.post('/suppliers', data).then(r => r.data);
export const updateSupplier  = (id, data) => api.put(`/suppliers/${id}`, data).then(r => r.data);
export const deleteSupplier  = (id)       => api.delete(`/suppliers/${id}`);

// Products
export const getProducts     = ()         => api.get('/products').then(r => r.data);
export const createProduct   = (data)     => api.post('/products', data).then(r => r.data);
export const updateProduct   = (id, data) => api.put(`/products/${id}`, data).then(r => r.data);
export const adjustStock     = (id, data) => api.patch(`/products/${id}/stock`, data).then(r => r.data);
export const deleteProduct   = (id)       => api.delete(`/products/${id}`);

// Orders
export const getOrders       = ()         => api.get('/orders').then(r => r.data);
export const createOrder     = (data)     => api.post('/orders', data).then(r => r.data);
export const updateOrder     = (id, data) => api.put(`/orders/${id}`, data).then(r => r.data);
export const deleteOrder     = (id)       => api.delete(`/orders/${id}`);

// Deliveries
export const getDeliveries   = ()         => api.get('/deliveries').then(r => r.data);
export const createDelivery  = (data)     => api.post('/deliveries', data).then(r => r.data);
export const updateDelivery  = (id, data) => api.put(`/deliveries/${id}`, data).then(r => r.data);
export const deleteDelivery  = (id)       => api.delete(`/deliveries/${id}`);

// Sales Distribution
export const getSalesSummary        = ()         => api.get('/sales/summary').then(r => r.data);
export const getSalesmen            = ()         => api.get('/sales/salesmen').then(r => r.data);
export const createSalesman         = (data)     => api.post('/sales/salesmen', data).then(r => r.data);
export const updateSalesman         = (id, data) => api.put(`/sales/salesmen/${id}`, data).then(r => r.data);
export const deleteSalesman         = (id)       => api.delete(`/sales/salesmen/${id}`);
export const getDistributions       = (params)   => api.get('/sales/distributions', { params }).then(r => r.data);
export const createDistribution     = (data)     => api.post('/sales/distributions', data).then(r => r.data);
export const updateDistribution     = (id, data) => api.put(`/sales/distributions/${id}`, data).then(r => r.data);
export const deleteDistribution     = (id)       => api.delete(`/sales/distributions/${id}`);

// HR
export const toggleHRAccess      = (id)       => api.put(`/admin/users/${id}/hr-access`).then(r => r.data);
export const getEmployees        = ()         => api.get('/hr/employees').then(r => r.data);
export const createEmployee      = (data)     => api.post('/hr/employees', data).then(r => r.data);
export const updateEmployee      = (id, data) => api.put(`/hr/employees/${id}`, data).then(r => r.data);
export const deleteEmployee      = (id)       => api.delete(`/hr/employees/${id}`);
export const getAttendance       = (date)     => api.get('/hr/attendance', { params: { date } }).then(r => r.data);
export const saveAttendanceBulk  = (data)     => api.post('/hr/attendance/bulk', data).then(r => r.data);
export const getHRSummary        = ()         => api.get('/hr/summary').then(r => r.data);
export const getPayroll          = (month)    => api.get('/hr/payroll', { params: { month } }).then(r => r.data);

// Portal (employee self-service — uses emp_token, no admin auth)
const portalApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8003/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});
portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('emp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const portalGetEmployees = ()     => portalApi.get('/hr/portal/employees').then(r => r.data);
export const portalLogin        = (data) => portalApi.post('/hr/portal/login', data).then(r => r.data);
export const portalGetStatus    = ()     => portalApi.get('/hr/portal/status').then(r => r.data);
export const portalCheckIn      = (data) => portalApi.post('/hr/portal/checkin', data).then(r => r.data);
export const portalCheckOut     = (data) => portalApi.post('/hr/portal/checkout', data).then(r => r.data);

// Stock Flow
export const getStockSummary       = ()         => api.get('/stock/summary').then(r => r.data);
export const getPurchaseOrders     = ()         => api.get('/stock/purchase-orders').then(r => r.data);
export const createPurchaseOrder   = (data)     => api.post('/stock/purchase-orders', data).then(r => r.data);
export const approvePO             = (id)       => api.put(`/stock/purchase-orders/${id}/approve`).then(r => r.data);
export const transitPO             = (id)       => api.put(`/stock/purchase-orders/${id}/transit`).then(r => r.data);
export const receivePO             = (id, data) => api.post(`/stock/purchase-orders/${id}/receive`, data).then(r => r.data);
export const getSaleOrders         = ()         => api.get('/stock/sale-orders').then(r => r.data);
export const createSaleOrder       = (data)     => api.post('/stock/sale-orders', data).then(r => r.data);
export const approveSO             = (id)       => api.put(`/stock/sale-orders/${id}/approve`).then(r => r.data);
export const dispatchSO            = (id)       => api.put(`/stock/sale-orders/${id}/dispatch`).then(r => r.data);
export const deliverSO             = (id)       => api.put(`/stock/sale-orders/${id}/deliver`).then(r => r.data);
export const rejectSO              = (id, data) => api.put(`/stock/sale-orders/${id}/reject`, data).then(r => r.data);
export const getReturns            = ()         => api.get('/stock/returns').then(r => r.data);
export const confirmReturn         = (id)       => api.put(`/stock/returns/${id}/confirm`).then(r => r.data);
export const getInvoices           = ()         => api.get('/stock/invoices').then(r => r.data);

// Reports
export const getReportSummary    = () => api.get('/reports/summary').then(r => r.data);
export const getOrdersByStatus   = () => api.get('/reports/orders-by-status').then(r => r.data);
export const getLowStockReport   = () => api.get('/reports/low-stock').then(r => r.data);
export const getTopProducts      = () => api.get('/reports/top-products').then(r => r.data);
export const getRevenueTrend     = () => api.get('/reports/revenue-trend').then(r => r.data);
