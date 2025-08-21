import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Nav } from 'react-bootstrap';
import {
  GeoAlt,
  Speedometer2,
  Map,
  GraphUp,
  Gear,
  QuestionCircle,
  XLg
} from 'react-bootstrap-icons';

const Sidebar = ({ open, toggleSidebar }) => {
  const location = useLocation();

  // Navigation items
  const navItems = [
    {
      title: 'Traffic Prediction',
      path: '/dashboard/traffic',
      icon: <GeoAlt size={18} />
    },
    {
      title: 'Route Optimization',
      path: '/dashboard/routes',
      icon: <Map size={18} />
    },
    {
      title: 'Analytics',
      path: '/dashboard/analytics',
      icon: <GraphUp size={18} />
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: <Gear size={18} />
    },
    {
      title: 'Help',
      path: '/help',
      icon: <QuestionCircle size={18} />
    }
  ];

  return (
    <div className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-header d-flex justify-content-between align-items-center p-3">
        <div className="d-flex align-items-center">
          <Speedometer2 size={24} className="me-2" />
          <h5 className="mb-0">TrafficAI</h5>
        </div>
        <button 
          className="btn-close d-lg-none" 
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        ></button>
      </div>
      
      <div className="sidebar-content p-2">
        <Nav className="flex-column">
          {navItems.map((item, index) => (
            <Nav.Item key={index}>
              <Nav.Link 
                as={Link} 
                to={item.path}
                className={`d-flex align-items-center py-2 ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => window.innerWidth < 992 && toggleSidebar()}
              >
                <span className="nav-icon me-3">{item.icon}</span>
                <span className="nav-text">{item.title}</span>
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>
      
      <div className="sidebar-footer p-3 border-top">
        <div className="d-flex align-items-center">
          <div className="avatar bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
            <span className="text-white">AI</span>
          </div>
          <div className="ms-2">
            <div className="small fw-bold">TrafficAI v1.0</div>
            <div className="small text-muted">Real-time traffic intelligence</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;