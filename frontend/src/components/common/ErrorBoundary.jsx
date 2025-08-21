import React, { Component } from 'react';
import { Alert, Button, Container } from 'react-bootstrap';
import { ExclamationTriangle } from 'react-bootstrap-icons';

/**
 * ErrorBoundary component to catch JavaScript errors in child components
 * and display a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return (
        <Container className="py-5">
          <Alert variant="danger">
            <div className="text-center mb-4">
              <ExclamationTriangle size={48} className="text-danger mb-3" />
              <h2>Something went wrong</h2>
              <p className="text-muted">
                An unexpected error has occurred in the application.
              </p>
            </div>
            
            {this.state.error && (
              <div className="mt-3">
                <h5>Error Details:</h5>
                <pre className="bg-light p-3 rounded">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}
            
            <div className="d-flex justify-content-center mt-4">
              <Button 
                variant="primary" 
                onClick={this.handleReset}
                className="me-2"
              >
                Try Again
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => window.location.href = '/'}
              >
                Go to Home
              </Button>
            </div>
          </Alert>
        </Container>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;