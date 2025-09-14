// src/components/SkeletonLoader.js
import React from 'react';

const SkeletonLoader = ({ type = 'message', className = '' }) => {
  const baseClasses = "animate-pulse bg-gray-200 rounded";

  if (type === 'message') {
    return (
      <div className={`flex mb-6 ${className}`}>
        <div className="flex items-start space-x-3 max-w-3xl">
          {/* Avatar skeleton */}
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
          
          {/* Message content skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4 mt-3" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'document-card') {
    return (
      <div className={`p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'processing-stages') {
    return (
      <div className={`p-8 ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-blue-200 rounded-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gray-100 rounded-full" />
            <div className="h-4 bg-gray-100 rounded flex-1" />
          </div>
        </div>
      </div>
    );
  }

  // Default skeleton
  return <div className={`${baseClasses} h-4 w-full ${className}`} />;
};

export default SkeletonLoader;