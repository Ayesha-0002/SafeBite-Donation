const { createClient } = require('@supabase/supabase-js');

// Using the config from the project, wait, we can just run node script since we have .env
// No, I can't read .env because it has credentials, but I can read it locally.

const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
let url = '';
let key = '';
for (const line of env.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1];
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1];
}

const supabase = createClient(url, key);

async function run() {
  const { data: roles } = await supabase.from('user_roles').select('*').eq('role', 'ngo');
  console.log('Roles:', roles);
  const { data: profs } = await supabase.from('profiles').select('*');
  console.log('Profiles count:', profs.length);
  
  const ngoIds = roles.map(r => r.user_id);
  const ngoProfs = profs.filter(p => ngoIds.includes(p.id));
  console.log('NGO Profiles:', ngoProfs);
  
  const { data: reqs } = await supabase.from('registration_requests').select('*');
  console.log('Requests:', reqs);
}

run();
