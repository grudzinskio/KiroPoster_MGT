import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ImageUpload from '../ImageUpload';
import imageService from '../../../services/imageService';

// Mock the image service
vi.mock('../../../services/imageService', () => ({
  default: {
    uploadImage: vi.fn(),
  },
}));

const mockImageService = imageService as unknown;

describe('ImageUpload', () => {
  const mockProps = {
    campaignId: 1,
    onUploadSuccess: vi.fn(),
    onUploadError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with correct text', () => {
    render(<ImageUpload {...mockProps} />);
    
    expect(screen.getByText('Upload campaign images')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop images here, or click to select files')).toBeInTheDocument();
    expect(screen.getByText('Supports JPEG, PNG, GIF, WebP (max 10MB each)')).toBeInTheDocument();
  });

  it('shows disabled state when disabled prop is true', () => {
    render(<ImageUpload {...mockProps} disabled={true} />);
    
    const uploadArea = screen.getByText('Upload campaign images').closest('div')?.parentElement;
    expect(uploadArea).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles file selection via click', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    mockImageService.uploadImage.mockResolvedValue({ id: 1, filename: 'test.jpg' });

    render(<ImageUpload {...mockProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockImageService.uploadImage).toHaveBeenCalledWith(1, mockFile);
    });
  });

  it('validates file type', async () => {
    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    render(<ImageUpload {...mockProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockProps.onUploadError).toHaveBeenCalledWith('Only JPEG, PNG, GIF, and WebP images are allowed');
    });
  });

  it('validates file size', async () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    render(<ImageUpload {...mockProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(mockProps.onUploadError).toHaveBeenCalledWith('File size must be less than 10MB');
    });
  });

  it('handles drag and drop', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    mockImageService.uploadImage.mockResolvedValue({ id: 1, filename: 'test.jpg' });

    render(<ImageUpload {...mockProps} />);
    
    const uploadArea = screen.getByText('Upload campaign images').closest('div')!;
    
    fireEvent.dragOver(uploadArea);
    expect(screen.getByText('Drop images here')).toBeInTheDocument();
    
    fireEvent.drop(uploadArea, {
      dataTransfer: { files: [mockFile] },
    });

    await waitFor(() => {
      expect(mockImageService.uploadImage).toHaveBeenCalledWith(1, mockFile);
    });
  });

  it('shows upload progress', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    mockImageService.uploadImage.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ id: 1, filename: 'test.jpg' }), 100))
    );

    render(<ImageUpload {...mockProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  it('handles upload error', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const error = new Error('Upload failed');
    mockImageService.uploadImage.mockRejectedValue(error);

    render(<ImageUpload {...mockProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockProps.onUploadError).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('calls onUploadSuccess when upload completes', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockImage = { id: 1, filename: 'test.jpg' };
    mockImageService.uploadImage.mockResolvedValue(mockImage);

    render(<ImageUpload {...mockProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockProps.onUploadSuccess).toHaveBeenCalledWith(mockImage);
    });
  });

  it('does not upload when disabled', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    render(<ImageUpload {...mockProps} disabled={true} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });

    expect(mockImageService.uploadImage).not.toHaveBeenCalled();
  });
});