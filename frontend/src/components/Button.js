// src/components/Button.js
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = 'font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-900 focus:ring-gray-500',
    outline: 'border-2 border-gray-300 hover:border-gray-400 disabled:border-gray-200 text-gray-700 bg-transparent focus:ring-gray-500',
    ghost: 'bg-transparent hover:bg-gray-100 disabled:hover:bg-transparent text-gray-600 focus:ring-gray-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${
        loading ? 'relative' : ''
      }`}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" className="text-current" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
};

export default Button;