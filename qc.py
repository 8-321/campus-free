"""qc.py — 用本机 Edge + 原生 CDP 跑 8 项验收（不依赖任何 npm 包）"""
import json, os, subprocess, time, urllib.request, base64, sys
import websocket

PORT = 9334
PROF = r"C:\Users\34137\AppData\Local\hermes\cache\scratch\edge-qc"
OUT = r"D:\Hermes\work\campus-free\shots"
os.makedirs(OUT, exist_ok=True)

def start_edge():
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=2)
        return
    except Exception:
        pass
    exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    subprocess.Popen([exe, "--headless=new", f"--remote-debugging-port={PORT}",
                      f"--user-data-dir={PROF}", "--no-first-run", "--disable-extensions",
                      "--window-size=1280,900", "about:blank"],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=1)
            return
        except Exception:
            time.sleep(0.25)
    raise RuntimeError("edge 启动失败")

class CDP:
    def __init__(self, url):
        self.ws = websocket.create_connection(url, timeout=30)
        self.i = 0
        self.events = []
    def send(self, method, **params):
        self.i += 1
        self.ws.send(json.dumps({"id": self.i, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.i:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
            self.events.append(msg)
    def drain(self):
        self.ws.settimeout(0.2)
        try:
            while True:
                self.events.append(json.loads(self.ws.recv()))
        except Exception:
            pass
        self.ws.settimeout(30)
    def ev(self, expr, await_promise=False):
        r = self.send("Runtime.evaluate", expression=expr, returnByValue=True,
                      awaitPromise=await_promise, userGesture=True)
        if r.get("exceptionDetails"):
            raise RuntimeError(json.dumps(r["exceptionDetails"])[:400])
        return r["result"].get("value")
    def shot(self, name, clip=None):
        p = {"format": "png", "captureBeyondViewport": False}
        if clip:
            p["clip"] = {"x": clip[0], "y": clip[1], "width": clip[2], "height": clip[3], "scale": 1}
        data = self.send("Page.captureScreenshot", **p)["data"]
        path = os.path.join(OUT, name)
        open(path, "wb").write(base64.b64decode(data))
        return path

def wait_ready(c, t=12):
    end = time.time() + t
    while time.time() < end:
        try:
            if c.ev("document.readyState") == "complete":
                return True
        except Exception:
            pass
        time.sleep(0.15)
    return False

def main():
    start_edge()
    tgt = json.loads(urllib.request.urlopen(
        urllib.request.Request(f"http://127.0.0.1:{PORT}/json/new?about:blank", method="PUT")).read())
    c = CDP(tgt["webSocketDebuggerUrl"])
    c.send("Page.enable"); c.send("Runtime.enable"); c.send("Log.enable"); c.send("Network.enable")
    c.send("Network.setCacheDisabled", cacheDisabled=True)
    c.send("Page.addScriptToEvaluateOnNewDocument", source="""
      window.__errs = [];
      window.addEventListener('error', e => window.__errs.push('error: ' + (e.message||'') + ' @' + (e.filename||'')),
        true);
      window.addEventListener('unhandledrejection', e => window.__errs.push('rejection: ' + e.reason));
      const ce = console.error;
      console.error = function(){ window.__errs.push('console.error: ' + Array.from(arguments).join(' ')); ce.apply(console, arguments); };
    """)

    c.send("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=2, mobile=True)
    c.send("Page.navigate", url="http://127.0.0.1:8123/?v=%d" % int(time.time()))
    wait_ready(c)
    time.sleep(0.8)
    c.ev("localStorage.clear()")            # 每次从干净状态开始
    c.send("Page.navigate", url="http://127.0.0.1:8123/?v=%d" % int(time.time()))
    wait_ready(c)
    time.sleep(1.2)

    R = {}
    # ① 首页条数 / 库存总数
    R["home"] = c.ev("JSON.stringify(window.__BAINA__.counts())")
    R["rows_dom"] = c.ev("document.querySelectorAll('#bands .row').length")
    R["hero"] = c.ev("document.querySelector('#heroTitle').innerText.replace(/\\n/g,' ')")
    R["listStat"] = c.ev("document.querySelector('#listStat').textContent")
    R["hotCards"] = c.ev("document.querySelectorAll('#hotStrip .hot-card').length")
    R["chips"] = c.ev("document.querySelectorAll('#chips .chip').length")
    # 图片是否都真加载
    R["bad_imgs"] = c.ev("Array.from(document.images).filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)")
    R["img_count"] = c.ev("document.images.length")
    c.shot("01-mobile-home.png")

    # ② 点分类
    c.ev("document.querySelector('#chips .chip[data-cat=food]').click()")
    time.sleep(0.5)
    R["food"] = c.ev("JSON.stringify(window.__BAINA__.counts())")
    R["food_hero"] = c.ev("document.querySelector('#heroTitle').innerText.replace(/\\n/g,' ')")
    R["food_rows_dom"] = c.ev("document.querySelectorAll('#bands .row').length")
    c.shot("02-filter-food.png")

    # ③ 详情标题与卡片一致
    R["card_title"] = c.ev("document.querySelector('#bands .row .row-title').textContent.trim()")
    c.ev("document.querySelector('#bands .row').click()")
    time.sleep(0.6)
    R["sheet_open"] = c.ev("document.querySelector('#sheet').classList.contains('on')")
    R["detail_title"] = c.ev("document.querySelector('#dTitle').textContent.trim()")
    R["detail_dist"] = c.ev("document.querySelector('#dDist').textContent.trim()")
    R["detail_photo_ok"] = c.ev("(()=>{const i=document.querySelector('#dPhoto');return i.complete&&i.naturalWidth>0&&i.src.includes('-wide.jpg')})()")
    R["detail_time_color"] = c.ev("getComputedStyle(document.querySelector('#dTime')).color")
    R["detail_dist_color"] = c.ev("getComputedStyle(document.querySelector('#dDist')).color")
    c.shot("03-detail.png")

    # ④ 领取 → 4 位码
    c.ev("document.querySelector('#dClaim').click()")
    time.sleep(0.7)
    R["code"] = c.ev("document.querySelector('#dCode').textContent.trim()")
    R["code_ok"] = bool(c.ev("(()=>{const t=document.querySelector('#dCode').textContent.trim();return /^\\d{4}$/.test(t)})()"))
    c.shot("04-code.png")

    # ⑤ 我的 · 省钱
    c.ev("document.querySelector('#dDone').click()")
    time.sleep(1.0)
    R["me_view"] = c.ev("document.querySelector('#view-me').classList.contains('is-active')")
    R["money"] = c.ev("document.querySelector('#mMoney').textContent.trim()")
    R["claims"] = c.ev("document.querySelector('#mCount').textContent.trim()")
    R["recs"] = c.ev("document.querySelectorAll('#mRecs .rec').length")
    c.shot("05-me.png")

    # 手慢无 tab + 发布视图截图
    c.ev("document.querySelector('.tab[data-tab=hot]').click()")
    time.sleep(0.5)
    R["hot_tab_rows"] = c.ev("document.querySelectorAll('#hotList .row').length")
    c.shot("05b-hot-tab.png")

    # ⑥ 发布一条 → 排第一
    c.ev("document.querySelector('.tab[data-tab=publish]').click()")
    time.sleep(0.4)
    c.shot("05c-publish-form.png")
    c.ev("""(()=>{document.querySelector('#fTitle').value='半箱未开封矿泉水';
      document.querySelector('#fMeters').value='700';
      document.querySelector('#fSpot').value='三食堂侧门台阶';
      document.querySelector('#fNote').value='搬宿舍剩的，一箱24瓶，自己来扛。';
      document.querySelector('#fCat .chip[data-pcat=daily]').click();
      document.querySelector('#fPhotos button[data-pphoto=daily-notebook-set]').click();
      document.querySelector('#pubForm').requestSubmit();})()""")
    time.sleep(1.0)
    R["first_title"] = c.ev("document.querySelector('#bands .row .row-title').textContent.trim()")
    R["first_band"] = c.ev("document.querySelector('#bands .band-head b').textContent.trim()")
    R["first_is_new"] = c.ev("document.querySelector('#bands .row').classList.contains('is-new')")
    R["rows_after_pub"] = c.ev("document.querySelectorAll('#bands .row').length")
    R["stock_after_pub"] = c.ev("document.querySelector('#listStat').textContent")
    R["near_active"] = c.ev("document.querySelector('.tab[data-tab=near]').classList.contains('is-active')")
    c.ev("document.querySelector('#screen').scrollTop=0")
    time.sleep(0.3)
    c.shot("06-after-publish.png")

    # ⑦ 390 宽无横向滚动 + 4 tab 在视口内
    R["hscroll"] = c.ev("""JSON.stringify({
      docScrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
      screenScrollW: document.querySelector('#screen').scrollWidth,
      screenClientW: document.querySelector('#screen').clientWidth,
      innerW: window.innerWidth,
      tall: Array.from(document.querySelectorAll('.row,.nav,.strip,.chips,.tabbar')).filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className+':'+e.scrollWidth+'/'+e.clientWidth)
    })""")
    R["tabs"] = c.ev("JSON.stringify(Array.from(document.querySelectorAll('.tab')).map(function(t){var r=t.getBoundingClientRect();return {label:t.innerText.trim(), left:Math.round(r.left), right:Math.round(r.right), w:Math.round(r.width), inView:(r.left>=0&&r.right<=390&&r.top>=0&&r.bottom<=844)};}))")
    R["toast_ok"] = c.ev("document.querySelector('#toast').textContent.slice(0,30)")
    # 全量图片加载（滚到底再回来，触发 lazy）
    c.ev("(()=>{const s=document.querySelector('#screen');s.scrollTop=s.scrollHeight;})()")
    time.sleep(1.0)
    c.ev("(()=>{const s=document.querySelector('#screen');s.scrollTop=0;})()")
    time.sleep(0.6)
    R["bad_imgs_after_scroll"] = c.ev("Array.from(document.images).filter(i=>i.src&&(!i.complete||i.naturalWidth===0)).map(i=>i.src)")

    #  控制台错误
    c.drain()
    R["errs"] = c.ev("JSON.stringify(window.__errs)")
    R["log_errors"] = []
    for e in c.events:
        if e.get("method") in ("Log.entryAdded",):
            ent = e["params"]["entry"]
            if ent.get("level") in ("error",):
                R["log_errors"].append(ent.get("text", "")[:160])
        if e.get("method") == "Runtime.exceptionThrown":
            R["log_errors"].append(str(e["params"]["exceptionDetails"].get("text"))[:160])
        if e.get("method") == "Network.loadingFailed":
            R["log_errors"].append("net: " + str(e["params"].get("errorText"))[:80])

    # 桌面 1280 双栏
    c.send("Emulation.setDeviceMetricsOverride", width=1280, height=900, deviceScaleFactor=1, mobile=False)
    time.sleep(0.8)
    c.shot("07-desktop.png")
    R["desktop"] = c.ev("JSON.stringify({aside: !!document.querySelector('.aside') && getComputedStyle(document.querySelector('.aside')).display, deviceW: document.querySelector('#device').getBoundingClientRect().width, qr: document.querySelector('.qr').naturalWidth})")
    c.shot("08-desktop-full.png", clip=[0, 0, 1280, 1400])

    print(json.dumps(R, ensure_ascii=False, indent=1))

main()
