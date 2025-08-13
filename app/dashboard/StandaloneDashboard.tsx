'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Bell,
  User,
  ChevronDown,
  BarChart3,
  Activity,
  Route,
  Monitor,
  Settings,
  MapPin,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

// Import feature components
import TrafficPrediction from '../../lib/components/dashboard/TrafficPrediction';
import RouteOptimization from '../../lib/components/dashboard/RouteOptimization';
import RealTimeMonitoring from '../../lib/components/dashboard/RealTimeMonitoring';
import Analytics from '../../lib/components/dashboard/Analytics';
import SettingsComponent from '../../lib/components/dashboard/Settings';

const StandaloneDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState('overview');

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', id: 'overview' },
    { icon: Activity, label: 'Traffic Prediction', id: 'prediction' },
    { icon: Route, label: 'Route Optimization', id: 'routes' },
    { icon: Monitor, label: 'Real-time Monitoring', id: 'monitoring' },
    { icon: TrendingUp, label: 'Analytics', id: 'analytics' },
    { icon: Settings, label: 'Settings', id: 'settings' }
  ];

  const getPageTitle = () => {
    switch (activeFeature) {
      case 'prediction': return 'Traffic Prediction';
      case 'routes': return 'Route Optimization';
      case 'monitoring': return 'Real-time Monitoring';
      case 'analytics': return 'Analytics & Reports';
      case 'settings': return 'Settings';
      default: return 'Dashboard Overview';
    }
  };

  const renderFeatureContent = () => {
    switch (activeFeature) {
      case 'prediction':
        return <TrafficPrediction />;
      case 'routes':
        return <RouteOptimization />;
      case 'monitoring':
        return <RealTimeMonitoring />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <SettingsComponent />;
      default:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">--</div>
                <div className="text-gray-600 text-sm">Traffic Predictions</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
                    <Route className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">--</div>
                <div className="text-gray-600 text-sm">Active Routes</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                    <Monitor className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">--</div>
                <div className="text-gray-600 text-sm">Live Monitoring</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">--</div>
                <div className="text-gray-600 text-sm">System Alerts</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Interactive Traffic Map</h2>
              <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 opacity-50"></div>
                <div className="text-center relative z-10">
                  <MapPin className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium text-lg">3D Interactive Traffic Map</p>
                  <p className="text-gray-500 text-sm mt-2">Real-time traffic visualization and monitoring</p>
                  <div className="mt-4 flex justify-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Light Traffic</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Moderate Traffic</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Heavy Traffic</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Route optimization completed</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Traffic prediction updated</p>
                      <p className="text-xs text-gray-500">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">System maintenance scheduled</p>
                      <p className="text-xs text-gray-500">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">System Efficiency</span>
                      <span className="font-medium text-gray-900">94%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '94%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Prediction Accuracy</span>
                      <span className="font-medium text-gray-900">87%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '87%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Route Optimization</span>
                      <span className="font-medium text-gray-900">91%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '91%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
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
                
                <AnimatePresence>
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
                </AnimatePresence>
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