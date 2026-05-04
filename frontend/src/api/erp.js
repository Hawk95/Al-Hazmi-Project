import axios from 'axios';
import { getToken } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8003/api',
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

// Reports
export const getReportSummary    = () => api.get('/reports/summary').then(r => r.data);
export const getOrdersByStatus   = () => api.get('/reports/orders-by-status').then(r => r.data);
export const getLowStockReport   = () => api.get('/reports/low-stock').then(r => r.data);
export const getTopProducts      = () => api.get('/reports/top-products').then(r => r.data);
export const getRevenueTrend     = () => api.get('/reports/revenue-trend').then(r => r.data);
