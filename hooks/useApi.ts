/**
 * Custom hooks for API calls
 */
import { useState, useEffect, useCallback } from 'react';
import { trafficApi, routeApi, authApi } from '../lib/api-client';

/**
 * Hook for handling API loading states, errors, and data
 */
export function useApiState<T>(initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset state
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  // Execute API call with loading/error handling
  const execute = useCallback(async <R>(apiCall: () => Promise<R>): Promise<R | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result as unknown as T);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, []);

  return { data, loading, error, execute, reset, setData };
}

/**
 * Hook for traffic prediction API
 */
export function useTrafficApi() {
  // Get cities
  const useCities = () => {
    const apiState = useApiState<any[]>([]);
    
    const fetchCities = useCallback(async () => {
      return apiState.execute(() => trafficApi.getCities());
    }, [apiState]);
    
    useEffect(() => {
      fetchCities();
    }, [fetchCities]);
    
    return { ...apiState, fetchCities };
  };
  
  // Get live traffic
  const useLiveTraffic = (cityId?: string) => {
    const apiState = useApiState<any>(null);
    
    const fetchLiveTraffic = useCallback(async (id?: string) => {
      if (!id && !cityId) return null;
      return apiState.execute(() => trafficApi.getLiveTraffic(id || cityId as string));
    }, [apiState, cityId]);
    
    useEffect(() => {
      if (cityId) fetchLiveTraffic(cityId);
    }, [cityId, fetchLiveTraffic]);
    
    return { ...apiState, fetchLiveTraffic };
  };
  
  // Get predicted traffic
  const usePredictedTraffic = (cityId?: string, hoursAhead: number = 1) => {
    const apiState = useApiState<any>(null);
    
    const fetchPredictedTraffic = useCallback(async (id?: string, hours?: number) => {
      if (!id && !cityId) return null;
      return apiState.execute(() => 
        trafficApi.getPredictedTraffic(id || cityId as string, hours || hoursAhead)
      );
    }, [apiState, cityId, hoursAhead]);
    
    useEffect(() => {
      if (cityId) fetchPredictedTraffic(cityId, hoursAhead);
    }, [cityId, hoursAhead, fetchPredictedTraffic]);
    
    return { ...apiState, fetchPredictedTraffic };
  };
  
  // Get historical traffic
  const useHistoricalTraffic = (cityId?: string, daysBack: number = 7) => {
    const apiState = useApiState<any>(null);
    
    const fetchHistoricalTraffic = useCallback(async (id?: string, days?: number) => {
      if (!id && !cityId) return null;
      return apiState.execute(() => 
        trafficApi.getHistoricalTraffic(id || cityId as string, days || daysBack)
      );
    }, [apiState, cityId, daysBack]);
    
    useEffect(() => {
      if (cityId) fetchHistoricalTraffic(cityId, daysBack);
    }, [cityId, daysBack, fetchHistoricalTraffic]);
    
    return { ...apiState, fetchHistoricalTraffic };
  };
  
  // Get traffic metrics
  const useTrafficMetrics = () => {
    const apiState = useApiState<any>(null);
    
    const fetchTrafficMetrics = useCallback(async () => {
      return apiState.execute(() => trafficApi.getTrafficMetrics());
    }, [apiState]);
    
    useEffect(() => {
      fetchTrafficMetrics();
    }, [fetchTrafficMetrics]);
    
    return { ...apiState, fetchTrafficMetrics };
  };
  
  // Report traffic incident
  const useReportTrafficIncident = () => {
    const apiState = useApiState<any>(null);
    
    const reportIncident = useCallback(async (report: any) => {
      return apiState.execute(() => trafficApi.reportTrafficIncident(report));
    }, [apiState]);
    
    return { ...apiState, reportIncident };
  };
  
  return {
    useCities,
    useLiveTraffic,
    usePredictedTraffic,
    useHistoricalTraffic,
    useTrafficMetrics,
    useReportTrafficIncident
  };
}

/**
 * Hook for route optimization API
 */
export function useRouteApi() {
  // Optimize route
  const useRouteOptimization = () => {
    const apiState = useApiState<any>(null);
    
    const optimizeRoute = useCallback(async (params: {
      start: [number, number],
      end: [number, number],
      priority?: string,
      vehicleType?: string
    }) => {
      return apiState.execute(() => routeApi.optimizeRoute(params));
    }, [apiState]);
    
    return { ...apiState, optimizeRoute };
  };
  
  // Get route metrics
  const useRouteMetrics = () => {
    const apiState = useApiState<any>(null);
    
    const fetchRouteMetrics = useCallback(async () => {
      return apiState.execute(() => routeApi.getRouteMetrics());
    }, [apiState]);
    
    useEffect(() => {
      fetchRouteMetrics();
    }, [fetchRouteMetrics]);
    
    return { ...apiState, fetchRouteMetrics };
  };
  
  // Get active routes
  const useActiveRoutes = () => {
    const apiState = useApiState<any[]>([]);
    
    const fetchActiveRoutes = useCallback(async () => {
      return apiState.execute(() => routeApi.getActiveRoutes());
    }, [apiState]);
    
    useEffect(() => {
      fetchActiveRoutes();
    }, [fetchActiveRoutes]);
    
    return { ...apiState, fetchActiveRoutes };
  };
  
  // Select route
  const useRouteSelection = () => {
    const apiState = useApiState<any>(null);
    
    const selectRoute = useCallback(async (routeId: string) => {
      return apiState.execute(() => routeApi.selectRoute(routeId));
    }, [apiState]);
    
    return { ...apiState, selectRoute };
  };
  
  return {
    useRouteOptimization,
    useRouteMetrics,
    useActiveRoutes,
    useRouteSelection
  };
}

/**
 * Hook for authentication API
 */
export function useAuthApi() {
  // Register user
  const useRegister = () => {
    const apiState = useApiState<any>(null);
    
    const register = useCallback(async (userData: {
      email: string,
      password: string,
      name: string
    }) => {
      return apiState.execute(() => authApi.register(userData));
    }, [apiState]);
    
    return { ...apiState, register };
  };
  
  // Login user
  const useLogin = () => {
    const apiState = useApiState<any>(null);
    
    const login = useCallback(async (credentials: {
      email: string,
      password: string
    }) => {
      return apiState.execute(() => authApi.login(credentials));
    }, [apiState]);
    
    return { ...apiState, login };
  };
  
  // Logout user
  const useLogout = () => {
    const apiState = useApiState<boolean>(false);
    
    const logout = useCallback(async () => {
      return apiState.execute(async () => {
        await authApi.logout();
        return true;
      });
    }, [apiState]);
    
    return { ...apiState, logout };
  };
  
  // Get user profile
  const useProfile = () => {
    const apiState = useApiState<any>(null);
    
    const fetchProfile = useCallback(async () => {
      return apiState.execute(() => authApi.getProfile());
    }, [apiState]);
    
    useEffect(() => {
      if (authApi.isAuthenticated()) {
        fetchProfile();
      }
    }, [fetchProfile]);
    
    const updateProfile = useCallback(async (profileData: any) => {
      return apiState.execute(() => authApi.updateProfile(profileData));
    }, [apiState]);
    
    return { ...apiState, fetchProfile, updateProfile };
  };
  
  // Request password reset
  const usePasswordReset = () => {
    const apiState = useApiState<any>(null);
    
    const requestReset = useCallback(async (email: string) => {
      return apiState.execute(() => authApi.requestPasswordReset(email));
    }, [apiState]);
    
    return { ...apiState, requestReset };
  };
  
  // Check authentication status
  const useAuthStatus = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
      typeof window !== 'undefined' ? authApi.isAuthenticated() : false
    );
    
    useEffect(() => {
      const checkAuth = () => {
        setIsAuthenticated(authApi.isAuthenticated());
      };
      
      // Check on mount
      checkAuth();
      
      // Set up storage event listener to detect login/logout in other tabs
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (e) => {
          if (e.key === 'authToken') {
            checkAuth();
          }
        });
      }
      
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', () => {});
        }
      };
    }, []);
    
    return { isAuthenticated };
  };
  
  return {
    useRegister,
    useLogin,
    useLogout,
    useProfile,
    usePasswordReset,
    useAuthStatus
  };
}

// Export all API hooks
export default {
  useTrafficApi,
  useRouteApi,
  useAuthApi
};