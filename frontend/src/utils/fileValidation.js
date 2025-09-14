// src/utils/fileValidation.js

export const validateFile = (file) => {
  const errors = [];
  const warnings = [];
  
  // File size validation (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB limit.`);
  }

  // File type validation
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    errors.push(`File type "${fileExtension}" is not supported. Please upload PDF, DOC, or DOCX files.`);
  }

  // File name validation
  if (file.name.length > 100) {
    warnings.push('File name is very long and may be truncated in display.');
  }

  // Size warnings for large files
  if (file.size > 10 * 1024 * 1024 && file.size <= maxSize) { // 10MB-50MB
    warnings.push('Large files may take several minutes to process.');
  }

  // Empty file check
  if (file.size === 0) {
    errors.push('The file appears to be empty. Please select a valid document.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      formattedSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
    }
  };
};

export const getFileIcon = (filename) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    default:
      return '📄';
  }
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getProcessingEstimate = (fileSize) => {
  // Rough estimates based on file size
  if (fileSize < 1024 * 1024) { // < 1MB
    return '30-60 seconds';
  } else if (fileSize < 5 * 1024 * 1024) { // 1-5MB
    return '1-2 minutes';
  } else if (fileSize < 20 * 1024 * 1024) { // 5-20MB
    return '2-5 minutes';
  } else {
    return '5-10 minutes';
  }
};