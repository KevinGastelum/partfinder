-- Insert seed data
insert into public.listings (title, price, service_fee, store, condition, image_url, link, year, make, model, part_name)
values
  ('2023 Toyota Camry Alternator', 120.00, 36.00, 'PartsGeek', 'New', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=600', '#', '2023', 'Toyota', 'Camry', 'Alternator'),
  ('OEM Toyota Camry Alternator (Refurbished)', 85.00, 25.50, 'eBay Motors', 'Refurbished', 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=600', '#', '2023', 'Toyota', 'Camry', 'Alternator'),
  ('High Performance Alternator 160A', 210.00, 63.00, 'Summit Racing', 'New', 'https://images.unsplash.com/photo-1624709585868-b769cb391753?auto=format&fit=crop&q=80&w=600', '#', '2023', 'Toyota', 'Camry', 'Alternator'),
  ('Used Alternator - Tested', 45.00, 13.50, 'Local Junkyard', 'Used', 'https://via.placeholder.com/300x200?text=Part', '#', '2023', 'Toyota', 'Camry', 'Alternator');
