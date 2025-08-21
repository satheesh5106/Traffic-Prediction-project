'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, TrendingUp, BarChart3, Activity, Users, Clock, AlertTriangle, Target } from 'lucide-react';
import dynamic from 'next/dynamic';
import axios from 'axios';

// Dynamically import charts with no SSR
const LineChart = dynamic(() => import('@/components/charts/LineChart'), { ssr: false });
const BarChart = dynamic(() => import('@/components/charts/BarChart'), { ssr: false });
const PieChart = dynamic(() => import('@/components/charts/PieChart'), { ssr: false });

interface AnalyticsMetrics {
  totalPredictions: string;
  accuracyRate: string;
  activeUsers: string;
  systemUptime: string;
  dataProcessed: string;
}

interface ChartData {
  traffic: {
    name: string;
    value: number;
  }[];
  accuracy: {
    name: string;
    value: number;
  }[];
  usage: {
    name: string;
    value: number;
    color?: string;
  }[];
}

const AnalyticsDashboard = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalPredictions: '12,847',
    accuracyRate: '99.2%',
    activeUsers: '1,247',
    systemUptime: '99.9%',
    dataProcessed: '2.4TB'
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [chartData, setChartData] = useState<ChartData>({
    traffic: [],
    accuracy: [],
    usage: []
  });
  const [error, setError] = useState<string | null>(null);

  // Mock chart data
  const mockTrafficData = [
    { name: 'Mon', value: 65 },
    { name: 'Tue', value: 59 },
    { name: 'Wed', value: 80 },
    { name: 'Thu', value: 81 },
    { name: 'Fri', value: 56 },
    { name: 'Sat', value: 55 },
    { name: 'Sun', value: 40 }
  ];

  const mockAccuracyData = [
    { name: 'Week 1', value: 98.5 },
    { name: 'Week 2', value: 99.1 },
    { name: 'Week 3', value: 99.2 },
    { name: 'Week 4', value: 99.4 }
  ];

  const mockUsageData = [
    { name: 'Traffic Prediction', value: 45, color: 'rgba(59, 130, 246, 0.8)' },
    { name: 'Route Optimization', value: 30, color: 'rgba(16, 185, 129, 0.8)' },
    { name: 'Analytics', value: 15, color: 'rgba(245, 158, 11, 0.8)' },
    { name: 'Settings', value: 10, color: 'rgba(239, 68, 68, 0.8)' }
  ];

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setChartData({
        traffic: mockTrafficData,
        accuracy: mockAccuracyData,
        usage: mockUsageData
      });
      
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  const handleExport = () => {
    // Export functionality
    console.log('Exporting analytics data...');
  };

  const renderMetricCard = (title: string, value: string, icon: any, color: string, change?: string) => {
    const Icon = icon;
    return (
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {change && (
                <p className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {change} from last period
                </p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {renderMetricCard('Total Predictions', metrics.totalPredictions, TrendingUp, 'bg-blue-500', '+12.5%')}
        {renderMetricCard('Accuracy Rate', metrics.accuracyRate, Target, 'bg-green-500', '+0.3%')}
        {renderMetricCard('Active Users', metrics.activeUsers, Users, 'bg-purple-500', '+8.2%')}
        {renderMetricCard('System Uptime', metrics.systemUptime, Activity, 'bg-indigo-500', '+0.1%')}
        {renderMetricCard('Data Processed', metrics.dataProcessed, BarChart3, 'bg-pink-500', '+24.1%')}
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Volume Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    <LineChart data={chartData.traffic} dataKey="value" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prediction Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    <BarChart data={chartData.accuracy} dataKey="value" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Traffic Analysis</h3>
                <p className="text-gray-600">Detailed traffic analysis and patterns will be displayed here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Metrics</h3>
                <p className="text-gray-600">System performance metrics and health indicators will be displayed here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="h-64">
                  <PieChart data={chartData.usage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;