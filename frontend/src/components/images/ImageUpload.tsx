import React, { useState, useRef, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import imageService from '../../services/imageService';
import { validateFileUpload } from '../../utils/validation';
import { handleApiError, getErrorMessage } from '../../utils/errorHandler';

interface UploadedImage {
  id: number;
  filename: string;
  originalFilename: string;
  campaignId: number;
}

interface ImageUploadProps {
  campaignId: number;
  onUploadSuccess?: (image: UploadedImage) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  campaignId,
  onUploadSuccess,
  onUploadError,
  disabled = false,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'uploading' | 'success' | 'error' }>({});
  const [uploadErrors, setUploadErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    return validateFileUpload(file, {
      maxSize: maxFileSize,
      allowedTypes,
    });
  };

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    try {
      setUploadStatus(prev => ({ ...prev, [fileId]: 'uploading' }));
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      setUploadErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fileId];
        return newErrors;
      });

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileId] || 0;
          if (current < 90) {
            return { ...prev, [fileId]: current + 10 };
          }
          return prev;
        });
      }, 200);

      const uploadedImage = await imageService.uploadImage(campaignId, file);
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      setUploadStatus(prev => ({ ...prev, [fileId]: 'success' }));
      
      onUploadSuccess?.(uploadedImage);

      // Clear status after 3 seconds
      setTimeout(() => {
        clearFileStatus(fileId);
      }, 3000);

    } catch (error: unknown) {
      handleApiError(error, 'Image upload');
      const errorMessage = getErrorMessage(error);
      
      setUploadStatus(prev => ({ ...prev, [fileId]: 'error' }));
      setUploadErrors(prev => ({ ...prev, [fileId]: errorMessage }));
      
      onUploadError?.(errorMessage);
      
      // Clear error status after 10 seconds
      setTimeout(() => {
        clearFileStatus(fileId);
      }, 10000);
    }
  };

  const clearFileStatus = (fileId: string) => {
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileId];
      return newStatus;
    });
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fileId];
      return newErrors;
    });
  };



  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check file count limit
    const currentUploads = Object.keys(uploadStatus).length;
    const totalFiles = currentUploads + fileArray.length;
    
    if (totalFiles > maxFiles) {
      onUploadError?.(`Cannot upload more than ${maxFiles} files at once`);
      return;
    }

    // Validate each file
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push(file);
      }
    }

    // Show validation errors
    if (errors.length > 0) {
      onUploadError?.(errors.join('\n'));
    }

    // Upload valid files
    for (const file of validFiles) {
      await uploadFile(file);
    }
  }, [disabled, maxFiles, onUploadError, uploadStatus, uploadFile, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const hasActiveUploads = Object.keys(uploadStatus).length > 0;

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragOver && !disabled ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-400 hover:bg-gray-50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
          aria-label="Upload images"
        />
        
        <Upload className={`mx-auto h-12 w-12 mb-4 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
        
        <div className="space-y-2">
          <p className={`text-lg font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {isDragOver ? 'Drop images here' : 'Upload campaign images'}
          </p>
          <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
            Drag and drop images here, or click to select files
          </p>
          <p className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-400'}`}>
            Supports {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} (max {Math.round(maxFileSize / (1024 * 1024))}MB each)
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {hasActiveUploads && (
        <div className="mt-4 space-y-2">
          {Object.entries(uploadStatus).map(([fileId, status]) => {
            const fileName = fileId.split('-')[0];
            const progress = uploadProgress[fileId] || 0;
            
            return (
              <div key={fileId} className="bg-white border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {fileName}
                  </span>
                  <div className="flex items-center space-x-2">
                    {status === 'uploading' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    {status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                
                {status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Upload progress: ${progress}%`}
                    ></div>
                  </div>
                )}
                
                {status === 'success' && (
                  <p className="text-xs text-green-600">Upload completed successfully</p>
                )}
                
                {status === 'error' && (
                  <div className="space-y-1">
                    <p className="text-xs text-red-600">Upload failed</p>
                    {uploadErrors[fileId] && (
                      <p className="text-xs text-red-500">{uploadErrors[fileId]}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;