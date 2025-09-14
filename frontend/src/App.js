// frontend/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import LoadingSpinner from './components/LoadingSpinner';
import ProgressBar from './components/ProgressBar';
import Button from './components/Button';
import ChatContainer from './components/ChatContainer';
import ProcessingStages from './components/ProcessingStages';
import SkeletonLoader from './components/SkeletonLoader';
import EmptyState from './components/EmptyState';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer, useToast } from './components/Toast';
import { validateFile, getFileIcon, formatFileSize, getProcessingEstimate } from './utils/fileValidation';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const { toasts, removeToast, showSuccess, showError, showWarning, showInfo } = useToast();

  // Enhanced drag and drop with validation
  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors.some(e => e.code === 'file-too-large')) {
        showError('File size exceeds 50MB limit');
      } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
        showError('Invalid file type. Please upload PDF, DOC, or DOCX files');
      } else {
        showError('File upload failed. Please try again');
      }
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      const validation = validateFile(file);
      setFileValidation(validation);

      if (!validation.isValid) {
        validation.errors.forEach(error => showError(error));
        return;
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => showWarning(warning));
      }

      setSelectedFile(file);
      setJobId(null);
      setStatus('');
      setConversation([]);
      setQuestion('');
      setUploadProgress(0);
      setProcessingProgress(0);
      setNetworkError(false);
      setRetryCount(0);
      showInfo(`File "${file.name}" ready for upload`);
    }
  }, [showError, showWarning, showInfo]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024
  });

  const handleUpload = async () => {
    if (!selectedFile || !fileValidation?.isValid) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    setStatus('uploading');
    setProcessingStage('Preparing document...');
    setUploadProgress(0);
    setNetworkError(false);
    
    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      setJobId(response.data.job_id);
      setStatus('processing');
      setProcessingStage('Document uploaded successfully');
      setProcessingProgress(20);
      setIsUploading(false);
      showSuccess('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      setStatus('failed');
      setIsUploading(false);
      
      if (error.code === 'ECONNABORTED') {
        setProcessingStage('Upload timeout. Please try again.');
        showError('Upload timed out. Please check your connection and try again.');
      } else if (error.response?.status >= 500) {
        setProcessingStage('Server error. Please try again later.');
        showError('Server error. Please try again later.');
        setNetworkError(true);
      } else {
        const errorMessage = error.response?.data?.detail || error.message || 'Upload failed';
        setProcessingStage(`Upload failed: ${errorMessage}`);
        showError(`Upload failed: ${errorMessage}`);
      }
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !jobId || isLoading) return;
    
    const currentQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);
    
    const userMessage = {
      type: 'user',
      content: currentQuestion,
      timestamp: Date.now()
    };
    
    const loadingMessage = {
      type: 'assistant',
      content: '',
      isLoading: true,
      timestamp: Date.now()
    };
    
    setConversation(prev => [...prev, userMessage, loadingMessage]);
    
    try {
      const response = await axios.post(`${API_URL}/api/ask`, {
        document_id: jobId,
        question: currentQuestion,
      }, {
        timeout: 60000
      });
      
      setConversation(prev => [
        ...prev.slice(0, -1),
        {
          type: 'assistant',
          content: response.data.answer,
          isLoading: false,
          timestamp: Date.now()
        }
      ]);
    } catch (error) {
      console.error('Error asking question:', error);
      
      let errorMessage = 'I apologize, but I encountered an error processing your question.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'The request timed out. Please try asking a simpler question or check your connection.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again in a moment.';
      } else if (error.response?.data?.detail) {
        errorMessage = `Error: ${error.response.data.detail}`;
      }
      
      setConversation(prev => [
        ...prev.slice(0, -1),
        {
          type: 'assistant',
          content: errorMessage,
          isLoading: false,
          isError: true,
          timestamp: Date.now()
        }
      ]);
      
      showError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced status polling with exponential backoff
  useEffect(() => {
    let intervalId;
    let pollCount = 0;
    
    if (jobId && status === 'processing') {
      const poll = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/status/${jobId}`, {
            timeout: 10000
          });
          const newStatus = response.data.status;
          pollCount++;

          if (newStatus === 'processing') {
            const progressIncrement = Math.min(10, 80 - processingProgress);
            setProcessingProgress(prev => Math.min(prev + progressIncrement, 80));
            
            const stages = [
              'Parsing document structure...',
              'Extracting content...',
              'Analyzing text patterns...',
              'Building knowledge base...',
              'Creating semantic index...',
              'Optimizing for search...'
            ];
            setProcessingStage(stages[pollCount % stages.length]);
          } else if (newStatus === 'complete') {
            setStatus('ready');
            setProcessingStage('Ready to answer your questions!');
            setProcessingProgress(100);
            clearInterval(intervalId);
            showSuccess('Document processing complete! You can now ask questions.');
          } else if (newStatus === 'failed') {
            setStatus('failed');
            setProcessingStage('Document processing failed. Please try again.');
            setProcessingProgress(0);
            clearInterval(intervalId);
            showError('Document processing failed. Please try uploading again.');
          }
        } catch (error) {
          console.error('Error checking status:', error);
          setRetryCount(prev => prev + 1);
          
          if (retryCount >= 3) {
            setStatus('failed');
            setProcessingStage('Connection error. Please refresh and try again.');
            clearInterval(intervalId);
            showError('Connection error. Please check your internet and try again.');
            setNetworkError(true);
          }
        }
      };

      poll();
      intervalId = setInterval(poll, Math.min(3000 + (pollCount * 1000), 10000));
    }
    
    return () => clearInterval(intervalId);
  }, [jobId, status, processingProgress, retryCount, showSuccess, showError]);

  const startNewSession = () => {
    setSelectedFile(null);
    setFileValidation(null);
    setJobId(null);
    setStatus('');
    setProcessingStage('');
    setProcessingProgress(0);
    setConversation([]);
    setQuestion('');
    setUploadProgress(0);
    setNetworkError(false);
    setRetryCount(0);
    showInfo('New session started');
  };

  const clearConversation = () => {
    setConversation([]);
    showInfo('Conversation cleared');
  };

  const exportConversation = () => {
    if (conversation.length === 0) {
      showWarning('No conversation to export');
      return;
    }

    const exportData = {
      document: selectedFile?.name || 'Unknown Document',
      timestamp: new Date().toISOString(),
      conversation: conversation.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexi-conversation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Conversation exported successfully');
  };

  const retryOperation = () => {
    if (status === 'failed' && selectedFile) {
      setRetryCount(0);
      handleUpload();
    }
  };

  const suggestedQuestions = [
    "What is the main purpose of this document?",
    "What are the key terms and conditions?",
    "Are there any important dates or deadlines?",
    "What are the parties' obligations?"
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Lexi
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Your intelligent document co-pilot. Upload any legal document and start asking questions in plain English.
            </p>
          </div>

          {/* Network Error Banner */}
          {networkError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-3">
                <span className="text-red-600">🌐</span>
                <div className="flex-1">
                  <div className="font-semibold text-red-800">Connection Error</div>
                  <div className="text-red-700 text-sm">
                    Unable to connect to the server. Please check your internet connection.
                  </div>
                </div>
                <Button
                  onClick={retryOperation}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white rounded-3xl shadow-elegant-lg overflow-hidden">
            {!selectedFile ? (
              /* Upload Interface */
              <div className="p-8">
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ease-out
                    ${isDragActive && !isDragReject 
                      ? 'border-blue-400 bg-blue-50 scale-[1.02] shadow-lg' 
                      : isDragReject 
                      ? 'border-red-400 bg-red-50 scale-[1.02]'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 hover:scale-[1.01] hover:shadow-md'
                    }
                  `}
                >
                  <input {...getInputProps()} />
                  <div className="text-6xl mb-6 transition-transform duration-300">
                    {isDragActive ? '⬇️' : '📄'}
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    {isDragActive 
                      ? isDragReject
                        ? 'File type not supported'
                        : 'Drop your document here'
                      : 'Upload your document'
                    }
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Drag and drop your PDF or Word document, or click to browse
                  </p>
                  <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
                    <span className="mr-2">📎</span>
                    Supported: PDF, DOC, DOCX • Max size: 50MB
                  </div>
                </div>
                
                {/* Upload Tips */}
                <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for best results:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use clear, text-based PDFs (not scanned images)</li>
                    <li>• Ensure document text is readable and not corrupted</li>
                    <li>• Large documents may take several minutes to process</li>
                  </ul>
                </div>
              </div>
            ) : status === '' ? (
              /* File Selected, Ready to Upload */
              <div className="p-8">
                <div className="flex items-center justify-between mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{getFileIcon(selectedFile.name)}</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">{selectedFile.name}</div>
                      <div className="text-gray-600 text-sm">
                        {formatFileSize(selectedFile.size)} • Estimated processing: {getProcessingEstimate(selectedFile.size)}
                      </div>
                      {fileValidation?.warnings.length > 0 && (
                        <div className="text-yellow-600 text-xs mt-1">
                          ⚠️ {fileValidation.warnings[0]}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedFile(null);
                      setFileValidation(null);
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="text-center">
                  <Button
                    onClick={handleUpload}
                    loading={isUploading}
                    size="lg"
                    className="shadow-lg"
                  >
                    {isUploading ? 'Uploading...' : 'Analyze Document'}
                  </Button>
                  <p className="text-gray-500 text-sm mt-3">
                    Processing may take {getProcessingEstimate(selectedFile.size)} depending on document complexity
                  </p>
                </div>
              </div>
            ) : (
              /* Document Processing/Chat Interface */
              <div>
                {/* Status Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{getFileIcon(selectedFile.name)}</div>
                      <div>
                        <div className="font-semibold text-lg">{selectedFile.name}</div>
                        <div className="text-blue-100">{processingStage}</div>
                      </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="flex items-center space-x-4">
                      {status === 'uploading' && (
                        <div className="flex items-center space-x-3">
                          <ProgressBar 
                            progress={uploadProgress} 
                            className="w-24" 
                          />
                          <span className="text-sm">{uploadProgress}%</span>
                        </div>
                      )}
                      {status === 'processing' && (
                        <div className="flex items-center space-x-3">
                          <LoadingSpinner className="text-white" />
                          <span className="text-sm">{Math.round(processingProgress)}%</span>
                        </div>
                      )}
                      {status === 'ready' && (
                        <div className="bg-green-500 rounded-full p-2">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      )}
                      {status === 'failed' && (
                        <div className="flex items-center space-x-2">
                          <div className="bg-red-500 rounded-full p-2">
                            <span className="text-white text-sm">✕</span>
                          </div>
                          <Button
                            onClick={retryOperation}
                            variant="ghost"
                            size="sm"
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-white border-opacity-30"
                          >
                            Retry
                          </Button>
                        </div>
                      )}
                      
                      <Button
                        onClick={startNewSession}
                        variant="ghost"
                        size="sm"
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-white border-opacity-30"
                      >
                        New Document
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                {status === 'ready' && (
                  <div className="p-6">
                    <ChatContainer
                      conversation={conversation}
                      onClearConversation={clearConversation}
                      onExportConversation={exportConversation}
                    />

                    {/* Question Input */}
                    <div className="border-t border-gray-100 pt-6 mt-6">
                      <div className="flex space-x-3 mb-4">
                        <input
                          type="text"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                          placeholder="Ask a question about your document..."
                          disabled={isLoading}
                          className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 transition-all duration-200"
                        />
                        <Button
                          onClick={handleAsk}
                          disabled={isLoading || !question.trim()}
                          loading={isLoading}
                          className="px-6"
                        >
                          Ask
                        </Button>
                      </div>
                      
                      {/* Suggested Questions */}
                      {conversation.length === 0 && (
                        <div className="mt-6">
                          <p className="text-sm text-gray-500 mb-3">Try asking:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {suggestedQuestions.map((suggested, index) => (
                              <button 
                                key={index}
                                onClick={() => setQuestion(suggested)}
                                disabled={isLoading}
                                className="text-left p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                "{suggested}"
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {(status === 'processing' || status === 'uploading') && (
                  <ProcessingStages 
                    currentStage={processingStage}
                    progress={status === 'uploading' ? uploadProgress : processingProgress}
                  />
                )}

                {/* Error State */}
                {status === 'failed' && (
                  <div className="p-12">
                    <EmptyState
                      type="error"
                      title="Processing Failed"
                      description={processingStage || "We couldn't process your document. Please try again."}
                      action={
                        <div className="space-x-3">
                          <Button
                            onClick={retryOperation}
                            variant="primary"
                            size="lg"
                          >
                            Try Again
                          </Button>
                          <Button
                            onClick={startNewSession}
                            variant="outline"
                            size="lg"
                          >
                            Upload Different File
                          </Button>
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span>🔒</span>
              <span>Powered by advanced AI • Your documents are processed securely</span>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;