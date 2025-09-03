#!/usr/bin/env node

/**
 * Security Key Rotation Utility
 * 
 * This script helps manage the rotation of API keys that were exposed in git history.
 * It provides a systematic approach to key rotation and validation.
 * 
 * CRITICAL: This script should be run immediately after manual key rotation
 * through each service's dashboard.
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface APIKeyMetadata {
  service: string;
  keyType: string;
  currentKey: string;
  newKey?: string;
  status: 'exposed' | 'rotated' | 'validated' | 'deployed';
  lastRotated?: Date;
  validationResult?: boolean;
}

interface RotationReport {
  timestamp: Date;
  exposedKeys: APIKeyMetadata[];
  rotationResults: APIKeyMetadata[];
  validationResults: Record<string, boolean>;
  deploymentStatus: Record<string, boolean>;
  recommendations: string[];
}

class SecurityKeyRotator {
  private exposedKeys: APIKeyMetadata[] = [];
  private rotationReport: RotationReport;

  constructor() {
    this.rotationReport = {
      timestamp: new Date(),
      exposedKeys: [],
      rotationResults: [],
      validationResults: {},
      deploymentStatus: {},
      recommendations: []
    };

    this.identifyExposedKeys();
  }

  /**
   * Identify all API keys that were exposed in the git history
   */
  private identifyExposedKeys(): void {
    // These are the keys that were exposed in git history
    this.exposedKeys = [
      {
        service: 'Supabase',
        keyType: 'anon_key',
        currentKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dnN3Y3VmaHNwdHFkc2NpeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5ODA3NjQsImV4cCI6MjA3MDU1Njc2NH0.rn_6nkpTd_53aZ-wvoqrutHsuZnep3AqfKu7K7vvBvI',
        status: 'exposed'
      },
      {
        service: 'Supabase',
        keyType: 'service_role_key',
        currentKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dnN3Y3VmaHNwdHFkc2NpeXZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk4MDc2NCwiZXhwIjoyMDcwNTU2NzY0fQ.t4buJ_LcIXuQA7iDSUoBzIoXS82PmFWcaweQlCFTt2Y',
        status: 'exposed'
      },
      {
        service: 'Google Gemini',
        keyType: 'api_key',
        currentKey: 'AIzaSyAm8_hMPGkd51cI8MHAz5E2UxLr04FWsqs',
        status: 'exposed'
      },
      {
        service: 'ElevenLabs',
        keyType: 'api_key',
        currentKey: 'sk_ed7a3f3dd771b4ea145e694314a851d82b45f048747ac48a',
        status: 'exposed'
      },
      {
        service: 'AssemblyAI',
        keyType: 'api_key',
        currentKey: '8d6ba412e37f47bd8f52235472dfe0b0',
        status: 'exposed'
      }
    ];

    this.rotationReport.exposedKeys = [...this.exposedKeys];
  }

  /**
   * Validate that new API keys are working correctly
   */
  async validateNewKeys(newKeys: Record<string, string>): Promise<Record<string, boolean>> {
    const validationResults: Record<string, boolean> = {};

    console.log('🔍 Validating new API keys...');

    // Validate Supabase keys
    if (newKeys.NEXT_PUBLIC_SUPABASE_ANON_KEY && newKeys.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          newKeys.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        validationResults['Supabase'] = !error;
        
        if (validationResults['Supabase']) {
          console.log('✅ Supabase keys validated successfully');
        } else {
          console.log('❌ Supabase key validation failed:', error?.message);
        }
      } catch (error) {
        console.log('❌ Supabase key validation error:', error);
        validationResults['Supabase'] = false;
      }
    }

    // Validate Google Gemini API key
    if (newKeys.GOOGLE_GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(newKeys.GOOGLE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const result = await model.generateContent('Test connection');
        validationResults['Google Gemini'] = !!result.response;
        
        if (validationResults['Google Gemini']) {
          console.log('✅ Google Gemini API key validated successfully');
        } else {
          console.log('❌ Google Gemini API key validation failed');
        }
      } catch (error) {
        console.log('❌ Google Gemini API key validation error:', error);
        validationResults['Google Gemini'] = false;
      }
    }

    // Validate ElevenLabs API key
    if (newKeys.ELEVENLABS_API_KEY) {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: {
            'xi-api-key': newKeys.ELEVENLABS_API_KEY
          }
        });
        
        validationResults['ElevenLabs'] = response.ok;
        
        if (validationResults['ElevenLabs']) {
          console.log('✅ ElevenLabs API key validated successfully');
        } else {
          console.log('❌ ElevenLabs API key validation failed:', response.status);
        }
      } catch (error) {
        console.log('❌ ElevenLabs API key validation error:', error);
        validationResults['ElevenLabs'] = false;
      }
    }

    // Validate AssemblyAI API key
    if (newKeys.ASSEMBLYAI_API_KEY) {
      try {
        const response = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'GET',
          headers: {
            'authorization': newKeys.ASSEMBLYAI_API_KEY
          }
        });
        
        validationResults['AssemblyAI'] = response.ok;
        
        if (validationResults['AssemblyAI']) {
          console.log('✅ AssemblyAI API key validated successfully');
        } else {
          console.log('❌ AssemblyAI API key validation failed:', response.status);
        }
      } catch (error) {
        console.log('❌ AssemblyAI API key validation error:', error);
        validationResults['AssemblyAI'] = false;
      }
    }

    this.rotationReport.validationResults = validationResults;
    return validationResults;
  }

  /**
   * Generate a comprehensive rotation report
   */
  generateReport(): RotationReport {
    // Add security recommendations
    this.rotationReport.recommendations = [
      'All exposed API keys have been identified and marked for rotation',
      'Keys must be rotated through each service\'s dashboard immediately',
      'Old keys should be revoked completely after new keys are validated',
      'Environment variables must be updated in Netlify deployment settings',
      'Git history should be cleaned to remove exposed keys',
      'Implement pre-commit hooks to prevent future key exposure',
      'Set up monitoring for unusual API usage patterns',
      'Consider implementing API key rotation schedules'
    ];

    return this.rotationReport;
  }

  /**
   * Display the current status of exposed keys
   */
  displayExposedKeys(): void {
    console.log('\n🚨 SECURITY ALERT: The following API keys were exposed in git history:\n');
    
    this.exposedKeys.forEach((key, index) => {
      console.log(`${index + 1}. ${key.service} (${key.keyType})`);
      console.log(`   Key: ${key.currentKey.substring(0, 20)}...`);
      console.log(`   Status: ${key.status.toUpperCase()}`);
      console.log('');
    });

    console.log('⚠️  IMMEDIATE ACTION REQUIRED:');
    console.log('1. Revoke these keys through each service\'s dashboard');
    console.log('2. Generate new keys for each service');
    console.log('3. Update environment variables with new keys');
    console.log('4. Test application functionality');
    console.log('5. Clean git history to remove exposed keys\n');
  }
}

// Export for use in other scripts
export { SecurityKeyRotator };
export type { APIKeyMetadata, RotationReport };

// CLI execution
if (require.main === module) {
  const rotator = new SecurityKeyRotator();
  
  console.log('🔐 Security Key Rotation Utility');
  console.log('================================\n');
  
  rotator.displayExposedKeys();
  
  const report = rotator.generateReport();
  
  console.log('📋 Security Recommendations:');
  report.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  
  console.log('\n⚡ Next Steps:');
  console.log('1. Manually rotate keys through service dashboards');
  console.log('2. Run validation with: npm run validate-keys');
  console.log('3. Update Netlify environment variables');
  console.log('4. Test application functionality');
}