import React, { useRef, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function usePullToRefresh(onRefresh) {
  const containerRef = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      if (element.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
        setPulling(true);
      }
    };

    const handleTouchMove = (e) => {
      if (!pulling) return;
      const distance = e.touches[0].clientY - startYRef.current;
      setPullDistance(Math.max(0, distance));
    };

    const handleTouchEnd = () => {
      if (pullDistance > 60) {
        onRefresh?.();
      }
      setPulling(false);
      setPullDistance(0);
      startYRef.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pulling, pullDistance, onRefresh]);

  return containerRef;
}

export default function PullToRefreshIndicator({ distance }) {
  return (
    <div 
      className="flex items-center justify-center h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-transform"
      style={{ transform: `translateY(${Math.min(distance, 60)}px)` }}
    >
      <RefreshCw 
        className="w-5 h-5 text-blue-600 dark:text-blue-400"
        style={{ transform: `rotate(${(distance / 60) * 180}deg)` }}
      />
    </div>
  );
}