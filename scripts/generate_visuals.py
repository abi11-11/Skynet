from PIL import Image, ImageDraw, ImageFont
import os
os.makedirs('output/planning-artifacts/grants/nidhi-prayas/assets', exist_ok=True)

# Simple logo
logo = Image.new('RGBA', (800,200), (14, 68, 113, 255))
d = ImageDraw.Draw(logo)
try:
    f = ImageFont.truetype('arial.ttf', 72)
except Exception:
    f = ImageFont.load_default()
d.text((30,50), 'Skynet', font=f, fill=(255,255,255,255))
logo.save('output/planning-artifacts/grants/nidhi-prayas/assets/logo.png')

# Coverage diagram (stylized map)
img = Image.new('RGBA', (1200,800), (255,255,255,255))
d = ImageDraw.Draw(img)
d.rectangle([50,50,1150,750], outline=(0,0,0), width=4)
# draw field polygons
fields = [((150,150),(420,350)), ((500,180),(900,380)), ((200,430),(600,700))]
colors = [(200,240,200),(200,220,255),(255,230,200)]
for i, fbox in enumerate(fields):
    d.rectangle([fbox[0], fbox[1]], fill=colors[i], outline=(80,80,80))
# draw drone path
path = [(170,170),(300,230),(420,190),(540,220),(700,260),(820,340),(920,320)]
d.line(path, fill=(255,0,0), width=6)
for p in path:
    d.ellipse([p[0]-6,p[1]-6,p[0]+6,p[1]+6], fill=(255,0,0))
img.save('output/planning-artifacts/grants/nidhi-prayas/assets/coverage_diagram.png')

# Budget chart (simple bars)
chart = Image.new('RGBA', (1000,600), (255,255,255,255))
d = ImageDraw.Draw(chart)
labels = ['Sensors','Mech','Integration','Trials','Fab','Firmware','Compliance','Contingency']
bars = [60,90,125,180,140,100,80,150]
maxv = max(bars)
for i, b in enumerate(bars):
    x = 80 + i*110
    h = int((b/maxv)*400)
    d.rectangle([x,500-h,x+60,500], fill=(34,139,34))
    d.text((x,510),'{}'.format(labels[i]))
chart.save('output/planning-artifacts/grants/nidhi-prayas/assets/budget_chart.png')

print('Generated assets in output/planning-artifacts/grants/nidhi-prayas/assets/')
