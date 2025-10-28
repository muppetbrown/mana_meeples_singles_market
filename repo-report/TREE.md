```
mana_meeples_singles_market
├── .git/
├── .github/
├── .vscode/
├── apps/
│ ├── api/
│ │ ├── scripts/
│ │ │ └── print-coverage-summary.mjs
│ │ ├── src/
│ │ │ ├── lib/
│ │ │ │ ├── authUtils.ts
│ │ │ │ ├── db.ts
│ │ │ │ ├── env.ts
│ │ │ │ └── logger.ts
│ │ │ ├── middleware/
│ │ │ │ ├── auth.ts
│ │ │ │ ├── error.ts
│ │ │ │ ├── rateLimit.ts
│ │ │ │ ├── requestLog.ts
│ │ │ │ └── securityHeaders.ts
│ │ │ ├── routes/
│ │ │ │ ├── additional.ts
│ │ │ │ ├── auth.ts
│ │ │ │ ├── cards.ts
│ │ │ │ ├── index.ts
│ │ │ │ ├── inventory.ts
│ │ │ │ ├── orders.ts
│ │ │ │ ├── storefront.ts
│ │ │ │ └── variations.ts
│ │ │ ├── services/
│ │ │ │ ├── emailService.ts
│ │ │ │ └── variationAnalysis.ts
│ │ │ ├── types/
│ │ │ │ └── express.d.ts
│ │ │ ├── utils/
│ │ │ │ └── strings.ts
│ │ │ ├── app.ts
│ │ │ ├── index.ts
│ │ │ └── server.ts
│ │ ├── test-logs/
│ │ │ ├── test-env-1761092727187.json
│ │ │ ├── test-env-1761092727187.txt
│ │ │ ├── test-env-1761092727198.json
│ │ │ ├── test-env-1761092727198.txt
│ │ │ ├── test-env-1761092727199.json
│ │ │ ├── test-env-1761092727199.txt
│ │ │ ├── test-env-1761092727200.json
│ │ │ ├── test-env-1761092727200.txt
│ │ │ ├── test-env-1761092727207.json
│ │ │ ├── test-env-1761092727207.txt
│ │ │ ├── test-env-1761092727209.json
│ │ │ ├── test-env-1761092727209.txt
│ │ │ ├── test-env-1761092727336.json
│ │ │ ├── test-env-1761092727336.txt
│ │ │ ├── test-env-1761095979787.json
│ │ │ ├── test-env-1761095979787.txt
│ │ │ ├── test-env-1761095979788.json
│ │ │ ├── test-env-1761095979788.txt
│ │ │ ├── test-env-1761095979792.json
│ │ │ ├── test-env-1761095979792.txt
│ │ │ ├── test-env-1761095979796.json
│ │ │ ├── test-env-1761095979796.txt
│ │ │ ├── test-env-1761095979798.json
│ │ │ ├── test-env-1761095979798.txt
│ │ │ ├── test-env-1761095979802.json
│ │ │ ├── test-env-1761095979802.txt
│ │ │ ├── test-env-1761154530372.json
│ │ │ ├── test-env-1761154530372.txt
│ │ │ ├── test-env-1761154530373.json
│ │ │ ├── test-env-1761154530373.txt
│ │ │ ├── test-env-1761154530374.json
│ │ │ ├── test-env-1761154530374.txt
│ │ │ ├── test-env-1761154530375.json
│ │ │ ├── test-env-1761154530375.txt
│ │ │ ├── test-env-1761155232222.json
│ │ │ ├── test-env-1761155232222.txt
│ │ │ ├── test-env-1761155232224.json
│ │ │ ├── test-env-1761155232224.txt
│ │ │ ├── test-env-1761155232227.json
│ │ │ ├── test-env-1761155232227.txt
│ │ │ ├── test-env-1761155232228.json
│ │ │ ├── test-env-1761155232228.txt
│ │ │ ├── test-env-1761155232240.json
│ │ │ ├── test-env-1761155232240.txt
│ │ │ ├── test-env-1761155232241.json
│ │ │ ├── test-env-1761155232241.txt
│ │ │ ├── test-env-1761155232242.json
│ │ │ ├── test-env-1761155232242.txt
│ │ │ ├── test-env-1761155512904.json
│ │ │ ├── test-env-1761155512904.txt
│ │ │ ├── test-env-1761155512926.json
│ │ │ ├── test-env-1761155512926.txt
│ │ │ ├── test-env-1761155512989.json
│ │ │ ├── test-env-1761155512989.txt
│ │ │ ├── test-env-1761155513011.json
│ │ │ ├── test-env-1761155513011.txt
│ │ │ ├── test-env-1761155513126.json
│ │ │ ├── test-env-1761155513126.txt
│ │ │ ├── test-env-1761155513155.json
│ │ │ ├── test-env-1761155513155.txt
│ │ │ ├── test-env-1761155513164.json
│ │ │ ├── test-env-1761155513164.txt
│ │ │ ├── test-env-1761155546156.json
│ │ │ ├── test-env-1761155546156.txt
│ │ │ ├── test-env-1761155546247.json
│ │ │ ├── test-env-1761155546247.txt
│ │ │ ├── test-env-1761155546298.json
│ │ │ ├── test-env-1761155546298.txt
│ │ │ ├── test-env-1761155546306.json
│ │ │ ├── test-env-1761155546306.txt
│ │ │ ├── test-env-1761155546315.json
│ │ │ ├── test-env-1761155546315.txt
│ │ │ ├── test-env-1761155546317.json
│ │ │ ├── test-env-1761155546317.txt
│ │ │ ├── test-env-1761155546342.json
│ │ │ ├── test-env-1761155546342.txt
│ │ │ ├── test-env-1761155562503.json
│ │ │ ├── test-env-1761155562503.txt
│ │ │ ├── test-env-1761155562634.json
│ │ │ ├── test-env-1761155562634.txt
│ │ │ ├── test-env-1761155562635.json
│ │ │ ├── test-env-1761155562635.txt
│ │ │ ├── test-env-1761155562636.json
│ │ │ ├── test-env-1761155562636.txt
│ │ │ ├── test-env-1761155562644.json
│ │ │ ├── test-env-1761155562644.txt
│ │ │ ├── test-env-1761155562681.json
│ │ │ ├── test-env-1761155562681.txt
│ │ │ ├── test-env-1761155668223.json
│ │ │ ├── test-env-1761155668223.txt
│ │ │ ├── test-env-1761155668235.json
│ │ │ ├── test-env-1761155668235.txt
│ │ │ ├── test-env-1761155668236.json
│ │ │ ├── test-env-1761155668236.txt
│ │ │ ├── test-env-1761155668240.json
│ │ │ ├── test-env-1761155668240.txt
│ │ │ ├── test-env-1761155668246.json
│ │ │ ├── test-env-1761155668246.txt
│ │ │ ├── test-env-1761155668249.json
│ │ │ ├── test-env-1761155668249.txt
│ │ │ ├── test-env-1761155668255.json
│ │ │ ├── test-env-1761155668255.txt
│ │ │ ├── test-env-1761155985240.json
│ │ │ ├── test-env-1761155985240.txt
│ │ │ ├── test-env-1761155985244.json
│ │ │ ├── test-env-1761155985244.txt
│ │ │ ├── test-env-1761155985249.json
│ │ │ ├── test-env-1761155985249.txt
│ │ │ ├── test-env-1761155985255.json
│ │ │ ├── test-env-1761155985255.txt
│ │ │ ├── test-env-1761155985258.json
│ │ │ ├── test-env-1761155985258.txt
│ │ │ ├── test-env-1761155985265.json
│ │ │ ├── test-env-1761155985265.txt
│ │ │ ├── test-env-1761156013978.json
│ │ │ ├── test-env-1761156013978.txt
│ │ │ ├── test-env-1761156013986.json
│ │ │ ├── test-env-1761156013986.txt
│ │ │ ├── test-env-1761156013993.json
│ │ │ ├── test-env-1761156013993.txt
│ │ │ ├── test-env-1761156013996.json
│ │ │ ├── test-env-1761156013996.txt
│ │ │ ├── test-env-1761156014003.json
│ │ │ ├── test-env-1761156014003.txt
│ │ │ ├── test-env-1761156014005.json
│ │ │ ├── test-env-1761156014005.txt
│ │ │ ├── test-env-1761156014011.json
│ │ │ ├── test-env-1761156014011.txt
│ │ │ ├── test-env-1761156282077.json
│ │ │ ├── test-env-1761156282077.txt
│ │ │ ├── test-env-1761156282079.json
│ │ │ ├── test-env-1761156282079.txt
│ │ │ ├── test-env-1761156282084.json
│ │ │ ├── test-env-1761156282084.txt
│ │ │ ├── test-env-1761156282085.json
│ │ │ ├── test-env-1761156282085.txt
│ │ │ ├── test-env-1761156282093.json
│ │ │ ├── test-env-1761156282093.txt
│ │ │ ├── test-env-1761156282100.json
│ │ │ ├── test-env-1761156282100.txt
│ │ │ ├── test-env-1761156311431.json
│ │ │ ├── test-env-1761156311431.txt
│ │ │ ├── test-env-1761156311435.json
│ │ │ ├── test-env-1761156311435.txt
│ │ │ ├── test-env-1761156311441.json
│ │ │ ├── test-env-1761156311441.txt
│ │ │ ├── test-env-1761156311448.json
│ │ │ ├── test-env-1761156311448.txt
│ │ │ ├── test-env-1761156311451.json
│ │ │ ├── test-env-1761156311451.txt
│ │ │ ├── test-env-1761156311456.json
│ │ │ ├── test-env-1761156311456.txt
│ │ │ ├── test-env-1761156311463.json
│ │ │ ├── test-env-1761156311463.txt
│ │ │ ├── test-env-1761156341241.json
│ │ │ ├── test-env-1761156341241.txt
│ │ │ ├── test-env-1761156341245.json
│ │ │ ├── test-env-1761156341245.txt
│ │ │ ├── test-env-1761156341250.json
│ │ │ ├── test-env-1761156341250.txt
│ │ │ ├── test-env-1761156341252.json
│ │ │ ├── test-env-1761156341252.txt
│ │ │ ├── test-env-1761157018641.json
│ │ │ ├── test-env-1761157018641.txt
│ │ │ ├── test-env-1761157018643.json
│ │ │ ├── test-env-1761157018643.txt
│ │ │ ├── test-env-1761157018647.json
│ │ │ ├── test-env-1761157018647.txt
│ │ │ ├── test-env-1761157018651.json
│ │ │ ├── test-env-1761157018651.txt
│ │ │ ├── test-env-1761157018652.json
│ │ │ ├── test-env-1761157018652.txt
│ │ │ ├── test-env-1761157018655.json
│ │ │ ├── test-env-1761157018655.txt
│ │ │ ├── test-env-1761157018657.json
│ │ │ ├── test-env-1761157018657.txt
│ │ │ ├── test-env-1761157076083.json
│ │ │ ├── test-env-1761157076083.txt
│ │ │ ├── test-env-1761157076095.json
│ │ │ ├── test-env-1761157076095.txt
│ │ │ ├── test-env-1761157076096.json
│ │ │ ├── test-env-1761157076096.txt
│ │ │ ├── test-env-1761157076099.json
│ │ │ ├── test-env-1761157076099.txt
│ │ │ ├── test-env-1761157076100.json
│ │ │ ├── test-env-1761157076100.txt
│ │ │ ├── test-env-1761157076104.json
│ │ │ ├── test-env-1761157076104.txt
│ │ │ ├── test-env-1761157076111.json
│ │ │ ├── test-env-1761157076111.txt
│ │ │ ├── test-env-1761157111074.json
│ │ │ ├── test-env-1761157111074.txt
│ │ │ ├── test-env-1761157111079.json
│ │ │ ├── test-env-1761157111079.txt
│ │ │ ├── test-env-1761157111081.json
│ │ │ ├── test-env-1761157111081.txt
│ │ │ ├── test-env-1761157111083.json
│ │ │ ├── test-env-1761157111083.txt
│ │ │ ├── test-env-1761157111084.json
│ │ │ ├── test-env-1761157111084.txt
│ │ │ ├── test-env-1761157111085.json
│ │ │ ├── test-env-1761157111085.txt
│ │ │ ├── test-env-1761157111095.json
│ │ │ ├── test-env-1761157111095.txt
│ │ │ ├── test-env-1761157694560.json
│ │ │ ├── test-env-1761157694560.txt
│ │ │ ├── test-env-1761157694561.json
│ │ │ ├── test-env-1761157694561.txt
│ │ │ ├── test-env-1761157694573.json
│ │ │ ├── test-env-1761157694573.txt
│ │ │ ├── test-env-1761157694574.json
│ │ │ ├── test-env-1761157694574.txt
│ │ │ ├── test-env-1761157694576.json
│ │ │ ├── test-env-1761157694576.txt
│ │ │ ├── test-env-1761159453687.json
│ │ │ ├── test-env-1761159453687.txt
│ │ │ ├── test-env-1761159453689.json
│ │ │ ├── test-env-1761159453689.txt
│ │ │ ├── test-env-1761159453691.json
│ │ │ ├── test-env-1761159453691.txt
│ │ │ ├── test-env-1761159453692.json
│ │ │ ├── test-env-1761159453692.txt
│ │ │ ├── test-env-1761159453696.json
│ │ │ ├── test-env-1761159453696.txt
│ │ │ ├── test-env-1761161227657.json
│ │ │ ├── test-env-1761161227657.txt
│ │ │ ├── test-env-1761161227658.json
│ │ │ ├── test-env-1761161227658.txt
│ │ │ ├── test-env-1761161227661.json
│ │ │ ├── test-env-1761161227661.txt
│ │ │ ├── test-env-1761161227664.json
│ │ │ ├── test-env-1761161227664.txt
│ │ │ ├── test-env-1761161227667.json
│ │ │ ├── test-env-1761161227667.txt
│ │ │ ├── test-env-1761161227675.json
│ │ │ ├── test-env-1761161227675.txt
│ │ │ ├── test-env-1761161313863.json
│ │ │ ├── test-env-1761161313863.txt
│ │ │ ├── test-env-1761161313864.json
│ │ │ ├── test-env-1761161313864.txt
│ │ │ ├── test-env-1761161313878.json
│ │ │ ├── test-env-1761161313878.txt
│ │ │ ├── test-env-1761161313880.json
│ │ │ ├── test-env-1761161313880.txt
│ │ │ ├── test-env-1761161313892.json
│ │ │ ├── test-env-1761161313892.txt
│ │ │ ├── test-env-1761161663494.json
│ │ │ ├── test-env-1761161663494.txt
│ │ │ ├── test-env-1761161663497.json
│ │ │ ├── test-env-1761161663497.txt
│ │ │ ├── test-env-1761161663498.json
│ │ │ ├── test-env-1761161663498.txt
│ │ │ ├── test-env-1761161663500.json
│ │ │ ├── test-env-1761161663500.txt
│ │ │ ├── test-env-1761161663504.json
│ │ │ ├── test-env-1761161663504.txt
│ │ │ ├── test-env-1761161663507.json
│ │ │ ├── test-env-1761161663507.txt
│ │ │ ├── test-env-1761161663511.json
│ │ │ ├── test-env-1761161663511.txt
│ │ │ ├── test-env-1761161871283.json
│ │ │ ├── test-env-1761161871283.txt
│ │ │ ├── test-env-1761161871286.json
│ │ │ ├── test-env-1761161871286.txt
│ │ │ ├── test-env-1761161871292.json
│ │ │ ├── test-env-1761161871292.txt
│ │ │ ├── test-env-1761161871295.json
│ │ │ ├── test-env-1761161871295.txt
│ │ │ ├── test-env-1761161871303.json
│ │ │ ├── test-env-1761161871303.txt
│ │ │ ├── test-env-1761161871308.json
│ │ │ ├── test-env-1761161871308.txt
│ │ │ ├── test-env-1761161908797.json
│ │ │ ├── test-env-1761161908797.txt
│ │ │ ├── test-env-1761161908798.json
│ │ │ ├── test-env-1761161908798.txt
│ │ │ ├── test-env-1761161908801.json
│ │ │ ├── test-env-1761161908801.txt
│ │ │ ├── test-env-1761161908803.json
│ │ │ ├── test-env-1761161908803.txt
│ │ │ ├── test-env-1761161908806.json
│ │ │ ├── test-env-1761161908806.txt
│ │ │ ├── test-env-1761183664725.json
│ │ │ ├── test-env-1761183664725.txt
│ │ │ ├── test-env-1761183664726.json
│ │ │ ├── test-env-1761183664726.txt
│ │ │ ├── test-env-1761183664727.json
│ │ │ ├── test-env-1761183664727.txt
│ │ │ ├── test-env-1761183664740.json
│ │ │ ├── test-env-1761183664740.txt
│ │ │ ├── test-env-1761186438308.json
│ │ │ ├── test-env-1761186438308.txt
│ │ │ ├── test-env-1761186438314.json
│ │ │ ├── test-env-1761186438314.txt
│ │ │ ├── test-env-1761186438317.json
│ │ │ ├── test-env-1761186438317.txt
│ │ │ ├── test-env-1761186438321.json
│ │ │ ├── test-env-1761186438321.txt
│ │ │ ├── test-env-1761186438325.json
│ │ │ ├── test-env-1761186438325.txt
│ │ │ ├── test-env-1761186438326.json
│ │ │ ├── test-env-1761186438326.txt
│ │ │ ├── test-env-1761186477446.json
│ │ │ ├── test-env-1761186477446.txt
│ │ │ ├── test-env-1761186477447.json
│ │ │ ├── test-env-1761186477447.txt
│ │ │ ├── test-env-1761186477449.json
│ │ │ ├── test-env-1761186477449.txt
│ │ │ ├── test-env-1761186477453.json
│ │ │ ├── test-env-1761186477453.txt
│ │ │ ├── test-env-1761186477459.json
│ │ │ ├── test-env-1761186477459.txt
│ │ │ ├── test-env-1761186477460.json
│ │ │ ├── test-env-1761186477460.txt
│ │ │ ├── test-env-1761186477461.json
│ │ │ ├── test-env-1761186477461.txt
│ │ │ ├── test-env-1761186589581.json
│ │ │ ├── test-env-1761186589581.txt
│ │ │ ├── test-env-1761186589583.json
│ │ │ ├── test-env-1761186589583.txt
│ │ │ ├── test-env-1761186589586.json
│ │ │ ├── test-env-1761186589586.txt
│ │ │ ├── test-env-1761186589587.json
│ │ │ ├── test-env-1761186589587.txt
│ │ │ ├── test-env-1761186589593.json
│ │ │ ├── test-env-1761186589593.txt
│ │ │ ├── test-env-1761186589594.json
│ │ │ ├── test-env-1761186589594.txt
│ │ │ ├── test-env-1761186710030.json
│ │ │ ├── test-env-1761186710030.txt
│ │ │ ├── test-env-1761186710034.json
│ │ │ ├── test-env-1761186710034.txt
│ │ │ ├── test-env-1761186710039.json
│ │ │ ├── test-env-1761186710039.txt
│ │ │ ├── test-env-1761186710044.json
│ │ │ ├── test-env-1761186710044.txt
│ │ │ ├── test-env-1761186710046.json
│ │ │ ├── test-env-1761186710046.txt
│ │ │ ├── test-env-1761186710052.json
│ │ │ ├── test-env-1761186710052.txt
│ │ │ ├── test-env-1761186740189.json
│ │ │ ├── test-env-1761186740189.txt
│ │ │ ├── test-env-1761186740192.json
│ │ │ ├── test-env-1761186740192.txt
│ │ │ ├── test-env-1761186740197.json
│ │ │ ├── test-env-1761186740197.txt
│ │ │ ├── test-env-1761186740200.json
│ │ │ ├── test-env-1761186740200.txt
│ │ │ ├── test-env-1761186740205.json
│ │ │ ├── test-env-1761186740205.txt
│ │ │ ├── test-env-1761186740206.json
│ │ │ ├── test-env-1761186740206.txt
│ │ │ ├── test-env-1761186740210.json
│ │ │ ├── test-env-1761186740210.txt
│ │ │ ├── test-env-1761186848691.json
│ │ │ ├── test-env-1761186848691.txt
│ │ │ ├── test-env-1761186848692.json
│ │ │ ├── test-env-1761186848692.txt
│ │ │ ├── test-env-1761186848706.json
│ │ │ ├── test-env-1761186848706.txt
│ │ │ ├── test-env-1761186848707.json
│ │ │ ├── test-env-1761186848707.txt
│ │ │ ├── test-env-1761186848715.json
│ │ │ ├── test-env-1761186848715.txt
│ │ │ ├── test-env-1761186885666.json
│ │ │ ├── test-env-1761186885666.txt
│ │ │ ├── test-env-1761186885667.json
│ │ │ ├── test-env-1761186885667.txt
│ │ │ ├── test-env-1761186885668.json
│ │ │ ├── test-env-1761186885668.txt
│ │ │ ├── test-env-1761186885670.json
│ │ │ ├── test-env-1761186885670.txt
│ │ │ ├── test-env-1761186885684.json
│ │ │ ├── test-env-1761186885684.txt
│ │ │ ├── test-env-1761186885689.json
│ │ │ ├── test-env-1761186885689.txt
│ │ │ ├── test-env-1761187200890.json
│ │ │ ├── test-env-1761187200890.txt
│ │ │ ├── test-env-1761187200894.json
│ │ │ ├── test-env-1761187200894.txt
│ │ │ ├── test-env-1761187200896.json
│ │ │ ├── test-env-1761187200896.txt
│ │ │ ├── test-env-1761187200900.json
│ │ │ ├── test-env-1761187200900.txt
│ │ │ ├── test-env-1761187200901.json
│ │ │ ├── test-env-1761187200901.txt
│ │ │ ├── test-env-1761187200908.json
│ │ │ ├── test-env-1761187200908.txt
│ │ │ ├── test-env-1761187200909.json
│ │ │ ├── test-env-1761187200909.txt
│ │ │ ├── test-env-1761187569448.json
│ │ │ ├── test-env-1761187569448.txt
│ │ │ ├── test-env-1761187569449.json
│ │ │ ├── test-env-1761187569449.txt
│ │ │ ├── test-env-1761187569458.json
│ │ │ ├── test-env-1761187569458.txt
│ │ │ ├── test-env-1761187569459.json
│ │ │ ├── test-env-1761187569459.txt
│ │ │ ├── test-env-1761187766320.json
│ │ │ ├── test-env-1761187766320.txt
│ │ │ ├── test-env-1761187766333.json
│ │ │ ├── test-env-1761187766333.txt
│ │ │ ├── test-env-1761187766336.json
│ │ │ ├── test-env-1761187766336.txt
│ │ │ ├── test-env-1761187766337.json
│ │ │ ├── test-env-1761187766337.txt
│ │ │ ├── test-env-1761187766344.json
│ │ │ ├── test-env-1761187766344.txt
│ │ │ ├── test-env-1761187800604.json
│ │ │ ├── test-env-1761187800604.txt
│ │ │ ├── test-env-1761187800618.json
│ │ │ ├── test-env-1761187800618.txt
│ │ │ ├── test-env-1761187800620.json
│ │ │ ├── test-env-1761187800620.txt
│ │ │ ├── test-env-1761187800621.json
│ │ │ ├── test-env-1761187800621.txt
│ │ │ ├── test-env-1761187800626.json
│ │ │ └── test-env-1761187800626.txt
│ │ ├── tests/
│ │ │ ├── e2e/
│ │ │ │ └── checkout.flow.test.ts
│ │ │ ├── integration/
│ │ │ │ ├── auth.routes.test.ts
│ │ │ │ ├── cards.search.test.ts
│ │ │ │ ├── error-handling.test.ts
│ │ │ │ ├── inventory.routes.test.ts
│ │ │ │ ├── orders.routes.test.ts
│ │ │ │ └── storefront.routes.test.ts
│ │ │ ├── setup/
│ │ │ │ ├── db.ts
│ │ │ │ └── testEnv.ts
│ │ │ ├── unit/
│ │ │ │ ├── auth.validateCredentials.test.ts
│ │ │ │ ├── slugify.test.ts
│ │ │ │ ├── utils.test.ts
│ │ │ │ └── validation.test.ts
│ │ │ ├── testEmail.js
│ │ │ └── testresults.txt
│ │ ├── .env
│ │ ├── .env.example
│ │ ├── .tsbuildinfo
│ │ ├── package-lock.json
│ │ ├── package.json
│ │ ├── tsconfig.build.json
│ │ ├── tsconfig.json
│ │ ├── tsconfig.typecheck.json
│ │ └── vitest.config.ts
│ └── web/
│  ├── public/
│  │ ├── images/
│  │ │ ├── card-back-placeholder.jpg
│  │ │ └── card-back-placeholder.svg
│  │ ├── mana_meeples_logo_192.png
│  │ ├── mana_meeples_logo_512.png
│  │ ├── mana_meeples_logo.ico
│  │ ├── manifest.webmanifest
│  │ ├── robots.txt
│  │ └── static.json
│  ├── src/
│  │ ├── a11y/
│  │ │ └── Announcer.tsx
│  │ ├── features/
│  │ │ ├── admin/
│  │ │ │ ├── components/
│  │ │ │ │ ├── Analytics/
│  │ │ │ │ │ └── AnalyticsTab.tsx
│  │ │ │ │ ├── Cards/
│  │ │ │ │ │ ├── AddToInventoryModal.tsx
│  │ │ │ │ │ ├── BulkManager.tsx
│  │ │ │ │ │ └── CardsTab.tsx
│  │ │ │ │ └── Orders/
│  │ │ │ │  └── OrdersTab.tsx
│  │ │ │ ├── Dashboard.tsx
│  │ │ │ └── Login.tsx
│  │ │ ├── hooks/
│  │ │ │ ├── index.ts
│  │ │ │ ├── useCardDisplayArea.tsx
│  │ │ │ ├── useCardFetching.ts
│  │ │ │ ├── useCart.ts
│  │ │ │ ├── useFilterCounts.ts
│  │ │ │ ├── useRecentlyViewed.tsx
│  │ │ │ ├── useShopFilters.ts
│  │ │ │ ├── useShopKeyboardShortcuts.ts
│  │ │ │ ├── useShopViewMode.ts
│  │ │ │ └── useVariationSelection.ts
│  │ │ └── shop/
│  │ │  ├── components/
│  │ │  │ ├── Cart/
│  │ │  │ │ ├── AddToCartModal.tsx
│  │ │  │ │ ├── CartItem.tsx
│  │ │  │ │ ├── CartModal.tsx
│  │ │  │ │ ├── Checkout.tsx
│  │ │  │ │ └── MiniCart.tsx
│  │ │  │ ├── index.ts
│  │ │  │ ├── RecentlyViewedCards.tsx
│  │ │  │ ├── ResultsHeader.tsx
│  │ │  │ ├── ShopCart.tsx
│  │ │  │ ├── ShopFilters.tsx
│  │ │  │ ├── ShopHeader.tsx
│  │ │  │ └── ShopState.tsx
│  │ │  └── ShopPage.tsx
│  │ ├── lib/
│  │ │ ├── api/
│  │ │ │ ├── client.ts
│  │ │ │ ├── endpoints.ts
│  │ │ │ └── index.ts
│  │ │ ├── constants/
│  │ │ │ ├── index.ts
│  │ │ │ └── validation.ts
│  │ │ └── utils/
│  │ │  ├── csv.ts
│  │ │  ├── errorLogger.ts
│  │ │  ├── format.ts
│  │ │  ├── groupCards.ts
│  │ │  ├── index.ts
│  │ │  ├── sanitization.ts
│  │ │  └── virtualScroll.ts
│  │ ├── services/
│  │ │ ├── error/
│  │ │ │ ├── handler.ts
│  │ │ │ └── types.ts
│  │ │ └── http/
│  │ │  └── throttler.ts
│  │ ├── shared/
│  │ │ ├── card/
│  │ │ │ ├── CardItem.tsx
│  │ │ │ ├── CardRow.tsx
│  │ │ │ ├── CardSkeleton.tsx
│  │ │ │ └── index.ts
│  │ │ ├── layout/
│  │ │ │ ├── CardGrid.tsx
│  │ │ │ ├── CardList.tsx
│  │ │ │ ├── ErrorBoundary.tsx
│  │ │ │ ├── index.ts
│  │ │ │ └── KeyboardShortcuts.tsx
│  │ │ ├── media/
│  │ │ │ ├── index.ts
│  │ │ │ └── OptimizedImage.tsx
│  │ │ ├── search/
│  │ │ │ ├── ActiveFilters.tsx
│  │ │ │ ├── FiltersPanel.tsx
│  │ │ │ ├── index.ts
│  │ │ │ ├── MobileFilterButton.tsx
│  │ │ │ ├── SearchBar.tsx
│  │ │ │ ├── VariationFilter.tsx
│  │ │ │ └── VariationFilterCache.ts
│  │ │ └── ui/
│  │ │  ├── Button.tsx
│  │ │  ├── CurrencySelector.tsx
│  │ │  ├── EmptyState.tsx
│  │ │  ├── FilterSidebar.tsx
│  │ │  ├── index.ts
│  │ │  ├── MobileFilterModal.tsx
│  │ │  ├── Modal.tsx
│  │ │  ├── SectionHeader.tsx
│  │ │  ├── Toast.tsx
│  │ │  └── VariationBadge.tsx
│  │ ├── styles/
│  │ │ └── index.css
│  │ ├── types/
│  │ │ ├── api/
│  │ │ │ ├── requests.ts
│  │ │ │ └── responses.ts
│  │ │ ├── models/
│  │ │ │ ├── card.ts
│  │ │ │ ├── inventory.ts
│  │ │ │ └── order.ts
│  │ │ ├── ui/
│  │ │ │ ├── cart.ts
│  │ │ │ └── common.ts
│  │ │ └── index.ts
│  │ ├── App.tsx
│  │ ├── main.tsx
│  │ ├── reportWebVitals.ts
│  │ └── vit-env.d.ts
│  ├── .env.local
│  ├── .env.local.example
│  ├── .tsbuildinfo
│  ├── index.html
│  ├── package.json
│  ├── postcss.config.cjs
│  ├── tailwind.config.ts
│  ├── tsconfig.json
│  └── vite.config.ts
├── build_logs/
│ ├── problems-eslint.log
│ └── problems-ts.log
├── database/
│ ├── DATABASE_SCHEMA.md
│ └── database-stats.json
├── docs/
│ ├── samples/
│ │ ├── api_driven_variations.ts
│ │ ├── mtg_card_variations_sample.json
│ │ ├── onepiece_card_variations_sample.json
│ │ └── sv_card_variations_sample.json
│ ├── Complete File Documentation for apps.docx
│ ├── openapi.yaml
│ ├── pokemon_set_codes.txt
│ └── problems_to_fix.txt
├── scripts/
│ ├── imports/
│ │ ├── analyze-variations.ts
│ │ ├── import_mtg_with_variations.ts
│ │ ├── import-onepiece-set.ts
│ │ ├── import-pokemon-set.ts
│ │ └── list-pokemon-sets.ts
│ ├── migrations/
│ │ ├── migrate-card-pricing.ts
│ │ └── run-migration.ts
│ ├── analyze-repo.mjs
│ ├── analyze-unused-code.js
│ ├── copy-dist-to-api.js
│ ├── debug-admin-login.ts
│ ├── deps-graph.ts
│ ├── export-database-schema.ts
│ ├── generate-admin-hash.ts
│ ├── line-lengths.ts
│ ├── refresh-mviews.sh
│ ├── route-analysis-report.json
│ ├── scan-routes.js
│ ├── smoke.mjs
│ ├── test-db-connected.ts
│ ├── test-login.sh
│ └── test-password.ts
├── .dependency-cruiser.cjs
├── .env.example
├── .gitignore
├── ai_dev_principles.md
├── api.effective.tsconfig.json
├── deps.svg
├── eslint.config.cjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── prettier.config.cjs
├── render.yaml
├── tsconfig.base.json
└── tsconfig.json
```