
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const mockData = [
    {
      title: '2023 Toyota Camry Alternator',
      price: 120.00,
      service_fee: 36.00,
      store: 'PartsGeek',
      condition: 'New',
      image_url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=600',
      link: '#',
      year: '2023',
      make: 'Toyota',
      model: 'Camry',
      part_name: 'Alternator'
    },
    {
      title: 'OEM Toyota Camry Alternator (Refurbished)',
      price: 85.00,
      service_fee: 25.50,
      store: 'eBay Motors',
      condition: 'Refurbished',
      image_url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=600',
      link: '#',
      year: '2023',
      make: 'Toyota',
      model: 'Camry',
      part_name: 'Alternator'
    },
    {
      title: 'High Performance Alternator 160A',
      price: 210.00,
      service_fee: 63.00,
      store: 'Summit Racing',
      condition: 'New',
      image_url: 'https://images.unsplash.com/photo-1624709585868-b769cb391753?auto=format&fit=crop&q=80&w=600',
      link: '#',
      year: '2023',
      make: 'Toyota',
      model: 'Camry',
      part_name: 'Alternator'
    },
    {
      title: 'Used Alternator - Tested',
      price: 45.00,
      service_fee: 13.50,
      store: 'Local Junkyard',
      condition: 'Used',
      image_url: 'https://via.placeholder.com/300x200?text=Part',
      link: '#',
      year: '2023',
      make: 'Toyota',
      model: 'Camry',
      part_name: 'Alternator'
    }
];

async function seed() {
  console.log('Seeding database...');
  
  const { data, error } = await supabase
    .from('listings')
    .insert(mockData)
    .select();

  if (error) {
    console.error('Error seeding data:', error);
  } else {
    console.log(`Successfully inserted ${data.length} rows!`);
  }
}

seed();
