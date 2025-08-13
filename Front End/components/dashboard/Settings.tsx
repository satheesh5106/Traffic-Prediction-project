'use client';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Palette, Globe, Key, Save, RefreshCw } from 'lucide-react';

const Settings = () => {
  const settingsSections = [
    {
      id: 'profile',
      title: 'Profile Settings',
      icon: User,
      color: 'from-blue-500 to-blue-600',
      description: 'Manage your account information and preferences'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      color: 'from-green-500 to-green-600',
      description: 'Configure alert and notification preferences'
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      description: 'Security settings and privacy controls'
    },
    {
      id: 'system',
      title: 'System Configuration',
      icon: Database,
      color: 'from-purple-500 to-purple-600',
      description: 'System-wide settings and configurations'
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      color: 'from-pink-500 to-pink-600',
      description: 'Customize the look and feel of your dashboard'
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: Globe,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Third-party integrations and API settings'
    }
  ];

  const notificationTypes = [
    { id: 'traffic_alerts', label: 'Traffic Alerts', description: 'Real-time traffic incident notifications', enabled: true },
    { id: 'system_updates', label: 'System Updates', description: 'System maintenance and update notifications', enabled: true },
    { id: 'performance_reports', label: 'Performance Reports', description: 'Weekly performance and analytics reports', enabled: false },
    { id: 'security_alerts', label: 'Security Alerts', description: 'Security-related notifications and warnings', enabled: true }
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
            <div className="p-3 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account and system preferences</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
              <RefreshCw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Settings Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {settingsSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${section.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {section.title}
                  </h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm">{section.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                <input
                  type="text"
                  placeholder="Enter your organization"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Administrator</option>
                  <option>Traffic Manager</option>
                  <option>Analyst</option>
                  <option>Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>UTC-8 (Pacific Time)</option>
                  <option>UTC-5 (Eastern Time)</option>
                  <option>UTC+0 (GMT)</option>
                  <option>UTC+5:30 (IST)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bell className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
          </div>
          
          <div className="space-y-4">
            {notificationTypes.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{notification.label}</h3>
                  <p className="text-sm text-gray-600">{notification.description}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Email</span>
                    <input
                      type="checkbox"
                      defaultChecked={notification.enabled}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Push</span>
                    <input
                      type="checkbox"
                      defaultChecked={notification.enabled}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">SMS</span>
                    <input
                      type="checkbox"
                      defaultChecked={false}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Security Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Security & Privacy</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">Two-Factor Authentication</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </div>
                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">Session Timeout</span>
                  <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>Never</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600">Automatically log out after inactivity</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">API Access</span>
                  <button className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors">
                    <Key className="h-3 w-3" />
                    <span>Manage Keys</span>
                  </button>
                </div>
                <p className="text-sm text-gray-600">Manage API keys and access tokens</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* System Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Database className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">System Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Data Retention</h3>
              <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                <option>30 days</option>
                <option>90 days</option>
                <option>1 year</option>
                <option>Indefinite</option>
              </select>
              <p className="text-xs text-gray-600 mt-2">How long to keep traffic data</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Update Frequency</h3>
              <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                <option>Real-time</option>
                <option>Every 5 minutes</option>
                <option>Every 15 minutes</option>
                <option>Hourly</option>
              </select>
              <p className="text-xs text-gray-600 mt-2">Data refresh interval</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Backup Schedule</h3>
              <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Manual</option>
              </select>
              <p className="text-xs text-gray-600 mt-2">Automatic backup frequency</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;