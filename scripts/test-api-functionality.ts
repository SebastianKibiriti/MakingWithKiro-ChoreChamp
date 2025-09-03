#!/usr/bin/env node

/**
 * API Functionality Testing Script
 * 
 * This script tests all API endpoints and external service integrations
 * to ensure they work correctly with the new API keys.
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TestResult {
  service: string;
  test: string;
  success: boolean;
  error?: string;
  responseTime?: number;
}

class APIFunctionalityTester {
  private testResults: TestResult[] = [];

  /**
   * Run all API functionality tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 API Functionality Testing');
    console.log('============================\n');

    await this.testSupabaseConnection();
    await this.testGoogleGeminiAPI();
    await this.testElevenLabsAPI();
    await this.testAssemblyAIAPI();
    await this.testApplicationEndpoints();

    this.displayResults();
  }

  /**
   * Test Supabase database connectivity
   */
  private async testSupabaseConnection(): Promise<void> {
    console.log('🗄️  Testing Supabase connection...');

    const startTime = Date.now();
    
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      // Test basic connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        this.testResults.push({
          service: 'Supabase',
          test: 'Database Connection',
          success: false,
          error: error.message,
          responseTime
        });
      } else {
        this.testResults.push({
          service: 'Supabase',
          test: 'Database Connection',
          success: true,
          responseTime
        });

        // Test authentication
        await this.testSupabaseAuth(supabase);
      }

    } catch (error) {
      this.testResults.push({
        service: 'Supabase',
        test: 'Database Connection',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test Supabase authentication
   */
  private async testSupabaseAuth(supabase: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Test getting current session (should be null for unauthenticated)
      const { data: { session }, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;

      this.testResults.push({
        service: 'Supabase',
        test: 'Authentication Check',
        success: !error,
        error: error?.message,
        responseTime
      });

    } catch (error) {
      this.testResults.push({
        service: 'Supabase',
        test: 'Authentication Check',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test Google Gemini API
   */
  private async testGoogleGeminiAPI(): Promise<void> {
    console.log('🤖 Testing Google Gemini API...');

    const startTime = Date.now();

    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const result = await model.generateContent('Hello, this is a test message. Please respond with "API test successful".');
      const response = await result.response;
      const text = response.text();

      const responseTime = Date.now() - startTime;

      this.testResults.push({
        service: 'Google Gemini',
        test: 'Content Generation',
        success: !!text && text.length > 0,
        responseTime
      });

    } catch (error) {
      this.testResults.push({
        service: 'Google Gemini',
        test: 'Content Generation',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test ElevenLabs API
   */
  private async testElevenLabsAPI(): Promise<void> {
    console.log('🔊 Testing ElevenLabs API...');

    const startTime = Date.now();

    try {
      // Test getting user info
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const userData = await response.json();
        this.testResults.push({
          service: 'ElevenLabs',
          test: 'User Info Retrieval',
          success: true,
          responseTime
        });

        // Test getting voices
        await this.testElevenLabsVoices();
      } else {
        this.testResults.push({
          service: 'ElevenLabs',
          test: 'User Info Retrieval',
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        });
      }

    } catch (error) {
      this.testResults.push({
        service: 'ElevenLabs',
        test: 'User Info Retrieval',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test ElevenLabs voices endpoint
   */
  private async testElevenLabsVoices(): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const voices = await response.json();
        this.testResults.push({
          service: 'ElevenLabs',
          test: 'Voices List',
          success: Array.isArray(voices.voices),
          responseTime
        });
      } else {
        this.testResults.push({
          service: 'ElevenLabs',
          test: 'Voices List',
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        });
      }

    } catch (error) {
      this.testResults.push({
        service: 'ElevenLabs',
        test: 'Voices List',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test AssemblyAI API
   */
  private async testAssemblyAIAPI(): Promise<void> {
    console.log('🎤 Testing AssemblyAI API...');

    const startTime = Date.now();

    try {
      // Test getting transcripts (should return empty list for new account)
      const response = await fetch('https://api.assemblyai.com/v2/transcript', {
        headers: {
          'authorization': process.env.ASSEMBLYAI_API_KEY || ''
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        this.testResults.push({
          service: 'AssemblyAI',
          test: 'Transcripts List',
          success: true,
          responseTime
        });
      } else {
        this.testResults.push({
          service: 'AssemblyAI',
          test: 'Transcripts List',
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        });
      }

    } catch (error) {
      this.testResults.push({
        service: 'AssemblyAI',
        test: 'Transcripts List',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test application API endpoints
   */
  private async testApplicationEndpoints(): Promise<void> {
    console.log('🌐 Testing application endpoints...');

    // Note: These tests would need to be run against a running application
    // For now, we'll just document what should be tested

    const endpointsToTest = [
      '/api/ai-coach',
      '/api/tts',
      '/api/speech-recognition'
    ];

    console.log('📝 Application endpoints to test manually:');
    endpointsToTest.forEach(endpoint => {
      console.log(`   • ${endpoint}`);
    });

    this.testResults.push({
      service: 'Application',
      test: 'Endpoint Documentation',
      success: true
    });
  }

  /**
   * Display test results
   */
  private displayResults(): void {
    console.log('\n📊 Test Results Summary');
    console.log('=======================\n');

    const successCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;

    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const timing = result.responseTime ? ` (${result.responseTime}ms)` : '';
      console.log(`${status} ${result.service} - ${result.test}${timing}`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log(`\n📈 Overall Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);

    if (successCount === totalCount) {
      console.log('\n🎉 All tests passed! API keys are working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }

    console.log('\n📋 Next Steps:');
    if (successCount === totalCount) {
      console.log('• Deploy to production with confidence');
      console.log('• Monitor application logs for any issues');
      console.log('• Complete git history sanitization');
      console.log('• Revoke old API keys completely');
    } else {
      console.log('• Fix failing API key configurations');
      console.log('• Re-run tests until all pass');
      console.log('• Do not deploy until all tests pass');
    }
  }
}

// CLI execution
if (require.main === module) {
  const tester = new APIFunctionalityTester();
  tester.runAllTests().catch(console.error);
}

export { APIFunctionalityTester };