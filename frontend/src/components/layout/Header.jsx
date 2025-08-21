import React from 'react';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { List, Person, Bell, GearFill } from 'react-bootstrap-icons';

const Header = ({ toggleSidebar, authenticated, currentUser, onLogout }) => {
  const location = useLocation();
  
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="navbar-main sticky-top">
      <Container fluid>
        {authenticated && (
          <Button 
            variant="link" 
            className="sidebar-toggle d-lg-none me-3 text-light" 
            onClick={toggleSidebar}
          >
            <List size={24} />
          </Button>
        )}
        
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <img 
            src="/logo.svg" 
            alt="TrafficAI" 
            height="30" 
            className="me-2" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PHBvbHlnb24gcG9pbnRzPSIxNiAxMiAxMCAxNiAxMCA4Ij48L3BvbHlnb24+PC9zdmc+'; // Fallback to a simple play icon
            }}
          />
          <span className="fw-bold">TrafficAI</span>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="navbar-nav" />
        
        <Navbar.Collapse id="navbar-nav">
          {authenticated ? (
            <>
              <Nav className="me-auto">
                <Nav.Link 
                  as={Link} 
                  to="/dashboard/traffic" 
                  active={location.pathname.includes('/dashboard/traffic')}
                >
                  Traffic Prediction
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/dashboard/routes" 
                  active={location.pathname.includes('/dashboard/routes')}
                >
                  Route Optimization
                </Nav.Link>
              </Nav>
              
              <Nav>
                <Dropdown align="end">
                  <Dropdown.Toggle variant="link" id="notification-dropdown" className="nav-link text-light">
                    <Bell size={20} />
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      3
                    </span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Header>Notifications</Dropdown.Header>
                    <Dropdown.Item>New traffic alert in Downtown</Dropdown.Item>
                    <Dropdown.Item>Route optimization complete</Dropdown.Item>
                    <Dropdown.Item>System update available</Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item className="text-center">View All</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                
                <Dropdown align="end">
                  <Dropdown.Toggle variant="link" id="user-dropdown" className="nav-link d-flex align-items-center text-light">
                    <div className="avatar me-2 bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                      {currentUser?.displayName?.charAt(0) || <Person size={18} />}
                    </div>
                    <span className="d-none d-lg-inline">{currentUser?.displayName || 'User'}</span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item as={Link} to="/profile">
                      <Person className="me-2" /> Profile
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/settings">
                      <GearFill className="me-2" /> Settings
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={onLogout}>Logout</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav>
            </>
          ) : (
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/login" active={location.pathname === '/login'}>
                Login
              </Nav.Link>
              <Nav.Link as={Link} to="/register" active={location.pathname === '/register'}>
                Register
              </Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;