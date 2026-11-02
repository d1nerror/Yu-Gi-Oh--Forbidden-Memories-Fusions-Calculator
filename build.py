"""Developer note: rebuilds index.html from src/, data/ and assets/. Run: python build.py"""
import base64, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
def read(*p): return open(os.path.join(ROOT, *p), encoding='utf-8').read()
def b64(*p): return base64.b64encode(open(os.path.join(ROOT, *p), 'rb').read()).decode()

icons = {f[:-4].replace('_', ' '): 'data:image/png;base64,' + b64('assets', 'icons', f)
         for f in sorted(os.listdir(os.path.join(ROOT, 'assets', 'icons'))) if f.endswith('.png')}
fonts = ''.join("@font-face{font-family:'Cinzel';font-style:normal;font-weight:%d;font-display:swap;"
                "src:url(data:font/woff2;base64,%s) format('woff2')}\n" % (w, b64('assets', 'fonts', 'cinzel-latin-%d-normal.woff2' % w))
                for w in (600, 700, 800))
data = json.dumps(json.loads(read('data', 'cards.json')), separators=(',', ':'))

js = (read('src', 'app.js').replace('__DATA__', data)
      .replace('__ICONS__', json.dumps(icons, separators=(',', ':')))
      .replace('__ONLINEART__', 'true'))
assert '</script>' not in js
page = read('src', 'index.html').replace('__CSS__', read('src', 'styles.css').replace('__FONTFACE__', fonts)).replace('__JS__', js)

split = page.index('<div class="app">')
html = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + page[:split] + '</head><body>\n' + page[split:] + '</body></html>\n')
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(html)
print('Built index.html (%d KB)' % (os.path.getsize(os.path.join(ROOT, 'index.html')) // 1024))
