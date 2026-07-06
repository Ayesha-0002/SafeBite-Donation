with open('src/pages/Auth.tsx', 'r') as f:
    content = f.read()

# Replace stage 3 with fetching user_id instead of id, and put it before the fallback in stage 2.

old_stage3 = '''        // Stage 3: Fetch pending/newly signed up NGOs from registration_requests so they appear immediately
        try {
          const { data: reqData, error: reqErr } = await supabase
            .from("registration_requests")
            .select("id, full_name, requested_role")
            .eq("requested_role", "ngo");
          
          if (reqErr) {
            console.error("Diagnostic: Error fetching NGO registration_requests:", reqErr);
          } else if (reqData) {
            console.log(`Diagnostic: registration_requests table returned ${reqData.length} NGO registration requests.`);
            reqData.forEach(r => {
              if (r.id && !resultMap.has(r.id)) {
                resultMap.set(r.id, r.full_name || "New Registered NGO");
              }
            });
          }
        } catch (reqCatchErr) {
          console.error("Diagnostic: Exception while fetching registration_requests:", reqCatchErr);
        }'''

content = content.replace(old_stage3, '''        // Stage 3: Fetch pending/newly signed up NGOs from registration_requests so they appear immediately
        try {
          const { data: reqData, error: reqErr } = await supabase
            .from("registration_requests")
            .select("user_id, full_name, requested_role")
            .eq("requested_role", "ngo");
          
          if (reqErr) {
            console.error("Diagnostic: Error fetching NGO registration_requests:", reqErr);
          } else if (reqData) {
            console.log(`Diagnostic: registration_requests table returned ${reqData.length} NGO registration requests.`);
            reqData.forEach(r => {
              if (r.user_id && (!resultMap.has(r.user_id) || resultMap.get(r.user_id)?.startsWith("Registered NGO #"))) {
                resultMap.set(r.user_id, r.full_name || "New Registered NGO");
              }
            });
          }
        } catch (reqCatchErr) {
          console.error("Diagnostic: Exception while fetching registration_requests:", reqCatchErr);
        }''')

with open('src/pages/Auth.tsx', 'w') as f:
    f.write(content)

