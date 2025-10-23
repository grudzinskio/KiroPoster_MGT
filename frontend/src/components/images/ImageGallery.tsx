import React, { useState } from 'react';
import { Eye, Download, Trash2, Clock, CheckCircle, XCircle, User, Calendar } from 'lucide-react';
import type { Image } from '../../types/image';
import imageService from '../../services/imageService';
import { useAuth } from '../../contexts/AuthContext';

interface ImageGalleryProps {
  campaignId: number;
  images: Image[];
  onImageClick?: (image: Image) => void;
  onImageDelete?: (imageId: number) => void;
  onRefresh?: () => void;
  showActions?: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImageClick,
  onImageDelete,
  onRefresh,
  showActions = true,
}) => {
  const { user } = useAuth();
  const [deletingImages, setDeletingImages] = useState<Set<number>>(new Set());

  const getStatusIcon = (status: Image['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: Image['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async (image: Image) => {
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

  const handleDelete = async (imageId: number) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    setDeletingImages(prev => new Set(prev).add(imageId));
    
    try {
      await imageService.deleteImage(imageId);
      onImageDelete?.(imageId);
      onRefresh?.();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeletingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const canDeleteImage = (image: Image): boolean => {
    if (!user) return false;
    
    // Company employees can delete any image
    if (user.role === 'company_employee') return true;
    
    // Contractors can only delete their own pending images
    if (user.role === 'contractor') {
      return image.uploadedBy === user.id && image.status === 'pending';
    }
    
    return false;
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No images uploaded</h3>
        <p className="text-gray-500">Images uploaded for this campaign will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {images.map((image) => (
        <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          {/* Image Preview */}
          <div className="relative aspect-square bg-gray-100">
            <img
              src={imageService.getImageUrl(image.id)}
              alt={image.originalFilename}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onImageClick?.(image)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTZMOC41ODU3OSAxMS40MTQyQzguOTYwODYgMTEuMDM5MSA5LjU2OTE0IDExLjAzOTEgOS45NDQyMSAxMS40MTQyTDE2IDE3LjVNMTQgMTVMMTUuNTg1OCAxMy40MTQyQzE1Ljk2MDkgMTMuMDM5MSAxNi41NjkxIDEzLjAzOTEgMTYuOTQ0MiAxMy40MTQyTDIwIDE2LjVNMTQgOEgxNC4wMU02IDIwSDEyQzEzLjEwNDYgMjAgMTQgMTkuMTA0NiAxNCAyMFY2QzE0IDQuODk1NDMgMTMuMTA0NiA0IDEyIDRINkM0Ljg5NTQzIDQgNCA0Ljg5NTQzIDQgNlYxOEM0IDE5LjEwNDYgNC44OTU0MyAyMCA2IDIwWiIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
              }}
            />
            
            {/* Status Badge */}
            <div className="absolute top-2 right-2">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(image.status)}`}>
                {getStatusIcon(image.status)}
                <span className="ml-1 capitalize">{image.status}</span>
              </div>
            </div>

            {/* Actions Overlay */}
            {showActions && (
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick?.(image);
                    }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                    title="View full size"
                  >
                    <Eye className="h-4 w-4 text-gray-700" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(image);
                    }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-gray-700" />
                  </button>
                  
                  {canDeleteImage(image) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                      disabled={deletingImages.has(image.id)}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingImages.has(image.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Image Info */}
          <div className="p-4">
            <h4 className="font-medium text-gray-900 truncate mb-2" title={image.originalFilename}>
              {image.originalFilename}
            </h4>
            
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>
                  {image.uploader ? `${image.uploader.firstName} ${image.uploader.lastName}` : 'Unknown'}
                </span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{formatDate(image.uploadedAt)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>{formatFileSize(image.fileSize)}</span>
                <span className="uppercase">{image.mimeType.split('/')[1]}</span>
              </div>
            </div>

            {/* Rejection Reason */}
            {image.status === 'rejected' && image.rejectionReason && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-700">
                  <strong>Rejected:</strong> {image.rejectionReason}
                </p>
                {image.reviewer && image.reviewedAt && (
                  <p className="text-xs text-red-600 mt-1">
                    By {image.reviewer.firstName} {image.reviewer.lastName} on {formatDate(image.reviewedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Approval Info */}
            {image.status === 'approved' && image.reviewer && image.reviewedAt && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-700">
                  Approved by {image.reviewer.firstName} {image.reviewer.lastName} on {formatDate(image.reviewedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImageGallery;