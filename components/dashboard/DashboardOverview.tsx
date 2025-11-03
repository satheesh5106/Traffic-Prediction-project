'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Weather from '@/components/dashboard/weather';
import {
  Activity,
  TrendingUp,
  Users,
  MapPin,
  AlertTriangle,
  Clock,
  BarChart3,
  Route,
  Shield
} from 'lucide-react';

interface DashboardStats {
  totalTraffic: number;
  activeIncidents: number;
  routesOptimized: number;
  systemUptime: string;
}

const DashboardOverview = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTraffic: 0,
    activeIncidents: 0,
    routesOptimized: 0,
    systemUptime: '99.9%'
  });

  const [loading, setLoading] = useState(true);

  // Load real dashboard stats from backend API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/dashboard/overview`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'demo_token'}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalTraffic: data.total_traffic_flow || 0,
            activeIncidents: data.active_incidents || 0,
            routesOptimized: data.routes_optimized || 0,
            systemUptime: data.system_uptime || '0h 0m'
          });
        } else {
          console.error('Failed to fetch dashboard stats:', response.statusText);
          // Fallback to demo data if API fails
          setStats({
            totalTraffic: 0,
            activeIncidents: 0,
            routesOptimized: 0,
            systemUptime: 'API Error'
          });
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        // Fallback to demo data if API fails
        setStats({
          totalTraffic: 0,
          activeIncidents: 0,
          routesOptimized: 0,
          systemUptime: 'Connection Error'
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Set up real-time polling every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, change }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    change?: string;
  }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? '...' : value}</div>
        {change && (
          <p className="text-xs text-gray-600 mt-1">
            <span className="text-green-600">{change}</span> from last hour
          </p>
        )}
      </CardContent>
    </Card>
  );

  const QuickActions = () => (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <Activity className="h-5 w-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-blue-900">Traffic Analysis</div>
              <div className="text-sm text-blue-600">View live traffic data</div>
            </div>
          </button>
          
          <button className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <Route className="h-5 w-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-green-900">Route Planning</div>
              <div className="text-sm text-green-600">Optimize routes</div>
            </div>
          </button>
          
          <button className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
            <Shield className="h-5 w-5 text-orange-600" />
            <div className="text-left">
              <div className="font-medium text-orange-900">Incident Reports</div>
              <div className="text-sm text-orange-600">View active incidents</div>
            </div>
          </button>
          
          <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <div className="text-left">
              <div className="font-medium text-purple-900">Analytics</div>
              <div className="text-sm text-purple-600">System insights</div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const RecentActivity = () => (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Route optimization completed</p>
              <p className="text-xs text-gray-500">2 minutes ago</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Traffic congestion detected</p>
              <p className="text-xs text-gray-500">5 minutes ago</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Incident reported on Highway 1</p>
              <p className="text-xs text-gray-500">12 minutes ago</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">System health check passed</p>
              <p className="text-xs text-gray-500">1 hour ago</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome to your TrafficAI Dashboard. Monitor traffic patterns, optimize routes, and manage incidents in real-time.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Traffic Flow"
            value={stats.totalTraffic.toLocaleString()}
            icon={Activity}
            color="text-blue-600"
            change="+12%"
          />
          
          <StatCard
            title="Active Incidents"
            value={stats.activeIncidents}
            icon={AlertTriangle}
            color="text-red-600"
            change="-2 resolved"
          />
          
          <StatCard
            title="Routes Optimized"
            value={stats.routesOptimized}
            icon={Route}
            color="text-green-600"
            change="+8%"
          />
          
          <StatCard
            title="System Uptime"
            value={stats.systemUptime}
            icon={TrendingUp}
            color="text-purple-600"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weather Widget */}
          <div className="lg:col-span-1">
            <Weather 
              city="krishnankoil"
              className="h-full"
            />
          </div>
          
          {/* Quick Actions */}
          <QuickActions />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <RecentActivity />
          
          {/* System Status */}
          <Card className="col-span-full lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-green-900">Traffic Monitoring</div>
                    <div className="text-sm text-green-600">Operational</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-green-900">Route Optimization</div>
                    <div className="text-sm text-green-600">Operational</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-yellow-900">Incident Detection</div>
                    <div className="text-sm text-yellow-600">Maintenance</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;