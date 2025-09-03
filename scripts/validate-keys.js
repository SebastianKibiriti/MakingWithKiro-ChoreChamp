#!/usr/bin/env node

/**
 * API Keys Validation Script (JavaScript)
 * 
 * This script validates that new API keys are working correctly
 * before updating production environment variables.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class KeyValidator {
  constructor() {
    this.validationResults = {};
  }

  /**
   * Load new keys from .env.new file
   */
  loadNewKeys() {
    const secureKeysPath = path.join(process.cwd(), '.env.new');
    
    if (!fs.existsSync(secureKeysPath)) {
      console.log('\n🔑 New API Keys Required');
      console.log('========================\n');
      console.log('Please create a .env.new file with your new API keys:');
      console.log('');
      console.log('NEXT_PUBLIC_SUPABASE_URL=https://htvswcufhsptqdsciyvh.supabase.co');
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

    console.log('📁 Loading new keys from .env.new file...');
    const envContent = fs.readFileSync(secureKeysPath, 'utf8');
    const keys = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        keys[key.trim()] = value.trim();
      }
    });
    
    return keys;
  }

  /**
   * Make HTTP request helper
   */
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data,
            ok: res.statusCode >= 200 && res.statusCode < 300
          });
        });
      });
      
      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Validate ElevenLabs API key
   */
  async validateElevenLabs(apiKey) {
    console.log('🔊 Testing ElevenLabs API...');
    
    try {
      const response = await this.makeRequest('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': apiKey
        }
      });
      
      if (response.ok) {
        console.log('✅ ElevenLabs API key validated successfully');
        return true;
      } else {
        console.log(`❌ ElevenLabs API key validation failed: HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log('❌ ElevenLabs API key validation error:', error.message);
      return false;
    }
  }

  /**
   * Validate AssemblyAI API key
   */
  async validateAssemblyAI(apiKey) {
    console.log('🎤 Testing AssemblyAI API...');
    
    try {
      const response = await this.makeRequest('https://api.assemblyai.com/v2/transcript', {
        headers: {
          'authorization': apiKey
        }
      });
      
      if (response.ok) {
        console.log('✅ AssemblyAI API key validated successfully');
        return true;
      } else {
        console.log(`❌ AssemblyAI API key validation failed: HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log('❌ AssemblyAI API key validation error:', error.message);
      return false;
    }
  }

  /**
   * Validate all new keys
   */
  async validateKeys() {
    console.log('🔐 API Key Validation Starting...\n');

    try {
      const newKeys = this.loadNewKeys();
      
      // Validate keys that we can test without complex setup
      if (newKeys.ELEVENLABS_API_KEY) {
        this.validationResults['ElevenLabs'] = await this.validateElevenLabs(newKeys.ELEVENLABS_API_KEY);
      }
      
      if (newKeys.ASSEMBLYAI_API_KEY) {
        this.validationResults['AssemblyAI'] = await this.validateAssemblyAI(newKeys.ASSEMBLYAI_API_KEY);
      }

      // For Supabase and Google Gemini, we'll provide manual validation instructions
      console.log('\n📋 Manual Validation Required:');
      console.log('==============================');
      
      if (newKeys.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('🗄️  Supabase Keys:');
        console.log('   • Go to your Supabase dashboard');
        console.log('   • Try to access your project with the new keys');
        console.log('   • Verify database queries work correctly');
        this.validationResults['Supabase'] = 'manual_check_required';
      }
      
      if (newKeys.GOOGLE_GEMINI_API_KEY) {
        console.log('🤖 Google Gemini API:');
        console.log('   • Test the API key in Google Cloud Console');
        console.log('   • Verify it has the correct permissions');
        console.log('   • Check usage quotas are set appropriately');
        this.validationResults['Google Gemini'] = 'manual_check_required';
      }
      
      // Generate validation report
      console.log('\n📊 Validation Results:');
      console.log('======================');
      
      let allValid = true;
      Object.entries(this.validationResults).forEach(([service, result]) => {
        if (result === true) {
          console.log(`${service}: ✅ VALID`);
        } else if (result === false) {
          console.log(`${service}: ❌ INVALID`);
          allValid = false;
        } else {
          console.log(`${service}: ⚠️  MANUAL CHECK REQUIRED`);
        }
      });
      
      if (allValid) {
        console.log('\n🎉 Automated validation passed!');
        console.log('\n📋 Next Steps:');
        console.log('1. Complete manual validation for Supabase and Google Gemini');
        console.log('2. Update .env.local with new keys');
        console.log('3. Update Netlify environment variables');
        console.log('4. Test application functionality');
        console.log('5. Delete .env.new file');
        console.log('6. Revoke old keys completely');
        
        // Update .env.local automatically
        await this.updateLocalEnvironment(newKeys);
        
      } else {
        console.log('\n⚠️  Some automated tests failed!');
        console.log('Please check the keys and try again.');
        console.log('Make sure you have the correct permissions and the keys are active.');
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Update local environment file with validated keys
   */
  async updateLocalEnvironment(newKeys) {
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
        `NEXT_PUBLIC_SUPABASE_URL=${newKeys.NEXT_PUBLIC_SUPABASE_URL || 'https://htvswcufhsptqdsciyvh.supabase.co'}`,
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
      console.error('❌ Failed to update .env.local:', error.message);
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new KeyValidator();
  validator.validateKeys().catch(console.error);
}

module.exports = { KeyValidator };