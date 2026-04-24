# TechBidly

A proof-of-concept frontend for an anonymous tech-auction marketplace. Buyers bid on phones, laptops, tablets and other gear listed by anonymous sellers (only City, Country is shown). Built with React + Vite + Tailwind so it can be ported to React Native later.

## Features

- **Dashboard** — buyer summary, featured auctions, personalised picks, "ending soon" feed.
- **Browse** — sortable, filterable grid with category pills, condition filter, and max-bid slider.
- **Listing detail** — image gallery, bid panel with AI-suggested max bid, recent bids feed, seller trust signals.
- **Sell** — listing form with AI-drafted descriptions and pricing tips.
- **Orders** — tabbed (active / past / all) with status, tracking, and seller location.
- **Profile** — account, billing, shipping, privacy, preferences.
- **Bidly AI** — floating assistant available everywhere with starter prompts.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Tech

- React 18 + React Router 6
- Vite
- Tailwind CSS (custom palette in `tailwind.config.js`)
- Lucide React icons

All data is mocked in `src/data/mockData.js`.
