#!/usr/bin/env node

/**
 * API Functionality Testing Script (JavaScript)
 * 
 * This script tests API endpoints to ensure they work with new keys.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class APITester {
  constructor() {
    this.testResults = [];
    this.loadEnvironment();
  }

  /**
   * Load environment variables
   */
  loadEnvironment() {
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env.local file not found');
      console.log('Please ensure your environment is set up correctly.');
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }

  /**
   * Make HTTP request helper
   */
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            data: data,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            responseTime
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  /**
   * Test ElevenLabs API
   */
  async testElevenLabs() {
    console.log('🔊 Testing ElevenLabs API...');

    try {
      // Test user info
      const userResponse = await this.makeRequest('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
        }
      });

      this.testResults.push({
        service: 'ElevenLabs',
        test: 'User Info',
        success: userResponse.ok,
        responseTime: userResponse.responseTime,
        error: userResponse.ok ? null : `HTTP ${userResponse.statusCode}`
      });

      if (userResponse.ok) {
        // Test voices list
        const voicesResponse = await this.makeRequest('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
          }
        });

        this.testResults.push({
          service: 'ElevenLabs',
          test: 'Voices List',
          success: voicesResponse.ok,
          responseTime: voicesResponse.responseTime,
          error: voicesResponse.ok ? null : `HTTP ${voicesResponse.statusCode}`
        });
      }

    } catch (error) {
      this.testResults.push({
        service: 'ElevenLabs',
        test: 'API Connection',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test AssemblyAI API
   */
  async testAssemblyAI() {
    console.log('🎤 Testing AssemblyAI API...');

    try {
      const response = await this.makeRequest('https://api.assemblyai.com/v2/transcript', {
        headers: {
          'authorization': process.env.ASSEMBLYAI_API_KEY || ''
        }
      });

      this.testResults.push({
        service: 'AssemblyAI',
        test: 'Transcripts List',
        success: response.ok,
        responseTime: response.responseTime,
        error: response.ok ? null : `HTTP ${response.statusCode}`
      });

    } catch (error) {
      this.testResults.push({
        service: 'AssemblyAI',
        test: 'API Connection',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test application health
   */
  async testApplicationHealth() {
    console.log('🌐 Testing application health...');

    // Check if we have all required environment variables
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GOOGLE_GEMINI_API_KEY',
      'ELEVENLABS_API_KEY',
      'ASSEMBLYAI_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    this.testResults.push({
      service: 'Environment',
      test: 'Required Variables',
      success: missingVars.length === 0,
      error: missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : null
    });

    // Test if keys look valid (basic format check)
    const keyFormats = {
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': /^eyJ/,
      'SUPABASE_SERVICE_ROLE_KEY': /^eyJ/,
      'GOOGLE_GEMINI_API_KEY': /^AIza/,
      'ELEVENLABS_API_KEY': /^sk_/,
      'ASSEMBLYAI_API_KEY': /^[a-f0-9]{32}$/
    };

    Object.entries(keyFormats).forEach(([varName, pattern]) => {
      const value = process.env[varName];
      const isValid = value && pattern.test(value);
      
      this.testResults.push({
        service: 'Environment',
        test: `${varName} Format`,
        success: isValid,
        error: isValid ? null : 'Invalid key format'
      });
    });
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 API Functionality Testing');
    console.log('============================\n');

    await this.testApplicationHealth();
    await this.testElevenLabs();
    await this.testAssemblyAI();

    this.displayResults();
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log('\n📊 Test Results Summary');
    console.log('=======================\n');

    const successCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;

    // Group results by service
    const serviceResults = {};
    this.testResults.forEach(result => {
      if (!serviceResults[result.service]) {
        serviceResults[result.service] = [];
      }
      serviceResults[result.service].push(result);
    });

    Object.entries(serviceResults).forEach(([service, results]) => {
      console.log(`📋 ${service}:`);
      results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const timing = result.responseTime ? ` (${result.responseTime}ms)` : '';
        console.log(`   ${status} ${result.test}${timing}`);
        
        if (!result.success && result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
      console.log('');
    });

    console.log(`📈 Overall Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);

    if (successCount === totalCount) {
      console.log('\n🎉 All tests passed! API keys are working correctly.');
      console.log('\n📋 Next Steps:');
      console.log('• Deploy to production with confidence');
      console.log('• Update Netlify environment variables');
      console.log('• Monitor application logs for any issues');
      console.log('• Complete git history sanitization');
      console.log('• Revoke old API keys completely');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      console.log('\n🔧 Troubleshooting:');
      console.log('• Verify API keys are correct and active');
      console.log('• Check API key permissions in service dashboards');
      console.log('• Ensure environment variables are properly set');
      console.log('• Test keys individually in service dashboards');
      console.log('• Do not deploy until all tests pass');
    }

    console.log('\n📝 Manual Testing Still Required:');
    console.log('• Supabase database connectivity');
    console.log('• Google Gemini AI responses');
    console.log('• Full application functionality');
    console.log('• End-to-end user workflows');
  }
}

// CLI execution
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests().catch(console.error);
}

module.exports = { APITester };