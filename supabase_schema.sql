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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

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
