import axios from 'axios';

// Create a simple axios instance with basic configuration
// Node.js will automatically handle CA certificates when NODE_EXTRA_CA_CERTS is set
const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for debugging (optional)
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (optional)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'CERT_UNTRUSTED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      console.error('TLS Certificate verification failed:', error.message);
      console.error('Check your CA certificate configuration in Kubernetes');
    }
    return Promise.reject(error);
  }
);

// Export the configured axios instance
export { axiosInstance };

// Export a default axios instance for backward compatibility
export default axiosInstance;