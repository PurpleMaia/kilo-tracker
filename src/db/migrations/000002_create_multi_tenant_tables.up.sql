

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    branding_config JSONB -- Optional field to store branding information like logo URL, theme colors, etc.
);

-- Roles within an organization, can be expanded to include more roles as needed
CREATE TYPE role AS ENUM (
    'admin', -- can manage org settings and members
    'member'     -- regular member with standard permissions
);
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_role role NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    emoji VARCHAR(10), -- Optional emoji for visual representation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
