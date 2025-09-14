// src/components/ProgressBar.js
import React from 'react';

const ProgressBar = ({ progress, className = '', showPercentage = false }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-xs text-gray-600 mt-1 text-right">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;