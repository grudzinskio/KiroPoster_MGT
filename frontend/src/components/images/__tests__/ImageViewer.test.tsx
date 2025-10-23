import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ImageViewer from '../ImageViewer';
import imageService from '../../../services/imageService';
import { Image } from '../../../types/image';

// Mock the image service
vi.mock('../../../services/imageService', () => ({
  default: {
    getImageUrl: vi.fn((id) => `http://localhost:3000/api/images/${id}/file`),
  },
}));

const mockImageService = imageService as any;

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

const mockImages: Image[] = [
  mockImage,
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
    uploader: {
      id: 2,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
  },
];

describe('ImageViewer', () => {
  const mockProps = {
    image: mockImage,
    images: mockImages,
    isOpen: true,
    onClose: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when not open', () => {
    render(<ImageViewer {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('test-image-1.jpg')).not.toBeInTheDocument();
  });

  it('does not render when no image provided', () => {
    render(<ImageViewer {...mockProps} image={null} />);
    
    expect(screen.queryByText('test-image-1.jpg')).not.toBeInTheDocument();
  });

  it('renders image viewer with correct information', () => {
    render(<ImageViewer {...mockProps} />);
    
    expect(screen.getByText('test-image-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('1000 KB • JPEG')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ImageViewer {...mockProps} />);
    
    const closeButton = screen.getByTitle('Close (Esc)');
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside', () => {
    render(<ImageViewer {...mockProps} />);
    
    const backdrop = screen.getByRole('img').closest('.fixed')?.querySelector('div:last-child');
    fireEvent.click(backdrop!);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles keyboard navigation', () => {
    render(<ImageViewer {...mockProps} />);
    
    // Test Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockProps.onClose).toHaveBeenCalled();
    
    // Test Arrow keys
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(mockProps.onPrevious).toHaveBeenCalled();
    
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(mockProps.onNext).toHaveBeenCalled();
  });

  it('handles zoom controls', () => {
    render(<ImageViewer {...mockProps} />);
    
    const zoomInButton = screen.getByTitle('Zoom In (+)');
    const zoomOutButton = screen.getByTitle('Zoom Out (-)');
    const resetButton = screen.getByTitle('Reset (0)');
    
    // Initial zoom should be 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // Zoom in
    fireEvent.click(zoomInButton);
    expect(screen.getByText('120%')).toBeInTheDocument();
    
    // Zoom out
    fireEvent.click(zoomOutButton);
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // Reset zoom
    fireEvent.click(zoomInButton);
    fireEvent.click(resetButton);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles rotation', () => {
    render(<ImageViewer {...mockProps} />);
    
    const rotateButton = screen.getByTitle('Rotate (R)');
    fireEvent.click(rotateButton);
    
    const image = screen.getByRole('img');
    expect(image).toHaveStyle('transform: scale(1) rotate(90deg) translate(0px, 0px)');
  });

  it('handles keyboard zoom shortcuts', () => {
    render(<ImageViewer {...mockProps} />);
    
    // Test zoom in with +
    fireEvent.keyDown(document, { key: '+' });
    expect(screen.getByText('120%')).toBeInTheDocument();
    
    // Test zoom out with -
    fireEvent.keyDown(document, { key: '-' });
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // Test reset with 0
    fireEvent.keyDown(document, { key: '+' });
    fireEvent.keyDown(document, { key: '0' });
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // Test rotate with R
    fireEvent.keyDown(document, { key: 'r' });
    const image = screen.getByRole('img');
    expect(image).toHaveStyle('transform: scale(1) rotate(90deg) translate(0px, 0px)');
  });

  it('shows navigation buttons when multiple images', () => {
    render(<ImageViewer {...mockProps} />);
    
    expect(screen.getByTitle('Previous (←)')).toBeInTheDocument();
    expect(screen.getByTitle('Next (→)')).toBeInTheDocument();
  });

  it('does not show navigation buttons when single image', () => {
    render(<ImageViewer {...mockProps} images={[mockImage]} />);
    
    expect(screen.queryByTitle('Previous (←)')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Next (→)')).not.toBeInTheDocument();
    expect(screen.queryByText('1 of 2')).not.toBeInTheDocument();
  });

  it('handles download', async () => {
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
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    render(<ImageViewer {...mockProps} />);
    
    const downloadButton = screen.getByTitle('Download (D)');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe('test-image-1.jpg');
    });
  });

  it('shows rejection reason for rejected images', () => {
    const rejectedImage: Image = {
      ...mockImage,
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

    render(<ImageViewer {...mockProps} image={rejectedImage} />);
    
    expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
    expect(screen.getByText('Poor image quality')).toBeInTheDocument();
    expect(screen.getByText(/Rejected by Admin User/)).toBeInTheDocument();
  });

  it('shows approval info for approved images', () => {
    const approvedImage: Image = {
      ...mockImage,
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

    render(<ImageViewer {...mockProps} image={approvedImage} />);
    
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/By Admin User/)).toBeInTheDocument();
  });

  it('handles image load error', () => {
    render(<ImageViewer {...mockProps} />);
    
    const image = screen.getByRole('img');
    fireEvent.error(image);
    
    expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    expect(screen.getByText('The image could not be displayed')).toBeInTheDocument();
  });

  it('handles mouse drag for zoomed images', () => {
    render(<ImageViewer {...mockProps} />);
    
    // First zoom in
    const zoomInButton = screen.getByTitle('Zoom In (+)');
    fireEvent.click(zoomInButton);
    
    const container = screen.getByRole('img').closest('.cursor-move')!;
    
    // Start drag
    fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
    
    // Move mouse
    fireEvent.mouseMove(container, { clientX: 150, clientY: 150 });
    
    // End drag
    fireEvent.mouseUp(container);
    
    // Image should have moved
    const image = screen.getByRole('img');
    expect(image).toHaveStyle(expect.stringContaining('translate'));
  });

  it('resets viewer state when image changes', () => {
    const { rerender } = render(<ImageViewer {...mockProps} />);
    
    // Zoom in and rotate
    const zoomInButton = screen.getByTitle('Zoom In (+)');
    const rotateButton = screen.getByTitle('Rotate (R)');
    fireEvent.click(zoomInButton);
    fireEvent.click(rotateButton);
    
    expect(screen.getByText('120%')).toBeInTheDocument();
    
    // Change image
    rerender(<ImageViewer {...mockProps} image={mockImages[1]} />);
    
    // Should reset to default state
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});