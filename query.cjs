const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('profiles').select('*');
  console.log('Profiles:', data);
  const { data: roles } = await supabase.from('user_roles').select('*');
  console.log('Roles:', roles);
  const { data: reqs } = await supabase.from('registration_requests').select('*');
  console.log('Reqs:', reqs);
}
run();
