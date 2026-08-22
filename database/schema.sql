-- CADENCE ENTERPRISE DATABASE SCHEMA (PostgreSQL 16+)
-- Designed for Multi-Tenancy, High Scale, and August 2026 Feature Set
-- Includes: CRM, Marketing, Sales, Service, Agency, AI Data Lake

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geo-location data
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption

-- ==========================================
-- 1. CORE TENANCY & SECURITY
-- ==========================================

-- Organizations (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- subdomain
    plan_tier VARCHAR(50) DEFAULT 'starter', -- starter, pro, enterprise, agency
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}', -- Theme, currency, timezone
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_org_slug ON organizations(slug);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Organization Members (Many-to-Many with Roles)
CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- owner, admin, member, viewer, client_user
    permissions JSONB DEFAULT '[]', -- Granular permissions override
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended
    UNIQUE(org_id, user_id)
);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

-- Audit Logs (Immutable for Compliance)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, EXPORT
    resource_type VARCHAR(50) NOT NULL, -- CONTACT, DEAL, CAMPAIGN
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    changes JSONB, -- { before: {}, after: {} }
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id, created_at DESC);
-- Partitioning strategy for high volume logs would be applied here in production

-- ==========================================
-- 2. ADVANCED CRM (CONTACTS & COMPANIES)
-- ==========================================

-- Contact Lifecycle Stages & Properties Definitions
CREATE TABLE property_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    object_type VARCHAR(50) NOT NULL, -- contact, company, deal, ticket
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- text, number, date, enum, boolean, json
    options JSONB, -- For enum dropdowns
    is_required BOOLEAN DEFAULT FALSE,
    is_unique BOOLEAN DEFAULT FALSE,
    group_label VARCHAR(100), -- "Contact Info", "Social Profiles"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, object_type, field_key)
);

-- Contacts Table (Horizontal Sharding Key: org_id)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    owner_id UUID REFERENCES users(id),
    
    -- Standard Fields
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    job_title VARCHAR(150),
    
    -- Lifecycle & Scoring
    lifecycle_stage VARCHAR(50) DEFAULT 'subscriber', -- subscriber, lead, mql, sql, opportunity, customer, evangelist
    lead_score INTEGER DEFAULT 0,
    lead_score_history JSONB DEFAULT '[]', -- Track score changes over time
    
    -- Relationships
    primary_company_id UUID, -- Denormalized for performance
    
    -- System
    is_duplicate BOOLEAN DEFAULT FALSE,
    merged_into_id UUID, -- Self-reference for merges
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_contacts_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX idx_contacts_org_email ON contacts(org_id, email);
CREATE INDEX idx_contacts_lifecycle ON contacts(org_id, lifecycle_stage);
CREATE INDEX idx_contacts_score ON contacts(org_id, lead_score DESC);
-- GIN Index for dynamic custom properties stored in JSONB
ALTER TABLE contacts ADD COLUMN custom_properties JSONB DEFAULT '{}';
CREATE INDEX idx_contacts_custom_props ON contacts USING GIN (custom_properties);

-- Companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    parent_company_id UUID, -- For hierarchies
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    industry VARCHAR(100),
    annual_revenue NUMERIC(15,2),
    employee_count INTEGER,
    ownership_type VARCHAR(50), -- Public, Private, Non-profit
    tech_stack JSONB DEFAULT '[]', -- Detected technologies
    custom_properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_companies_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE INDEX idx_companies_org ON companies(org_id);
CREATE INDEX idx_companies_domain ON companies(org_id, domain);

-- Contact-Company Associations (Many-to-Many if needed, though primary is denormalized)
CREATE TABLE contact_company_roles (
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role_title VARCHAR(100), -- "Decision Maker", "Influencer"
    is_primary BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (contact_id, company_id)
);

-- ==========================================
-- 3. SALES PIPELINE & DEALS
-- ==========================================

CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'sales', -- sales, recruitment, partnership
    is_default BOOLEAN DEFAULT FALSE,
    stages JSONB NOT NULL, -- [{ id, label, probability, color }]
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    pipeline_id UUID REFERENCES pipelines(id),
    stage_id VARCHAR(50) NOT NULL,
    owner_id UUID REFERENCES users(id),
    
    contact_id UUID REFERENCES contacts(id),
    company_id UUID REFERENCES companies(id),
    
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    close_date DATE,
    probability INTEGER, -- Derived from stage usually
    status VARCHAR(50) DEFAULT 'open', -- open, won, lost, archived
    
    forecast_category VARCHAR(50), -- Pipeline, Best Case, Commit, Omitted
    loss_reason TEXT,
    
    custom_properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_deals_org_pipeline ON deals(org_id, pipeline_id, stage_id);
CREATE INDEX idx_deals_close_date ON deals(org_id, close_date);

-- ==========================================
-- 4. MARKETING AUTOMATION & EMAIL
-- ==========================================

-- Workflows
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50), -- form_submission, property_change, date_based, api
    trigger_config JSONB,
    definition JSONB NOT NULL, -- The visual graph: { nodes: [], edges: [] }
    status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused
    enrollment_count BIGINT DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Templates & Campaigns
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    name VARCHAR(255),
    subject_line VARCHAR(255),
    content_html TEXT,
    content_text TEXT,
    variables JSONB DEFAULT '[]', -- Detected {{ variables }}
    folder_path VARCHAR(255),
    is_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    template_id UUID REFERENCES email_templates(id),
    workflow_id UUID REFERENCES workflows(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, completed, cancelled
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    audience_filter JSONB, -- Smart list criteria
    stats JSONB DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "unsubscribed": 0}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual Email Logs (For tracking per contact)
CREATE TABLE email_events (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID NOT NULL,
    campaign_id UUID,
    contact_id UUID,
    message_id VARCHAR(255) NOT NULL, -- Provider Message ID
    event_type VARCHAR(50) NOT NULL, -- sent, delivered, opened, clicked, bounced, complained
    metadata JSONB, -- IP, User Agent, Link URL
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_events_contact ON email_events(contact_id, occurred_at DESC);
CREATE INDEX idx_email_events_campaign ON email_events(campaign_id);
-- Partition by month in production for billions of events
-- CREATE TABLE email_events_2026_08 PARTITION OF email_events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- ==========================================
-- 5. SOCIAL MEDIA COMMAND CENTER
-- ==========================================

CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    platform VARCHAR(50) NOT NULL, -- linkedin, twitter, facebook, instagram, tiktok, youtube
    account_id VARCHAR(255) NOT NULL, -- Platform ID
    username VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    permissions JSONB, -- scopes granted
    status VARCHAR(20) DEFAULT 'active', -- active, expired, revoked
    last_synced_at TIMESTAMPTZ,
    UNIQUE(org_id, platform, account_id)
);

CREATE TABLE social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    campaign_id UUID, -- Optional grouping
    content_text TEXT,
    media_urls JSONB DEFAULT '[]',
    schedule_time TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, publishing, published, failed, deleted
    platforms JSONB NOT NULL, -- Target platforms config
    published_data JSONB, -- { platform: { post_id, url, error } }
    ai_optimization_score INTEGER, -- Score given by AI engine
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE social_engagements (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID NOT NULL,
    account_id UUID REFERENCES social_accounts(id),
    external_post_id VARCHAR(255),
    engagement_type VARCHAR(50), -- like, comment, share, mention
    author_data JSONB, -- Snapshot of user who engaged
    content_text TEXT,
    sentiment_score NUMERIC(3,2), -- -1.0 to 1.0
    is_resolved BOOLEAN DEFAULT FALSE,
    assigned_to UUID REFERENCES users(id),
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_social_engagements_unresolved ON social_engagements(org_id, is_resolved) WHERE is_resolved = FALSE;

-- ==========================================
-- 6. SERVICE HUB & TICKETING
-- ==========================================

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    ticket_id_serial BIGSERIAL, -- Human readable ID (e.g., #1024)
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new', -- new, open, pending, resolved, closed
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    source VARCHAR(50), -- email, chat, form, api, social
    channel VARCHAR(50), -- web, mobile, whatsapp, messenger
    
    contact_id UUID REFERENCES contacts(id),
    company_id UUID REFERENCES companies(id),
    owner_id UUID REFERENCES users(id),
    
    sla_policy_id UUID,
    sla_status VARCHAR(50), -- active, breached, paused
    sla_breach_at TIMESTAMPTZ,
    
    category VARCHAR(100),
    tags TEXT[],
    
    custom_properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
CREATE INDEX idx_tickets_org_status ON tickets(org_id, status);
CREATE INDEX idx_tickets_sla ON tickets(org_id, sla_breach_at) WHERE sla_status = 'active';

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- customer, agent, bot, system
    sender_id UUID, -- User ID or Contact ID
    body_html TEXT,
    body_text TEXT,
    attachments JSONB DEFAULT '[]',
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. AGENCY & MULTI-CLIENT MANAGEMENT
-- ==========================================

CREATE TABLE client_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL, -- The Agency Org
    client_org_id UUID REFERENCES organizations(id), -- The Client Org
    name VARCHAR(255),
    access_level VARCHAR(50) DEFAULT 'restricted', -- full, restricted, view_only
    branding_config JSONB, -- Logo, colors, domain for white labeling
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agency_billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    client_org_id UUID REFERENCES organizations(id),
    plan_type VARCHAR(50),
    billing_cycle VARCHAR(20), -- monthly, annual
    amount NUMERIC(15,2),
    next_billing_date DATE,
    payment_method_nonce TEXT, -- Stripe/Braintree token
    status VARCHAR(20) DEFAULT 'active',
    invoices_json JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. AI DATA LAKE & UNIFIED ANALYTICS
-- ==========================================

-- Unified Activity Stream (The "Data Lake" Lite for fast querying)
CREATE TABLE unified_activities (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID NOT NULL,
    actor_type VARCHAR(50), -- contact, user, system
    actor_id UUID,
    action_type VARCHAR(100), -- email_opened, form_submitted, deal_won, ticket_created
    target_type VARCHAR(50),
    target_id UUID,
    context_json JSONB, -- Full payload of the event
    ai_insights JSONB, -- Generated insights: { sentiment: "positive", intent: "buying" }
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_unified_activities_org_time ON unified_activities(org_id, occurred_at DESC);
CREATE INDEX idx_unified_activities_actor ON unified_activities(actor_type, actor_id);
-- This table is critical for the "360 View" and should be partitioned by date

-- Attribution Models
CREATE TABLE attribution_touchpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    contact_id UUID,
    deal_id UUID,
    campaign_id UUID,
    channel VARCHAR(50),
    interaction_type VARCHAR(50),
    credit_model VARCHAR(50), -- first_touch, last_touch, linear, time_decay, u_shaped
    credit_percentage NUMERIC(5,2),
    revenue_attributed NUMERIC(15,2),
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. INTEGRATIONS & WEBHOOKS
-- ==========================================

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL, -- slack, shopify, salesforce, zoom
    config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    last_sync_error TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    target_url TEXT NOT NULL,
    secret_key VARCHAR(255),
    events TEXT[], -- ["contact.created", "deal.won"]
    is_active BOOLEAN DEFAULT TRUE,
    failure_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ
);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - CRITICAL FOR MULTI-TENANCY
-- Enable RLS on all tenant-scoped tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create organization isolation policies
CREATE POLICY org_isolation_contacts ON contacts 
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_companies ON companies 
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_deals ON deals 
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_tickets ON tickets 
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_workflows ON workflows 
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_email_campaigns ON email_campaigns 
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_social_posts ON social_posts 
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_property_definitions ON property_definitions 
    USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_audit_logs ON audit_logs 
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Users can only see members of their own organization
CREATE POLICY org_isolation_org_members ON org_members 
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- Super admins can bypass RLS (for support/debugging)
-- CREATE POLICY super_admin_bypass ON contacts 
--     USING (current_setting('app.is_super_admin')::boolean = true);
