(function () {
  'use strict';

  const T = window.TRIP;
  const itinerary = [T.preparation, ...T.days];
  const $ = (sel, root = document) => root.querySelector(sel);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const svg = (body, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  const ICONS = {
    spot: svg('<path d="M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    transit: svg('<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14M8 20l2-4M16 20l-2-4"/><circle cx="9" cy="13" r=".6" fill="currentColor"/><circle cx="15" cy="13" r=".6" fill="currentColor"/>'),
    meal: svg('<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7.5c0-1.4 1-1.8 1-3.2M12 7.5c0-1.4 1-1.8 1-3.2M16 7.5c0-1.4 1-1.8 1-3.2"/>'),
    flight: svg('<path d="M21 12 3 4.5 6.5 12 3 19.5z"/><path d="M6.5 12H13"/>'),
    hotel: svg('<path d="M3 19V6M3 14h18v5M21 14a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="11" r="1.6"/>'),
    note: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.4"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    ticket: svg('<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/>'),
    yen: svg('<path d="M6 4l6 8 6-8M12 12v8M8 13.5h8M8 17h8"/>'),
    hourglass: svg('<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>'),
    map: svg('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>'),
    bed: svg('<path d="M3 19V6M3 14h18v5M21 14a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="11" r="1.6"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    chevron: svg('<path d="m6 9 6 6 6-6"/>', 'chev'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>')
  };

  const TYPE_LABEL = { spot: '景点', transit: '交通', meal: '餐食', flight: '航班', hotel: '住宿', note: '提示' };

  const mapUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

  const parseDate = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };
  const md = (s) => {
    const d = parseDate(s);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  };
  const todayInTokyo = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    return parseDate(parts);
  };
  const DAY_MS = 86400000;

  /* ───────────── Hero ───────────── */
  function renderHero() {
    const spots = T.days.reduce((n, d) => n + d.items.filter((i) => i.type === 'spot').length, 0);
    const meals = T.days.reduce((n, d) => n + d.items.filter((i) => i.type === 'meal')
      .reduce((m, i) => m + (i.options?.length || 0), 0), 0);
    const stats = [
      ['9', '天'], ['8', '晚'], ['3', '座城市'], [String(spots), '个景点'], [String(meals), '家餐厅推荐']
    ];
    $('#hero-stats').innerHTML = stats
      .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');

    const today = todayInTokyo();
    const start = parseDate(T.start);
    const end = parseDate(T.end);
    const diff = Math.round((start - today) / DAY_MS);
    let html;
    if (diff > 0) {
      html = `距离出发还有 <b>${diff}</b> 天 · <a href="#day-0">11/27 出游检查</a>`;
    } else if (today <= end) {
      const n = Math.round((today - start) / DAY_MS) + 1;
      html = `旅行第 <b>${n}</b> 天 · <a href="#day-${n}">查看今天的行程</a>`;
    } else {
      html = '旅程已结束，欢迎回家';
    }
    $('#countdown').innerHTML = html;
  }

  /* ───────────── Route stepper ───────────── */
  function renderRoute() {
    const modeIcon = { flight: ICONS.flight, train: ICONS.transit };
    $('#route').innerHTML = T.route.map((r, i) => {
      const node = `
        <div class="route-node ${r.nights ? 'stay' : ''}">
          <div class="route-dot">${r.nights ? `<b>${r.nights}</b>晚` : ''}</div>
          <div class="route-city">${esc(r.city)}</div>
          <div class="route-sub">${esc(r.sub)}</div>
        </div>`;
      const link = i < T.route.length - 1
        ? `<div class="route-link mode-${r.mode}">${modeIcon[r.mode] || ''}</div>` : '';
      return node + link;
    }).join('');
  }

  /* ───────────── Flights ───────────── */
  function renderFlights() {
    $('#flights').innerHTML = T.flights.map((f) => `
      <div class="flight">
        <div class="flight-date">${esc(f.date)}<span>${esc(f.code)}</span></div>
        <div class="flight-row">
          <div><b>${esc(f.dep)}</b><small>${esc(f.from)}</small></div>
          <div class="flight-line">${ICONS.flight}</div>
          <div class="right"><b>${esc(f.arr)}</b><small>${esc(f.to)}</small></div>
        </div>
        ${f.note ? `<div class="flight-note">${esc(f.note)}</div>` : ''}
      </div>`).join('');
  }

  /* ───────────── Geo schematic ───────────── */
  function renderGeo() {
    const W = 560, H = 300, pad = 46;
    const P = Object.fromEntries(T.geo.map((g) => [g.name, g]));
    const fuji = T.fuji;

    const seg = (a, c, cls, curve = 0) => {
      const A = P[a], C = P[c];
      if (!curve) return `<line class="${cls}" x1="${A.x}" y1="${A.y}" x2="${C.x}" y2="${C.y}"/>`;
      const mx = (A.x + C.x) / 2, my = (A.y + C.y) / 2 - curve;
      return `<path class="${cls}" d="M${A.x},${A.y} Q${mx},${my} ${C.x},${C.y}"/>`;
    };

    const paths = [
      seg('羽田', '东京', 'geo-rail'),
      seg('东京', '京都', 'geo-rail main', -70),
      seg('京都', '大阪', 'geo-rail'),
      seg('大阪', '伊丹', 'geo-rail'),
      seg('伊丹', '羽田', 'geo-fly', 170)
    ].join('');

    const nodes = Object.values(P).map((g) => {
      const r = g.small ? 4.5 : 6 + (g.nights || 0) * 2;
      const [dx, dy, anchor] = g.label || [0, -14, 'middle'];
      return `
        <g class="geo-node ${g.small ? 'small' : ''}">
          <circle cx="${g.x}" cy="${g.y}" r="${r}"/>
          <text x="${g.x + dx}" y="${g.y + dy}" text-anchor="${anchor}">${esc(g.name)}${g.nights ? ` · ${g.nights}晚` : ''}</text>
        </g>`;
    }).join('');

    $('#geo').innerHTML = `
      <svg class="geo" viewBox="0 0 ${W} ${H}" role="img" aria-label="行程城市示意图">
        <defs>
          <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" class="geo-dot"/>
          </pattern>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#dots)" rx="12"/>
        ${paths}
        <g class="geo-fuji">
          <path d="M${fuji.x - 11},${fuji.y + 8} L${fuji.x},${fuji.y - 9} L${fuji.x + 11},${fuji.y + 8} Z"/>
          <path class="cap" d="M${fuji.x - 4},${fuji.y - 2.5} L${fuji.x},${fuji.y - 9} L${fuji.x + 4},${fuji.y - 2.5} Z"/>
          <text x="${fuji.x}" y="${fuji.y + 24}" text-anchor="middle">富士山（新干线车窗）</text>
        </g>
        ${nodes}
        <g class="geo-legend" transform="translate(${pad - 20}, ${H - 18})">
          <line class="geo-rail main" x1="0" y1="0" x2="22" y2="0"/><text x="28" y="4">铁路</text>
          <path class="geo-fly" d="M74,0 L96,0"/><text x="102" y="4">飞机</text>
        </g>
      </svg>`;
  }

  /* ───────────── Overview day cards ───────────── */
  function renderDayCards() {
    $('#day-cards').innerHTML = itinerary.map((d, i) => `
      <a class="day-card" href="#day-${i}">
        <div class="day-card-top">
          <span class="day-no">DAY ${i}</span>
          <span class="day-date">${md(d.date)} ${esc(d.weekday)}</span>
        </div>
        <div class="day-card-city">${esc(d.city)}</div>
        <div class="day-card-title">${esc(d.title)}</div>
        <div class="day-card-tags">${d.highlights.slice(0, 4).map((h) => `<span>${esc(h)}</span>`).join('')}</div>
      </a>`).join('');
  }

  /* ───────────── Timeline items ───────────── */
  function metaChips(it) {
    const chips = [];
    if (it.type === 'spot') {
      if (it.stay) chips.push([ICONS.hourglass, it.stay]);
      if (it.ticket) chips.push([ICONS.ticket, it.ticket.length > 14 ? it.ticket.split('，')[0].split('（')[0] : it.ticket]);
    } else if (it.type === 'transit') {
      if (it.duration) chips.push([ICONS.clock, it.duration]);
      if (it.cost) chips.push([ICONS.yen, it.cost]);
    } else if (it.type === 'meal') {
      if (it.options?.length) chips.push([ICONS.meal, `${it.options.length} 个推荐`]);
    }
    return chips.map(([ic, t]) => `<span class="chip">${ic}${esc(t)}</span>`).join('');
  }

  function tipsList(tips) {
    if (!tips?.length) return '';
    return `<ul class="tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  }

  function itemBody(it) {
    let h = '';
    if (it.type === 'transit') {
      if (it.steps?.length) h += `<ol class="steps">${it.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
      h += tipsList(it.tips);
      return h;
    }
    if (it.type === 'meal') {
      h += `<div class="meal-options">${it.options.map((o) => `
        <div class="meal-opt">
          <div class="meal-opt-head">
            <b>${esc(o.name)}</b>
            ${o.map ? `<a class="map-link small" href="${mapUrl(o.map)}" target="_blank" rel="noopener">${ICONS.map}地图</a>` : ''}
          </div>
          <div class="meal-opt-meta"><span>${esc(o.kind)}</span><span>${esc(o.price)}</span></div>
          ${o.note ? `<p>${esc(o.note)}</p>` : ''}
        </div>`).join('')}</div>`;
      return h;
    }
    if (it.intro) h += `<p class="intro">${esc(it.intro)}</p>`;
    const facts = [];
    if (it.hours) facts.push([ICONS.clock, '开放时间', it.hours]);
    if (it.ticket) facts.push([ICONS.ticket, '门票', it.ticket]);
    if (it.stay) facts.push([ICONS.hourglass, '建议停留', it.stay]);
    if (facts.length) {
      h += `<dl class="facts">${facts.map(([ic, k, v]) => `<div><dt>${ic}${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    }
    h += tipsList(it.tips);
    if (it.map) h += `<a class="map-link" href="${mapUrl(it.map)}" target="_blank" rel="noopener">${ICONS.map}在 Google 地图中打开</a>`;
    return h;
  }

  function hasBody(it) {
    if (it.type === 'transit') return !!(it.steps?.length || it.tips?.length);
    if (it.type === 'meal') return !!it.options?.length;
    return !!(it.intro || it.hours || it.ticket || it.stay || it.tips?.length || it.map);
  }

  function renderItem(it) {
    const sub = it.type === 'transit' ? it.line : it.summary;
    const head = `
      <div class="tl-head">
        <span class="tl-type">${TYPE_LABEL[it.type]}</span>
        <h4>${esc(it.title)}</h4>
        ${it.optional ? '<span class="badge-opt">可选</span>' : ''}
      </div>
      ${sub ? `<div class="tl-sub">${esc(sub)}</div>` : ''}
      <div class="tl-meta">${metaChips(it)}</div>`;

    const card = hasBody(it)
      ? `<details class="tl-card"><summary>${head}${ICONS.chevron}</summary><div class="tl-body">${itemBody(it)}</div></details>`
      : `<div class="tl-card plain">${head}</div>`;

    return `
      <li class="tl-item type-${it.type}" data-type="${it.type}">
        <div class="tl-time">${esc(it.time)}</div>
        <div class="tl-dot">${ICONS[it.type]}</div>
        ${card}
      </li>`;
  }

  /* ───────────── Day sections ───────────── */
  function renderDays() {
    $('#day-chips').innerHTML = itinerary.map((d, i) =>
      `<a href="#day-${i}" data-day="${i}"><b>D${i}</b><span>${md(d.date)}</span></a>`).join('');

    const today = todayInTokyo().getTime();

    $('#day-list').innerHTML = itinerary.map((d, i) => {
      const isToday = parseDate(d.date).getTime() === today;
      return `
      <article class="day ${isToday ? 'is-today' : ''}" id="day-${i}" data-day="${i}">
        <header class="day-head">
          <div class="day-badge">
            <span>DAY</span><b>${i}</b>
          </div>
          <div class="day-head-main">
            <div class="day-head-date">${md(d.date)} ${esc(d.weekday)} · ${esc(d.city)}${isToday ? '<em class="today-tag">今天</em>' : ''}</div>
            <h3>${esc(d.title)}</h3>
            <div class="day-head-meta">
              ${d.base && d.base !== '—' ? `<span>${ICONS.bed}今晚住：${esc(d.base)}</span>` : ''}
              ${d.weather ? `<span>${ICONS.sun}${esc(d.weather)}</span>` : ''}
            </div>
            <div class="day-tags">${d.highlights.map((h) => `<span>${esc(h)}</span>`).join('')}</div>
          </div>
          ${d.items ? `<button class="day-toggle" data-toggle="${i}">展开本日</button>` : ''}
        </header>
        ${d.checklist ? `
          <p class="section-desc">打包时逐项勾选。勾选状态会保存在当前浏览器里。</p>
          <div class="progress"><div class="progress-bar"></div><span></span></div>
          <div class="checklist"></div>
        ` : `<ol class="timeline">${d.items.map(renderItem).join('')}</ol>`}
        ${d.tips?.length ? `<div class="day-tips"><h5>${ICONS.note}今日提示</h5>${tipsList(d.tips)}</div>` : ''}
      </article>`;
    }).join('');
  }

  /* ───────────── Interactions ───────────── */
  function bindToolbar() {
    const list = $('#day-list');

    $('#filters').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      document.querySelectorAll('#filters button').forEach((b) => b.classList.toggle('active', b === btn));
      list.dataset.filter = btn.dataset.filter;
    });

    const setAll = (root, open) => root.querySelectorAll('details.tl-card').forEach((d) => { d.open = open; });
    $('#expand-all').addEventListener('click', () => setAll(list, true));
    $('#collapse-all').addEventListener('click', () => setAll(list, false));

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.day-toggle');
      if (!btn) return;
      const day = btn.closest('.day');
      const anyClosed = [...day.querySelectorAll('details.tl-card')].some((d) => !d.open);
      setAll(day, anyClosed);
      btn.textContent = anyClosed ? '收起本日' : '展开本日';
    });

    window.addEventListener('beforeprint', () => setAll(document, true));

    const chipBar = $('#day-chips');
    const chips = [...chipBar.querySelectorAll('a')];

    // Scroll only the chip bar horizontally; scrollIntoView would also scroll the page
    // and cancel any in-progress smooth scroll.
    const setActive = (n) => {
      let target = null;
      chips.forEach((c) => {
        const on = c.dataset.day === n;
        c.classList.toggle('active', on);
        if (on) target = c;
      });
      if (!target) return;
      const bar = chipBar.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const left = chipBar.scrollLeft + (rect.left - bar.left) - (bar.width - rect.width) / 2;
      chipBar.scrollTo({ left, behavior: 'smooth' });
    };

    let navigating = false;
    let navTimer = 0;
    const endNav = () => { navigating = false; clearTimeout(navTimer); };
    chipBar.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-day]');
      if (!a) return;
      setActive(a.dataset.day);
      navigating = true;
      clearTimeout(navTimer);
      navTimer = setTimeout(endNav, 1500);
    });
    window.addEventListener('scrollend', endNav);
    ['wheel', 'touchstart', 'keydown'].forEach((ev) =>
      window.addEventListener(ev, endNav, { passive: true }));

    const io = new IntersectionObserver((entries) => {
      if (navigating) return;
      entries.forEach((en) => {
        if (en.isIntersecting) setActive(en.target.dataset.day);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.day').forEach((d) => io.observe(d));
  }

  /* ───────────── Checklist ───────────── */
  function renderChecklist(section, groups, storageKey) {
    let state = {};
    try { state = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) { /* ignore */ }

    const list = $('.checklist', section);
    list.innerHTML = groups.map((g) => `
      <div class="check-group">
        <div class="check-group-head"><h3>${esc(g.group)}</h3>${g.due ? `<span>${esc(g.due)}</span>` : ''}</div>
        <ul>${g.items.map((it) => `
          <li class="${it.urgent ? 'urgent' : ''}">
            <label>
              <input type="checkbox" data-id="${esc(it.id)}" ${(state[it.id] ?? it.done) ? 'checked' : ''}/>
              <span class="box"></span>
              <span class="check-text">
                <b>${esc(it.text)}</b>${it.urgent ? '<em>急</em>' : ''}
                ${it.note ? `<small>${esc(it.note)}</small>` : ''}
              </span>
            </label>
          </li>`).join('')}</ul>
      </div>`).join('');

    const update = () => {
      const boxes = [...list.querySelectorAll('input[type=checkbox]')];
      const done = boxes.filter((box) => box.checked).length;
      $('.progress-bar', section).style.width = `${(done / boxes.length) * 100}%`;
      $('.progress span', section).textContent = `已完成 ${done} / ${boxes.length}`;
    };

    list.addEventListener('change', (e) => {
      const cb = e.target;
      if (!cb.matches('input[type=checkbox]')) return;
      state[cb.dataset.id] = cb.checked;
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) { /* ignore */ }
      update();
    });
    update();
  }

  /* ───────────── Shopping ───────────── */
  const SHOP_TAG = { 零食: 'gold', 伴手礼: 'red', 黑五: 'ink', 药品: 'green' };

  function shopPrice(item) {
    const yenPrices = esc(item.price).replace(/(\d[\d,]*)(?:[–-](\d[\d,]*))? 日元/g,
      (price, low, high) => `${price}<span data-yen-low="${low.replace(/,/g, '')}" data-yen-high="${high?.replace(/,/g, '') ?? ''}"></span>`);
    const yenReference = item.referenceCny
      ? `<span data-cny-reference="${item.referenceCny}"></span>` : '';
    return yenPrices + yenReference;
  }

  async function updateShopExchange() {
    const label = $('#shop-exchange');
    const format = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
    const fallback = { date: '2026-11-23', rate: 0.042152 };
    const applyRate = ({ date, rate }, source, url) => {
      label.innerHTML = `参考汇率 ${date} · 100 日元 ≈ ${(rate * 100).toFixed(2)} 元人民币 · <a href="${url}" target="_blank" rel="noopener">${source}</a>。商品为参考价，结算以现场为准。`;
      document.querySelectorAll('#shop-cats [data-yen-low]').forEach((element) => {
        const { yenLow, yenHigh } = element.dataset;
        const low = format.format(yenLow * rate);
        const high = yenHigh && format.format(yenHigh * rate);
        element.textContent = `（约 ${low}${high && high !== low ? `–${high}` : ''} 元人民币）`;
      });
      document.querySelectorAll('#shop-cats [data-cny-reference]').forEach((element) => {
        element.textContent = ` · 中国价折合约 ${format.format(element.dataset.cnyReference / rate)} 日元/桶`;
      });
    };

    applyRate(fallback, '中国银行折算价', 'https://www.boc.cn/sourcedb/whpj/');
    try {
      const response = await fetch('https://api.frankfurter.dev/v2/rate/JPY/CNY', {
        credentials: 'omit',
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return;
      const quote = await response.json();
      if (quote.base === 'JPY' && quote.quote === 'CNY' &&
          /^\d{4}-\d{2}-\d{2}$/.test(quote.date) && quote.date >= fallback.date &&
          Number.isFinite(quote.rate) && quote.rate > 0) {
        applyRate(quote, 'Frankfurter 日度参考价', 'https://frankfurter.dev/');
      }
    } catch (_) { /* Keep the dated fallback quote. */ }
  }

  const shopItem = (it) => `
    <div class="shop-item">
      <div class="shop-item-head">
        <b>${esc(it.name)}</b>
        ${it.city ? `<span class="city-badge">${esc(it.city)}</span>` : ''}
      </div>
      ${it.price ? `<div class="shop-price">${ICONS.yen}<span>${shopPrice(it)}</span></div>` : ''}
      <div class="shop-where">${ICONS.spot}${esc(it.where)}</div>
      ${it.note ? `<p>${esc(it.note)}</p>` : ''}
    </div>`;

  function renderShopping() {
    const S = T.shopping;
    if (!S) return;
    $('#shop-intro').textContent = S.intro;

    $('#shop-plan').innerHTML = S.plan.map((p) => `
      <div class="plan-step tag-${SHOP_TAG[p.tag] || 'gray'}">
        <div class="plan-when">${esc(p.when)}</div>
        <div class="plan-where">${esc(p.where)}</div>
        <div class="plan-what">${esc(p.what)}</div>
        <span class="plan-tag">${esc(p.tag)}</span>
      </div>`).join('');

    $('#shop-tabs').innerHTML = S.categories.map((c, i) => `
      <button data-cat="${esc(c.id)}" class="${i === 0 ? 'active' : ''}">
        <b>${esc(c.title)}</b><small>${esc(c.sub)}</small>
      </button>`).join('');

    $('#shop-tabs').querySelectorAll('button').forEach((btn, i) => {
      const c = S.categories[i];
      const n = c.groups ? c.groups.reduce((m, g) => m + g.items.length, 0) : c.items.length;
      btn.querySelector('b').insertAdjacentHTML('beforeend', `<em>${n}</em>`);
    });

    $('#shop-cats').innerHTML = S.categories.map((c, i) => `
      <div class="shop-cat" data-cat="${esc(c.id)}" ${i === 0 ? '' : 'hidden'}>
        <p class="shop-cat-desc">${esc(c.desc)}</p>
        ${c.groups
          ? c.groups.map((g) => `
            <h4 class="shop-group">${esc(g.name)}<span>${g.items.length}</span></h4>
            <div class="shop-items">${g.items.map(shopItem).join('')}</div>`).join('')
          : `<div class="shop-items">${c.items.map(shopItem).join('')}</div>`}
        ${c.tip ? `<p class="shop-cat-tip">${ICONS.note}${esc(c.tip)}</p>` : ''}
      </div>`).join('');

    updateShopExchange();

    const BF = S.blackFriday;
    if (BF) {
      $('#black-friday').innerHTML = `
        <div class="bf-head">
          <div class="bf-date"><span>BLACK FRIDAY</span><b>11/27</b><small>周五</small></div>
          <div>
            <h3>${esc(BF.title)}</h3>
            <p>${esc(BF.lead)}</p>
          </div>
        </div>
        <div class="bf-list">${BF.items.map((b) => `
          <div class="bf-item">
            <div class="bf-item-head">
              <b>${esc(b.name)}</b>
              ${b.map ? `<a class="map-link small" href="${mapUrl(b.map)}" target="_blank" rel="noopener">${ICONS.map}地图</a>` : ''}
            </div>
            <div class="bf-when">${ICONS.clock}${esc(b.date)}</div>
            <p>${esc(b.what)}</p>
            <p class="bf-fit">${esc(b.fit)}</p>
          </div>`).join('')}</div>
        <ul class="tips">${BF.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
    }

    $('#shop-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-cat]');
      if (!btn) return;
      const id = btn.dataset.cat;
      document.querySelectorAll('#shop-tabs button').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.shop-cat').forEach((el) => { el.hidden = el.dataset.cat !== id; });
    });

    $('#shop-places').innerHTML = S.places.map((p) => `
      <div class="shop-place">
        <div class="shop-place-head">
          <b>${esc(p.name)}</b><span class="city-badge">${esc(p.city)}</span>
        </div>
        <div class="shop-place-meta">
          <span>${ICONS.clock}${esc(p.hours)}</span>
          <span>${ICONS.ticket}${esc(p.best)}</span>
        </div>
        <p>${esc(p.note)}</p>
        <a class="map-link small" href="${mapUrl(p.map)}" target="_blank" rel="noopener">${ICONS.map}地图</a>
      </div>`).join('');

    $('#shop-rules').innerHTML = `
      <h3>回国海关与退税</h3>
      <ul class="tips">${S.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <div class="info-links">${S.sources.map((l) =>
        `<a href="${esc(l.url)}" target="_blank" rel="noopener">${ICONS.link}${esc(l.text)}</a>`).join('')}</div>`;

    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('.shop-cat').forEach((el) => { el.hidden = false; });
    });
  }

  /* ───────────── Info ───────────── */
  function renderInfo() {
    $('#info-grid').innerHTML = T.info.map((c) => `
      <div class="card info-card ${c.highlight ? 'highlight' : ''}">
        <h3>${esc(c.title)}</h3>
        ${c.body.map((p) => `<p>${esc(p)}</p>`).join('')}
        ${c.links?.length ? `<div class="info-links">${c.links.map((l) =>
          `<a href="${esc(l.url)}" target="_blank" rel="noopener">${ICONS.link}${esc(l.text)}</a>`).join('')}</div>` : ''}
      </div>`).join('');
  }

  renderHero();
  renderRoute();
  renderFlights();
  renderGeo();
  renderDayCards();
  renderDays();
  renderChecklist($('#day-0'), T.preparation.checklist, 'japan-trip-2026-packing');
  renderChecklist($('#booking'), T.checklist, 'japan-trip-2026-checklist');
  renderShopping();
  renderInfo();
  bindToolbar();
})();
