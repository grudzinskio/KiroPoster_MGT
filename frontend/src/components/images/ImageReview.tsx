import React, { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, User, Calendar, FileText } from 'lucide-react';
import type { Image } from '../../types/image';
import imageService from '../../services/imageService';

interface ImageReviewProps {
  image: Image;
  onReviewComplete?: (updatedImage: Image) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const ImageReview: React.FC<ImageReviewProps> = ({
  image,
  onReviewComplete,
  onError,
  disabled = false,
}) => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

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

  const handleApprove = async () => {
    if (disabled || isReviewing) return;

    setIsReviewing(true);
    try {
      const updatedImage = await imageService.approveImage(image.id);
      onReviewComplete?.(updatedImage);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to approve image';
      onError?.(errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReject = () => {
    if (disabled || isReviewing) return;
    setShowRejectionModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      onError?.('Please provide a reason for rejection');
      return;
    }

    setIsReviewing(true);
    try {
      const updatedImage = await imageService.rejectImage(image.id, rejectionReason.trim());
      onReviewComplete?.(updatedImage);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error: unknown) {
      const errorMessage = (error as unknown)?.response?.data?.error?.message || 'Failed to reject image';
      onError?.(errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRejectCancel = () => {
    setShowRejectionModal(false);
    setRejectionReason('');
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

  const isPending = image.status === 'pending';
  const isApproved = image.status === 'approved';
  const isRejected = image.status === 'rejected';

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Image Preview */}
        <div className="relative aspect-video bg-gray-100">
          <img
            src={imageService.getImageUrl(image.id)}
            alt={image.originalFilename}
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMTZMOC41ODU3OSAxMS40MTQyQzguOTYwODYgMTEuMDM5MSA5LjU2OTE0IDExLjAzOTEgOS45NDQyMSAxMS40MTQyTDE2IDE3LjVNMTQgMTVMMTUuNTg1OCAxMy40MTQyQzE1Ljk2MDkgMTMuMDM5MSAxNi41NjkxIDEzLjAzOTEgMTYuOTQ0MiAxMy40MTQyTDIwIDE2LjVNMTQgOEgxNC4wMU02IDIwSDEyQzEzLjEwNDYgMjAgMTQgMTkuMTA0NiAxNCAyMFY2QzE0IDQuODk1NDMgMTMuMTA0NiA0IDEyIDRINkM0Ljg5NTQzIDQgNCA0Ljg5NTQzIDQgNlYxOEM0IDE5LjEwNDYgNC44OTU0MyAyMCA2IDIwWiIgc3Ryb2tlPSIjOTQ5NDk0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
            }}
          />
          
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(image.status)}`}>
              {isPending && <MessageSquare className="h-4 w-4 mr-1" />}
              {isApproved && <CheckCircle className="h-4 w-4 mr-1" />}
              {isRejected && <XCircle className="h-4 w-4 mr-1" />}
              <span className="capitalize">{image.status}</span>
            </div>
          </div>
        </div>

        {/* Image Details */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2" title={image.originalFilename}>
              {image.originalFilename}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
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
              
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <span>{formatFileSize(image.fileSize)}</span>
              </div>
              
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2 text-center text-xs font-mono bg-gray-100 rounded">
                  {image.mimeType.split('/')[1].toUpperCase()}
                </span>
                <span>{image.mimeType}</span>
              </div>
            </div>
          </div>

          {/* Review Status */}
          {isApproved && image.reviewer && image.reviewedAt && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center text-green-800">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Approved</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                By {image.reviewer.firstName} {image.reviewer.lastName} on {formatDate(image.reviewedAt)}
              </p>
            </div>
          )}

          {isRejected && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800 mb-2">
                <XCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Rejected</span>
              </div>
              {image.rejectionReason && (
                <p className="text-sm text-red-700 mb-2">
                  <strong>Reason:</strong> {image.rejectionReason}
                </p>
              )}
              {image.reviewer && image.reviewedAt && (
                <p className="text-sm text-red-600">
                  By {image.reviewer.firstName} {image.reviewer.lastName} on {formatDate(image.reviewedAt)}
                </p>
              )}
            </div>
          )}

          {/* Review Actions */}
          {isPending && (
            <div className="flex space-x-3">
              <button
                onClick={handleApprove}
                disabled={disabled || isReviewing}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReviewing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </button>
              
              <button
                onClick={handleReject}
                disabled={disabled || isReviewing}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleRejectCancel}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Reject Image
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        Please provide a reason for rejecting this image. This will help the contractor understand what needs to be improved.
                      </p>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  disabled={!rejectionReason.trim() || isReviewing}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReviewing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Rejecting...
                    </>
                  ) : (
                    'Reject Image'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRejectCancel}
                  disabled={isReviewing}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageReview;