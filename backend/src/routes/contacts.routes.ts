import { Router, Request, Response } from 'express';
import { contactService } from '../services/contact.service.js';
import { authenticate, tenantContext, authorize, checkResourceOwnership, AuthRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createContactSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company_id: z.string().uuid().optional(),
  lifecycle_stage: z.enum(['lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer', 'evangelist', 'churned']).optional(),
  lead_score: z.number().min(0).max(100).optional(),
});

const updateContactSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company_id: z.string().uuid().optional(),
  lifecycle_stage: z.enum(['lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer', 'evangelist', 'churned']).optional(),
  lead_score: z.number().min(0).max(100).optional(),
  version: z.number().optional(), // For optimistic locking
});

/**
 * GET /api/v2/contacts
 * List all contacts for current organization (RLS enforced)
 */
router.get('/', 
  authenticate, 
  tenantContext, 
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const offset = parseInt(req.query.offset as string) || 0;
      
      const contacts = await contactService.findAll(req.user!.org_id, limit, offset);
      
      res.json({
        success: true,
        data: contacts,
        pagination: { limit, offset, total: contacts.length },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/v2/contacts/:id
 * Get single contact by ID with ownership validation
 */
router.get('/:id', 
  authenticate, 
  tenantContext, 
  checkResourceOwnership('contact'),
  async (req: AuthRequest, res: Response) => {
    try {
      const contact = await contactService.findById(req.params.id, req.user!.org_id);
      
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      
      res.json({ success: true, data: contact });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/v2/contacts
 * Create new contact
 */
router.post('/', 
  authenticate, 
  tenantContext, 
  authorize('admin', 'owner', 'member'),
  async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = createContactSchema.parse(req.body);
      
      const contact = await contactService.create({
        ...validatedData,
        org_id: req.user!.org_id,
        owner_id: req.user!.id,
      });
      
      res.status(201).json({ success: true, data: contact });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/v2/contacts/:id
 * Update contact with optimistic locking
 */
router.put('/:id', 
  authenticate, 
  tenantContext, 
  authorize('admin', 'owner', 'member'),
  checkResourceOwnership('contact'),
  async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = updateContactSchema.parse(req.body);
      const expectedVersion = validatedData.version ?? 1;
      
      // Remove version from data before passing to service
      const { version, ...updateData } = validatedData;
      
      const contact = await contactService.update(req.params.id, updateData, expectedVersion);
      
      res.json({ success: true, data: contact });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      if (error.message.includes('CONFLICT')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/v2/contacts/:id
 * Delete contact
 */
router.delete('/:id', 
  authenticate, 
  tenantContext, 
  authorize('admin', 'owner'),
  checkResourceOwnership('contact'),
  async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await contactService.delete(req.params.id, req.user!.org_id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      
      res.json({ success: true, message: 'Contact deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/v2/contacts/merge
 * Merge duplicate contacts
 */
router.post('/merge', 
  authenticate, 
  tenantContext, 
  authorize('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { primaryId, secondaryId } = req.body;
      
      if (!primaryId || !secondaryId) {
        return res.status(400).json({ error: 'Both primaryId and secondaryId are required' });
      }
      
      const result = await contactService.merge(primaryId, secondaryId, req.user!.org_id);
      
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/v2/contacts/bulk-import
 * Bulk import contacts with deduplication
 */
router.post('/bulk-import', 
  authenticate, 
  tenantContext, 
  authorize('admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { contacts } = req.body;
      
      if (!Array.isArray(contacts)) {
        return res.status(400).json({ error: 'Contacts must be an array' });
      }
      
      const result = await contactService.bulkImport(contacts, req.user!.org_id);
      
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export { router as contactRoutes };
