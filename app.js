/* app.js — 白拿 · 校园免费捡漏
   零依赖。状态存 localStorage。所有距离/时间判断集中在这里。 */

(function () {
  'use strict';

  var LS_KEY = 'baina.campusfree.v1';
  var NEAR_M = 90;          // 极近：距离强调色阈值
  var URGENT_MIN = 30;      // 30 分钟内过期改砖红
  var HOT_MIN = 45;         // 手慢无：时间阈值
  var HERO_R = 500;         // 首屏标题的半径
  var BANDS = [
    { max: 100, label: '100 米内' },
    { max: 300, label: '300 米内' },
    { max: 500, label: '500 米内' },
    { max: 1250, label: '1.2 公里内' }
  ];

  /* ---------------- 状态 ---------------- */
  var state = { claims: [], posts: [], campus: CAMPUSES[0].id, cat: 'all', view: 'near' };

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        state.claims = Array.isArray(s.claims) ? s.claims : [];
        state.posts = Array.isArray(s.posts) ? s.posts : [];
        if (s.campus && CAMPUSES.some(function (c) { return c.id === s.campus; })) state.campus = s.campus;
      }
    } catch (e) { /* 隐私模式 / 脏数据：忽略，走内存态 */ }
  }
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        claims: state.claims, posts: state.posts, campus: state.campus
      }));
    } catch (e) { /* 配额或隐私模式，不影响演示 */ }
  }

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function campus() {
    return CAMPUSES.filter(function (c) { return c.id === state.campus; })[0] || CAMPUSES[0];
  }
  function catLabel(id) {
    var c = CATEGORIES.filter(function (x) { return x.id === id; })[0];
    return c ? c.label : '其他';
  }
  function spotText(item) {
    if (item.spotText) return item.spotText;   // 用户发布时自定义的地点
    var sp = campus().spots[item.spot];
    return sp || '校内 · 到现场联系发布者';
  }
  function timeText(min) {
    if (min < 60) return min + ' 分钟后过期';
    if (min < 1440) return Math.round(min / 60) + ' 小时后过期';
    return '今天内有效';
  }
  function timeLeftShort(min) {
    if (min < 60) return min + ' 分钟';
    return Math.round(min / 60) + ' 小时';
  }
  function isUrgent(item) { return item.expires <= URGENT_MIN; }
  function isNear(item) { return item.meters <= NEAR_M; }
  function isHot(item) { return isUrgent(item) || item.expires <= HOT_MIN || isNear(item); }
  function claimedOf(id) {
    return state.claims.filter(function (c) { return c.id === id; })[0] || null;
  }
  function allItems() {
    return state.posts.concat(SEED);
  }
  /* 已被你领走的份数不再算进库存：卡片上的「剩 N 份」与首页总量必须一致 */
  function claimedQty(id) {
    var n = 0;
    for (var i = 0; i < state.claims.length; i++) if (state.claims[i].id === id) n += 1;
    return n;
  }
  function leftQty(item) {
    return Math.max(0, (item.qty || 1) - claimedQty(item.id));
  }
  function filtered() {
    var items = allItems();
    if (state.cat !== 'all') {
      items = items.filter(function (i) { return i.cat === state.cat; });
    }
    return items;
  }
  function stockOf(items) {
    return items.reduce(function (n, i) { return n + leftQty(i); }, 0);
  }
  function byMeters(a, b) { return a.meters - b.meters; }

  /* 数字滚动：Date.now() 驱动，结束写终值 */
  function rollNumber(el, to, dur) {
    dur = dur || 320;
    var from = 0;
    var m = /^(-?)(\d+)/.exec(el.textContent || '');
    if (m) from = parseInt(m[2], 10) * (m[1] === '-' ? -1 : 1);
    if (from === to) { el.textContent = String(to); return; }
    var t0 = Date.now();
    function step() {
      var p = Math.min(1, (Date.now() - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      if (p < 1) {
        el.textContent = String(Math.round(from + (to - from) * e));
        requestAnimationFrame(step);
      } else {
        el.textContent = String(to);
      }
    }
    requestAnimationFrame(step);
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  /* ---------------- 渲染：卡片 ---------------- */
  function rowHTML(item) {
    var dist = Math.round(item.meters);
    var hotDist = isNear(item) ? ' hot' : '';
    var hotTime = isUrgent(item) ? ' urgent' : '';
    var claimed = claimedOf(item.id);
    var sub = spotText(item) + ' · 剩 ' + leftQty(item) + ' 份' + (item.value ? ' · 估值 ¥' + item.value : '');
    return '<button class="row' + (item.fresh ? ' is-new' : '') + '" type="button" data-id="' + esc(item.id) + '">' +
      '<img class="thumb" src="assets/photos/' + esc(item.photo) + '-card.jpg" alt="' + esc(item.title) + ' 的实拍图" width="96" height="72">' +
      '<span class="row-main">' +
        '<span class="row-title">' + (item.fresh ? '<span class="badge-new">新</span>' : '') + esc(item.title) + '</span>' +
        '<span class="row-sub">' + esc(sub) + '</span>' +
      '</span>' +
      '<span class="row-right">' +
        '<span class="dist' + hotDist + '">' + dist + '<span>m</span></span>' +
        '<span class="time' + hotTime + '" style="display:block">' +
          (claimed ? '已领取 ' + claimed.code : timeText(item.expires)) +
        '</span>' +
      '</span>' +
    '</button>';
  }

  function hotCardHTML(item) {
    return '<button class="hot-card" type="button" data-id="' + esc(item.id) + '">' +
      '<img src="assets/photos/' + esc(item.photo) + '-card.jpg" alt="' + esc(item.title) + ' 的实拍图" width="164" height="123">' +
      '<span class="hot-body" style="display:block">' +
        '<span class="hot-title">' + esc(item.title) + '</span>' +
        '<span class="hot-meta">' +
          '<span class="hot-dist' + (isNear(item) ? ' hot' : '') + '">' + Math.round(item.meters) + 'm</span>' +
          '<span class="hot-time' + (isUrgent(item) ? ' urgent' : '') + '">' + timeLeftShort(item.expires) + '</span>' +
        '</span>' +
      '</span>' +
    '</button>';
  }

  /* ---------------- 渲染：首页 ---------------- */
  function renderHero() {
    var items = filtered();
    var inside = items.filter(function (i) { return i.meters <= HERO_R && !i.fresh; });
    var label = state.cat === 'all' ? '东西' : catLabel(state.cat);
    $('heroTitle').innerHTML = inside.length + ' 样' + label + '，<br>在你 ' + HERO_R + ' 米内';
    var nearest = inside.length ? Math.round(inside.reduce(function (m, i) { return Math.min(m, i.meters); }, 9999)) : 0;
    var soonest = items.length ? items.reduce(function (m, i) { return Math.min(m, i.expires); }, 9999) : 0;
    $('heroNote').textContent = inside.length
      ? '最近 ' + nearest + ' 米 · ' + soonest + ' 分钟后有东西过期'
      : '这个半径内暂时空了，往下看更远的';
    $('heroCampus').textContent = campus().name;
    $('campusName').textContent = campus().name;
  }

  function renderChips() {
    var items = allItems();
    var html = CATEGORIES.map(function (c) {
      var n = c.id === 'all' ? items.length : items.filter(function (i) { return i.cat === c.id; }).length;
      return '<button class="chip" type="button" data-cat="' + c.id + '" aria-pressed="' +
        (state.cat === c.id) + '">' + c.label + ' ' + n + '</button>';
    }).join('');
    $('chips').innerHTML = html;
  }

  function renderStrip() {
    var items = allItems().filter(function (i) { return isHot(i); })
      .sort(function (a, b) { return a.expires - b.expires; }).slice(0, 6);
    $('hotStrip').innerHTML = items.map(hotCardHTML).join('');
    $('hotHint').textContent = HOT_MIN + ' 分钟内过期或 ' + NEAR_M + ' 米内';
  }

  function renderBands() {
    var items = filtered();
    var fresh = items.filter(function (i) { return i.fresh; }).sort(byMeters);
    var total = stockOf(items);
    $('listStat').textContent = items.length + ' 条 · ' + total + ' 份';

    var html = '';
    if (fresh.length) {
      html += '<div class="band-head"><b>刚刚发布</b><span class="band-n">' + fresh.length + ' 条 · ' +
        stockOf(fresh) + ' 份</span></div>' + fresh.map(rowHTML).join('');
    }
    var pool = items.filter(function (i) { return !i.fresh; }).sort(byMeters);
    var lo = 0;
    BANDS.forEach(function (band) {
      var slice = pool.filter(function (i) { return i.meters > lo && i.meters <= band.max; });
      lo = band.max;
      if (!slice.length) return;
      html += '<div class="band-head"><b>' + band.label + '</b><span class="band-n">' +
        slice.length + ' 条 · ' + stockOf(slice) + ' 份</span></div>' + slice.map(rowHTML).join('');
    });
    if (!items.length) {
      html = '<p class="empty">这个分类现在没有东西。换个分类，或者你自己发一条占位。</p>';
    }
    $('bands').innerHTML = html;
    $('listFoot').textContent = '以上共 ' + items.length + ' 条 · ' + total + ' 份可领 · 全部免费';
  }

  function renderHotView() {
    var items = allItems().filter(function (i) { return isHot(i); })
      .sort(function (a, b) { return a.expires - b.expires; });
    $('hotCount').textContent = items.length;
    $('hotList').innerHTML = items.length
      ? items.map(rowHTML).join('')
      : '<p class="empty">现在没有快过期的。等下一波下课时间。</p>';
  }

  /* ---------------- 渲染：我的 ---------------- */
  function renderMe() {
    var claims = state.claims.slice().sort(function (a, b) { return b.at - a.at; });
    var money = claims.reduce(function (n, c) { return n + (c.value || 0); }, 0);
    rollNumber($('mMoney'), Math.round(money));
    $('mCount').textContent = String(claims.length);
    $('mAvg').textContent = String(claims.length ? Math.round(money / claims.length) : 0);
    $('mRecCount').textContent = claims.length + ' 条';

    $('mRecs').innerHTML = claims.map(function (c) {
      return '<div class="rec">' +
        '<div class="rec-main">' +
          '<div class="rec-title">' + esc(c.title) + '</div>' +
          '<div class="rec-sub">' + esc(c.spot || '校内') + ' · ' + esc(c.when || '刚刚') + '</div>' +
        '</div>' +
        '<div class="rec-code">' + esc(c.code) + '</div>' +
        '<div class="rec-amt">' + (c.value ? '省 ¥' + c.value : '免费') + '</div>' +
      '</div>';
    }).join('');
    var has = claims.length > 0;
    $('mEmpty').style.display = has ? 'none' : 'block';
  }

  function render() {
    renderHero();
    renderChips();
    renderStrip();
    renderBands();
    renderHotView();
    renderMe();
  }

  /* ---------------- 详情 ---------------- */
  var currentId = null;

  function openDetail(id) {
    var item = allItems().filter(function (i) { return i.id === id; })[0];
    if (!item) return;
    currentId = id;
    var claimed = claimedOf(id);

    $('dPhoto').src = 'assets/photos/' + item.photo + '-wide.jpg';
    $('dPhoto').alt = item.title + ' 的 16:9 实拍图';
    $('dCat').textContent = catLabel(item.cat) + ' · 剩 ' + leftQty(item) + ' 份';
    $('dTitle').textContent = item.title;
    $('dDist').innerHTML = Math.round(item.meters) + '<span>m</span>';
    $('dDist').className = 'd-num' + (isNear(item) ? ' hot' : '');
    $('dTime').textContent = timeText(item.expires);
    $('dTime').className = 'd-time' + (isUrgent(item) ? ' urgent' : '');
    $('dSpot').textContent = spotText(item);
    $('dValue').textContent = item.value ? '¥' + item.value + '（估算）' : '免费 · 无押金';
    $('dBy').textContent = item.by + ' · ' + (item.posted || '刚刚');
    $('dNote').textContent = item.note;

    var btn = $('dClaim');
    if (claimed) {
      btn.textContent = '已领取 · 再看一次 ' + claimed.code;
    } else {
      btn.textContent = '领取 · 生成 4 位码';
    }
    btn.disabled = false;

    $('codeView').classList.remove('on');
    $('codeView').setAttribute('aria-hidden', 'true');
    $('sheet').classList.add('on');
    $('sheet').setAttribute('aria-hidden', 'false');
    $('scrim').classList.add('on');
    document.querySelector('.sheet-scroll').scrollTop = 0;
  }

  function closeDetail() {
    $('sheet').classList.remove('on');
    $('sheet').setAttribute('aria-hidden', 'true');
    $('scrim').classList.remove('on');
    $('codeView').classList.remove('on');
    $('codeView').setAttribute('aria-hidden', 'true');
    currentId = null;
  }

  function claim() {
    if (!currentId) return;
    var item = allItems().filter(function (i) { return i.id === currentId; })[0];
    if (!item) return;
    var existing = claimedOf(currentId);
    var rec = existing;
    if (!rec) {
      var code = String(1000 + Math.floor(Math.random() * 9000));
      rec = {
        id: item.id, title: item.title, code: code, value: item.value || 0,
        spot: spotText(item), when: '刚刚领取', at: Date.now()
      };
      state.claims.push(rec);
      save();
      render();
      toast('已领取 · 到现场报这 4 位数字');
    }
    $('dCode').textContent = rec.code;
    $('codeView').classList.add('on');
    $('codeView').setAttribute('aria-hidden', 'false');
    $('dClaim').textContent = '已领取 · 再看一次 ' + rec.code;
  }

  /* ---------------- 发布 ---------------- */
  var pubCat = 'food';
  var pubPhoto = 'food-pizza-slice';

  function renderPickers() {
    $('fCat').innerHTML = CATEGORIES.filter(function (c) { return c.id !== 'all'; }).map(function (c) {
      return '<button class="chip" type="button" data-pcat="' + c.id + '" aria-pressed="' +
        (pubCat === c.id) + '">' + c.label + '</button>';
    }).join('');
    var picks = ['food-pizza-slice', 'book-math-stack', 'daily-notebook-set', 'furniture-stool',
      'cloth-shirts', 'spot-lecture', 'food-salad-bowl', 'daily-desk-mug'];
    $('fPhotos').innerHTML = picks.map(function (p) {
      return '<button type="button" data-pphoto="' + p + '" aria-pressed="' + (pubPhoto === p) + '" aria-label="选择示意图 ' + p + '">' +
        '<img src="assets/photos/' + p + '-card.jpg" alt="" width="76" height="57"></button>';
    }).join('');
  }

  function publish(e) {
    e.preventDefault();
    var title = $('fTitle').value.trim();
    if (!title) {
      toast('先写一句「送什么」');
      $('fTitle').focus();
      return;
    }
    var meters = Math.max(10, Math.min(1500, parseInt($('fMeters').value, 10) || 120));
    var expires = parseInt($('fExpires').value, 10) || 60;
    var spotRaw = $('fSpot').value.trim();
    var note = $('fNote').value.trim() || '要的话直接来拿，不用打招呼。';

    var item = {
      id: 'p' + Date.now(),
      title: title, cat: pubCat, meters: meters, expires: expires, qty: 1,
      value: 0, spot: 'gate', spotText: spotRaw || campus().name + ' · 南门快递架',
      by: '你', note: note, photo: pubPhoto, posted: '刚刚', fresh: true
    };
    state.posts.unshift(item);
    save();

    state.cat = 'all';
    setView('near');
    render();
    $('screen').scrollTo ? $('screen').scrollTo({ top: 0, behavior: 'auto' }) : ($('screen').scrollTop = 0);
    toast('已发布 · 排在列表第一位');
    $('pubForm').reset();
    $('fMeters').value = '120';
    $('fSpot').value = '';
    $('fNote').value = '';
  }

  /* ---------------- 视图 / tab ---------------- */
  function setView(name) {
    state.view = name;
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.getAttribute('data-view') === name);
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-tab') === name);
    });
    $('screen').scrollTop = 0;
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    document.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip[data-cat]');
      if (chip) {
        state.cat = chip.getAttribute('data-cat');
        renderHero(); renderChips(); renderBands(); renderStrip();
        return;
      }
      var row = e.target.closest('[data-id]');
      if (row) { openDetail(row.getAttribute('data-id')); return; }

      var pcat = e.target.closest('[data-pcat]');
      if (pcat) { pubCat = pcat.getAttribute('data-pcat'); renderPickers(); return; }

      var pphoto = e.target.closest('[data-pphoto]');
      if (pphoto) { pubPhoto = pphoto.getAttribute('data-pphoto'); renderPickers(); return; }
    });

    $('tabbar').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (tab) setView(tab.getAttribute('data-tab'));
    });

    $('topPub').addEventListener('click', function () { setView('publish'); });
    $('campusBtn').addEventListener('click', function () {
      var i = CAMPUSES.map(function (c) { return c.id; }).indexOf(state.campus);
      state.campus = CAMPUSES[(i + 1) % CAMPUSES.length].id;
      save();
      render();
      toast('已切到 ' + campus().name + ' · 地点说法同步替换');
    });

    $('dClose').addEventListener('click', closeDetail);
    $('scrim').addEventListener('click', closeDetail);
    $('dClaim').addEventListener('click', claim);
    $('dDone').addEventListener('click', function () { closeDetail(); setView('me'); });
    $('pubForm').addEventListener('submit', publish);
    $('proBtn').addEventListener('click', function () { toast('Pro 是演示卡位，未接支付'); });
    $('resetBtn').addEventListener('click', function () {
      state.claims = []; state.posts = []; state.cat = 'all';
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      render(); setView('near');
      toast('已清空 · 回到 14 条种子数据');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDetail();
    });
  }

  /* ---------------- 启动 ---------------- */
  load();
  renderPickers();
  render();
  bind();
  setView('near');

  // 供自检读取的调试口（只读，不参与业务）
  window.__BAINA__ = {
    counts: function () {
      var items = filtered();
      return { rows: items.length, stock: stockOf(items), all: allItems().length, allStock: stockOf(allItems()) };
    },
    state: state
  };
})();
