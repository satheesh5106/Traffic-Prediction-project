'use client';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, PieChart, LineChart, Download, Filter, Calendar, Target } from 'lucide-react';

const Analytics = () => {
  const analyticsMetrics = [
    { label: 'Total Traffic Volume', value: '--', change: '+-%', icon: BarChart3, color: 'from-blue-500 to-blue-600' },
    { label: 'Average Speed', value: '-- km/h', change: '+-%', icon: TrendingUp, color: 'from-green-500 to-green-600' },
    { label: 'Incident Rate', value: '--%', change: '-%', icon: Target, color: 'from-red-500 to-red-600' },
    { label: 'Route Efficiency', value: '--%', change: '+-%', icon: LineChart, color: 'from-purple-500 to-purple-600' }
  ];

  const timeRanges = ['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'Last Year'];
  const chartTypes = ['Line Chart', 'Bar Chart', 'Area Chart', 'Pie Chart'];

  const reportData = [
    { id: 1, name: 'Daily Traffic Report', type: 'PDF', size: '-- MB', date: '--/--/----', status: 'Ready' },
    { id: 2, name: 'Weekly Analytics Summary', type: 'Excel', size: '-- MB', date: '--/--/----', status: 'Processing' },
    { id: 3, name: 'Monthly Performance Report', type: 'PDF', size: '-- MB', date: '--/--/----', status: 'Ready' },
    { id: 4, name: 'Incident Analysis Report', type: 'PDF', size: '-- MB', date: '--/--/----', status: 'Ready' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'text-green-600 bg-green-100';
      case 'Processing': return 'text-orange-600 bg-orange-100';
      case 'Failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
              <p className="text-gray-600">Comprehensive traffic data analysis and insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {analyticsMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${metric.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${
                    metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.label}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Chart Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl p-6 shadow-lg border border-gray-100"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                {timeRanges.map((range) => (
                  <option key={range}>{range}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                {chartTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <button className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
            Update Charts
          </button>
        </div>
      </motion.div>

      {/* Charts Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Traffic Volume Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Traffic Volume Trends</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-600">Current Period</span>
            </div>
          </div>
          <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 animate-pulse" />
            <div className="text-center z-10">
              <LineChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Traffic Volume Chart</p>
              <p className="text-gray-400 text-sm">Real-time data visualization</p>
            </div>
          </div>
        </div>

        {/* Speed Analysis Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Speed Analysis</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-600">Average Speed</span>
            </div>
          </div>
          <div className="h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 animate-pulse" />
            <div className="text-center z-10">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Speed Distribution</p>
              <p className="text-gray-400 text-sm">Hourly speed analysis</p>
            </div>
          </div>
        </div>

        {/* Incident Distribution */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Incident Distribution</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm text-gray-600">By Type</span>
            </div>
          </div>
          <div className="h-64 bg-gradient-to-br from-red-50 to-pink-50 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5 animate-pulse" />
            <div className="text-center z-10">
              <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Incident Types</p>
              <p className="text-gray-400 text-sm">Distribution analysis</p>
            </div>
          </div>
        </div>

        {/* Route Efficiency */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Route Efficiency</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span className="text-sm text-gray-600">Performance</span>
            </div>
          </div>
          <div className="h-64 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 animate-pulse" />
            <div className="text-center z-10">
              <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Efficiency Metrics</p>
              <p className="text-gray-400 text-sm">Route optimization data</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reports Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Generated Reports</h2>
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
              Generate New Report
            </button>
          </div>
          <div className="space-y-4">
            {reportData.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Download className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-600">{report.type} • {report.size}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Generated</p>
                    <p className="font-medium text-gray-900">{report.date}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                  <button className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors text-sm">
                    Download
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

export default Analytics;