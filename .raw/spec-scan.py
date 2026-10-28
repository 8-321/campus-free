#!/usr/bin/env python
"""spec-scan.py — 把「硬性约束」逐条变成数字，别靠肉眼说「没有」。

用法：
  python spec-scan.py <project_dir> [--prd PRD.md] [--pair SRC OUT]...

  --prd   字数上限检查（默认 600 字，中文按字、英文按 token）
  --pair  原图与产出的成对比较，报逐像素 HSV 饱和度降幅（可重复）

输出示例：
  index.html  emoji/字符图标: none
  border-radius: 1（应为 1 处全局重置），linear-gradient: 0，radial-gradient: 0
  opacity:0 + animation both: 0
  PRD 汉字 375 + 英文/数字 token 36 = 411（上限 600）
  降饱和中位数 44.7%（目标 40–50%）
"""
import argparse
import pathlib
import re
import statistics
import sys

# emoji / 字符图标（用户会点名 ✓ ✕ ✦ ● 这类）
ICON_RE = re.compile(
    "[\U0001F000-\U0001FAFF\u2190-\u21FF\u2600-\u27BF\u2B00-\u2BFF\uFE0F"
    "\u2705\u274C\u2713\u2714\u2715\u2716\u2726\u2727\u25CF\u25CB\u25A0\u25A1"
    "\u25B6\u25C0\u25AA\u25AB\u25C6\u25C7\u2605\u2606\u2192\u2190\u2191\u2193]"
)
SCAN_EXT = {'.html', '.css', '.js', '.mjs', '.md'}


def scan_sources(root: pathlib.Path):
    for p in sorted(root.rglob('*')):
        if p.suffix.lower() not in SCAN_EXT or 'node_modules' in p.parts or '.git' in p.parts:
            continue
        rel = p.relative_to(root).as_posix()
        if rel.startswith('.raw/'):
            continue
        yield p, rel


def sat_median(src: str, out: str):
    from PIL import Image
    a = Image.open(src).convert('RGB')
    b = Image.open(out).convert('RGB').resize(a.size)
    sa = list(a.convert('HSV').split()[1].getdata())
    sb = list(b.convert('HSV').split()[1].getdata())
    ratios = [y / x for x, y in zip(sa, sb) if x > 12]
    return statistics.median(ratios) if ratios else 1.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--prd', default='PRD.md')
    ap.add_argument('--prd-limit', type=int, default=600)
    ap.add_argument('--pair', nargs=2, action='append', default=[], metavar=('SRC', 'OUT'))
    args = ap.parse_args()

    root = pathlib.Path(args.root)
    hits = 0
    for path, rel in scan_sources(root):
        txt = path.read_text(encoding='utf-8', errors='ignore')
        icons = sorted(set(ICON_RE.findall(txt)))
        if icons:
            hits += 1
            print(f'{rel:<24} emoji/字符图标: {icons}')
    if not hits:
        print('emoji/字符图标: none（扫过 html/css/js/md）')

    css = '\n'.join(p.read_text(encoding='utf-8', errors='ignore') for p, _ in scan_sources(root) if p.suffix == '.css')
    print(f"border-radius: {css.count('border-radius')}（正常应为 1 处全局归零）"
          f"，linear-gradient: {css.count('linear-gradient')}，radial-gradient: {css.count('radial-gradient')}")
    risky = len(re.findall(r'opacity\s*:\s*0[^}]*animation[^}]*both', css))
    print(f'opacity:0 + animation … both: {risky}（必须 0；入场只做 translateY）')

    prd = root / args.prd
    if prd.exists():
        body = re.sub(r'^#.*$', '', prd.read_text(encoding='utf-8'), flags=re.M)
        zh = len(re.findall(r'[\u4e00-\u9fff]', body))
        tok = len(re.findall(r'[A-Za-z0-9$¥][A-Za-z0-9$¥.\-]*', body))
        flag = 'OK' if zh + tok <= args.prd_limit else '超了'
        print(f'PRD 汉字 {zh} + 英文/数字 token {tok} = {zh + tok}（上限 {args.prd_limit}，{flag}）')

    if args.pair:
        meds = [sat_median(s, o) for s, o in args.pair]
        for (s, o), m in zip(args.pair, meds):
            print(f'  {pathlib.Path(o).name}: 去饱和 {100 * (1 - m):.0f}%')
        avg = sum(1 - m for m in meds) / len(meds)
        print(f'降饱和中位数均值 {100 * avg:.1f}%（目标 40–50%）')

    return 0


if __name__ == '__main__':
    sys.exit(main())
