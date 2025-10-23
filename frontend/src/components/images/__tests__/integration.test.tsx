import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ImageUpload, ImageGallery, ImageViewer, ImageReview } from '../index';
import { Image } from '../../../types/image';

// Mock the image service
vi.mock('../../../services/imageService', () => ({
  default: {
    uploadImage: vi.fn(),
    getImageUrl: vi.fn((id) => `http://localhost:3000/api/images/${id}/file`),
    approveImage: vi.fn(),
    rejectImage: vi.fn(),
    deleteImage: vi.fn(),
  },
}));

// Mock the useAuth hook
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 1,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'company_employee',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    isAuthenticated: true,
    token: 'mock-token',
    refreshToken: vi.fn(),
  })),
}));

const mockImage: Image = {
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

describe('Image Components Integration', () => {
  it('renders ImageUpload component', () => {
    render(
      <ImageUpload
        campaignId={1}
        onUploadSuccess={vi.fn()}
        onUploadError={vi.fn()}
      />
    );
    
    expect(screen.getByText('Upload campaign images')).toBeInTheDocument();
  });

  it('renders ImageGallery component with images', () => {
    render(
      <ImageGallery
        campaignId={1}
        images={[mockImage]}
        onImageClick={vi.fn()}
        onImageDelete={vi.fn()}
        onRefresh={vi.fn()}
      />
    );
    
    expect(screen.getByText('test-image-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders ImageGallery empty state', () => {
    render(
      <ImageGallery
        campaignId={1}
        images={[]}
        onImageClick={vi.fn()}
        onImageDelete={vi.fn()}
        onRefresh={vi.fn()}
      />
    );
    
    expect(screen.getByText('No images uploaded')).toBeInTheDocument();
  });

  it('renders ImageReview component', () => {
    render(
      <ImageReview
        image={mockImage}
        onReviewComplete={vi.fn()}
        onError={vi.fn()}
      />
    );
    
    expect(screen.getByText('test-image-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('renders ImageViewer component when open', () => {
    render(
      <ImageViewer
        image={mockImage}
        images={[mockImage]}
        isOpen={true}
        onClose={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />
    );
    
    expect(screen.getByText('test-image-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('Image Details')).toBeInTheDocument();
  });

  it('does not render ImageViewer when closed', () => {
    render(
      <ImageViewer
        image={mockImage}
        images={[mockImage]}
        isOpen={false}
        onClose={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />
    );
    
    expect(screen.queryByText('test-image-1.jpg')).not.toBeInTheDocument();
  });
});