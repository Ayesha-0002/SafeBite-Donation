import re

with open("src/pages/volunteer/LiveTracking.tsx", "r") as f:
    content = f.read()

# Fix the select query
old_query = '.select("title, location, donor_id, ngo_verified_by, status")'
new_query = '.select("title, location, dropoff_location, donor_id, ngo_verified_by, status")'
content = content.replace(old_query, new_query)

# Fix status text
old_status_text = '<p className="text-sm font-bold text-primary">{status === "arrived" ? "At Pickup 📍" : status === "arrived-dropoff" || status === "photo-proof" ? "At Drop-off 📍" : "En Route 🚗"}</p>'
new_status_text = '<p className="text-sm font-bold text-primary">{status === "not-started" ? "Not Started" : status === "en-route" ? "En Route to Pickup 🚗" : status === "arrived" ? "At Pickup 📍" : status === "in-transit" ? "En Route to Drop-off 🚗" : status === "arrived-dropoff" || status === "photo-proof" || status === "signature" ? "At Drop-off 📍" : "Delivered ✅"}</p>'
content = content.replace(old_status_text, new_status_text)

with open("src/pages/volunteer/LiveTracking.tsx", "w") as f:
    f.write(content)
