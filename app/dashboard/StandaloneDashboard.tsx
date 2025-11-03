'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Menu,
  Bell,
  User,
  ChevronDown,
  BarChart3,
  Activity,
  Route,
  Settings,
  MapPin,
  TrendingUp,
  AlertCircle,
  Shield,
  Cloud
} from 'lucide-react';

// Dynamically import dashboard components
const DashboardOverview = dynamic(() => import('@/components/dashboard/DashboardOverview'), { ssr: false });
const WeatherDashboard = dynamic(() => import('@/components/dashboard/WeatherDashboard'), { ssr: false });
const TrafficPredictionDashboard = dynamic(() => import('@/components/dashboard/TrafficPredictionDashboard'), { ssr: false });
const RouteOptimizationDashboard = dynamic(() => import('@/components/dashboard/RouteOptimizationDashboard'), { ssr: false });
const IncidentPredictionDashboard = dynamic(() => import('@/components/dashboard/IncidentPredictionDashboard'), { ssr: false });

const SettingsDashboard = dynamic(() => import('@/components/dashboard/SettingsDashboard'), { ssr: false });

const StandaloneDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState('overview');

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', id: 'overview' },
    { icon: Cloud, label: 'IMD Warnings ⚠️', id: 'weather' },
    { icon: Route, label: 'Route Optimization 🛣️', id: 'routes' },
    { icon: Activity, label: 'Traffic Prediction ', id: 'prediction' },
    { icon: Shield, label: 'Incident Prediction ', id: 'incidents' },

    { icon: Settings, label: 'Settings', id: 'settings' }
  ];

  const getPageTitle = () => {
    switch (activeFeature) {
      case 'weather': return 'Weather and IMD';
      case 'prediction': return 'Traffic Prediction';
      case 'routes': return 'Route Optimization';
      case 'incidents': return 'Incident Prediction';

      case 'settings': return 'Settings';
      default: return 'Dashboard Overview';
    }
  };

  const renderFeatureContent = () => {
    switch (activeFeature) {
      case 'weather':
        return <WeatherDashboard />;
      case 'prediction':
        return <TrafficPredictionDashboard />;
      case 'routes':
        return <RouteOptimizationDashboard />;
      case 'incidents':
        return <IncidentPredictionDashboard />;

              case 'settings':
        return <SettingsDashboard />;
      case 'overview':
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="font-bold text-xl text-gray-900">TrafficAI</span>
              </div>
              
              <div className="hidden md:block">
                <span className="text-gray-600 font-medium">{getPageTitle()}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </button>
                
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                    >
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Demo User</span>
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                    </motion.div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-16 h-full bg-white shadow-lg border-r border-gray-200 transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}>
          <div className="p-4">
            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveFeature(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                      activeFeature === item.id
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="font-medium">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}>
          <div className="p-6">
            {renderFeatureContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StandaloneDashboard;