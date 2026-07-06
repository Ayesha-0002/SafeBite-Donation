const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
async function run() {
  const { data, error } = await supabase.from('food_donations').update({ dropoff_location: 'test' }).eq('id', 'dummy');
  console.log("Error:", error);
}
run();
