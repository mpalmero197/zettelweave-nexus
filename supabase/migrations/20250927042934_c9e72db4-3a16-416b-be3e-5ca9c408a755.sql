-- Fix the dashboard_layouts table to support proper upsert operations
-- The error indicates we need a unique constraint for the ON CONFLICT clause

-- First, ensure we have the proper unique constraint
ALTER TABLE public.dashboard_layouts DROP CONSTRAINT IF EXISTS dashboard_layouts_user_id_key;
ALTER TABLE public.dashboard_layouts ADD CONSTRAINT dashboard_layouts_user_id_key UNIQUE (user_id);