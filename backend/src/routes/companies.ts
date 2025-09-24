import express from 'express';
import { CompanyService, CreateCompanyData, UpdateCompanyData } from '../services/CompanyService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createCompanySchema, updateCompanySchema, toggleCompanyStatusSchema } from '../validation/company.js';

const router = express.Router();

/**
 * GET /api/companies
 * Get all companies (Company Employees only)
 */
router.get('/', authenticate, authorize('company_employee'), async (req, res) => {
  try {
    
    const includeUserCount = req.query.include_user_count === 'true';
    
    let companies;
    if (includeUserCount) {
      companies = await CompanyService.getCompaniesWithUserCount();
    } else {
      companies = await CompanyService.getAllCompanies();
    }

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch companies'
    });
  }
});

/**
 * GET /api/companies/active
 * Get active companies only
 */
router.get('/active', authenticate, authorize('company_employee'), async (req, res) => {
  try {
    
    const companies = await CompanyService.getActiveCompanies();

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Error fetching active companies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active companies'
    });
  }
});

/**
 * GET /api/companies/:id
 * Get company by ID
 */
router.get('/:id', authenticate, authorize('company_employee'), async (req, res) => {
  try {
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    const includeUsers = req.query.include_users === 'true';
    
    let company;
    if (includeUsers) {
      company = await CompanyService.getCompanyByIdWithUsers(id);
    } else {
      company = await CompanyService.getCompanyById(id);
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company'
    });
  }
});

/**
 * POST /api/companies
 * Create new company (Company Employees only)
 */
router.post('/', authenticate, authorize('company_employee'), validate(createCompanySchema), async (req, res) => {
  try {
    
    const companyData: CreateCompanyData = {
      name: req.body.name,
      contact_email: req.body.contact_email,
      contact_phone: req.body.contact_phone,
      address: req.body.address,
      is_active: req.body.is_active
    };

    const company = await CompanyService.createCompany(companyData);

    res.status(201).json({
      success: true,
      data: company,
      message: 'Company created successfully'
    });
  } catch (error) {
    console.error('Error creating company:', error);
    
    // Handle validation errors
    if (error instanceof Error) {
      if (error.message.includes('required') || 
          error.message.includes('Invalid') || 
          error.message.includes('already exists') ||
          error.message.includes('must be')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create company'
    });
  }
});

/**
 * PUT /api/companies/:id
 * Update company (Company Employees only)
 */
router.put('/:id', authenticate, authorize('company_employee'), validate(updateCompanySchema), async (req, res) => {
  try {
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    const updates: UpdateCompanyData = {
      name: req.body.name,
      contact_email: req.body.contact_email,
      contact_phone: req.body.contact_phone,
      address: req.body.address,
      is_active: req.body.is_active
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof UpdateCompanyData] === undefined) {
        delete updates[key as keyof UpdateCompanyData];
      }
    });

    const company = await CompanyService.updateCompany(id, updates);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company,
      message: 'Company updated successfully'
    });
  } catch (error) {
    console.error('Error updating company:', error);
    
    // Handle validation errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message.includes('required') || 
          error.message.includes('Invalid') || 
          error.message.includes('already exists') ||
          error.message.includes('must be')) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update company'
    });
  }
});

/**
 * DELETE /api/companies/:id
 * Deactivate company (Company Employees only)
 */
router.delete('/:id', authenticate, authorize('company_employee'), async (req, res) => {
  try {
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    const force = req.query.force === 'true';

    let success;
    if (force) {
      success = await CompanyService.deleteCompany(id);
    } else {
      success = await CompanyService.deactivateCompany(id);
    }

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: force ? 'Company deleted successfully' : 'Company deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting/deactivating company:', error);
    
    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message.includes('Cannot') || error.message.includes('active users') || error.message.includes('associated users')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete/deactivate company'
    });
  }
});

/**
 * PUT /api/companies/:id/activate
 * Activate company (Company Employees only)
 */
router.put('/:id/activate', authenticate, authorize('company_employee'), async (req, res) => {
  try {
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    const company = await CompanyService.updateCompany(id, { is_active: true });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company,
      message: 'Company activated successfully'
    });
  } catch (error) {
    console.error('Error activating company:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to activate company'
    });
  }
});

/**
 * PUT /api/companies/:id/deactivate
 * Deactivate company (Company Employees only)
 */
router.put('/:id/deactivate', authenticate, authorize('company_employee'), async (req, res) => {
  try {
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    const success = await CompanyService.deactivateCompany(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating company:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message.includes('Cannot') || error.message.includes('active users')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to deactivate company'
    });
  }
});

export default router;