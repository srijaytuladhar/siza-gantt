-- Supabase Database Schema for ApexGantt
-- Copy and paste this into the Supabase SQL Editor to initialize your database tables.

-- 1. Create PROJECTS Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  collapsed BOOLEAN DEFAULT false,
  start_date TEXT,
  due_date TEXT,
  duration INT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create FEATURES Table
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  collapsed BOOLEAN DEFAULT false,
  start_date TEXT,
  due_date TEXT,
  duration INT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create TASKS Table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  feature_id TEXT REFERENCES features(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  duration INT NOT NULL,
  status TEXT DEFAULT 'todo',
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create SETTINGS Table (global app settings, single row with id='global')
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  default_feature_color TEXT DEFAULT '#3b82f6',
  default_task_color TEXT DEFAULT '#10b981',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings row (idempotent)
INSERT INTO settings (id, default_feature_color, default_task_color)
VALUES ('global', '#3b82f6', '#10b981')
ON CONFLICT (id) DO NOTHING;

-- Add color column to tasks if it doesn't exist yet (for existing databases)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS color TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write since there is no authentication
CREATE POLICY "Allow public read access on projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on projects" ON projects FOR DELETE USING (true);

CREATE POLICY "Allow public read access on features" ON features FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on features" ON features FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on features" ON features FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on features" ON features FOR DELETE USING (true);

CREATE POLICY "Allow public read access on tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on tasks" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on tasks" ON tasks FOR DELETE USING (true);

CREATE POLICY "Allow public read access on settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on settings" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on settings" ON settings FOR UPDATE USING (true);
