# Destroy Scripts

## Overview

The destroy scripts are used to completely remove your Dokku applications and Postgres database containers from the PMF Dokku host. These scripts provide a safe and controlled way to tear down your development and production environments.

## Why These Scripts Exist

When you need to completely remove a project from the Dokku host or start fresh with a new setup, these scripts automate the cleanup process. They ensure that both the application containers and their associated database containers are properly removed from the remote server.

**IMPORTANT**: These operations are destructive and cannot be undone. Use with caution!

## Scripts

### `index.sh`

The main entry point for the destruction process. This orchestrates the entire cleanup workflow with safety confirmations.

**What it does:**
1. Prompts for confirmation before proceeding (requires explicit "y" or "Y")
2. Asks for the app name to be destroyed
3. Calls `dokku.sh` to remove the Dokku apps and databases
4. Optionally removes the `.env` file

**Usage:**
```bash
./scripts/destroy/index.sh
```

**Interactive prompts:**
- Confirmation to proceed with destruction
- App name to remove
- Whether to remove the `.env` file

### `dokku.sh`

Handles the actual removal of Dokku applications and Postgres containers from the remote host.

**What it does:**
1. Loads environment variables from `.env` file (requires `PMF_DOKKU_HOST`)
2. Removes the DEV environment:
   - Destroys `{APP_NAME}-dev` Dokku app
   - Destroys `{APP_NAME}-dev-db` Postgres container
3. Removes the PROD environment:
   - Destroys `{APP_NAME}` Dokku app
   - Destroys `{APP_NAME}-db` Postgres container

**Usage:**
```bash
./scripts/destroy/dokku.sh <app-name>
```

**Parameters:**
- `app-name`: The name of your application (without `-dev` or `-db` suffixes)

**Requirements:**
- `.env` file must exist with `PMF_DOKKU_HOST` defined
- SSH access to the Dokku host must be configured
- The apps and databases must exist on the Dokku host

## How to Use

### Standard Usage

Run the main script and follow the prompts:

```bash
./scripts/destroy/index.sh
```

The script will:
1. Ask for confirmation
2. Request your app name
3. Remove all Dokku apps and databases
4. Optionally remove your `.env` file

### Direct Usage (Advanced)

If you need to remove only the Dokku resources without interactive prompts:

```bash
./scripts/destroy/dokku.sh my-app-name
```

This directly removes the apps and databases without confirmation prompts or `.env` cleanup.

## What Gets Removed

For an app named `myapp`, the following resources are destroyed:

**Development Environment:**
- Dokku app: `myapp-dev`
- Postgres database: `myapp-dev-db`

**Production Environment:**
- Dokku app: `myapp`
- Postgres database: `myapp-db`

**Optionally:**
- Local `.env` file (if you choose to remove it)

## Safety Considerations

1. **No Undo**: Once destroyed, these resources cannot be recovered. Make sure you have backups of any important data.

2. **Database Data**: All data in the Postgres containers will be permanently lost. Export any needed data before running these scripts.

3. **Manual Execution**: These scripts are intentionally NOT added to `package.json` scripts to prevent accidental execution. You must run them directly from the command line, which gives you time to think about what you're doing.

4. **Environment Variables**: If you plan to reinitialize the project, consider keeping your `.env` file to preserve configuration values like `PMF_DOKKU_HOST`.

## When to Use

- Starting over with a fresh setup
- Removing a test or experimental deployment
- Decommissioning a project entirely
- Fixing issues that require complete recreation of infrastructure

## Recovery

After destroying your applications:

1. If you removed your `.env` file, you'll need to start completely fresh with the init scripts
2. You'll need to run migrations again to recreate your database schema
3. All data will need to be restored from backups or recreated

## Troubleshooting

**"SSH access failed"**
- Ensure your SSH key is properly configured
- Verify you have access to the Dokku host
- Contact the PMF Builder admin if needed

**"App does not exist"**
- The app may have already been destroyed
- Verify the app name is correct
- Check what apps exist with: `ssh dokku@$PMF_DOKKU_HOST apps:list`

**"Permission denied"**
- Ensure you have permission to destroy apps on the Dokku host
- Contact the PMF Builder admin for proper access
