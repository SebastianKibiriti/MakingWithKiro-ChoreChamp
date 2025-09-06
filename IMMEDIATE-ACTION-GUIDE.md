# 🚨 IMMEDIATE ACTION GUIDE - API Key Rotation

**TIME CRITICAL:** Complete within 4 hours

## Quick Start Commands

```bash
# 1. Check what keys are exposed
npm run security:check-exposed

# 2. After rotating keys manually, validate them
npm run security:validate-keys

# 3. Get Netlify update instructions
npm run security:netlify-guide

# 4. Test everything works
npm run security:test-apis
```

## Step-by-Step Process

### 🔥 STEP 1: Revoke Keys Immediately (30 minutes)

#### Supabase (HIGHEST PRIORITY)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `htvswcufhsptqdsciyvh`
3. Settings → API → Reset API Keys
4. Copy new anon and service_role keys

#### Google Gemini AI
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Find key: `AIzaSyAm8_hMPGkd51cI8MHAz5E2UxLr04FWsqs`
4. Delete old key, create new one

#### ElevenLabs
1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app)
2. Profile → API Keys
3. Revoke key: `sk_ed7a3f3dd771b4ea145e694314a851d82b45f048747ac48a`
4. Generate new key

#### AssemblyAI
1. Go to [AssemblyAI Dashboard](https://www.assemblyai.com/app)
2. API Keys section
3. Revoke key: `8d6ba412e37f47bd8f52235472dfe0b0`
4. Create new key

### 🔧 STEP 2: Create Secure Key File (5 minutes)

Create `.env.new` with your new keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://htvswcufhsptqdsciyvh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_new_supabase_publishable_key
SUPABASE_SECRET_KEY=your_new_supabase_secret_key
GOOGLE_GEMINI_API_KEY=your_new_google_gemini_api_key
ELEVENLABS_API_KEY=your_new_elevenlabs_api_key
ASSEMBLYAI_API_KEY=your_new_assemblyai_api_key
```

### ✅ STEP 3: Validate Keys (10 minutes)

```bash
npm run security:validate-keys
```

This will:
- Test each API key
- Update your `.env.local` automatically
- Show validation results

### 🌐 STEP 4: Update Netlify (15 minutes)

```bash
npm run security:netlify-guide
```

Follow the instructions to:
- Update environment variables in Netlify
- Mark sensitive keys as "Secret"
- Trigger new deployment

### 🧪 STEP 5: Test Everything (20 minutes)

```bash
npm run security:test-apis
```

This tests:
- Database connectivity
- AI service functionality
- All API endpoints

### 🧹 STEP 6: Cleanup (5 minutes)

```bash
# Remove temporary key file
rm .env.new

# Verify .env.local is not tracked
git status
```

## Verification Checklist

- [ ] All old keys revoked in service dashboards
- [ ] New keys generated and copied
- [ ] Local validation passes all tests
- [ ] Netlify environment variables updated
- [ ] New deployment successful
- [ ] Application functionality verified
- [ ] Temporary files cleaned up

## Emergency Contacts

If you encounter issues:
1. Check the detailed error messages in the scripts
2. Verify API key permissions in each service
3. Ensure all environment variables are correctly set
4. Check Netlify deployment logs

## After Immediate Actions

Once keys are rotated and working:
1. Clean git history (see security spec tasks)
2. Implement pre-commit hooks
3. Set up monitoring
4. Complete security audit

---

**🎯 SUCCESS CRITERIA:**
- All API tests pass
- Application deploys without errors
- All features work correctly
- Old keys are completely revoked