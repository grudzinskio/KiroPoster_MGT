export interface Company {
  id: number;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'company_employee' | 'client' | 'contractor';
  company_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  company_id: number;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: Date;
  end_date?: Date;
  completed_at?: Date;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignAssignment {
  id: number;
  campaign_id: number;
  contractor_id: number;
  assigned_at: Date;
  assigned_by: number;
}

export interface Image {
  id: number;
  campaign_id: number;
  uploaded_by: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: number;
  reviewed_at?: Date;
  uploaded_at: Date;
}

// Extended interfaces with relationships
export interface UserWithCompany extends User {
  company?: Company;
}

export interface CampaignWithRelations extends Campaign {
  company?: Company;
  created_by_user?: User;
  assigned_contractors?: User[];
  images?: Image[];
}

export interface ImageWithRelations extends Image {
  campaign?: Campaign;
  uploaded_by_user?: User;
  reviewed_by_user?: User;
}