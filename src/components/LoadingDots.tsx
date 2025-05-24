import React, { useEffect, useState } from 'react';

interface LoadingDotsProps {
  text?: string;
  color?: string;
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ 
  text = "Thinking", 
  color = "text-gray-200"
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-1">
      <span className={`${color} animate-pulse font-medium`}>
        {text}
      </span>
      <span className={`${color} w-6 inline-block`}>
        {dots}
      </span>
    </div>
  );
};

export default LoadingDots; 