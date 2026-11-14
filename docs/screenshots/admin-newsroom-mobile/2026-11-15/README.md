# Synthetic Admin Newsroom mobile verification

Actual local production-build UI captured with Chromium at 320, 390, 430, 768 and 1440 CSS pixels. Data, Auth identity and session are synthetic fixtures served only on loopback HTTPS; non-loopback browser requests were blocked. These are not Production account/content screenshots.

`measurements.json` records viewport/document/body widths. All five final captures have document and body widths equal to the viewport. The wide table intentionally scrolls within its keyboard-focusable named panel. Table descendants outside the viewport in the diagnostic array are clipped by that local scroll panel; they are not document overflow.

Synthetic titles explicitly identify the content as fixtures. Startup overlay was allowed to finish before capture. Screenshot files are named `newsroom-<width>-synthetic.png`.
