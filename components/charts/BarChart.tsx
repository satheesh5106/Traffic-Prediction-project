'use client';

import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface BarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  dataKey, 
  xAxisKey = 'name', 
  color = '#8884d8',
  height = 300 
}) => {
  const chartConfig = {
    [dataKey]: {
      label: dataKey,
      color: color,
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar 
          dataKey={dataKey} 
          fill={color}
          radius={[4, 4, 0, 0]}
        />
      </RechartsBarChart>
    </ChartContainer>
  );
};

export default BarChart;