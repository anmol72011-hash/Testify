import os
from PIL import Image, ImageDraw, ImageFont

# Create a transparent image 1000x1000
img = Image.new('RGBA', (1000, 1000), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

text = "TESTIFY"

# Try to load a nice bold font, fallback to default
try:
    font = ImageFont.truetype("arialbd.ttf", 160)
except:
    try:
        font = ImageFont.truetype("segoeuib.ttf", 160)
    except:
        font = ImageFont.load_default()

# Get text bounding box to center it
bbox = d.textbbox((0, 0), text, font=font)
w = bbox[2] - bbox[0]
h = bbox[3] - bbox[1]

# Draw white text in the center
d.text(((1000 - w) / 2, (1000 - h) / 2), text, font=font, fill=(255, 255, 255, 255))

# Save
output_path = os.path.join(os.path.dirname(__file__), 'assets', 'splash-testify.png')
img.save(output_path)
print(f"Saved to {output_path}")
