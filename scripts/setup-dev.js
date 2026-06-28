#!/usr/bin/env node
// SPDX-License-Identifier: MIT OR Apache-2.0
// SPDX-FileCopyrightText: 2026 Brett Davies

/**
 * Development Setup Script
 *
 * This script automates the initial development environment setup:
 * - Seeds each app's local env file (web .env, api .dev.vars) from its template
 * - Installs all dependencies
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_EXAMPLE_FILES = [
  { from: 'apps/web/.env.example', to: 'apps/web/.env' },
  { from: 'apps/api/.dev.vars.example', to: 'apps/api/.dev.vars' },
];

function setupEnvironmentFiles() {
  console.log('🔧 Setting up environment files...\n');

  for (const { from, to } of ENV_EXAMPLE_FILES) {
    const fromPath = path.join(__dirname, '..', from);
    const toPath = path.join(__dirname, '..', to);

    if (!fs.existsSync(toPath)) {
      if (fs.existsSync(fromPath)) {
        fs.copyFileSync(fromPath, toPath);
        console.log(`✅ Created ${to} from ${from}`);
      } else {
        console.warn(`⚠️  Warning: ${from} not found`);
      }
    } else {
      console.log(`ℹ️  ${to} already exists, skipping`);
    }
  }
}

function installDependencies() {
  console.log('\n📦 Installing dependencies...\n');
  try {
    execSync('npm install', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
}

function main() {
  console.log('🚀 CF Office Hours - Development Setup\n');
  console.log('=====================================\n');

  setupEnvironmentFiles();
  installDependencies();

  console.log('\n✨ Setup complete! Run `npm run dev` to start development.\n');
  console.log('⚠️  Remember to update .env / .dev.vars files with your actual values:\n');
  console.log('   - VITE_API_BASE_URL (web)');
  console.log('   - JWT_SECRET (api)');
  console.log('   - OAuth credentials and other API keys (when needed)\n');
}

main();
