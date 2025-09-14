// src/components/EmptyState.js
import React from 'react';

const EmptyState = ({ 
  type = 'upload', 
  title, 
  description, 
  icon, 
  action,
  className = '' 
}) => {
  const presetConfigs = {
    upload: {
      icon: '📤',
      title: 'No Document Uploaded',
      description: 'Upload a document to start analyzing and asking questions about its content.',
      action: null
    },
    conversation: {
      icon: '💬',
      title: 'Start Your Conversation',
      description: 'Ask questions about your document and get intelligent responses from Lexi.',
      action: null
    },
    search: {
      icon: '🔍',
      title: 'No Results Found',
      description: 'Try adjusting your search terms or check for typos.',
      action: null
    },
    error: {
      icon: '⚠️',
      title: 'Something Went Wrong',
      description: 'An error occurred while processing your request. Please try again.',
      action: null
    },
    processing: {
      icon: '⏳',
      title: 'Processing Document',
      description: 'Please wait while we analyze your document and prepare it for questions.',
      action: null
    }
  };

  const config = presetConfigs[type] || presetConfigs.upload;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalIcon = icon || config.icon;
  const finalAction = action || config.action;

  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      <div className="text-6xl mb-4 opacity-50">
        {finalIcon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {finalTitle}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
        {finalDescription}
      </p>
      {finalAction && (
        <div className="mt-6">
          {finalAction}
        </div>
      )}
    </div>
  );
};

export default EmptyState;