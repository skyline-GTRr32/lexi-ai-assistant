// src/components/ProcessingStages.js
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const ProcessingStages = ({ currentStage, progress = 0 }) => {
  const stages = [
    { id: 'upload', label: 'Uploading Document', icon: '📤' },
    { id: 'parse', label: 'Parsing Content', icon: '📋' },
    { id: 'analyze', label: 'Analyzing Structure', icon: '🔍' },
    { id: 'index', label: 'Building AI Index', icon: '🧠' },
    { id: 'complete', label: 'Ready to Chat', icon: '✅' }
  ];

  const getStageStatus = (stage, index) => {
    if (currentStage === 'failed') return 'failed';
    if (currentStage === 'ready' || currentStage === 'complete') return 'completed';
    
    const currentIndex = stages.findIndex(s => 
      currentStage.toLowerCase().includes(stage.id) || 
      currentStage.toLowerCase().includes(stage.label.toLowerCase().split(' ')[0])
    );
    
    if (currentIndex === index) return 'active';
    if (currentIndex > index) return 'completed';
    return 'pending';
  };

  return (
    <div className="p-8">
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage, index);
          
          return (
            <div key={stage.id} className="flex items-center space-x-4">
              {/* Stage Icon/Status */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                status === 'completed' 
                  ? 'bg-green-500 text-white' 
                  : status === 'active'
                  ? 'bg-blue-500 text-white'
                  : status === 'failed'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {status === 'active' ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : status === 'completed' ? (
                  '✓'
                ) : status === 'failed' ? (
                  '✕'
                ) : (
                  stage.icon
                )}
              </div>

              {/* Stage Label */}
              <div className="flex-1">
                <div className={`font-medium transition-colors duration-300 ${
                  status === 'active' 
                    ? 'text-blue-600' 
                    : status === 'completed'
                    ? 'text-green-600'
                    : status === 'failed'
                    ? 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {stage.label}
                </div>
                
                {/* Progress Bar for Active Stage */}
                {status === 'active' && progress > 0 && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Time Estimate */}
              <div className="text-xs text-gray-500 w-20 text-right">
                {status === 'completed' ? 'Done' : 
                 status === 'active' ? 'Processing...' : 
                 status === 'failed' ? 'Failed' : 
                 ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Progress */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ease-out ${
              currentStage === 'failed' ? 'bg-red-500' : 
              currentStage === 'ready' || currentStage === 'complete' ? 'bg-green-500' : 
              'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProcessingStages;