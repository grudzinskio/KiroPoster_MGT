export interface Image {
  id: number;
  campaignId: number;
  uploadedBy: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  uploadedAt: string;
  uploader?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ImageUploadRequest {
  campaignId: number;
  file: File;
}

export interface ImageReviewRequest {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface ImagesResponse {
  success: boolean;
  data: Image[];
}

export interface ImageResponse {
  success: boolean;
  data: Image;
}

export interface ImageUploadResponse {
  success: boolean;
  data: Image;
  message?: string;
}