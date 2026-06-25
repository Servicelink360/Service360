"""Generate Service360 favicon and PWA icons from brand source PNG."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "brand" / "service360-app-icon-source.png"

PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"


def crop_to_square(img: Image.Image) -> Image.Image:
    """Center-crop to 1:1 so resize never stretches."""
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def resize_square(img: Image.Image, size: int) -> Image.Image:
    square = crop_to_square(img)
    return square.resize((size, size), Image.Resampling.LANCZOS)


def maskable(img: Image.Image, size: int, scale: float = 0.78) -> Image.Image:
    """Android maskable safe zone (~80% diameter)."""
    canvas = Image.new("RGBA", (size, size), (57, 125, 54, 255))
    inner = int(size * scale)
    scaled = resize_square(img, inner)
    offset = (size - inner) // 2
    canvas.paste(scaled, (offset, offset), scaled if scaled.mode == "RGBA" else None)
    return canvas.convert("RGB")


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Source icon not found: {SOURCE}")

    img = Image.open(SOURCE).convert("RGBA")
    square = crop_to_square(img)
    # Keep source square for future runs
    square.save(SOURCE, optimize=True)
    ICONS.mkdir(parents=True, exist_ok=True)

    # Favicon bundle
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = [resize_square(img, s) for s, _ in ico_sizes]
    ico_path = PUBLIC / "favicon.ico"
    ico_images[0].save(
        ico_path,
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_images[1:],
    )

    resize_square(img, 32).convert("RGB").save(ICONS / "favicon-32x32.png", optimize=True)
    resize_square(img, 512).convert("RGB").save(PUBLIC / "logo.png", optimize=True)
    resize_square(img, 180).convert("RGB").save(ICONS / "apple-touch-icon.png", optimize=True)
    resize_square(img, 192).convert("RGB").save(ICONS / "icon-192x192.png", optimize=True)
    resize_square(img, 512).convert("RGB").save(ICONS / "icon-512x512.png", optimize=True)
    maskable(img, 512).save(ICONS / "icon-512-maskable.png", optimize=True)

    print("Wrote:", ico_path)
    print("Wrote:", PUBLIC / "logo.png")
    for name in (
        "apple-touch-icon.png",
        "icon-192x192.png",
        "icon-512x512.png",
        "icon-512-maskable.png",
    ):
        print("Wrote:", ICONS / name)


if __name__ == "__main__":
    main()
