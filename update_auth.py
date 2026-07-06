with open('src/pages/Auth.tsx', 'r') as f:
    content = f.read()

content = content.replace('''              const isNgoName = nameLower.includes("ngo") || 
                               nameLower.includes("welfare") || 
                               nameLower.includes("foundation") || 
                               nameLower.includes("trust") || 
                               nameLower.includes("charity") ||
                               nameLower.includes("association");
              if (r === "ngo" || isNgoName) {
                resultMap.set(p.id, p.full_name || (p as any).name || "Unnamed NGO");
              }''', '''              if (r === "ngo") {
                resultMap.set(p.id, p.full_name || (p as any).name || "Unnamed NGO");
              }''')

with open('src/pages/Auth.tsx', 'w') as f:
    f.write(content)
