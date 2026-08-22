import { pool } from '../database/pool.js';

export interface Contact {
  id: string;
  org_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_id?: string;
  owner_id?: string;
  lifecycle_stage?: string;
  lead_score?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class ContactService {
  /**
   * Get all contacts for current tenant (RLS enforced automatically)
   */
  async findAll(orgId: string, limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM contacts 
       WHERE org_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [orgId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Get single contact with ownership validation
   */
  async findById(id: string, orgId: string) {
    const result = await pool.query(
      `SELECT * FROM contacts WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create contact with optimistic locking support
   */
  async create(contact: Partial<Contact>) {
    const { org_id, first_name, last_name, email, phone, company_id, owner_id, lifecycle_stage } = contact;
    
    const result = await pool.query(
      `INSERT INTO contacts (org_id, first_name, last_name, email, phone, company_id, owner_id, lifecycle_stage, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
       RETURNING *`,
      [org_id, first_name, last_name, email, phone, company_id, owner_id, lifecycle_stage]
    );
    return result.rows[0];
  }

  /**
   * Update contact with optimistic locking to prevent race conditions
   */
  async update(id: string, contact: Partial<Contact>, expectedVersion: number) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (contact.first_name !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(contact.first_name);
    }
    if (contact.last_name !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(contact.last_name);
    }
    if (contact.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(contact.email);
    }
    if (contact.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(contact.phone);
    }
    if (contact.lifecycle_stage !== undefined) {
      fields.push(`lifecycle_stage = $${idx++}`);
      values.push(contact.lifecycle_stage);
    }
    if (contact.lead_score !== undefined) {
      fields.push(`lead_score = $${idx++}`);
      values.push(contact.lead_score);
    }

    fields.push(`updated_at = NOW()`);
    fields.push(`version = version + 1`);

    values.push(id);
    values.push(expectedVersion);

    const query = `
      UPDATE contacts 
      SET ${fields.join(', ')}
      WHERE id = $${idx} AND version = $${idx + 1}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('CONFLICT: Record was modified by another user. Please refresh and try again.');
    }

    return result.rows[0];
  }

  /**
   * Delete contact
   */
  async delete(id: string, orgId: string) {
    const result = await pool.query(
      `DELETE FROM contacts WHERE id = $1 AND org_id = $2 RETURNING id`,
      [id, orgId]
    );
    return result.rows.length > 0;
  }

  /**
   * Merge duplicate contacts (keep primary, archive secondary)
   */
  async merge(primaryId: string, secondaryId: string, orgId: string) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify both contacts belong to same org
      const verifyQuery = `
        SELECT id FROM contacts 
        WHERE id IN ($1, $2) AND org_id = $3
      `;
      const verifyResult = await client.query(verifyQuery, [primaryId, secondaryId, orgId]);
      
      if (verifyResult.rows.length !== 2) {
        throw new Error('Invalid contact IDs or organization mismatch');
      }

      // Archive secondary contact
      await client.query(
        `UPDATE contacts 
         SET status = 'merged', merged_into = $1, updated_at = NOW()
         WHERE id = $2`,
        [primaryId, secondaryId]
      );

      // Transfer associated data (deals, tickets, etc.)
      await client.query(
        `UPDATE deals SET primary_contact_id = $1 WHERE primary_contact_id = $2`,
        [primaryId, secondaryId]
      );

      await client.query('COMMIT');

      return { success: true, primaryId, secondaryId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk import contacts with deduplication
   */
  async bulkImport(contacts: Partial<Contact>[], orgId: string) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const inserted: any[] = [];
      const skipped: any[] = [];

      for (const contact of contacts) {
        // Check for existing email (deduplication)
        if (contact.email) {
          const existing = await client.query(
            `SELECT id FROM contacts WHERE email = $1 AND org_id = $2`,
            [contact.email, orgId]
          );

          if (existing.rows.length > 0) {
            skipped.push({ ...contact, reason: 'Duplicate email' });
            continue;
          }
        }

        const result = await client.query(
          `INSERT INTO contacts (org_id, first_name, last_name, email, phone, lifecycle_stage, version)
           VALUES ($1, $2, $3, $4, $5, $6, 1)
           RETURNING *`,
          [orgId, contact.first_name, contact.last_name, contact.email, contact.phone, contact.lifecycle_stage || 'lead']
        );

        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return {
        success: true,
        inserted: inserted.length,
        skipped: skipped.length,
        data: inserted,
        skippedData: skipped,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const contactService = new ContactService();
