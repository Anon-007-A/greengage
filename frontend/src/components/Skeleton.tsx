import React from 'react';

export const Skeleton: React.FC<{rows?: number}> = ({ rows = 4 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ))}
    </div>
  );
};

export default Skeleton;
