import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/common/Toast';

// Create context
const ToastContext = createContext();

/**
 * ToastProvider component for managing toast notifications application-wide
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Add a new toast notification
  const showToast = ({
    variant = 'info',
    title = '',
    message = '',
    delay = 5000,
    position = 'top-end'
  }) => {
    const id = Date.now();
    setToasts(prevToasts => [
      ...prevToasts,
      { id, variant, title, message, delay, position }
    ]);
    return id;
  };

  // Remove a toast notification by ID
  const hideToast = (id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  // Convenience methods for different toast types
  const showSuccessToast = (title, message, options = {}) => {
    return showToast({ variant: 'success', title, message, ...options });
  };

  const showErrorToast = (title, message, options = {}) => {
    return showToast({ variant: 'danger', title, message, ...options });
  };

  const showWarningToast = (title, message, options = {}) => {
    return showToast({ variant: 'warning', title, message, ...options });
  };

  const showInfoToast = (title, message, options = {}) => {
    return showToast({ variant: 'info', title, message, ...options });
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
        showSuccessToast,
        showErrorToast,
        showWarningToast,
        showInfoToast
      }}
    >
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            show={true}
            variant={toast.variant}
            title={toast.title}
            message={toast.message}
            delay={toast.delay}
            position={toast.position}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Custom hook for using toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;