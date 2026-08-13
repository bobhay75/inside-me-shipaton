# Devpost Draft — Inside Me

## One-line pitch

Inside Me is a privacy-first reflection app that helps people capture what they feel, notice patterns, and turn an overwhelming moment into something they can name and examine.

## Inspiration

People often know that something feels off before they can explain why. Journaling apps capture words and mood trackers capture numbers, but those pieces are often disconnected. Inside Me combines a fast check-in, private journaling, simple pattern recognition, and a short reflection in one focused loop.

## What it does

A user rates the moment from 1–5, writes what happened, saves the entry locally, and receives a short reflection. The journal keeps those moments together so patterns can be reviewed over time without pretending that a number alone explains the person's experience.

## How RevenueCat is used

RevenueCat manages the `pro` entitlement and current premium offering. The free tier keeps the core check-in, journal, and basic reflection available. Inside Me Plus is designed for longer history, personal exports, richer pattern summaries, and custom reflection paths.

That split is intentional: monetization adds depth and convenience rather than weakening the useful free loop.

## How it was built

Inside Me is built with Expo and React Native as an Android-first mobile app. Local journal data uses AsyncStorage for the MVP. RevenueCat is integrated with `react-native-purchases`. The reflection service supports an optional server-side endpoint while providing a local fallback; provider secrets never belong in the mobile bundle.

## What I learned

Building the smallest useful version forced the product to focus on one loop: notice → name → reflect → review. Privacy and monetization decisions were treated as product architecture rather than afterthoughts.

## What's next

Next steps are encrypted sync, opt-in long-term pattern analysis, export tools, stronger accessibility, user-controlled AI settings, and real-user testing.
