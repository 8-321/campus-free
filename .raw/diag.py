"""qc.py — 用本机 Edge + 原生 CDP 跑 8 项验收（不依赖任何 npm 包）"""
import json, os, subprocess, time, urllib.request, base64, sys
import websocket

PORT = 9334
PROF = r"C:\Users\34137\AppData\Local\hermes\cache\scratch\edge-qc"
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123"
OUT = r"D:\Hermes\work\campus-free\shots" + ("" if len(sys.argv) < 2 else "-live")
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
    tgt = json.loads(urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{PORT}/json/new?about:blank", method="PUT")).read())
    c = CDP(tgt["webSocketDebuggerUrl"]); c.send("Page.enable"); c.send("Runtime.enable")
    c.send("Network.enable")   # 不再 setCacheDisabled
    c.send("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=2, mobile=True)
    c.send("Page.navigate", url=BASE + "/?d=%d" % int(time.time()))
    wait_ready(c)
    for step in range(6):
        time.sleep(1.0)
        r = c.ev("""(async()=>{const im=[...document.images];
          const bad=[];for(const i of im){if(!i.complete||!i.naturalWidth){bad.push(i.src.split('/').pop())}}
          let dec=0;for(const i of im){try{await i.decode();dec++}catch(e){}}
          return JSON.stringify({t:Math.round(performance.now()),n:im.length,notLoaded:bad.length,decoded:dec})})()""", await_promise=True)
        print(r)

main()
