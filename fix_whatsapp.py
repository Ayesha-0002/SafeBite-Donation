import os

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the function definition
    if 'const handleWhatsApp =' in content or 'const handleWhatsAppChat =' in content:
        # Check if the fix is already there
        if 'if (cleanPhone.startsWith("0"))' not in content:
            # We need to inject the fix
            import re
            content = re.sub(
                r'(const cleanPhone = phone\.replace\(/\\D/g, "";\))(.*?)(const message = |window\.open\()',
                r'\1\n    let formattedPhone = cleanPhone;\n    if (cleanPhone.startsWith("0")) {\n      formattedPhone = "92" + cleanPhone.substring(1);\n    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith("92")) {\n      formattedPhone = "92" + cleanPhone;\n    }\n    \3',
                content,
                flags=re.DOTALL
            )
            content = content.replace('${cleanPhone}', '${formattedPhone}')
            
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Fixed {filepath}")
            
fix_file('src/pages/donor/DonorDashboard.tsx')
fix_file('src/pages/ngo/NgoDashboard.tsx')
fix_file('src/pages/volunteer/VolunteerDashboard.tsx')
fix_file('src/pages/volunteer/LiveTracking.tsx')
