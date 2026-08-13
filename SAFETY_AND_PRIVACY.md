# Safety and Privacy Notes

## Prototype boundaries

Inside Me is a personal reflection and journaling product. It does not present its pattern summaries as professional conclusions or diagnoses.

## Data handling

The Shipaton MVP stores journal entries locally on the device using AsyncStorage. No analytics SDK is included in this starter. Cloud sync should only be added with clear retention, deletion, access-control, and privacy rules.

## AI

Provider secret keys remain server-side. The client accepts an optional HTTPS reflection endpoint and falls back to a local reflection prompt when the endpoint is unavailable.

## User control

The product should make it easy to understand where entries are stored, what leaves the device, and how a user can delete or export their own information.

## Monetization

Core check-ins, journaling, and basic reflection remain free. Paid features focus on longer history, export, customization, and deeper optional pattern tools.
