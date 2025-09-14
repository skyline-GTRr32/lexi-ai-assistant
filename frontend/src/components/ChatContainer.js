// src/components/ChatContainer.js
import React, { useRef, useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import Button from './Button';

const ChatContainer = ({ conversation, onClearConversation, onExportConversation }) => {
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Handle scroll detection for scroll button
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim()) {
      const results = conversation.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, conversation]);

  const scrollToTop = () => {
    chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversation = searchTerm.trim() ? searchResults : conversation;

  return (
    <div className="relative">
      {/* Chat Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Conversation</h3>
        
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Export Button */}
          <Button
            onClick={onExportConversation}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            📤 Export
          </Button>

          {/* Clear Button */}
          <Button
            onClick={onClearConversation}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 text-xs"
          >
            🗑️ Clear
          </Button>
        </div>
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            {searchResults.length > 0 
              ? `Found ${searchResults.length} message${searchResults.length !== 1 ? 's' : ''} containing "${searchTerm}"`
              : `No messages found containing "${searchTerm}"`
            }
          </div>
        </div>
      )}

      {/* Chat Messages Container */}
      <div 
        ref={chatContainerRef}
        className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {filteredConversation.length > 0 ? (
          <>
            {filteredConversation.map((message, index) => (
              <ChatMessage
                key={`${message.timestamp || Date.now()}-${index}`}
                message={message}
                index={index}
              />
            ))}
            <div ref={chatEndRef} />
          </>
        ) : searchTerm ? (
          <div className="text-center py-8 text-gray-500">
            No messages match your search
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Your conversation will appear here
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 z-10"
          title="Scroll to bottom"
        >
          ⬇️
        </button>
      )}

      {/* Scroll to Top Button */}
      {conversation.length > 5 && (
        <button
          onClick={scrollToTop}
          className="absolute top-4 right-4 bg-gray-600 hover:bg-gray-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 z-10"
          title="Scroll to top"
        >
          ⬆️
        </button>
      )}
    </div>
  );
};

export default ChatContainer;