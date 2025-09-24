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
  reviewedAt?: Date;
  uploadedAt: Date;
}

export interface CreateImageData {
  campaignId: number;
  uploadedBy: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface UpdateImageData {
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: number;
  reviewedAt?: Date;
}

export interface ImageWithRelations extends Image {
  campaign?: {
    id: number;
    name: string;
    companyId: number;
  };
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

export interface ImageFilters {
  campaignId?: number;
  uploadedBy?: number;
  status?: 'pending' | 'approved' | 'rejected';
  reviewedBy?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ImageApprovalData {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy: number;
}