/**
 * desert_animation.js — Карavan Сахара
 * ─────────────────────────────────────────────────────────────────
 * v3.0 ФИНАЛ — только небо, солнце, луна, звёзды. Без верблюдов.
 *
 * ✅ Реальное время (Варшава, UTC+2 летом / UTC+1 зимой)
 * ✅ Солнце движется по дуге восход→закат
 * ✅ Красивый оранжево-розово-фиолетовый закат/рассвет (60 мин)
 * ✅ Луна ночью по той же дуге + серп
 * ✅ 110 звёзд мерцают ночью
 * ✅ Canvas position:fixed, 100vw×100vh — на ВЕСЬ экран
 * ✅ Старт/стоп: initDesertAnimation() / stopDesertAnimation()
 *
 * МЕНЯЙ ПОД ДРУГОЙ ГОРОД:
 *   TZ_OFFSET    — смещение UTC (Варшава лето=2, зима=1)
 *   SUNRISE_HOUR — время восхода (5.5 = 5:30)
 *   SUNSET_HOUR  — время заката
 */

(function () {

  // ── ГОРОД ───────────────────────────────────────────────────────
  const TZ_OFFSET      = 2;     // UTC+2 Варшава (лето)
  const SUNRISE_HOUR   = 5.5;   // 5:30
  const SUNSET_HOUR    = 21.0;  // 21:00
  const TRANSITION_MIN = 60;    // минут перехода

  // ── CANVAS (весь экран) ──────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.id = 'desertCanvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    pointer-events: none;
    z-index: 0;
    display: none;
  `;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W, H;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── ЗВЁЗДЫ ──────────────────────────────────────────────────────
  const stars = Array.from({ length: 110 }, () => ({
    x: Math.random(), y: Math.random() * 0.78,
    r: 0.4 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 1.5,
  }));

  // ── HELPERS ─────────────────────────────────────────────────────
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const lerp  = (a,b,t) => a + (b-a)*t;

  function lerpHex(h1, h2, t) {
    const p = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const [r1,g1,b1]=p(h1), [r2,g2,b2]=p(h2);
    return `rgb(${~~lerp(r1,r2,t)},${~~lerp(g1,g2,t)},${~~lerp(b1,b2,t)})`;
  }

  // ── ВРЕМЯ → ФАКТОРЫ ─────────────────────────────────────────────
  function localMin() {
    const now = new Date();
    return (now.getUTCHours()*60 + now.getUTCMinutes() + now.getUTCSeconds()/60 + TZ_OFFSET*60 + 1440) % 1440;
  }

  function getFactors() {
    const lm = localMin();
    const sr = SUNRISE_HOUR * 60, ss = SUNSET_HOUR * 60, h = TRANSITION_MIN / 2;

    let night;
    if      (lm >= sr+h && lm <= ss-h) night = 0;
    else if (lm < sr-h  || lm > ss+h)  night = 1;
    else if (lm >= sr-h && lm <= sr+h) night = 1 - (lm-(sr-h)) / TRANSITION_MIN;
    else                                night =     (lm-(ss-h))  / TRANSITION_MIN;

    let sf = 0;
    if (lm >= sr-h && lm <= sr+h) sf = 1 - Math.abs(lm-sr)/h;
    else if (lm >= ss-h && lm <= ss+h) sf = 1 - Math.abs(lm-ss)/h;

    return { night: clamp(night,0,1), sunsetF: clamp(sf,0,1) };
  }

  function getSunT() {
    const lm=localMin(), sr=SUNRISE_HOUR*60, ss=SUNSET_HOUR*60;
    return clamp((lm-sr)/(ss-sr), 0, 1);
  }

  function getMoonT() {
    const lm=localMin(), ss=SUNSET_HOUR*60;
    const nightLen = SUNRISE_HOUR*60 + 1440 - ss;
    const nm = lm >= ss ? lm-ss : lm+(1440-ss);
    return clamp(nm/nightLen, 0, 1);
  }

  function pos(t) {
    return {
      x: lerp(-W*0.04, W*1.04, t),
      y: lerp(H*0.18,  H*0.06, Math.sin(t*Math.PI)),
    };
  }

  // ── РЕНДЕР ──────────────────────────────────────────────────────
  let raf=null, running=false;

  function tick(ts) {
    if (!running) return;

    const { night, sunsetF } = getFactors();
    const sunT=getSunT(), moonT=getMoonT();

    // НЕБО
    const skyGrad = ctx.createLinearGradient(0,0,0,H);
    skyGrad.addColorStop(0, lerpHex(lerpHex('#050300','#180800',sunsetF),'#00000e',night));
    skyGrad.addColorStop(0.5, lerpHex(lerpHex('#0c0600','#7a1e00',sunsetF),'#000012',night));
    skyGrad.addColorStop(1, lerpHex('#060300','#000008',night));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0,0,W,H);

    // ЗАКАТНЫЙ ОРЕОЛ
    if (sunsetF > 0.02) {
      const sx = pos(sunT).x;

      const gr = ctx.createRadialGradient(sx,H*0.88,0, sx,H*0.88,W*1.1);
      gr.addColorStop(0,    `rgba(255,110,10,${0.62*sunsetF})`);
      gr.addColorStop(0.18, `rgba(230,55,0,${0.46*sunsetF})`);
      gr.addColorStop(0.42, `rgba(155,10,55,${0.28*sunsetF})`);
      gr.addColorStop(0.72, `rgba(65,0,110,${0.14*sunsetF})`);
      gr.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);

      const stripe = ctx.createLinearGradient(0,H*0.70,0,H*0.90);
      stripe.addColorStop(0,    'rgba(255,160,40,0)');
      stripe.addColorStop(0.35, `rgba(255,120,15,${0.52*sunsetF})`);
      stripe.addColorStop(0.75, `rgba(180,40,0,${0.30*sunsetF})`);
      stripe.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle=stripe; ctx.fillRect(0,H*0.70,W,H*0.20);
    }

    // ЗВЁЗДЫ
    if (night > 0.05) {
      stars.forEach(s => {
        ctx.globalAlpha = night * (0.5+0.5*Math.sin(ts*0.001*s.speed+s.phase)) * 0.92;
        ctx.fillStyle='#cce8ff';
        ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1;
    }

    // СОЛНЦЕ
    if (night < 0.97) {
      const sp=pos(sunT), R=Math.min(W,H)*0.085, sa=clamp(1-night*2,0,1);

      const glow=ctx.createRadialGradient(sp.x,sp.y,R*0.3,sp.x,sp.y,R*3.5);
      glow.addColorStop(0,   `rgba(255,210,60,${0.50*sa})`);
      glow.addColorStop(0.35,`rgba(255,100,0,${0.22*sa})`);
      glow.addColorStop(1,   'rgba(200,40,0,0)');
      ctx.globalAlpha=sa; ctx.fillStyle=glow;
      ctx.beginPath(); ctx.arc(sp.x,sp.y,R*3.5,0,Math.PI*2); ctx.fill();

      const rim=ctx.createRadialGradient(sp.x,sp.y,R*0.78,sp.x,sp.y,R);
      rim.addColorStop(0,'#ffe045'); rim.addColorStop(1,'#ff5500');
      ctx.fillStyle=rim; ctx.beginPath(); ctx.arc(sp.x,sp.y,R,0,Math.PI*2); ctx.fill();

      const core=ctx.createRadialGradient(sp.x-R*0.25,sp.y-R*0.25,0,sp.x,sp.y,R*0.9);
      core.addColorStop(0,'#fffce0'); core.addColorStop(0.4,'#ffcc00'); core.addColorStop(1,'#cc3300');
      ctx.fillStyle=core; ctx.beginPath(); ctx.arc(sp.x,sp.y,R*0.88,0,Math.PI*2); ctx.fill();

      ctx.globalAlpha=1;
    }

    // ЛУНА
    if (night > 0.05) {
      const mp=pos(moonT), R=Math.min(W,H)*0.042, ma=clamp(night*1.6,0,1);

      const mg=ctx.createRadialGradient(mp.x,mp.y,R*0.4,mp.x,mp.y,R*4);
      mg.addColorStop(0,  `rgba(110,175,255,${0.30*ma})`);
      mg.addColorStop(0.5,`rgba(55,95,220,${0.10*ma})`);
      mg.addColorStop(1,  'rgba(20,40,180,0)');
      ctx.globalAlpha=ma; ctx.fillStyle=mg;
      ctx.beginPath(); ctx.arc(mp.x,mp.y,R*4,0,Math.PI*2); ctx.fill();

      const md=ctx.createRadialGradient(mp.x-R*0.28,mp.y-R*0.28,0,mp.x,mp.y,R);
      md.addColorStop(0,'#eef5ff'); md.addColorStop(0.55,'#b0caf0'); md.addColorStop(1,'#5880c0');
      ctx.fillStyle=md; ctx.beginPath(); ctx.arc(mp.x,mp.y,R,0,Math.PI*2); ctx.fill();

      ctx.fillStyle='rgba(0,4,20,0.62)';
      ctx.beginPath(); ctx.arc(mp.x+R*0.27,mp.y,R*0.87,0,Math.PI*2); ctx.fill();

      ctx.globalAlpha=1;
    }

    raf = requestAnimationFrame(tick);
  }

  // ── API ──────────────────────────────────────────────────────────
  window.initDesertAnimation = function() {
    if (running) return;
    running=true; canvas.style.display='block';
    raf=requestAnimationFrame(tick);
  };

  window.stopDesertAnimation = function() {
    running=false; canvas.style.display='none';
    if (raf) { cancelAnimationFrame(raf); raf=null; }
  };

})();
