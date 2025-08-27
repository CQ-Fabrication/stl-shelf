#!/usr/bin/env bun

/**
 * STL Shelf Setup Script
 *
 * Automates the initial setup process including:
 * - Git LFS installation check
 * - Environment file creation
 * - Data directory initialization
 * - Git repository setup with LFS tracking
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
};

function log(message, color = colors.white) {
  // biome-ignore lint/suspicious/noConsole: Console output is required for setup script
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function checkCommand(command: string): Promise<boolean> {
  try {
    await $`which ${command}`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function checkGitLFS(): Promise<void> {
  log('\n🔍 Checking Git LFS installation...', colors.cyan);

  if (!(await checkCommand('git-lfs'))) {
    logError('Git LFS is not installed!');
    log('\nPlease install Git LFS:', colors.yellow);
    log('  macOS: brew install git-lfs');
    log('  Ubuntu/Debian: sudo apt install git-lfs');
    log('  CentOS/RHEL: sudo yum install git-lfs');
    log('  Windows: Download from https://git-lfs.github.io/');
    log('\nAfter installation, run: git lfs install');
    process.exit(1);
  }

  logSuccess('Git LFS is installed');
}

async function setupEnvironment(): Promise<void> {
  log('\n🔧 Setting up environment configuration...', colors.cyan);

  // Setup server environment
  const serverEnvPath = 'apps/server/.env.local';
  const serverExamplePath = 'apps/server/.env.example';
  
  if (existsSync(serverEnvPath)) {
    logInfo('Server .env.local already exists - skipping');
  } else if (!existsSync(serverExamplePath)) {
    logError('apps/server/.env.example not found');
  } else {
    try {
      const serverContent = await Bun.file(serverExamplePath).text();
      await Bun.write(serverEnvPath, serverContent);
      logSuccess('Created apps/server/.env.local');
    } catch (error) {
      logError(`Failed to create server .env.local: ${(error as Error).message}`);
    }
  }

  // Setup web environment  
  const webEnvPath = 'apps/web/.env.local';
  const webExamplePath = 'apps/web/.env.example';
  
  if (existsSync(webEnvPath)) {
    logInfo('Web .env.local already exists - skipping');
  } else if (!existsSync(webExamplePath)) {
    logError('apps/web/.env.example not found');
  } else {
    try {
      const webContent = await Bun.file(webExamplePath).text();
      await Bun.write(webEnvPath, webContent);
      logSuccess('Created apps/web/.env.local');
    } catch (error) {
      logError(`Failed to create web .env.local: ${(error as Error).message}`);
    }
  }

  logInfo('Please edit the .env.local files in each app to configure your settings');
}

async function setupDataDirectory(): Promise<void> {
  log('\n📁 Setting up data directory...', colors.cyan);

  const dataDir = './data';

  if (existsSync(dataDir)) {
    logInfo('Data directory already exists');
  } else {
    try {
      mkdirSync(dataDir, { recursive: true });
      logSuccess(`Created data directory: ${dataDir}`);
    } catch (error) {
      logError(`Failed to create data directory: ${(error as Error).message}`);
      return;
    }
  }

  // Check if it's already a Git repository
  if (existsSync(join(dataDir, '.git'))) {
    logInfo('Data directory is already a Git repository');
    return;
  }

  try {
    // Initialize Git repository in data directory
    await $`git init`.cwd(dataDir).quiet();
    logSuccess('Initialized Git repository in data directory');

    // Setup Git LFS tracking
    const gitattributes = `# Git LFS tracking for 3D model files
*.stl filter=lfs diff=lfs merge=lfs -text
*.STL filter=lfs diff=lfs merge=lfs -text
*.obj filter=lfs diff=lfs merge=lfs -text
*.OBJ filter=lfs diff=lfs merge=lfs -text
*.3mf filter=lfs diff=lfs merge=lfs -text
*.3MF filter=lfs diff=lfs merge=lfs -text
*.ply filter=lfs diff=lfs merge=lfs -text
*.PLY filter=lfs diff=lfs merge=lfs -text

# Track thumbnails normally (small images)
thumbnail.png -filter
thumbnail.jpg -filter
`;

    await Bun.write(join(dataDir, '.gitattributes'), gitattributes);
    logSuccess('Created .gitattributes with LFS tracking');

    // Create .gitignore for data directory
    const gitignore = `# System files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
*.tmp
*.temp
*~

# Editor files
.vscode/
.idea/
*.swp
*.swo
`;

    await Bun.write(join(dataDir, '.gitignore'), gitignore);
    logSuccess('Created .gitignore for data directory');

    // Initial commit
    await $`git add .gitattributes .gitignore`.cwd(dataDir).quiet();
    
    // Load environment variables from server .env.local
    let gitUserName: string | undefined;
    let gitUserEmail: string | undefined;
    
    try {
      const serverEnvPath = 'apps/server/.env.local';
      if (existsSync(serverEnvPath)) {
        const envContent = await Bun.file(serverEnvPath).text();
        const envLines = envContent.split('\n');
        
        for (const line of envLines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('GIT_USER_NAME=')) {
            gitUserName = trimmed.split('=')[1]?.replace(/"/g, '');
          }
          if (trimmed.startsWith('GIT_USER_EMAIL=')) {
            gitUserEmail = trimmed.split('=')[1]?.replace(/"/g, '');
          }
        }
      }
    } catch (error) {
      logWarning('Could not read server environment file');
    }
    
    if (!gitUserName || gitUserName === 'Your Name') {
      logError('Git configuration missing!');
      logError('Please set GIT_USER_NAME in apps/server/.env.local');
      throw new Error('GIT_USER_NAME is required');
    }
    
    if (!gitUserEmail || gitUserEmail === 'your-email@example.com') {
      logError('Git configuration missing!');
      logError('Please set GIT_USER_EMAIL in apps/server/.env.local');
      throw new Error('GIT_USER_EMAIL is required');
    }
    
    await $`git -c user.name="${gitUserName}" -c user.email="${gitUserEmail}" commit -m "Initial commit: Setup Git LFS tracking"`
      .cwd(dataDir)
      .quiet();
    logSuccess('Created initial commit');
  } catch (error) {
    logError(`Failed to setup Git repository: ${(error as Error).message}`);
  }
}

async function checkDependencies(): Promise<void> {
  log('\n📦 Checking dependencies...', colors.cyan);

  if (existsSync('node_modules')) {
    logSuccess('Dependencies already installed');
  } else {
    logWarning('Dependencies not installed - running bun install...');
    try {
      await $`bun install`;
      logSuccess('Dependencies installed');
    } catch (error) {
      logError(`Failed to install dependencies: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}

function printNextSteps() {
  log('\n🎉 Setup completed successfully!', colors.green);
  log('\n📋 Next steps:', colors.cyan);
  log('  1. Edit apps/server/.env.local to configure Git user settings');
  log('  2. Edit apps/web/.env.local to configure web app settings (optional)');
  log(
    '  3. For GitHub integration, add your Personal Access Token to GIT_REMOTE_URL in apps/server/.env.local'
  );
  log('  4. Run: bun dev');
  log('  5. Open http://localhost:3001 in your browser');
  log('\n🔗 Useful links:', colors.cyan);
  log('  - Web Interface: http://localhost:3001');
  log('  - API Server: http://localhost:3000');
  log('  - API Health: http://localhost:3000/health');
  log('');
}

// Main setup process
async function main(): Promise<void> {
  log('🚀 STL Shelf Setup Script', colors.magenta);
  log('==========================', colors.magenta);

  try {
    await checkGitLFS();
    await setupEnvironment();
    await setupDataDirectory();
    await checkDependencies();
    printNextSteps();
  } catch (error) {
    logError(`Setup failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

// biome-ignore lint/suspicious/noConsole: Console output is required for setup script
main().catch(console.error);
