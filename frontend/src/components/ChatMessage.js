// src/components/ChatMessage.js
import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const ChatMessage = ({ message, index }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatResponse = (text) => {
    // Enhanced formatting for legal text
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 py-0.5 rounded text-sm">$1</code>') // Code blocks
      .replace(/(\d+\.|\([a-z]\)|\([0-9]+\))/g, '<strong>$1</strong>'); // Legal numbering
  };

  return (
    <div className={`flex mb-6 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl group ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} flex items-start space-x-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          message.type === 'user' 
            ? 'bg-blue-600 text-white ml-3' 
            : 'bg-gray-300 text-gray-700 mr-3'
        }`}>
          {message.type === 'user' ? '👤' : '🤖'}
        </div>

        {/* Message Content */}
        <div className={`relative p-4 rounded-2xl max-w-2xl ${
          message.type === 'user' 
            ? 'bg-blue-600 text-white' 
            : message.isError
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-gray-100 text-gray-900'
        }`}>
          {message.isLoading ? (
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="sm" className="text-gray-500" />
              <span className="text-gray-600">Analyzing your question...</span>
            </div>
          ) : (
            <div>
              <div 
                className="whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: message.type === 'assistant' ? formatResponse(message.content) : message.content 
                }}
              />
              
              {/* Copy Button */}
              {message.type === 'assistant' && !message.isLoading && (
                <button
                  onClick={() => copyToClipboard(message.content)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white hover:bg-opacity-20"
                  title="Copy response"
                >
                  {copied ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400 hover:text-gray-600">📋</span>
                  )}
                </button>
              )}
            </div>
          )}
          
          {/* Timestamp */}
          <div className={`text-xs mt-2 ${
            message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
          }`}>
            {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;