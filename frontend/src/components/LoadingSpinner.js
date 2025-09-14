// src/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-current ${sizeClasses[size]} ${className}`} />
  );
};

export default LoadingSpinner;