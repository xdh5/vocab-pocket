from pathlib import Path
import sys

from PIL import Image, ImageFilter, ImageOps


if len(sys.argv) != 3:
    raise SystemExit("Usage: build_icons.py <source.png> <output-dir>")

source = Path(sys.argv[1])
output_dir = Path(sys.argv[2])
output_dir.mkdir(parents=True, exist_ok=True)

image = ImageOps.exif_transpose(Image.open(source)).convert("RGBA")
side = max(image.size)
square = Image.new("RGBA", (side, side), "white")
square.alpha_composite(image, ((side - image.width) // 2, (side - image.height) // 2))

app_icon = square.resize((512, 512), Image.Resampling.LANCZOS)
app_icon.save(output_dir / "app-icon.png", optimize=True)

tray_icon = square.resize((32, 32), Image.Resampling.LANCZOS).filter(
    ImageFilter.UnsharpMask(radius=0.7, percent=130, threshold=2)
)
tray_icon.save(output_dir / "tray-icon.png", optimize=True)

square.save(
    output_dir / "app-icon.ico",
    format="ICO",
    sizes=[(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)],
)

print(f"Created icons in {output_dir.resolve()}")
