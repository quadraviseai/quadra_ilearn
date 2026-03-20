# Mobile Asset Specs

These files are currently wired into Expo config:

- `app-icon.png`
- `adaptive-icon.png`
- `splash-icon.png`
- `favicon.png`

Current status:

- The current set has been replaced with generated QuadraILearn-branded artwork for release preparation.
- They are usable for preview builds and store-prep testing.
- Replace them only if you want a more custom illustration-led brand treatment.

Recommended final replacements:

- `app-icon.png`
  - 1024x1024 PNG
  - no transparency
  - centered QuadraILearn mark
  - safe padding around edges
- `adaptive-icon.png`
  - 1024x1024 PNG with transparent background
  - foreground-only mark for Android adaptive icon masking
- `splash-icon.png`
  - 1024x1024 or larger PNG
  - simple centered mark with generous whitespace
- `favicon.png`
  - 48x48 or 64x64 PNG

Visual direction for final artwork:

- primary blue: `#14579a`
- deep brand text: `#103e6f`
- CTA orange: `#fb6404`
- warm cloud background: `#fcfaf2`

Keep the final icon set minimal and high-contrast. Avoid small text inside the icon.
