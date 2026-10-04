// ---------------------------------------------------------------------------------------
// Pure formatting helpers. Deliberately NOT in components/ui.jsx: that file imports the
// icon set, so anything importing a formatter from there dragged in React and every SVG
// with it — which is also why this could not be unit-tested where it used to live.
// ---------------------------------------------------------------------------------------

// Map pins have ~70px of room. "12,500,000 QAR" does not fit; "12.5M" does.
// Deliberately unit-less -- the currency lives on the card, not on the pin.
//
// ROUNDS DOWN, ALWAYS, and keeps one decimal at every scale. It used to round to nearest:
// 12,500 showed as "13K" and 6,950,000 as "7M" — a price advertised ABOVE what the seller
// is asking. For a price, one direction is safe and the other is a complaint; a figure that
// reads a little low is a pleasant surprise, one that reads high is a bait-and-switch.
export const compactPrice = (amount) => {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return 'POA'
  const down = (value) => Math.floor(value * 10) / 10          // one decimal, never up
  if (n >= 1e6) return `${String(down(n / 1e6)).replace(/\.0$/, '')}M`
  if (n >= 1e3) return `${String(down(n / 1e3)).replace(/\.0$/, '')}K`
  return String(Math.floor(n))
}