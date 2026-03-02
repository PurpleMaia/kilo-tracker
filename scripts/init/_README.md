# Initialization Scripts

## Overview

The initialization scripts automate the complete setup of your PMF application template, from SSH configuration and Dokku app creation to database migrations and admin user setup. These scripts transform a fresh clone of the template into a fully functional development and production environment.

## Why These Scripts Exist

Setting up a new PMF application involves many interconnected steps:
- Configuring SSH access to the Dokku host
- Creating Dokku applications for dev and prod environments
- Setting up Postgres databases
- Running database migrations
- Creating secure admin credentials
- Seeding test data

Running these steps manually is error-prone and time-consuming. These scripts automate the entire process, ensuring consistency and reducing setup time from hours to minutes.

## Scripts

### `index.sh`

The main orchestration script that coordinates the entire initialization process.

**What it does:**
1. Prompts for app name and PMF Dokku host
2. Creates `.env` file with initial configuration
3. Creates Dokku apps and Postgres containers (dev & prod)
4. Verifies/installs golang-migrate tool
5. Installs project dependencies (`pnpm install`)
6. Runs database migrations
7. Generates password hashing pepper
8. Creates system admin user

**Usage:**
```bash
pnpm run init
```

**Requirements:**
- `pnpm` installed
- SSH access to Dokku host (will prompt for `ssh-key.sh` if needed)
- Internet connection for installing dependencies

### `ssh-key.sh`

Manages SSH key generation and validation for Dokku access.

**What it does:**
1. Generates new ED25519 SSH key if none exists
2. Displays public key for sharing with PMF Builder admin
3. Validates SSH access to Dokku host

**Usage:**
```bash
pnpm run init:ssh
```

**When to use:**
- First time setting up on a new machine
- SSH access issues to Dokku host
- New developer onboarding

**Note:** This script is called automatically by `dokku.sh` if SSH access fails.

### `dokku.sh`

Creates and configures Dokku applications and Postgres databases on the remote host.

**What it does:**
1. Verifies SSH access to Dokku host
2. Creates development environment:
   - Creates `{APP_NAME}-dev` Dokku app
   - Creates `{APP_NAME}-dev-db` Postgres container
   - Exposes Postgres for external connections
   - Links database to app
   - Enables Let's Encrypt SSL
3. Creates production environment:
   - Creates `{APP_NAME}` Dokku app
   - Creates `{APP_NAME}-db` Postgres container
   - Exposes Postgres for external connections
   - Links database to app
   - Enables Let's Encrypt SSL
4. Retrieves database connection URLs
5. Writes all configuration to `.env` file

**Usage:**
```bash
./scripts/init/dokku.sh <app-name>
```

**Environment variables added to `.env`:**
- `DATABASE_URL`: Active database URL (defaults to dev)
- `DEV_URL`: Development database URL
- `PROD_URL`: Production database URL
- `NEXT_PUBLIC_BASE_URL`: App domain URLs (commented by default)

### `db.sh`

Runs initial database migrations and seeds test data.

**What it does:**
1. Runs first migration (users, sessions, login_attempts tables) on dev and prod
2. Optionally runs second migration (tenants, members tables) if multi-tenancy is needed
3. Seeds database with test data via `seed.ts`

**Usage:**
```bash
./scripts/init/db.sh
```

**Interactive prompts:**
- Whether to set up multi-tenancy tables

**Database tables created (first migration):**
- `users` - User accounts with system roles (sysadmin, user)
- `sessions` - User session management
- `login_attempts` - Security tracking

**Database tables created (second migration, if dev said yest to multi-tenancy):**
- `tenants` - Organizations for multi-tenancy
- `members` - Organization membership with roles (org_admin, member, guest)

### `sysadmin.ts`

Creates the initial system administrator account with validated credentials.

**What it does:**
1. Prompts for email (must be valid email format, preferably @purplemaia.org)
2. Prompts for username (minimum 3 characters)
3. Prompts for password with validation:
   - Minimum 8 characters
   - At least one lowercase letter
   - At least one uppercase letter
   - At least one number
   - At least one special character
4. Hashes password securely
5. Inserts admin user into database with `sysadmin` system role

**Usage:**
```bash
tsx ./scripts/init/sysadmin.ts
```

**Note:** This is called automatically by `index.sh`. Only run manually if you need to create additional admin users.

### `seed.ts`

Populates the database with test data for development.

**What it does:**
1. Checks database schema for available tables
2. Creates test user accounts:
   - John Doe (guest)
   - Jane Smith (member)
   - Alice Johnson (org admin)
3. If multi-tenancy tables exist:
   - Creates "Test Organization"
   - Assigns members with appropriate roles

**Usage:**
```bash
tsx ./scripts/init/seed.ts
```

**Test credentials:**
- All test accounts use password: `password123`
- WARNING: This password doesn't meet production Zod schema requirements; test data only

**Note:** This is called automatically by `db.sh` during initialization.

## Complete Initialization Workflow

### First-Time Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd app-template
   ```

2. **Run initialization**
   ```bash
   pnpm run init
   ```

3. **Follow the prompts:**
   - Enter app name (e.g., "myapp")
   - Enter PMF Dokku host
   - If SSH fails, creates SSH key and displays
   - Send public key to PMF Builder admin
   - Wait for admin confirmation   
   - Choose whether to enable multi-tenancy
   - Enter system admin credentials

4. **Start development**
   ```bash
   pnpm dev
   ```

### What Gets Created

**On Dokku Host:**
- `{app-name}-dev` - Development app
- `{app-name}-dev-db` - Development database
- `{app-name}` - Production app
- `{app-name}-db` - Production database

**Locally:**
- `.env` - Environment configuration
- Admin user account
- Test user accounts (if seeding enabled)
- All project dependencies installed

**Database Schema:**
- Core tables (users, sessions, login_attempts)
- Optional multi-tenancy tables (tenants, members)

## Environment Variables

After initialization, your `.env` file will contain:

```bash
PMF_DOKKU_HOST=<your-dokku-host>

# Database URLs
DATABASE_URL=<dev-database-url>
DEV_URL=<dev-database-url>
PROD_URL=<prod-database-url>

# Password hashing
PASSWORD_HASH_SECRET=<generated-pepper>

# Optional: App URLs (commented by default)
#NEXT_PUBLIC_BASE_URL=https://{app-name}-dev.{dokku-host}
#NEXT_PUBLIC_BASE_URL=https://{app-name}.{dokku-host}
```

## Troubleshooting

### SSH Access Issues

**Problem:** "SSH access to Dokku host failed"

**Solutions:**
1. Run `./scripts/init/ssh-key.sh` to set up SSH keys
2. Send your public key to PMF Builder admin
3. Wait for admin to add your key to Dokku host
4. Verify access: `ssh dokku@$PMF_DOKKU_HOST apps:list`

### Dokku App Already Exists

**Problem:** "App already exists" error

**Solutions:**
1. Choose a different app name
2. Destroy existing apps with `./scripts/destroy/index.sh`
3. Contact PMF Builder admin if you need to reclaim the name

### Migration Failures

**Problem:** Database migration errors

**Solutions:**
1. Verify database URLs in `.env` are correct
2. Check network connectivity to Dokku host
3. Ensure Postgres containers are running: `ssh dokku@$PMF_DOKKU_HOST postgres:info {app-name}-dev-db`
4. Check migration files in `src/lib/db/migrations` are valid

### golang-migrate Not Installing

**Problem:** Migration tool installation fails

**Solutions:**
- **macOS:** Ensure Homebrew is installed
- **Linux:** Ensure apt-get has proper permissions
- **Windows:** Install Scoop first
- **Manual:** Install from https://github.com/golang-migrate/migrate

## Starting Over

If initialization fails or you need to start fresh:

1. **Destroy existing resources:**
   ```bash
   ./scripts/destroy/index.sh
   ```

2. **Run initialization again:**
   ```bash
   pnpm run init
   ```

## Security Notes

1. **`.env` file:** Contains sensitive credentials. Never commit to version control.
2. **Password pepper:** Generated randomly during init. Required for password hashing.
3. **SSH keys:** Keep your private key (`~/.ssh/id_ed25519`) secure.
4. **Admin credentials:** Store securely (password manager recommended).
5. **Test passwords:** The default `password123` in seed data is INSECURE. Only use in development.

## Next Steps

After successful initialization:

1. Start development server: `pnpm dev`
2. Log in with your admin credentials
3. Explore the application structure
4. Create your first features
5. Use `scripts/migrate/` for schema changes
6. Deploy to Dokku when ready

## Additional Resources

- Dokku documentation: https://dokku.com/docs/
- golang-migrate: https://github.com/golang-migrate/migrate
- PMF Builder documentation: (contact admin)
