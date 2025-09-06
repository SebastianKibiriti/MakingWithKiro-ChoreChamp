-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES profiles(id),
  rank TEXT DEFAULT 'recruit-rascal',
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chores table
CREATE TABLE IF NOT EXISTS chores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  parent_id UUID REFERENCES profiles(id) NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chore_completions table
CREATE TABLE IF NOT EXISTS chore_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chore_id UUID REFERENCES chores(id) NOT NULL,
  child_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id)
);

-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  parent_id UUID REFERENCES profiles(id) NOT NULL,
  rank_required TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_usage table for tracking daily API usage
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ai_requests INTEGER DEFAULT 0,
  tts_requests INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per day
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Parents can view their children's profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = parent_id OR 
    auth.uid() = id
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Parents can insert child profiles" ON profiles
  FOR INSERT WITH CHECK (
    role = 'child' AND 
    parent_id = auth.uid()
  );

-- Chores policies
CREATE POLICY "Parents can manage their own chores" ON chores
  FOR ALL USING (parent_id = auth.uid());

CREATE POLICY "Children can view chores assigned to them or unassigned" ON chores
  FOR SELECT USING (
    assigned_to = auth.uid() OR 
    assigned_to IS NULL OR
    parent_id IN (SELECT parent_id FROM profiles WHERE id = auth.uid())
  );

-- Chore completions policies
CREATE POLICY "Children can insert their own completions" ON chore_completions
  FOR INSERT WITH CHECK (child_id = auth.uid());

CREATE POLICY "Users can view relevant completions" ON chore_completions
  FOR SELECT USING (
    child_id = auth.uid() OR
    approved_by = auth.uid() OR
    auth.uid() IN (SELECT parent_id FROM profiles WHERE id = child_id)
  );

CREATE POLICY "Parents can update completions for their children" ON chore_completions
  FOR UPDATE USING (
    auth.uid() IN (SELECT parent_id FROM profiles WHERE id = child_id)
  );

-- Rewards policies
CREATE POLICY "Parents can manage their own rewards" ON rewards
  FOR ALL USING (parent_id = auth.uid());

CREATE POLICY "Children can view their parent's rewards" ON rewards
  FOR SELECT USING (
    parent_id IN (SELECT parent_id FROM profiles WHERE id = auth.uid())
  );

-- User usage policies
CREATE POLICY "Users can view their own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON user_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON user_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name, parent_id, points, rank)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'parent_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'parent_id')::UUID
      ELSE NULL
    END,
    0,
    'recruit-rascal'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chores_updated_at
  BEFORE UPDATE ON chores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON user_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance on usage queries
CREATE INDEX IF NOT EXISTS idx_user_usage_user_date ON user_usage(user_id, date);

-- Function to clean up old usage records (keeps last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_usage()
RETURNS void AS $$
BEGIN
  DELETE FROM user_usage 
  WHERE date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;