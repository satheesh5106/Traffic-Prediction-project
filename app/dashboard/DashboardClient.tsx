'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Bell,
  User,
  ChevronDown,
  BarChart3,
  Activity,
  Route,
  Settings,
  LogOut,
  MapPin,
  TrendingUp,
  AlertCircle,
  Clock,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import dashboard components
const TrafficPredictionDashboard = dynamic(() => import('@/components/dashboard/TrafficPredictionDashboard'), { ssr: false });
const RouteOptimizationDashboard = dynamic(() => import('@/components/dashboard/RouteOptimizationDashboard'), { ssr: false });
const AnalyticsDashboard = dynamic(() => import('@/components/dashboard/AnalyticsDashboard'), { ssr: false });
const SettingsDashboard = dynamic(() => import('@/components/dashboard/SettingsDashboard'), { ssr: false });

const DashboardClient = () => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState('overview');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', id: 'overview' },
    { icon: Activity, label: 'Traffic Prediction', id: 'prediction' },
    { icon: Route, label: 'Route Optimization', id: 'routes' },
    { icon: TrendingUp, label: 'Analytics', id: 'analytics' },
    { icon: Settings, label: 'Settings', id: 'settings' }
  ];

  const getPageTitle = () => {
    switch (activeFeature) {
      case 'prediction': return 'Traffic Prediction';
      case 'routes': return 'Route Optimization';
      case 'analytics': return 'Analytics & Reports';
      case 'settings': return 'Settings';
      default: return 'Dashboard Overview';
    }
  };

  const renderFeatureContent = () => {
    switch (activeFeature) {
      case 'prediction':
        return (
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Traffic Prediction Dashboard</h2>
            <p className="text-gray-600 mb-6">This feature has been converted to standalone HTML files.</p>
            <a 
              href="/components/dashboard/TrafficPrediction.html" 
              target="_blank"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Traffic Prediction Dashboard
            </a>
          </div>
        );
      case 'routes':
        return (
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Route Optimization Dashboard</h2>
            <p className="text-gray-600 mb-6">This feature has been converted to standalone HTML files.</p>
            <a 
              href="/components/dashboard/RouteOptimization.html" 
              target="_blank"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Open Route Optimization Dashboard
            </a>
          </div>
        );
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'settings':
        return <SettingsDashboard />;
      default:
        return (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Updated</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">--</div>
                  <div className="text-gray-600 text-sm">Traffic Predictions</div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" /> Last updated: Today
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
                      <Route className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">--</div>
                  <div className="text-gray-600 text-sm">Active Routes</div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" /> Last updated: Today
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">Attention</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">--</div>
                  <div className="text-gray-600 text-sm">System Alerts</div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" /> Last updated: Today
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Data Visualization Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Recent Traffic Patterns</h3>
                    <div className="flex space-x-2">
                      <button className="p-1 rounded hover:bg-gray-100">
                        <RefreshCw className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="p-1 rounded hover:bg-gray-100">
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <div className="text-center">
                      <BarChart3 className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Traffic visualization will appear here</p>
                      <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">View Details</button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Route Efficiency</h3>
                    <div className="flex space-x-2">
                      <button className="p-1 rounded hover:bg-gray-100">
                        <RefreshCw className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="p-1 rounded hover:bg-gray-100">
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <div className="text-center">
                      <MapPin className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Route efficiency data will appear here</p>
                      <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">View Details</button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Interactive Map Section */}
              <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Interactive Traffic Map</h2>
                  <div className="flex space-x-2">
                    <button className="p-1 rounded hover:bg-gray-100">
                      <RefreshCw className="h-4 w-4 text-gray-500" />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100">
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">3D Interactive Map</p>
                    <p className="text-gray-400 text-sm">Real-time traffic visualization</p>
                    <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Explore Map
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Recent Activity Section */}
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start p-3 rounded-lg hover:bg-gray-50">
                    <div className="p-2 rounded-full bg-blue-100 mr-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Traffic prediction updated</p>
                      <p className="text-xs text-gray-500">30 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-start p-3 rounded-lg hover:bg-gray-50">
                    <div className="p-2 rounded-full bg-green-100 mr-3">
                      <Route className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">New route optimized</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start p-3 rounded-lg hover:bg-gray-50">
                    <div className="p-2 rounded-full bg-amber-100 mr-3">
                      <Settings className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">System settings updated</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
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
                  <div className="hidden md:flex flex-col items-start mr-2">
                    <span className="text-sm font-medium text-gray-900">{user.displayName || 'User'}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </button>
                
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                      <hr className="my-2" />
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
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

export default DashboardClient;