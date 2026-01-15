
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminUser() {
  console.log('Checking for admin user: admin@partfinder.com');
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  const admin = users.find(u => u.email === 'admin@partfinder.com');

  if (admin) {
    console.log('✅ Admin user FOUND.');
    console.log('ID:', admin.id);
    console.log('Confirmed At:', admin.email_confirmed_at);
    console.log('Last Sign In:', admin.last_sign_in_at);
  } else {
    console.log('❌ Admin user NOT found.');
    console.log('Existing users:', users.map(u => u.email));
  }
}

checkAdminUser();
