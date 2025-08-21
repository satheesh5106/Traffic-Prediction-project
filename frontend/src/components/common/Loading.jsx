import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

/**
 * Loading component to display a spinner during loading states
 * @param {Object} props - Component props
 * @param {String} props.size - Size of the spinner (sm, md, lg)
 * @param {String} props.variant - Color variant of the spinner
 * @param {String} props.message - Optional message to display
 * @param {Boolean} props.fullPage - Whether to center in the full page
 */
const Loading = ({ 
  size = 'md', 
  variant = 'primary', 
  message = 'Loading...', 
  fullPage = false 
}) => {
  const spinnerSize = {
    sm: '1rem',
    md: '2rem',
    lg: '3rem'
  }[size] || '2rem';

  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center">
      <Spinner
        animation="border"
        role="status"
        variant={variant}
        style={{ width: spinnerSize, height: spinnerSize }}
      >
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      {message && <p className="mt-3 text-center">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <Container 
        fluid 
        className="d-flex align-items-center justify-content-center" 
        style={{ minHeight: '80vh' }}
      >
        {content}
      </Container>
    );
  }

  return content;
};

export default Loading;