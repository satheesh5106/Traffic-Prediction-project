'use client';
import { motion } from 'framer-motion';
import { Activity, MapPin, Clock, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';

const TrafficPrediction = () => {
  const predictionData = [
    { id: 1, location: 'Main Street & 5th Avenue', prediction: 'Heavy Traffic', confidence: '92%', time: '15 mins', severity: 'high' },
    { id: 2, location: 'Highway 101 North', prediction: 'Moderate Traffic', confidence: '87%', time: '8 mins', severity: 'medium' },
    { id: 3, location: 'Downtown Core', prediction: 'Light Traffic', confidence: '94%', time: '3 mins', severity: 'low' },
    { id: 4, location: 'Business District', prediction: 'Congested', confidence: '89%', time: '22 mins', severity: 'high' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'from-red-500 to-red-600';
      case 'medium': return 'from-orange-500 to-orange-600';
      case 'low': return 'from-green-500 to-green-600';
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
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Traffic Prediction</h1>
              <p className="text-gray-600">AI-powered traffic flow analysis and predictions</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Last Updated</div>
            <div className="text-lg font-semibold text-gray-900">--:-- --</div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { label: 'Active Predictions', value: '--', icon: BarChart3, color: 'from-blue-500 to-blue-600' },
          { label: 'Accuracy Rate', value: '--%', icon: TrendingUp, color: 'from-green-500 to-green-600' },
          { label: 'Avg Response Time', value: '-- ms', icon: Clock, color: 'from-purple-500 to-purple-600' },
          { label: 'Critical Alerts', value: '--', icon: AlertCircle, color: 'from-red-500 to-red-600' }
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

      {/* Prediction Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Real-time Traffic Prediction Map</h2>
            <div className="flex space-x-2">
              {['Live', 'Predicted', 'Historical'].map((mode) => (
                <button
                  key={mode}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors"
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-teal-500/10 animate-pulse" />
            <div className="text-center z-10">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Interactive Prediction Map</p>
              <p className="text-gray-400 text-sm">Real-time traffic flow visualization</p>
            </div>
            
            {/* Floating prediction indicators */}
            <div className="absolute top-4 left-4 w-3 h-3 bg-red-400 rounded-full animate-ping" />
            <div className="absolute top-8 right-8 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <div className="absolute bottom-6 left-8 w-4 h-4 bg-green-400 rounded-full animate-bounce" />
          </div>
        </div>
      </motion.div>

      {/* Prediction List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Current Predictions</h2>
          <div className="space-y-4">
            {predictionData.map((prediction, index) => (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${getSeverityColor(prediction.severity)}`} />
                  <div>
                    <p className="font-medium text-gray-900">{prediction.location}</p>
                    <p className="text-sm text-gray-600">{prediction.prediction}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Confidence: </span>
                      <span className="font-medium text-gray-900">{prediction.confidence}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">ETA: </span>
                      <span className="font-medium text-gray-900">{prediction.time}</span>
                    </div>
                    <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TrafficPrediction;