with open('src/pages/ngo/NgoDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace('''  const sortedVolunteers = [...volunteers]
    .filter(v => v.is_approved === true && v.ngo_id === currentNgoId)
    .sort((a, b) => {''', '''  const sortedVolunteers = [...volunteers]
    .filter(v => v.statusLabel === "Approved Rider" || v.is_approved === true || v.ngo_id === currentNgoId || v.statusLabel === "Available Rider")
    .sort((a, b) => {''')

with open('src/pages/ngo/NgoDashboard.tsx', 'w') as f:
    f.write(content)
