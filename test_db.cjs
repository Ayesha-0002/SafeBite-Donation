const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('food_donations').select('*').eq('id', 'ca0034fa-ca20-4567-accd-215b42fc853b');
  console.log(JSON.stringify(data, null, 2));
}
run();
