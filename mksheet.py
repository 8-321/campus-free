
import os
from PIL import Image, ImageDraw
d = r"D:/Hermes/work/campus-free/raw"
files = sorted(os.listdir(d))
cols, cw, ch = 5, 240, 180
rows = (len(files)+cols-1)//cols
sheet = Image.new("RGB",(cols*cw, rows*(ch+22)),"white")
dr = ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im = Image.open(os.path.join(d,f)).convert("RGB")
    im.thumbnail((cw,ch))
    x,y = (i%cols)*cw, (i//cols)*(ch+22)
    sheet.paste(im,(x,y))
    dr.text((x+4,y+ch+4), f"{i}:{f}", fill="black")
sheet.save(r"D:/Hermes/work/campus-free/raw/_sheet.png")
print(len(files), "files", [f"{i}:{f}" for i,f in enumerate(files)])
