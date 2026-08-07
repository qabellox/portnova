"""Extract the PortNova logo from its white background into a transparent PNG.

Approach:
- Compute the distance of every pixel from pure white.
- White pixels become fully transparent.
- Slightly-off-white edge pixels (anti-aliasing) get partial alpha so there's
  no harsh white halo around the artwork.
- Pure-colored logo pixels stay fully opaque.
"""
from PIL import Image

SRC = r"F:\portnova\frontend\public\images\logo.png"
DST = r"F:\portnova\frontend\public\images\logo.png"

img = Image.open(SRC).convert("RGBA")
w, h = img.size
px = img.load()

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        # Distance from white in [0, 1]
        dist = max(r, g, b) / 255.0  # 1.0 == white
        if dist >= 0.97:
            # Pure/near white -> transparent
            px[x, y] = (r, g, b, 0)
        elif dist >= 0.85:
            # Anti-aliased fringe -> fade alpha gradually
            alpha = int(255 * (1.0 - (dist - 0.85) / 0.12))
            px[x, y] = (r, g, b, min(a, alpha))
        else:
            # Solid logo pixels stay as-is (keep original alpha)
            pass

img.save(DST, "PNG")
print(f"Saved transparent logo: {w}x{h} -> {DST}")
