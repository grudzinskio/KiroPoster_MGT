import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ImageReview from '../ImageReview';
import imageService from '../../../services/imageService';
import { Image } from '../../../types/image';

// Mock the image service
vi.mock('../../../services/imageService', () => ({
  default: {
    getImageUrl: vi.fn((id) => `http://localhost:3000/api/images/${id}/file`),
    approveImage: vi.fn(),
    rejectImage: vi.fn(),
  },
}));

const mockImageService = imageService as any;

const mockPendingImage: Image = {
  id: 1,
  campaignId: 1,
  uploadedBy: 2,
  filename: 'image1.jpg',
  originalFilename: 'test-image-1.jpg',
  filePath: '/uploads/image1.jpg',
  fileSize: 1024000,
  mimeType: 'image/jpeg',
  status: 'pending',
  uploadedAt: '2024-01-01T10:00:00Z',
  uploader: {
    id: 2,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
};

const mockApprovedImage: Image = {
  ...mockPendingImage,
  id: 2,
  status: 'approved',
  reviewedBy: 1,
  reviewedAt: '2024-01-01T12:00:00Z',
  reviewer: {
    id: 1,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
  },
};

const mockRejectedImage: Image = {
  ...mockPendingImage,
  id: 3,
  status: 'rejected',
  rejectionReason: 'Poor image quality',
  reviewedBy: 1,
  reviewedAt: '2024-01-01T12:00:00Z',
  reviewer: {
    id: 1,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
  },
};

describe('ImageReview', () => {
  const mockProps = {
    image: mockPendingImage,
    onReviewComplete: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders image with correct information', () => {
    render(<ImageReview {...mockProps} />);
    
    expect(screen.getByText('test-image-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    expect(screen.getByText('image/jpeg')).toBeInTheDocument();
    expect(screen.getByText('JPEG')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows approve and reject buttons for pending images', () => {
    render(<ImageReview {...mockProps} />);
    
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('does not show review buttons for approved images', () => {
    render(<ImageReview {...mockProps} image={mockApprovedImage} />);
    
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/By Admin User/)).toBeInTheDocument();
  });

  it('does not show review buttons for rejected images', () => {
    render(<ImageReview {...mockProps} image={mockRejectedImage} />);
    
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Poor image quality')).toBeInTheDocument();
    expect(screen.getByText(/By Admin User/)).toBeInTheDocument();
  });

  it('handles image approval', async () => {
    const approvedImage = { ...mockPendingImage, status: 'approved' as const };
    mockImageService.approveImage.mockResolvedValue(approvedImage);

    render(<ImageReview {...mockProps} />);
    
    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockImageService.approveImage).toHaveBeenCalledWith(1);
      expect(mockProps.onReviewComplete).toHaveBeenCalledWith(approvedImage);
    });
  });

  it('handles image rejection with reason', async () => {
    const rejectedImage = { 
      ...mockPendingImage, 
      status: 'rejected' as const,
      rejectionReason: 'Test rejection reason'
    };
    mockImageService.rejectImage.mockResolvedValue(rejectedImage);

    render(<ImageReview {...mockProps} />);
    
    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    // Modal should appear
    expect(screen.getByText('Reject Image')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter rejection reason...')).toBeInTheDocument();

    // Enter rejection reason
    const textarea = screen.getByPlaceholderText('Enter rejection reason...');
    fireEvent.change(textarea, { target: { value: 'Test rejection reason' } });

    // Confirm rejection
    const confirmButton = screen.getByText('Reject Image');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockImageService.rejectImage).toHaveBeenCalledWith(1, 'Test rejection reason');
      expect(mockProps.onReviewComplete).toHaveBeenCalledWith(rejectedImage);
    });
  });

  it('requires rejection reason', async () => {
    render(<ImageReview {...mockProps} />);
    
    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    // Try to confirm without reason
    const confirmButton = screen.getByText('Reject Image');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('Please provide a reason for rejection');
    });
  });

  it('handles rejection modal cancel', () => {
    render(<ImageReview {...mockProps} />);
    
    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    // Modal should appear
    expect(screen.getByText('Reject Image')).toBeInTheDocument();

    // Cancel rejection
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Modal should disappear
    expect(screen.queryByText('Reject Image')).not.toBeInTheDocument();
  });

  it('handles approval error', async () => {
    const error = new Error('Approval failed');
    error.response = { data: { error: { message: 'Server error' } } };
    mockImageService.approveImage.mockRejectedValue(error);

    render(<ImageReview {...mockProps} />);
    
    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('Server error');
    });
  });

  it('handles rejection error', async () => {
    const error = new Error('Rejection failed');
    error.response = { data: { error: { message: 'Server error' } } };
    mockImageService.rejectImage.mockRejectedValue(error);

    render(<ImageReview {...mockProps} />);
    
    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    const textarea = screen.getByPlaceholderText('Enter rejection reason...');
    fireEvent.change(textarea, { target: { value: 'Test reason' } });

    const confirmButton = screen.getByText('Reject Image');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockProps.onError).toHaveBeenCalledWith('Server error');
    });
  });

  it('shows loading state during approval', async () => {
    mockImageService.approveImage.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<ImageReview {...mockProps} />);
    
    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    // Should show loading spinner
    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('shows loading state during rejection', async () => {
    mockImageService.rejectImage.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<ImageReview {...mockProps} />);
    
    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    const textarea = screen.getByPlaceholderText('Enter rejection reason...');
    fireEvent.change(textarea, { target: { value: 'Test reason' } });

    const confirmButton = screen.getByText('Reject Image');
    fireEvent.click(confirmButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Rejecting...')).toBeInTheDocument();
    });
  });

  it('disables buttons when disabled prop is true', () => {
    render(<ImageReview {...mockProps} disabled={true} />);
    
    const approveButton = screen.getByText('Approve');
    const rejectButton = screen.getByText('Reject');
    
    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it('handles image load error', () => {
    render(<ImageReview {...mockProps} />);
    
    const image = screen.getByRole('img');
    fireEvent.error(image);
    
    // Should set fallback image source
    expect(image).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
  });

  it('formats file size correctly', () => {
    const largeImage = { ...mockPendingImage, fileSize: 1536000 }; // 1.5 MB
    render(<ImageReview {...mockProps} image={largeImage} />);
    
    expect(screen.getByText('1500 KB')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<ImageReview {...mockProps} />);
    
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
  });

  it('closes rejection modal on backdrop click', () => {
    render(<ImageReview {...mockProps} />);
    
    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    // Modal should appear
    expect(screen.getByText('Reject Image')).toBeInTheDocument();

    // Click backdrop
    const backdrop = document.querySelector('.fixed.inset-0.bg-gray-500');
    fireEvent.click(backdrop!);

    // Modal should disappear
    expect(screen.queryByText('Reject Image')).not.toBeInTheDocument();
  });
});