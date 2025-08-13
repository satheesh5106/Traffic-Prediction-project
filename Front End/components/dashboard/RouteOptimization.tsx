'use client';
import { motion } from 'framer-motion';
import { Route, Navigation, Clock, Fuel, MapPin, Zap, Settings, Play } from 'lucide-react';

const RouteOptimization = () => {
  const routeOptions = [
    { id: 1, name: 'Fastest Route', time: '-- mins', distance: '-- km', fuel: '-- L', traffic: 'Light', color: 'from-green-500 to-green-600' },
    { id: 2, name: 'Shortest Route', time: '-- mins', distance: '-- km', fuel: '-- L', traffic: 'Moderate', color: 'from-blue-500 to-blue-600' },
    { id: 3, name: 'Eco-Friendly Route', time: '-- mins', distance: '-- km', fuel: '-- L', traffic: 'Heavy', color: 'from-emerald-500 to-emerald-600' },
    { id: 4, name: 'Scenic Route', time: '-- mins', distance: '-- km', fuel: '-- L', traffic: 'Light', color: 'from-purple-500 to-purple-600' }
  ];

  const optimizationMetrics = [
    { label: 'Routes Optimized', value: '--', icon: Route, color: 'from-blue-500 to-blue-600' },
    { label: 'Time Saved', value: '-- mins', icon: Clock, color: 'from-green-500 to-green-600' },
    { label: 'Fuel Efficiency', value: '--%', icon: Fuel, color: 'from-orange-500 to-orange-600' },
    { label: 'Active Routes', value: '--', icon: Navigation, color: 'from-purple-500 to-purple-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
              <Route className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Route Optimization</h1>
              <p className="text-gray-600">AI-powered intelligent route planning and optimization</p>
            </div>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all">
            <Play className="h-4 w-4" />
            <span>Start Optimization</span>
          </button>
        </div>
      </motion.div>

      {/* Route Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6">Route Planning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Starting Point</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter starting location..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
              <div className="relative">
                <Navigation className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter destination..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Optimization Priority</label>
              <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option>Fastest Time</option>
                <option>Shortest Distance</option>
                <option>Fuel Efficiency</option>
                <option>Avoid Traffic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
              <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                <option>Car</option>
                <option>Truck</option>
                <option>Motorcycle</option>
                <option>Electric Vehicle</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Optimization Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {optimizationMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${metric.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="w-6 h-6 bg-gray-100 rounded-full animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.label}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Route Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Route Visualization</h2>
            <div className="flex items-center space-x-2">
              <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Settings className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Zap className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 animate-pulse" />
            <div className="text-center z-10">
              <Route className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Interactive Route Map</p>
              <p className="text-gray-400 text-sm">Optimized path visualization</p>
            </div>
            
            {/* Animated route indicators */}
            <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-green-400 rounded-full animate-ping" />
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-purple-400 rounded-full animate-bounce" />
          </div>
        </div>
      </motion.div>

      {/* Route Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Optimized Route Options</h2>
          <div className="space-y-4">
            {routeOptions.map((route, index) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${route.color}`} />
                  <div>
                    <p className="font-medium text-gray-900">{route.name}</p>
                    <p className="text-sm text-gray-600">Traffic: {route.traffic}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">{route.time}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Distance</p>
                    <p className="font-medium text-gray-900">{route.distance}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Fuel</p>
                    <p className="font-medium text-gray-900">{route.fuel}</p>
                  </div>
                  <button className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors text-sm">
                    Select Route
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RouteOptimization;