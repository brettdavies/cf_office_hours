#!/usr/bin/env node

/**
 * API Type Generation Script
 *
 * This script generates TypeScript types from the OpenAPI specification
 * exposed by the backend API. It uses openapi-typescript to create
 * type-safe API client types for the frontend.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:8787';
const OUTPUT_FILE = path.join(__dirname, '../packages/shared/src/types/api.generated.ts');

async function generateTypes() {
  console.log('🔄 Fetching OpenAPI spec from:', `${API_URL}/api/openapi.json`);

  try {
    // Generate TypeScript types from OpenAPI spec
    execSync(`npx openapi-typescript ${API_URL}/api/openapi.json -o ${OUTPUT_FILE}`, {
      stdio: 'inherit',
    });

    console.log('✅ API types generated successfully!');
    console.log('📄 Output:', OUTPUT_FILE);
  } catch (error) {
    console.error('❌ Failed to generate API types:', error.message);
    console.error('\nMake sure:');
    console.error('1. The API server is running (npm run dev:api)');
    console.error('2. The API is accessible at:', API_URL);
    console.error('3. The OpenAPI spec endpoint is available at: /api/openapi.json');
    process.exit(1);
  }
}

generateTypes();
