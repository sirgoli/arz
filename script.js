/* میز ارز — script.js */
(function(){
  "use strict";

  // ---------------- asset definitions ----------------
  // forex: price stored directly in Toman per 1 unit
  // crypto: price stored in USD per 1 unit, converted via live USD/Toman rate
  const forex = [
    {id:'USD', name:'دلار آمریکا', flag:'🇺🇸', price:260000, vol:0.0010, base:0},
    {id:'EUR', name:'یورو',        flag:'🇪🇺', price:290600, vol:0.0012, base:0},
    {id:'GBP', name:'پوند انگلیس', flag:'🇬🇧', price:343100, vol:0.0013, base:0},
    {id:'AED', name:'درهم امارات', flag:'🇦🇪', price:70930,  vol:0.0009, base:0},
    {id:'TRY', name:'لیر ترکیه',   flag:'🇹🇷', price:5297,   vol:0.0030, base:0},
    {id:'CNY', name:'یوان چین',    flag:'🇨🇳', price:39000,  vol:0.0010, base:0},
    {id:'CAD', name:'دلار کانادا', flag:'🇨🇦', price:182300, vol:0.0011, base:0},
    {id:'SAR', name:'ریال سعودی',  flag:'🇸🇦', price:69440,  vol:0.0008, base:0},
  ];
  const crypto = [
    {id:'BTC', name:'بیت‌کوین',  ic:'₿', priceUsd:83400,   vol:0.0035, base:0},
    {id:'ETH', name:'اتریوم',    ic:'Ξ', priceUsd:2510,    vol:0.0045, base:0},
    {id:'USDT',name:'تتر',       ic:'₮', priceUsd:1.000,   vol:0.0004, base:0},
    {id:'BNB', name:'بایننس‌کوین',ic:'B', priceUsd:745,     vol:0.0040, base:0},
    {id:'SOL', name:'سولانا',    ic:'S', priceUsd:108,     vol:0.0060, base:0},
    {id:'XRP', name:'ریپل',      ic:'X', priceUsd:1.37,    vol:0.0055, base:0},
    {id:'ADA', name:'کاردانو',   ic:'A', priceUsd:0.235,   vol:0.0050, base:0},
    {id:'DOGE',name:'دوج‌کوین',  ic:'Ð', priceUsd:0.0848,   vol:0.0075, base:0},
  ];
  forex.forEach(a=>a.base=a.price);
  crypto.forEach(a=>a.base=a.priceUsd);

  const HIST_LEN = 24;
  [...forex, ...crypto].forEach(a=>{
    const p = a.price !== undefined ? a.price : a.priceUsd;
    a.hist = new Array(HIST_LEN).fill(p);
    a.changePct = 0;
    a.lastDir = 0;
  });

  function usdRate(){ return forex.find(f=>f.id==='USD').price; }

  function rialOf(kind, id){
    if(kind==='UNIT'){
      return id==='TOMAN' ? 10 : 1; // rial base
    }
    if(kind==='FOREX'){
      const f = forex.find(x=>x.id===id);
      return f.price * 10;
    }
    if(kind==='CRYPTO'){
      const c = crypto.find(x=>x.id===id);
      return c.priceUsd * usdRate() * 10;
    }
    return 0;
  }

  // ---------------- number formatting ----------------
  function fmt(n, maxDec){
    if(n===undefined || isNaN(n)) return '0';
    let dec = maxDec;
    if(dec===undefined){
      if(n >= 1000) dec = 0;
      else if(n >= 1) dec = 2;
      else if(n >= 0.01) dec = 4;
      else dec = 8;
    }
    return n.toLocaleString('en-US', {maximumFractionDigits:dec, minimumFractionDigits:0});
  }
  function humanizeToman(n){
    if(n >= 1e12) return (n/1e12).toFixed(2)+' هزار میلیارد تومان';
    if(n >= 1e9)  return (n/1e9).toFixed(2)+' میلیارد تومان';
    if(n >= 1e6)  return (n/1e6).toFixed(1)+' میلیون تومان';
    return fmt(n)+' تومان';
  }

  // ---------------- build UI: cards ----------------
  const cryptoGrid = document.getElementById('cryptoGrid');
  const forexGrid = document.getElementById('forexGrid');

  function sparkSvg(hist, up){
    const w=100,h=34, min=Math.min(...hist), max=Math.max(...hist);
    const range = (max-min)||1;
    const pts = hist.map((v,i)=>{
      const x = (i/(hist.length-1))*w;
      const y = h - ((v-min)/range)*h;
      return x.toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    const color = up ? 'var(--up)' : 'var(--down)';
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function buildCard(asset, kind){
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = asset.id;
    el.dataset.name = asset.name;
    const icon = kind==='crypto' ? asset.ic : asset.flag;
    el.innerHTML = `
      <div class="card-top">
        <div class="asset-id">
          <div class="asset-ic">${icon}</div>
          <div>
            <div class="asset-name">${asset.name}</div>
            <div class="asset-sym">${asset.id}</div>
          </div>
        </div>
        <div class="chg up" data-role="chg">0.00%</div>
      </div>
      <div class="card-price num" data-role="price">0</div>
      <div class="card-sub" data-role="sub"></div>
      <div data-role="spark"></div>
    `;
    return el;
  }

  crypto.forEach(a=> cryptoGrid.appendChild(buildCard(a,'crypto')));
  forex.forEach(a=> forexGrid.appendChild(buildCard(a,'forex')));
  document.getElementById('cryptoCount').textContent = crypto.length + ' دارایی';
  document.getElementById('forexCount').textContent = forex.length + ' ارز';

  function renderCard(asset, kind){
    const el = document.querySelector(`.card[data-id="${asset.id}"]`);
    if(!el) return;
    const rial = rialOf(kind==='crypto'?'CRYPTO':'FOREX', asset.id);
    const toman = rial/10;
    const priceEl = el.querySelector('[data-role="price"]');
    const subEl = el.querySelector('[data-role="sub"]');
    const chgEl = el.querySelector('[data-role="chg"]');
    const sparkEl = el.querySelector('[data-role="spark"]');

    priceEl.innerHTML = fmt(toman) + ' <small>تومان</small>';
    if(kind==='crypto'){
      subEl.textContent = '$' + fmt(asset.priceUsd, asset.priceUsd<1?4:2) + '  ·  ' + humanizeToman(toman);
    } else {
      subEl.textContent = '۱ ' + asset.id + ' = ' + fmt(toman) + ' تومان';
    }
    const up = asset.changePct >= 0;
    chgEl.textContent = (up?'+':'') + asset.changePct.toFixed(2) + '%';
    chgEl.className = 'chg num ' + (up?'up':'down');
    sparkEl.innerHTML = sparkSvg(asset.hist, up);

    if(asset.lastDir !== 0){
      el.classList.remove('flash-up','flash-down');
      void el.offsetWidth;
      el.classList.add(asset.lastDir>0?'flash-up':'flash-down');
    }
  }

  // ---------------- ticker tape ----------------
  const tickerIds = ['USD','EUR','BTC','ETH','USDT','GBP','SOL','TRY'];
  function tickerAsset(id){
    return forex.find(f=>f.id===id) || crypto.find(c=>c.id===id);
  }
  function buildTicker(){
    const track = document.getElementById('tickerTrack');
    const list = tickerIds.map(id=>{
      const a = tickerAsset(id);
      const kind = forex.includes(a) ? 'forex':'crypto';
      const toman = rialOf(kind==='crypto'?'CRYPTO':'FOREX', a.id)/10;
      const up = a.changePct>=0;
      return `<span class="ticker-item"><b>${a.id}</b><span class="num">${fmt(toman)} ت</span><span class="${up?'chg-up':'chg-down'} num">${up?'▲':'▼'} ${Math.abs(a.changePct).toFixed(2)}%</span></span>`;
    }).join('');
    track.innerHTML = list + list; // duplicate for seamless loop
  }

  // ---------------- converter ----------------
  const selFrom = document.getElementById('selectFrom');
  const selTo = document.getElementById('selectTo');
  const amountFrom = document.getElementById('amountFrom');
  const amountTo = document.getElementById('amountTo');
  const rateText = document.getElementById('rateText');

  function optionList(){
    let html = '<optgroup label="واحد ریالی">';
    html += `<option value="UNIT:TOMAN">تومان</option>`;
    html += `<option value="UNIT:IRR">ریال</option>`;
    html += '</optgroup><optgroup label="ارز دیجیتال">';
    crypto.forEach(a=> html += `<option value="CRYPTO:${a.id}">${a.name} (${a.id})</option>`);
    html += '</optgroup><optgroup label="ارز خارجی">';
    forex.forEach(a=> html += `<option value="FOREX:${a.id}">${a.name} (${a.id})</option>`);
    html += '</optgroup>';
    return html;
  }
  selFrom.innerHTML = optionList();
  selTo.innerHTML = optionList();
  selFrom.value = 'CRYPTO:BTC';
  selTo.value = 'UNIT:TOMAN';

  function parseSel(v){ const [kind,id] = v.split(':'); return {kind,id}; }
  function labelOf(kind,id){
    if(kind==='UNIT') return id==='TOMAN'?'تومان':'ریال';
    if(kind==='CRYPTO') return crypto.find(a=>a.id===id).name;
    return forex.find(a=>a.id===id).name;
  }

  function updateConverter(){
    const from = parseSel(selFrom.value);
    const to = parseSel(selTo.value);
    const amt = parseFloat((amountFrom.value||'0').replace(/,/g,'')) || 0;
    const fromRial = rialOf(from.kind, from.id);
    const toRial = rialOf(to.kind, to.id);
    const result = toRial>0 ? (amt * fromRial) / toRial : 0;
    let dec = result>=1000?2:(result>=1?4:8);
    amountTo.value = fmt(result, dec);

    const oneRate = fromRial/toRial;
    rateText.innerHTML = `۱ <b>${labelOf(from.kind,from.id)}</b> = <span class="num">${fmt(oneRate, oneRate>=1000?0:6)}</span> <b>${labelOf(to.kind,to.id)}</b>`;
  }

  selFrom.addEventListener('change', updateConverter);
  selTo.addEventListener('change', updateConverter);
  amountFrom.addEventListener('input', ()=>{
    amountFrom.value = amountFrom.value.replace(/[^0-9.]/g,'');
    updateConverter();
  });
  document.getElementById('swapBtn').addEventListener('click', ()=>{
    const f = selFrom.value; selFrom.value = selTo.value; selTo.value = f;
    updateConverter();
  });

  // ---------------- search filter ----------------
  document.getElementById('searchInput').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.card').forEach(card=>{
      const hit = card.dataset.name.toLowerCase().includes(q) || card.dataset.id.toLowerCase().includes(q);
      card.style.display = hit ? '' : 'none';
    });
  });

  // ---------------- theme toggle ----------------
  const themeBtn = document.getElementById('themeToggle');
  themeBtn.addEventListener('click', ()=>{
    const root = document.documentElement;
    const next = root.getAttribute('data-theme')==='dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    themeBtn.textContent = next==='dark' ? '🌙' : '☀️';
  });

  // ---------------- clock ----------------
  function tickClock(){
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Tehran', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false}).format(now);
    const date = new Intl.DateTimeFormat('fa-IR', {timeZone:'Asia/Tehran', weekday:'long', day:'numeric', month:'long'}).format(now);
    document.getElementById('clockTime').textContent = time;
    document.getElementById('clockDate').textContent = date + ' - تهران';
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ---------------- live data layer (real APIs + simulation fallback) ----------------
  const LIVE_TTL = 120000; // data older than 2 min counts as stale -> fall back to simulation
  const src = { crypto:{ok:false, at:0}, fx:{ok:false, at:0}, usd:{ok:false, at:0}, iran:{ok:false, at:0} };
  let iranRates = null;
  let fxRates = null;
  const fresh = s => s.ok && (Date.now() - s.at) < LIVE_TTL;

  const cgIds = {BTC:'bitcoin',ETH:'ethereum',USDT:'tether',BNB:'binancecoin',SOL:'solana',XRP:'ripple',ADA:'cardano',DOGE:'dogecoin'};

  async function fj(url, opts){
    const ctl = new AbortController();
    const t = setTimeout(()=>ctl.abort(), 9000);
    try{
      const r = await fetch(url, Object.assign({signal: ctl.signal}, opts||{}));
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  function applyLive(asset, key, value){
    if(!(value > 0) || !isFinite(value)) return;
    const prev = asset[key];
    if(!asset.live){
      asset.base = value;
      asset.hist = new Array(HIST_LEN).fill(value);
      asset.lastDir = 0;
    } else {
      asset.hist.push(value);
      if(asset.hist.length > HIST_LEN) asset.hist.shift();
      asset.lastDir = value > prev ? 1 : (value < prev ? -1 : 0);
    }
    asset[key] = value;
    asset.changePct = ((value - asset.base) / asset.base) * 100;
    asset.live = true;
    asset.liveAt = Date.now();
  }

  async function fetchCrypto(){
    try{
      const ids = Object.values(cgIds).join(',');
      const d = await fj('https://api.coingecko.com/api/v3/simple/price?ids='+ids+'&vs_currencies=usd');
      let n = 0;
      crypto.forEach(c=>{ const v = d[cgIds[c.id]] && d[cgIds[c.id]].usd; if(v>0){ applyLive(c,'priceUsd',v); n++; } });
      if(!n) throw new Error('empty');
      src.crypto = {ok:true, at:Date.now()};
    }catch(e1){
      try{
        const fs = crypto.map(c=>c.id).join(',');
        const d = await fj('https://min-api.cryptocompare.com/data/pricemulti?fsyms='+fs+'&tsyms=USD');
        let n = 0;
        crypto.forEach(c=>{ const v = d[c.id] && d[c.id].USD; if(v>0){ applyLive(c,'priceUsd',v); n++; } });
        if(!n) throw new Error('empty');
        src.crypto = {ok:true, at:Date.now()};
      }catch(e1b){
      try{
        const syms = ['BTC','ETH','BNB','SOL','XRP','ADA','DOGE'].map(s=>s+'USDT');
        const d = await fj('https://api.binance.com/api/v3/ticker/price?symbols='+encodeURIComponent(JSON.stringify(syms)));
        d.forEach(row=>{
          const id = row.symbol.replace('USDT','');
          const c = crypto.find(x=>x.id===id);
          if(c) applyLive(c,'priceUsd',parseFloat(row.price));
        });
        src.crypto = {ok:true, at:Date.now()};
      }catch(e2){ src.crypto.ok = false; }
      }
    }
    refreshAll();
  }

  async function fetchFx(){
    try{
      const d = await fj('https://open.er-api.com/v6/latest/USD');
      if(d && d.rates){ fxRates = d.rates; src.fx = {ok:true, at:Date.now()}; }
    }catch(e){ src.fx.ok = false; }
    refreshAll();
  }

  function normToman(v){
    v = parseFloat(v);
    if(!isFinite(v)) return null;
    if(v > 1e6) v = v/10;               // value was in Rial
    return (v > 20000 && v < 2e6) ? v : null; // sanity range
  }

  async function fetchUsdToman(){
    const tries = [
      async()=>{ const d = await fj('https://api.nobitex.ir/v3/orderbook/USDTIRT'); return normToman(d.lastTradePrice); },
      async()=>{ const d = await fj('https://api.nobitex.ir/market/stats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({srcCurrency:'usdt',dstCurrency:'rls'})}); return normToman(d.stats['usdt-rls'].latest); },
      async()=>{ const d = await fj('https://api.wallex.ir/v1/markets'); return normToman(d.result.symbols.USDTTMN.stats.lastPrice); },
    ];
    // tgju: returns many Iranian-market rates (in Rial) in one call; try directly, then via a CORS relay
    const tgjuParse = (d)=>{
      const cur = d && d.current; if(!cur) return null;
      const g = k => cur[k] && cur[k].p ? normToman(String(cur[k].p).replace(/,/g,'')) : null;
      return { USD:g('price_dollar_rl'), EUR:g('price_eur'), GBP:g('price_gbp'), AED:g('price_aed'),
               TRY:g('price_try'), CNY:g('price_cny'), CAD:g('price_cad'), SAR:g('price_sar') };
    };
    const tgjuTry = async(url)=>{
      const d = await fj(url);
      const r = tgjuParse(d);
      if(!r || !r.USD) throw new Error('no usd');
      iranRates = r; src.iran = {ok:true, at:Date.now()};
      return r.USD;
    };
    tries.unshift(
      ()=>tgjuTry('https://call5.tgju.org/ajax.json'),
      ()=>tgjuTry('https://api.allorigins.win/raw?url='+encodeURIComponent('https://call5.tgju.org/ajax.json'))
    );
    for(const t of tries){
      try{
        const v = await t();
        if(v){
          applyLive(forex.find(f=>f.id==='USD'),'price',v);
          src.usd = {ok:true, at:Date.now()};
          refreshAll();
          return;
        }
      }catch(e){ /* try next source */ }
    }
    src.usd.ok = false;
    refreshAll();
  }

  // ---------------- status text ----------------
  function updateStatus(){
    const lc = fresh(src.crypto), lf = fresh(src.fx) || fresh(src.iran), lu = fresh(src.usd);
    const tag = (ok)=> ok ? 'زنده' : 'شبیه‌سازی';
    const el = document.getElementById('liveStatus');
    const foot = document.getElementById('footNote');
    if(lc && lf && lu){
      el.textContent = '🟢 همه‌ی قیمت‌ها زنده و از بازار گرفته می‌شوند';
    } else if(lc || lf || lu){
      el.textContent = '🟡 کریپتو: '+tag(lc)+' · ارزها: '+tag(lf)+' · دلار به تومان: '+tag(lu);
    } else {
      el.textContent = '🔴 اتصال به منابع قیمت برقرار نیست؛ قیمت‌ها شبیه‌سازی می‌شوند';
    }
    if(lc || lf || lu){
      foot.innerHTML = 'منبع داده‌ها: کریپتو از <b>CoinGecko</b> (یا CryptoCompare/Binance)، دلار و ارزهای بازار ایران از <b>TGJU</b> و در صورت قطع بودن از قیمت تتر در <b>نوبیتکس/والکس</b>، و نرخ جهانی ارزها از <b>open.er-api.com</b>. بخش‌هایی که متصل نیستند به‌صورت شبیه‌سازی نمایش داده می‌شوند. برای تصمیم‌های مالی از منابع رسمی بازار استفاده کنید.';
    } else {
      foot.innerHTML = 'در حال حاضر داده‌ها به‌صورت <b>شبیه‌سازی زنده</b> هستند (اتصال به منابع قیمت برقرار نشد) و صرفاً جنبه‌ی نمایشی دارند.';
    }
  }

  // ---------------- simulation fallback ----------------
  let secsSinceTick = 0;
  function randWalk(asset, key){
    const cur = asset[key];
    let spike = (Math.random() < 0.06) ? 3.2 : 1;
    const delta = (Math.random()-0.5) * 2 * asset.vol * spike;
    let next = cur * (1 + delta);
    if(next <= 0) next = cur;
    asset[key] = next;
    asset.hist.push(next);
    if(asset.hist.length > HIST_LEN) asset.hist.shift();
    asset.lastDir = next > cur ? 1 : (next < cur ? -1 : 0);
    asset.changePct = ((next - asset.base) / asset.base) * 100;
  }

  function stepPrices(){
    const usd = forex.find(f=>f.id==='USD');
    // USD/Toman
    if(!(usd.live && fresh(src.usd))){ usd.live = false; randWalk(usd,'price'); }
    // other fiat: derived from live cross rates when available
    forex.forEach(a=>{
      if(a.id==='USD') return;
      if(iranRates && fresh(src.iran) && iranRates[a.id] > 0){
        applyLive(a,'price', iranRates[a.id]);
      } else if(fxRates && fresh(src.fx) && fxRates[a.id] > 0){
        applyLive(a,'price', usd.price / fxRates[a.id]);
      } else { a.live = false; randWalk(a,'price'); }
    });
    // crypto
    crypto.forEach(a=>{
      if(a.live && fresh(src.crypto)) return;
      a.live = false; randWalk(a,'priceUsd');
    });
  }

  function refreshAll(){
    stepPrices();
    crypto.forEach(a=> renderCard(a,'crypto'));
    forex.forEach(a=> renderCard(a,'forex'));
    buildTicker();
    updateConverter();
    updateStatus();
    secsSinceTick = 0;
    document.getElementById('lastTick').textContent = 'هم‌اکنون به‌روزرسانی شد';
  }

  function tickAgeLoop(){
    secsSinceTick++;
    document.getElementById('lastTick').textContent = secsSinceTick + ' ثانیه پیش';
  }

  // initial paint, then go live
  crypto.forEach(a=> renderCard(a,'crypto'));
  forex.forEach(a=> renderCard(a,'forex'));
  buildTicker();
  updateConverter();
  updateStatus();

  fetchUsdToman(); fetchCrypto(); fetchFx();
  setInterval(fetchUsdToman, 10000);
  setInterval(fetchCrypto, 10000);
  setInterval(fetchFx, 300000);
  setInterval(refreshAll, 2500);   // keeps simulated parts moving and re-checks freshness
  setInterval(tickAgeLoop, 1000);

})();
