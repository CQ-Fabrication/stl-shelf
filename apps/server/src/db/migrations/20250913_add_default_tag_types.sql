-- Insert default tag types
INSERT INTO tag_types (name, description) 
VALUES 
  ('category', 'Model categorization tags (fantasy, dragon, 28mm)'),
  ('attribute', 'Version-specific attributes (supports-added, hollowed, resin-ready)')
ON CONFLICT (name) DO NOTHING;