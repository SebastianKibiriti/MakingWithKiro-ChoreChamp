#!/usr/bin/env node

/**
 * New API Keys Validation Script
 * 
 * This script validates that new API keys are working correctly
 * before updating production environment variables.
 */

import { SecurityKeyRotator } from './security-key-rotation';
import * as fs from 'fs';
import * as path from 'path';

interface NewKeySet {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_GEMINI_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  ASSEMBLYAI_API_KEY: string;
}

class KeyValidator {
  private rotator: SecurityKeyRotator;

  constructor() {
    this.rotator = new SecurityKeyRotator();
  }

  /**
   * Load new keys from environment or prompt for manual entry
   */
  private loadNewKeys(): NewKeySet {
    // Try to load from a temporary secure file first
    const secureKeysPath = path.join(process.cwd(), '.env.new');
    
    if (fs.existsSync(secureKeysPath)) {
      console.log('📁 Loading new keys from .env.new file...');
      const envContent = fs.readFileSync(secureKeysPath, 'utf8');
      const keys: Partial<NewKeySet> = {};
      
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          (keys as any)[key.trim()] = value.trim();
        }
      });
      
      return keys as NewKeySet;
    }

    // If no file exists, provide instructions for manual key entry
    console.log('\n🔑 New API Keys Required');
    console.log('========================\n');
    console.log('Please create a .env.new file with your new API keys:');
    console.log('');
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_new_supabase_url');
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_supabase_anon_key');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your_new_supabase_service_role_key');
    console.log('GOOGLE_GEMINI_API_KEY=your_new_google_gemini_api_key');
    console.log('ELEVENLABS_API_KEY=your_new_elevenlabs_api_key');
    console.log('ASSEMBLYAI_API_KEY=your_new_assemblyai_api_key');
    console.log('');
    console.log('Then run this script again.');
    console.log('');
    console.log('⚠️  Remember to delete .env.new after validation!');
    
    process.exit(1);
  }

  /**
   * Validate all new keys and generate report
   */
  async validateKeys(): Promise<void> {
    console.log('🔐 API Key Validation Starting...\n');

    try {
      const newKeys = this.loadNewKeys();
      
      // Validate each key
      const validationResults = await this.rotator.validateNewKeys(newKeys);
      
      // Generate validation report
      console.log('\n📊 Validation Results:');
      console.log('======================');
      
      let allValid = true;
      Object.entries(validationResults).forEach(([service, isValid]) => {
        const status = isValid ? '✅ VALID' : '❌ INVALID';
        console.log(`${service}: ${status}`);
        if (!isValid) allValid = false;
      });
      
      if (allValid) {
        console.log('\n🎉 All API keys validated successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Update .env.local with new keys');
        console.log('2. Update Netlify environment variables');
        console.log('3. Test application functionality');
        console.log('4. Delete .env.new file');
        console.log('5. Revoke old keys completely');
        
        // Optionally update .env.local automatically
        await this.updateLocalEnvironment(newKeys);
        
      } else {
        console.log('\n⚠️  Some keys failed validation!');
        console.log('Please check the keys and try again.');
        console.log('Make sure you have the correct permissions and the keys are active.');
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Update local environment file with validated keys
   */
  private async updateLocalEnvironment(newKeys: NewKeySet): Promise<void> {
    const envPath = path.join(process.cwd(), '.env.local');
    
    console.log('\n🔄 Updating .env.local with validated keys...');
    
    try {
      // Read current .env.local to preserve other settings
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Update or add the new keys
      const keyUpdates = [
        `NEXT_PUBLIC_SUPABASE_URL=${newKeys.NEXT_PUBLIC_SUPABASE_URL}`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=${newKeys.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        `SUPABASE_SERVICE_ROLE_KEY=${newKeys.SUPABASE_SERVICE_ROLE_KEY}`,
        `GOOGLE_GEMINI_API_KEY=${newKeys.GOOGLE_GEMINI_API_KEY}`,
        `ELEVENLABS_API_KEY=${newKeys.ELEVENLABS_API_KEY}`,
        `ASSEMBLYAI_API_KEY=${newKeys.ASSEMBLYAI_API_KEY}`
      ];
      
      // Replace existing keys or add new ones
      let updatedContent = envContent;
      keyUpdates.forEach(keyUpdate => {
        const [key] = keyUpdate.split('=');
        const keyRegex = new RegExp(`^${key}=.*$`, 'm');
        
        if (keyRegex.test(updatedContent)) {
          updatedContent = updatedContent.replace(keyRegex, keyUpdate);
        } else {
          updatedContent += `\n${keyUpdate}`;
        }
      });
      
      // Write updated content
      fs.writeFileSync(envPath, updatedContent.trim() + '\n');
      
      console.log('✅ .env.local updated successfully');
      
    } catch (error) {
      console.error('❌ Failed to update .env.local:', error);
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new KeyValidator();
  validator.validateKeys().catch(console.error);
}

export { KeyValidator };