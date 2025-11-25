import os
import json
import requests

# --- CONFIG ---
# Prefer env var, but fall back to the hard-coded key you used.
API_KEY = os.getenv("JUSTTCG_API_KEY", "tcg_887123715b7241a4a46126c96d3fff80")

if not API_KEY or API_KEY.startswith("YOUR_"):
    raise RuntimeError("❗ Set JUSTTCG_API_KEY env var or update API_KEY in this script")

BASE_URL = "https://api.justtcg.com/v1"

GAME_ID = "pokemon"
SET_ID = "sv-black-bolt-pokemon"   # from your sets output
CARD_NUMBER = "1"  
CONDITION = "NM"                # JustTCG card numbers are strings

OUTPUT_FILE = f"pokemon_{SET_ID}_card_{CARD_NUMBER}_variants.json"

headers = {
    "x-api-key": API_KEY,
    "Accept": "application/json",
}

# --- FETCH CARDS FOR THE SET ---
# Assumption: limit=400 is enough to cover all 332 cards in the set.
# If this ever hits a pagination limit, we can extend this later to loop with offset.
params = {
    "game": GAME_ID,
    "set": SET_ID,
    "limit": 20,
    "condition": CONDITION,
    "q": "Snivy",
}

print(f"Requesting cards for game={GAME_ID}, set={SET_ID} ...")
resp = requests.get(f"{BASE_URL}/cards", headers=headers, params=params, timeout=20)
resp.raise_for_status()
body = resp.json()

cards = body.get("data", [])
if not isinstance(cards, list):
    raise RuntimeError(f"Unexpected response shape: {body}")

# --- FLATTEN VARIANTS: ONE OBJECT PER VARIANT ---
flat_variants = []

for card in cards:
    base = {
        "card_id": card.get("id"),
        "name": card.get("name"),
        "game": card.get("game"),
        "set_id": card.get("set"),
        "set_name": card.get("set_name"),
        "number": card.get("number"),
        "rarity": card.get("rarity"),
        "details": card.get("details"),
        "tcgplayerId": card.get("tcgplayerId"),
        "mtgjsonId": card.get("mtgjsonId"),
        "scryfallId": card.get("scryfallId"),
    }

    for v in (card.get("variants") or []):
        flat_variants.append({
            **base,
            "variant_id": v.get("id"),
            "condition": v.get("condition"),
            "printing": v.get("printing"),
            "language": v.get("language"),
            "tcgplayerSkuId": v.get("tcgplayerSkuId"),
            "price": v.get("price"),
            "lastUpdated": v.get("lastUpdated"),
            "priceChange24hr": v.get("priceChange24hr"),
            "priceChange7d": v.get("priceChange7d"),
            "avgPrice": v.get("avgPrice"),
            # add more variant fields here if you want (30d/90d stats etc.)
        })

print(f"Flattened to {len(flat_variants)} variant object(s).")

# --- WRITE TO JSON FILE ---
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(flat_variants, f, indent=2, ensure_ascii=False)

print(f"✅ Wrote {len(flat_variants)} variants for card #{CARD_NUMBER} in set {SET_ID} to:")
print(f"   {OUTPUT_FILE}")
