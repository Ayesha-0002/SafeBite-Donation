with open("src/pages/volunteer/LiveTracking.tsx", "r") as f:
    content = f.read()

old_dropoff_text = """<p className="text-xs text-muted-foreground font-body leading-relaxed max-w-[250px]">{(ngo && ngo.address) ? `${ngo.full_name}, ${ngo.address}` : ngo?.full_name ? ngo.full_name : "Not specified"}</p>"""
new_dropoff_text = """<p className="text-xs text-muted-foreground font-body leading-relaxed max-w-[250px]">{donation?.dropoff_location || ((ngo && ngo.address) ? `${ngo.full_name}, ${ngo.address}` : ngo?.full_name ? ngo.full_name : "Not specified")}</p>"""

content = content.replace(old_dropoff_text, new_dropoff_text)

with open("src/pages/volunteer/LiveTracking.tsx", "w") as f:
    f.write(content)
