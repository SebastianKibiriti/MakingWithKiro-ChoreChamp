#!/usr/bin/env node

/**
 * Security Key Check Script (JavaScript)
 * 
 * This script identifies exposed API keys and provides immediate action guidance.
 */

const fs = require('fs');
const path = require('path');

class SecurityChecker {
  constructor() {
    this.exposedKeys = [];
    this.identifyExposedKeys();
  }

  /**
   * Identify all API keys that were exposed in the git history
   */
  identifyExposedKeys() {
    // Read the current .env.local file to identify exposed keys
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env.local file not found');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // These are the keys that were exposed in git history
    this.exposedKeys = [
      {
        service: 'Supabase',
        keyType: 'anon_key',
        currentKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dnN3Y3VmaHNwdHFkc2NpeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5ODA3NjQsImV4cCI6MjA3MDU1Njc2NH0.rn_6nkpTd_53aZ-wvoqrutHsuZnep3AqfKu7K7vvBvI',
        status: 'exposed',
        dashboardUrl: 'https://supabase.com/dashboard/project/htvswcufhsptqdsciyvh/settings/api'
      },
      {
        service: 'Supabase',
        keyType: 'service_role_key',
        currentKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dnN3Y3VmaHNwdHFkc2NpeXZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDk4MDc2NCwiZXhwIjoyMDcwNTU2NzY0fQ.t4buJ_LcIXuQA7iDSUoBzIoXS82PmFWcaweQlCFTt2Y',
        status: 'exposed',
        dashboardUrl: 'https://supabase.com/dashboard/project/htvswcufhsptqdsciyvh/settings/api'
      },
      {
        service: 'Google Gemini',
        keyType: 'api_key',
        currentKey: 'AIzaSyAm8_hMPGkd51cI8MHAz5E2UxLr04FWsqs',
        status: 'exposed',
        dashboardUrl: 'https://console.cloud.google.com/apis/credentials'
      },
      {
        service: 'ElevenLabs',
        keyType: 'api_key',
        currentKey: 'sk_ed7a3f3dd771b4ea145e694314a851d82b45f048747ac48a',
        status: 'exposed',
        dashboardUrl: 'https://elevenlabs.io/app/settings/api-keys'
      },
      {
        service: 'AssemblyAI',
        keyType: 'api_key',
        currentKey: '8d6ba412e37f47bd8f52235472dfe0b0',
        status: 'exposed',
        dashboardUrl: 'https://www.assemblyai.com/app/account'
      }
    ];
  }

  /**
   * Display the current status of exposed keys
   */
  displayExposedKeys() {
    console.log('\n🚨 SECURITY ALERT: API Keys Exposed in Git History');
    console.log('===================================================\n');
    
    console.log('The following API keys were found in your git history and need IMMEDIATE rotation:\n');
    
    this.exposedKeys.forEach((key, index) => {
      console.log(`${index + 1}. 🔴 ${key.service} (${key.keyType})`);
      console.log(`   Exposed Key: ${key.currentKey.substring(0, 20)}...`);
      console.log(`   Dashboard: ${key.dashboardUrl}`);
      console.log(`   Status: ${key.status.toUpperCase()}`);
      console.log('');
    });

    console.log('⚠️  IMMEDIATE ACTION REQUIRED (Complete within 4 hours):');
    console.log('========================================================');
    console.log('');
    console.log('1. 🔥 REVOKE KEYS IMMEDIATELY:');
    this.exposedKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. Go to ${key.dashboardUrl}`);
      console.log(`      → Revoke/Delete key: ${key.currentKey.substring(0, 20)}...`);
      console.log(`      → Generate new ${key.keyType} for ${key.service}`);
      console.log('');
    });

    console.log('2. 📝 CREATE NEW KEY FILE:');
    console.log('   Create .env.new with your new keys:');
    console.log('');
    console.log('   NEXT_PUBLIC_SUPABASE_URL=https://htvswcufhsptqdsciyvh.supabase.co');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_supabase_anon_key');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your_new_supabase_service_role_key');
    console.log('   GOOGLE_GEMINI_API_KEY=your_new_google_gemini_api_key');
    console.log('   ELEVENLABS_API_KEY=your_new_elevenlabs_api_key');
    console.log('   ASSEMBLYAI_API_KEY=your_new_assemblyai_api_key');
    console.log('');

    console.log('3. ✅ VALIDATE NEW KEYS:');
    console.log('   npm run security:validate-keys');
    console.log('');

    console.log('4. 🌐 UPDATE NETLIFY:');
    console.log('   npm run security:netlify-guide');
    console.log('');

    console.log('5. 🧪 TEST FUNCTIONALITY:');
    console.log('   npm run security:test-apis');
    console.log('');

    console.log('📋 SECURITY RECOMMENDATIONS:');
    console.log('============================');
    const recommendations = [
      'All exposed API keys must be rotated immediately',
      'Old keys should be completely revoked after new keys are validated',
      'Environment variables must be updated in Netlify deployment',
      'Git history should be cleaned to remove exposed keys',
      'Implement pre-commit hooks to prevent future exposure',
      'Set up monitoring for unusual API usage patterns',
      'Consider implementing regular API key rotation schedules'
    ];
    
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    console.log('\n🎯 SUCCESS CRITERIA:');
    console.log('• All old keys revoked in service dashboards');
    console.log('• New keys generated and validated');
    console.log('• Application functionality verified');
    console.log('• Netlify environment updated');
    console.log('• No API authentication errors');

    console.log('\n📞 NEED HELP?');
    console.log('• Check IMMEDIATE-ACTION-GUIDE.md for step-by-step instructions');
    console.log('• Review SECURITY-INCIDENT-REPORT.md for full incident details');
    console.log('• Run individual security scripts for specific tasks');
  }

  /**
   * Check if keys have been rotated
   */
  checkRotationStatus() {
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (!fs.existsSync(envPath)) {
      console.log('⚠️  .env.local file not found');
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    let rotatedCount = 0;

    this.exposedKeys.forEach(key => {
      if (!envContent.includes(key.currentKey)) {
        rotatedCount++;
      }
    });

    if (rotatedCount === this.exposedKeys.length) {
      console.log('✅ All keys appear to have been rotated!');
      console.log('   Next: Run npm run security:test-apis to verify functionality');
      return true;
    } else {
      console.log(`⚠️  ${this.exposedKeys.length - rotatedCount} keys still need rotation`);
      return false;
    }
  }
}

// CLI execution
if (require.main === module) {
  const checker = new SecurityChecker();
  
  console.log('🔐 Security Key Exposure Check');
  console.log('==============================\n');
  
  checker.displayExposedKeys();
  
  console.log('\n🔍 Current Status Check:');
  checker.checkRotationStatus();
  
  console.log('\n⚡ Quick Commands:');
  console.log('npm run security:validate-keys  # After you get new keys');
  console.log('npm run security:netlify-guide  # Update production');
  console.log('npm run security:test-apis      # Test everything works');
}

module.exports = { SecurityChecker };