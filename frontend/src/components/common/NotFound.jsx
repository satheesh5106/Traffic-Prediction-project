import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const NotFound = () => {
  return (
    <Container className="py-5 text-center">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <ExclamationTriangle size={64} className="text-warning mb-4" />
          <h1 className="display-4 mb-4">404</h1>
          <h2 className="mb-4">Page Not Found</h2>
          <p className="lead mb-5">
            The page you are looking for might have been removed, had its name changed,
            or is temporarily unavailable.
          </p>
          <Button as={Link} to="/dashboard/traffic" variant="primary" size="lg">
            Go to Dashboard
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound;