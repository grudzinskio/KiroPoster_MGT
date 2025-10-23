import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ImageGallery from '../ImageGallery';
import imageService from '../../../services/imageService';
import { useAuth } from '../../../contexts/AuthContext';
import { Image } from '../../../types/image';

// Mock the image service
vi.mock('../../../services/imageService', () => ({
  default: {
    getImageUrl: vi.fn((id) => `http://localhost:3000/api/images/${id}/file`),
    deleteImage: vi.fn(),
  },
}));

const mockImageService = imageService as any;

// Mock auth context
const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'company_employee' as const,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock the useAuth hook
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = useAuth as any;

const mockImages: Image[] = [
  {
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
  },
  {
    id: 2,
    campaignId: 1,
    uploadedBy: 2,
    filename: 'image2.jpg',
    originalFilename: 'test-image-2.jpg',
    filePath: '/uploads/image2.jpg',
    fileSize: 2048000,
    mimeType: 'image/png',
    status: 'approved',
    uploadedAt: '2024-01-01T11:00:00Z',
    reviewedAt: '2024-01-01T12:00:00Z',
    reviewedBy: 1,
    uploader: {
      id: 2,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    reviewer: {
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
    },
  },
  {
    id: 3,
    campaignId: 1,
    uploadedBy: 2,
    filename: 'image3.jpg',
    originalFilename: 'test-image-3.jpg',
    filePath: '/uploads/image3.jpg',
    fileSize: 512000,
    mimeType: 'image/gif',
    status: 'rejected',
    rejectionReason: 'Image quality is too low',
    uploadedAt: '2024-01-01T09:00:00Z',
    reviewedAt: '2024-01-01T13:00:00Z',
    reviewedBy: 1,
    uploader: {
      id: 2,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    reviewer: {
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
    },
  },
];

describe('ImageGallery', () => {
  const mockProps = {
    campaignId: 1,
    images: mockImages,
    onImageClick: vi.fn(),
    onImageDelete: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      token: 'mock-token',
      refreshToken: vi.fn(),
    });
  });

  it('renders empty state when no images', () => {
    render(<ImageGallery {...mockProps} images={[]} />);
    
    expect(screen.getByText('No images uploaded')).toBeInTheDocument();
    expect(screen.getByText('Images uploaded for this campaign will appear here.')).toBeInTheDocument();
  });

  it('renders all images with correct information', () => {
    render(<ImageGallery {...mockProps} />);
    
    expect(screen.getByText('test-image-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-image-2.jpg')).toBeInTheDocument();
    expect(screen.getByText('test-image-3.jpg')).toBeInTheDocument();
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    expect(screen.getByText('2000 KB')).toBeInTheDocument();
    expect(screen.getByText('500 KB')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<ImageGallery {...mockProps} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows rejection reason for rejected images', () => {
    render(<ImageGallery {...mockProps} />);
    
    expect(screen.getByText('Image quality is too low')).toBeInTheDocument();
    expect(screen.getByText(/Rejected:/)).toBeInTheDocument();
  });

  it('shows approval info for approved images', () => {
    render(<ImageGallery {...mockProps} />);
    
    expect(screen.getByText(/Approved by Admin User/)).toBeInTheDocument();
  });

  it('calls onImageClick when image is clicked', () => {
    render(<ImageGallery {...mockProps} />);
    
    const image = screen.getAllByRole('img')[0];
    fireEvent.click(image);
    
    expect(mockProps.onImageClick).toHaveBeenCalledWith(mockImages[0]);
  });

  it('handles image download', async () => {
    // Mock fetch for download
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
    });
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement and appendChild
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown);

    render(<ImageGallery {...mockProps} />);
    
    const image = screen.getAllByRole('img')[0];
    fireEvent.mouseEnter(image.closest('.relative')!);
    
    const downloadButton = screen.getAllByTitle('Download')[0];
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  it('handles image deletion for company employee', async () => {
    mockImageService.deleteImage.mockResolvedValue(undefined);
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ImageGallery {...mockProps} />);
    
    const image = screen.getAllByRole('img')[0];
    fireEvent.mouseEnter(image.closest('.relative')!);
    
    const deleteButton = screen.getAllByTitle('Delete')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockImageService.deleteImage).toHaveBeenCalledWith(1);
      expect(mockProps.onImageDelete).toHaveBeenCalledWith(1);
      expect(mockProps.onRefresh).toHaveBeenCalled();
    });
  });

  it('does not show delete button for contractors on approved images', () => {
    const contractorUser = { ...mockUser, role: 'contractor' as const };
    mockUseAuth.mockReturnValue({
      user: contractorUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      token: 'mock-token',
      refreshToken: vi.fn(),
    });
    
    render(<ImageGallery {...mockProps} />);
    
    const approvedImage = screen.getByText('test-image-2.jpg').closest('.relative')!;
    fireEvent.mouseEnter(approvedImage);
    
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('shows delete button for contractors on their own pending images', () => {
    const contractorUser = { ...mockUser, id: 2, role: 'contractor' as const };
    mockUseAuth.mockReturnValue({
      user: contractorUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      token: 'mock-token',
      refreshToken: vi.fn(),
    });
    
    render(<ImageGallery {...mockProps} />);
    
    const pendingImage = screen.getByText('test-image-1.jpg').closest('.relative')!;
    fireEvent.mouseEnter(pendingImage);
    
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('does not show actions when showActions is false', () => {
    render(<ImageGallery {...mockProps} showActions={false} />);
    
    const image = screen.getAllByRole('img')[0];
    fireEvent.mouseEnter(image.closest('.relative')!);
    
    expect(screen.queryByTitle('View full size')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Download')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('handles image load error', () => {
    render(<ImageGallery {...mockProps} />);
    
    const image = screen.getAllByRole('img')[0];
    fireEvent.error(image);
    
    // Should set fallback image source
    expect(image).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
  });
});