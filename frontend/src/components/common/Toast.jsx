import React, { useState, useEffect } from 'react';
import { Toast as BootstrapToast, ToastContainer } from 'react-bootstrap';
import {
  CheckCircleFill,
  ExclamationTriangleFill,
  InfoCircleFill,
  XCircleFill
} from 'react-bootstrap-icons';

/**
 * Toast notification component for displaying alerts and messages
 * @param {Object} props - Component props
 * @param {String} props.variant - Toast variant (success, danger, warning, info)
 * @param {String} props.title - Toast title
 * @param {String} props.message - Toast message
 * @param {Boolean} props.show - Whether to show the toast
 * @param {Function} props.onClose - Function to call when toast is closed
 * @param {Number} props.delay - Auto-hide delay in milliseconds
 * @param {String} props.position - Toast position
 */
const Toast = ({
  variant = 'success',
  title,
  message,
  show,
  onClose,
  delay = 5000,
  position = 'top-end'
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircleFill className="text-success" />;
      case 'danger':
        return <XCircleFill className="text-danger" />;
      case 'warning':
        return <ExclamationTriangleFill className="text-warning" />;
      case 'info':
        return <InfoCircleFill className="text-info" />;
      default:
        return <InfoCircleFill className="text-info" />;
    }
  };

  return (
    <ToastContainer position={position} className="p-3">
      <BootstrapToast
        show={visible}
        onClose={handleClose}
        delay={delay}
        autohide={delay > 0}
        bg={variant === 'danger' ? 'danger' : 'light'}
        className={`border-${variant}`}
      >
        <BootstrapToast.Header closeButton>
          <div className="me-2">{getIcon()}</div>
          <strong className="me-auto">{title}</strong>
        </BootstrapToast.Header>
        <BootstrapToast.Body className={variant === 'danger' ? 'text-white' : ''}>
          {message}
        </BootstrapToast.Body>
      </BootstrapToast>
    </ToastContainer>
  );
};

/**
 * ToastProvider component for managing multiple toasts
 */
export const ToastProvider = () => {
  const [toasts, setToasts] = useState([]);

  // Add a new toast
  const addToast = (toast) => {
    const id = Date.now();
    setToasts([...toasts, { ...toast, id }]);
    return id;
  };

  // Remove a toast by ID
  const removeToast = (id) => {
    setToasts(toasts.filter(toast => toast.id !== id));
  };

  return (
    <ToastContainer position="top-end" className="p-3">
      {toasts.map((toast) => (
        <BootstrapToast
          key={toast.id}
          show={true}
          onClose={() => removeToast(toast.id)}
          delay={toast.delay || 5000}
          autohide={toast.delay !== 0}
          bg={toast.variant === 'danger' ? 'danger' : 'light'}
          className={`border-${toast.variant || 'info'}`}
        >
          <BootstrapToast.Header closeButton>
            <div className="me-2">
              {toast.variant === 'success' && <CheckCircleFill className="text-success" />}
              {toast.variant === 'danger' && <XCircleFill className="text-danger" />}
              {toast.variant === 'warning' && <ExclamationTriangleFill className="text-warning" />}
              {toast.variant === 'info' && <InfoCircleFill className="text-info" />}
            </div>
            <strong className="me-auto">{toast.title}</strong>
          </BootstrapToast.Header>
          <BootstrapToast.Body className={toast.variant === 'danger' ? 'text-white' : ''}>
            {toast.message}
          </BootstrapToast.Body>
        </BootstrapToast>
      ))}
    </ToastContainer>
  );
};

export default Toast;