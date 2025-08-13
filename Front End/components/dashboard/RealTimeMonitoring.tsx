'use client';
import { motion } from 'framer-motion';
import { Monitor, Camera, AlertTriangle, Activity, Eye, Wifi, Signal, RefreshCw } from 'lucide-react';

const RealTimeMonitoring = () => {
  const monitoringStations = [
    { id: 1, name: 'Station Alpha', location: 'Main St & 1st Ave', status: 'online', vehicles: '--', speed: '-- km/h', incidents: '--' },
    { id: 2, name: 'Station Beta', location: 'Highway 101 North', status: 'online', vehicles: '--', speed: '-- km/h', incidents: '--' },
    { id: 3, name: 'Station Gamma', location: 'Downtown Core', status: 'offline', vehicles: '--', speed: '-- km/h', incidents: '--' },
    { id: 4, name: 'Station Delta', location: 'Business District', status: 'online', vehicles: '--', speed: '-- km/h', incidents: '--' }
  ];

  const alertsData = [
    { id: 1, type: 'Traffic Jam', location: 'Main Street', severity: 'high', time: '--:-- --' },
    { id: 2, type: 'Accident', location: 'Highway 101', severity: 'critical', time: '--:-- --' },
    { id: 3, type: 'Road Closure', location: 'Downtown', severity: 'medium', time: '--:-- --' },
    { id: 4, type: 'Weather Alert', location: 'City Wide', severity: 'low', time: '--:-- --' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'from-green-500 to-green-600';
      case 'offline': return 'from-red-500 to-red-600';
      case 'maintenance': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      case 'low': return 'from-blue-500 to-blue-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

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
            <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
              <Monitor className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Real-time Monitoring</h1>
              <p className="text-gray-600">Live traffic monitoring and incident detection</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Live</span>
            </div>
            <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { label: 'Active Cameras', value: '--', icon: Camera, color: 'from-blue-500 to-blue-600' },
          { label: 'Monitoring Stations', value: '--', icon: Monitor, color: 'from-green-500 to-green-600' },
          { label: 'Active Alerts', value: '--', icon: AlertTriangle, color: 'from-red-500 to-red-600' },
          { label: 'System Uptime', value: '--%', icon: Activity, color: 'from-purple-500 to-purple-600' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="w-6 h-6 bg-gray-100 rounded-full animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Live Feed Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Live Camera Feeds</h2>
            <div className="flex space-x-2">
              {['All', 'Main Roads', 'Intersections', 'Highways'].map((filter) => (
                <button
                  key={filter}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-purple-100 hover:text-purple-600 transition-colors"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((feed) => (
              <motion.div
                key={feed}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + feed * 0.1 }}
                className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <Camera className="h-12 w-12 text-gray-400" />
                </div>
                <div className="absolute top-2 left-2 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">LIVE</span>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/50 text-white text-xs p-2 rounded">
                    <p className="font-medium">Camera {feed}</p>
                    <p className="text-gray-300">Location {feed}</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Monitoring Stations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Monitoring Stations</h2>
          <div className="space-y-4">
            {monitoringStations.map((station, index) => (
              <motion.div
                key={station.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${getStatusColor(station.status)}`} />
                  <div>
                    <p className="font-medium text-gray-900">{station.name}</p>
                    <p className="text-sm text-gray-600">{station.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Vehicles</p>
                    <p className="font-medium text-gray-900">{station.vehicles}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Avg Speed</p>
                    <p className="font-medium text-gray-900">{station.speed}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Incidents</p>
                    <p className="font-medium text-gray-900">{station.incidents}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Signal className="h-4 w-4 text-gray-400" />
                    <Wifi className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Active Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Active Alerts</h2>
          <div className="space-y-4">
            {alertsData.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${getSeverityColor(alert.severity)}`} />
                  <div>
                    <p className="font-medium text-gray-900">{alert.type}</p>
                    <p className="text-sm text-gray-600">{alert.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">{alert.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Severity</p>
                    <p className={`font-medium capitalize ${
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'high' ? 'text-orange-600' :
                      alert.severity === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>{alert.severity}</p>
                  </div>
                  <button className="px-3 py-1 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors text-sm">
                    View Details
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

export default RealTimeMonitoring;