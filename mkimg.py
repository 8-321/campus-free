
from PIL import Image, ImageEnhance, ImageOps
import os, json
RAW = r"D:/Hermes/work/campus-free/raw"
OUT = r"D:/Hermes/work/campus-free/assets/photos"
os.makedirs(OUT, exist_ok=True)
MAP = [
 ("food-pizza-slice","pizza.jpg")  # 该原图本身偏灰，单独用 0.40,
 ("food-salad-bowl","salad2.jpg"),
 ("food-bread-plate","food_top.jpg"),
 ("book-exam-english","books_row.jpg"),
 ("book-math-stack","books_stack.jpg"),
 ("book-poetry","book_single.jpg"),
 ("daily-notebook-set","notebook.jpg"),
 ("daily-desk-mug","desk.jpg"),
 ("furniture-stool","chair3.jpg"),
 ("furniture-sofa","sofa.jpg"),
 ("cloth-shirts","clothes.jpg"),
 ("cloth-tee","tshirt.jpg"),
 ("spot-lecture","lecture.jpg"),
 ("spot-club","event.jpg"),
]
def prep(src, w, h, dst):
    im = Image.open(src).convert("RGB")
    im = ImageOps.exif_transpose(im)
    im = ImageOps.fit(im, (w, h), method=Image.LANCZOS, centering=(0.5,0.5))
    im = ImageEnhance.Color(im).enhance(0.40 if "pizza" in dst else 0.45)   # 压饱和到降 40-50%；pizza 原图偏灰，用 0.40
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im.save(dst, "JPEG", quality=82, optimize=True, progressive=True)
out=[]
for name, src in MAP:
    s = os.path.join(RAW, src)
    pass  # 产出已定稿，重跑会覆盖调好的匹萨参数
    prep(s, 1280, 720, f"{OUT}/{name}-wide.jpg")
    out.append(name)
print(len(out), "items")
print(sum(os.path.getsize(os.path.join(OUT,f)) for f in os.listdir(OUT))//1024, "KB total", len(os.listdir(OUT)), "files")
