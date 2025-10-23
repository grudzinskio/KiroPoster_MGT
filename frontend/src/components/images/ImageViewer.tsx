import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, User, Calendar, FileText } from 'lucide-react';
import type { Image } from '../../types/image';
import imageService from '../../services/imageService';

interface ImageViewerProps {
  image: Image | null;
  images?: Image[];
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  images = [],
  isOpen,
  onClose,
  onPrevious,
  onNext,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset viewer state when image changes
  useEffect(() => {
    if (image) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setImageError(false);
    }
  }, [image]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrevious?.();
          break;
        case 'ArrowRight':
          onNext?.();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
        case 'r':
        case 'R':
          handleRotate();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = async () => {
    if (!image) return;
    
    try {
      const imageUrl = imageService.getImageUrl(image.id);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: Image['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen || !image) return null;

  const currentIndex = images.findIndex(img => img.id === image.id);
  const hasMultipleImages = images.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium truncate max-w-md" title={image.originalFilename}>
              {image.originalFilename}
            </h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(image.status)}`}>
              {image.status}
            </span>
            {hasMultipleImages && (
              <span className="text-sm text-gray-300">
                {currentIndex + 1} of {images.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              title="Download (D)"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {hasMultipleImages && onPrevious && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-colors"
          title="Previous (←)"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {hasMultipleImages && onNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-colors"
          title="Next (→)"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-black bg-opacity-50 rounded-full px-4 py-2">
        <div className="flex items-center space-x-2 text-white">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="text-sm min-w-[4rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          
          <div className="w-px h-6 bg-white bg-opacity-30 mx-2"></div>
          
          <button
            onClick={handleResetZoom}
            className="px-3 py-1 text-sm hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title="Reset (0)"
          >
            Reset
          </button>
          
          <button
            onClick={handleRotate}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            title="Rotate (R)"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="flex-1 flex items-center justify-center p-20 cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {!imageLoaded && !imageError && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
        
        {imageError && (
          <div className="text-white text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Failed to load image</p>
            <p className="text-sm opacity-75">The image could not be displayed</p>
          </div>
        )}
        
        <img
          src={imageService.getImageUrl(image.id)}
          alt={image.originalFilename}
          className={`max-w-full max-h-full object-contain transition-transform duration-200 ${imageLoaded ? 'block' : 'hidden'}`}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          draggable={false}
        />
      </div>

      {/* Image Info Sidebar */}
      <div className="absolute top-16 right-4 w-80 bg-black bg-opacity-75 text-white rounded-lg p-4 max-h-96 overflow-y-auto">
        <h3 className="font-medium mb-3">Image Details</h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start">
            <User className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Uploaded by</p>
              <p className="text-gray-300">
                {image.uploader ? `${image.uploader.firstName} ${image.uploader.lastName}` : 'Unknown'}
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <Calendar className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Upload Date</p>
              <p className="text-gray-300">{formatDate(image.uploadedAt)}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">File Info</p>
              <p className="text-gray-300">
                {formatFileSize(image.fileSize)} • {image.mimeType.split('/')[1].toUpperCase()}
              </p>
            </div>
          </div>

          {image.status === 'rejected' && image.rejectionReason && (
            <div className="border-t border-gray-600 pt-3">
              <p className="font-medium text-red-400">Rejection Reason</p>
              <p className="text-gray-300 mt-1">{image.rejectionReason}</p>
              {image.reviewer && image.reviewedAt && (
                <p className="text-xs text-gray-400 mt-2">
                  Rejected by {image.reviewer.firstName} {image.reviewer.lastName} on {formatDate(image.reviewedAt)}
                </p>
              )}
            </div>
          )}

          {image.status === 'approved' && image.reviewer && image.reviewedAt && (
            <div className="border-t border-gray-600 pt-3">
              <p className="font-medium text-green-400">Approved</p>
              <p className="text-xs text-gray-400 mt-1">
                By {image.reviewer.firstName} {image.reviewer.lastName} on {formatDate(image.reviewedAt)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
};

export default ImageViewer;