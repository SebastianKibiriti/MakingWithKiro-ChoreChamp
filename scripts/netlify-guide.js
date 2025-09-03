#!/usr/bin/env node

/**
 * Netlify Environment Variables Update Guide (JavaScript)
 * 
 * This script provides instructions for updating Netlify environment variables.
 */

class NetlifyGuide {
  displayInstructions() {
    console.log('🌐 Netlify Environment Variables Update');
    console.log('=======================================\n');
    
    console.log('📋 Step-by-Step Instructions:');
    console.log('==============================\n');
    
    console.log('1. 🌐 Access Netlify Dashboard:');
    console.log('   • Go to https://app.netlify.com/');
    console.log('   • Select your Chore Champion site');
    console.log('   • Navigate to Site settings → Environment variables\n');
    
    console.log('2. 🔐 Update API Keys (Mark as Secret):');
    console.log('   Update these variables with your NEW keys:\n');
    
    const secretVars = [
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'GOOGLE_GEMINI_API_KEY',
      'ELEVENLABS_API_KEY',
      'ASSEMBLYAI_API_KEY'
    ];
    
    secretVars.forEach((varName, index) => {
      console.log(`   ${index + 1}. ${varName}`);
      console.log(`      → Click "Edit" next to the variable`);
      console.log(`      → Paste your new key value`);
      console.log(`      → Check "Secret" to hide the value`);
      console.log(`      → Set scope to "All deploy contexts"`);
      console.log(`      → Click "Save"\n`);
    });
    
    console.log('3. ⚙️  Verify Configuration Variables:');
    console.log('   Ensure these are still present (not secret):\n');
    
    const configVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'GEMINI_MODEL',
      'GEMINI_TEMPERATURE',
      'GEMINI_MAX_TOKENS',
      'ASSEMBLYAI_SAMPLE_RATE',
      'ELEVENLABS_MODEL',
      'VOICE_COACH_DEFAULT_CHARACTER',
      'VOICE_COACH_MAX_SESSION_MINUTES',
      'VOICE_COACH_DAILY_LIMIT_MINUTES'
    ];
    
    configVars.forEach((varName, index) => {
      console.log(`   ${index + 1}. ${varName}`);
    });
    
    console.log('\n4. 🚀 Deploy and Test:');
    console.log('   • Trigger a new deployment');
    console.log('   • Monitor deployment logs for errors');
    console.log('   • Test all application features');
    console.log('   • Verify AI functionality works\n');
    
    this.displayChecklist();
    this.displayTestingGuide();
  }

  displayChecklist() {
    console.log('✅ Deployment Checklist:');
    console.log('========================\n');
    
    const checklist = [
      'Backup current Netlify environment variables',
      'Update NEXT_PUBLIC_SUPABASE_ANON_KEY (mark as secret)',
      'Update SUPABASE_SERVICE_ROLE_KEY (mark as secret)',
      'Update GOOGLE_GEMINI_API_KEY (mark as secret)',
      'Update ELEVENLABS_API_KEY (mark as secret)',
      'Update ASSEMBLYAI_API_KEY (mark as secret)',
      'Verify NEXT_PUBLIC_SUPABASE_URL is correct',
      'Verify all configuration variables are present',
      'Set all variables to "All deploy contexts"',
      'Trigger new deployment',
      'Monitor deployment logs',
      'Test deployed application functionality',
      'Verify AI features work correctly',
      'Confirm database connectivity',
      'Check for any console errors'
    ];
    
    checklist.forEach((item, index) => {
      console.log(`[ ] ${index + 1}. ${item}`);
    });
  }

  displayTestingGuide() {
    console.log('\n🧪 Post-Deployment Testing:');
    console.log('===========================\n');
    
    console.log('1. 🏠 Basic Functionality:');
    console.log('   • Homepage loads without errors');
    console.log('   • User authentication works');
    console.log('   • Navigation functions correctly\n');
    
    console.log('2. 🤖 AI Features:');
    console.log('   • Voice coach initializes');
    console.log('   • Text-to-speech works');
    console.log('   • Different character voices function');
    console.log('   • Speech recognition responds\n');
    
    console.log('3. 📊 Dashboard Features:');
    console.log('   • Parent dashboard loads');
    console.log('   • Child dashboard functions');
    console.log('   • Chore management works');
    console.log('   • Real-time updates occur\n');
    
    console.log('4. 🗄️  Database Operations:');
    console.log('   • User profiles load');
    console.log('   • Chore CRUD operations work');
    console.log('   • Reward system functions');
    console.log('   • Data persists correctly\n');
    
    console.log('🎯 Success Indicators:');
    console.log('• No deployment errors in Netlify logs');
    console.log('• No console errors in browser');
    console.log('• All API calls return successful responses');
    console.log('• Application features work as expected');
    
    console.log('\n⚠️  If Issues Occur:');
    console.log('• Check Netlify function logs');
    console.log('• Verify environment variable values');
    console.log('• Ensure all keys are marked as secret');
    console.log('• Confirm API key permissions in service dashboards');
    console.log('• Test keys individually using npm run security:test-apis');
  }
}

// CLI execution
if (require.main === module) {
  const guide = new NetlifyGuide();
  guide.displayInstructions();
}

module.exports = { NetlifyGuide };