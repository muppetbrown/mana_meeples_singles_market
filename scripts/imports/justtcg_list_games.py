import os
import json
import requests

# --- CONFIG ---
API_KEY = "tcg_887123715b7241a4a46126c96d3fff80"  # Replace with env var later

if not API_KEY or "YOUR_API_KEY_HERE" in API_KEY:
    raise RuntimeError("❗ Set JUSTTCG_API_KEY env var or replace YOUR_API_KEY_HERE in script")

# --- REQUEST ---
url = "https://api.justtcg.com/v1/sets?game=pokemon"
headers = {
    "x-api-key": API_KEY,
    "Accept": "application/json",
}

response = requests.get(url, headers=headers, timeout=10)
response.raise_for_status()

data = response.json()  # expected: {"data": [...]}

# --- SIMPLE/CLEAN LIST OUTPUT ---
sets = data.get("data", [])

simple_list = [
    {
        "id": s.get("id"),
        "name": s.get("name"),
        "variants_count": s.get("variants_count"),
        "cards_count": s.get("cards_count"),
    }
    for s in sets
]

# --- SAVE TO FILE ---
output_file = "pokemon_sets.json"

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(simple_list, f, indent=2, ensure_ascii=False)

print(f"✅ Saved {len(simple_list)} sets to {output_file}")
