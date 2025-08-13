'use client';

import dynamic from 'next/dynamic';

const StandaloneDashboard = dynamic(() => import('./StandaloneDashboard'), {
  ssr: false,
  loading: () => <p>Loading dashboard...</p>,
});

const DashboardPage = () => {
  return <StandaloneDashboard />;
};

export default DashboardPage;