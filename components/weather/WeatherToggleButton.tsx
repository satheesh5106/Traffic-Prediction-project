import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WeatherToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const WeatherToggleButton: React.FC<WeatherToggleButtonProps> = ({
  isVisible,
  onToggle,
  className = '',
  variant = 'outline',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  };

  return (
    <Button
      variant={variant}
      onClick={onToggle}
      className={`flex items-center gap-2 transition-all duration-200 ${sizeClasses[size]} ${className}`}
      title={isVisible ? 'Hide weather overlay' : 'Show weather overlay'}
    >
      {isVisible ? (
        <>
          <Cloud className="h-4 w-4" />
          <span>Weather</span>
          <Badge variant="default" className="ml-1 text-xs">
            ON
          </Badge>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Weather</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            OFF
          </Badge>
        </>
      )}
    </Button>
  );
};

export default WeatherToggleButton;