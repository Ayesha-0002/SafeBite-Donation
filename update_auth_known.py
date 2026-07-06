with open('src/pages/Auth.tsx', 'r') as f:
    content = f.read()

content = content.replace('''              // Self-heal: For any registered NGO whose profile was not created, assign the known name or a fallback
              missingIds.forEach(id => {
                if (!resultMap.has(id)) {
                  resultMap.set(id, KNOWN_NGOS[id] || `Registered NGO #${id.substring(0, 4)}`);
                }
              });''', '''              // Self-heal: For any registered NGO whose profile was not created, assign the known name or a fallback
              missingIds.forEach(id => {
                if (!resultMap.has(id)) {
                  resultMap.set(id, `Registered NGO #${id.substring(0, 4)}`);
                }
              });''')

content = content.replace('''        const KNOWN_NGOS: Record<string, string> = {
          '25f2c60b-aa69-4d8b-a774-d8a8d3e48946': 'Edhi Foundation',
          '40504155-3945-4da2-9d70-49a572f693a1': 'Saylani Welfare Trust',
          'bb4198f6-f050-4f5d-91ed-932416030f0f': 'Al-Khidmat Foundation',
          '2f2d41e5-ba4e-4ece-8a67-a69fcfc5a365': 'Chhipa Welfare Association'
        };''', '')

with open('src/pages/Auth.tsx', 'w') as f:
    f.write(content)
