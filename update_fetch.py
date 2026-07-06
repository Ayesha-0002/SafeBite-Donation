import re

with open('src/pages/ngo/ManageVolunteers.tsx', 'r') as f:
    content = f.read()

# Replace the first `};` after fetchRequests
new_content = content.replace('    }\n  };\n\n  const handleAction', '    }\n  }, [user?.id]);\n\n  const handleAction')

with open('src/pages/ngo/ManageVolunteers.tsx', 'w') as f:
    f.write(new_content)
