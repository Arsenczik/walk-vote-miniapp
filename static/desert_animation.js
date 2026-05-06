// ============================================================
//  DESERT ANIMATION — Карavan Сахара
//  Интеграция: вставить ПОСЛЕ закрывающего </div> #mainMenu
//  и вызвать initDesertAnimation() при показе mainMenu
// ============================================================

(function() {

// ───── CANVAS SETUP ─────
const canvas = document.createElement('canvas');
canvas.id = 'desertCanvas';
canvas.style.cssText = `
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 0;
`;
document.getElementById('mainMenu').appendChild(canvas);

const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = canvas.offsetWidth;
  H = canvas.height = canvas.offsetHeight;
}
resize();
window.addEventListener('resize', resize);

// ───── CYCLE CONFIG ─────
const CYCLE   = 40000;   // полный цикл: 20 сек день + 20 сек ночь
const DAY_DUR = 20000;
const NIGHT_DUR = 20000;

// ───── STARS ─────
const STAR_COUNT = 80;
const stars = Array.from({length: STAR_COUNT}, () => ({
  x: Math.random(),
  y: Math.random() * 0.65,
  r: 0.5 + Math.random() * 1.5,
  twinkle: Math.random() * Math.PI * 2
}));

// ───── SAND DUNES (layered) ─────
// Каждый слой — набор контрольных точек для кривой Безье
// offset — смещение по X (0..1), скорость разная для параллакса
const DUNE_LAYERS = [
  { speed: 0.00018, color: '#8B5E2A', shadow: '#5a3a10', yBase: 0.88, amplitude: 0.10, waves: 4, offset: 0 },
  { speed: 0.00012, color: '#A0692E', shadow: '#6b3f12', yBase: 0.92, amplitude: 0.08, waves: 3, offset: 0 },
  { speed: 0.00007, color: '#C07830', shadow: '#8a4e14', yBase: 0.95, amplitude: 0.06, waves: 3, offset: 0 },
];

// ───── CAMEL ANIMATION ─────
// Верблюд рисуется процедурно — силуэт из путей
// legPhase идёт от 0 до 2π, шаг зависит от скорости пустыни

function drawCamel(cx, cy, scale, legPhase, nightFactor) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Силуэт цвет: днём тёмно-коричневый, ночью почти чёрный с синеватым отливом
  const baseColor = lerpColor('#1a0f00', '#0a0d1a', nightFactor);
  ctx.fillStyle = baseColor;
  ctx.strokeStyle = baseColor;
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

  // — Тело —
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // — Горб —
  ctx.beginPath();
  ctx.ellipse(-4, -18, 10, 12, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // — Шея —
  ctx.beginPath();
  ctx.moveTo(-16, -8);
  ctx.quadraticCurveTo(-26, -20, -22, -34);
  ctx.quadraticCurveTo(-20, -28, -10, -14);
  ctx.closePath();
  ctx.fill();

  // — Голова —
  ctx.beginPath();
  ctx.ellipse(-24, -37, 9, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // — Морда / нос —
  ctx.beginPath();
  ctx.ellipse(-30, -35, 5, 3.5, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // — Ухо —
  ctx.beginPath();
  ctx.moveTo(-17, -42);
  ctx.lineTo(-14, -48);
  ctx.lineTo(-11, -43);
  ctx.closePath();
  ctx.fill();

  // — Хвост —
  ctx.beginPath();
  ctx.moveTo(28, -4);
  ctx.quadraticCurveTo(38, 2, 34, 12);
  ctx.lineWidth = 3;
  ctx.stroke();

  // — Ноги (4 штуки с анимацией) —
  // Пары: передние и задние, попарный сдвиг фаз
  const legSwing = 10; // амплитуда качания в пикселях
  const legs = [
    { bx: -14, phase: 0        },   // перед-лев
    { bx:  -4, phase: Math.PI  },   // перед-прав
    { bx:  10, phase: Math.PI  },   // зад-лев
    { bx:  20, phase: 0        },   // зад-прав
  ];

  ctx.lineWidth = 5;
  legs.forEach(leg => {
    const swing = Math.sin(legPhase + leg.phase) * legSwing;
    const kneeX = leg.bx + swing * 0.5;
    const kneeY = 20;
    const footX = leg.bx + swing;
    const footY = 36;

    ctx.beginPath();
    ctx.moveTo(leg.bx, 12);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
  });

  // — Глаз (маленькая точка) —
  ctx.fillStyle = lerpColor('#ffffff', '#5599cc', nightFactor);
  ctx.beginPath();
  ctx.arc(-28, -39, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ───── SUN PATH ─────
// Солнце летит по дуге от левого края к правому, касаясь верхней границы
// t=0 → левый край; t=1 → правый край
function sunPos(t) {
  // параметрическая дуга: x линейный, y — парабола с минимумом у верхнего края
  const x = -W * 0.12 + t * (W * 1.24);
  const peak = H * 0.06; // макс. высота солнца (близко к верхней границе)
  const y = peak + (1 - Math.sin(t * Math.PI)) * (-peak + H * 0.18);
  // реально: y от ~0.18*H (края) до peak (середина)
  return { x, y };
}

// Луна — такая же дуга, но движется с задержкой
function moonPos(t) { return sunPos(t); }

// ───── HELPERS ─────
function lerpColor(hex1, hex2, t) {
  const parse = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = parse(hex1);
  const [r2,g2,b2] = parse(hex2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

// ───── MAIN LOOP ─────
let startTime = null;
let animRAF = null;
let running = false;

function tick(ts) {
  if (!running) return;
  if (!startTime) startTime = ts;
  const elapsed = (ts - startTime) % CYCLE;

  const isDayPhase = elapsed < DAY_DUR;
  // t внутри текущей фазы [0..1]
  const phaseT = isDayPhase
    ? elapsed / DAY_DUR
    : (elapsed - DAY_DUR) / NIGHT_DUR;

  // nightFactor: плавный переход день↔ночь
  let nightFactor;
  if (isDayPhase) {
    // конец дня — начало смеркания
    nightFactor = phaseT > 0.75 ? (phaseT - 0.75) / 0.25 : 0;
  } else {
    // ночь, потом рассвет в конце
    nightFactor = phaseT < 0.85 ? 1 : 1 - (phaseT - 0.85) / 0.15;
  }
  nightFactor = clamp(nightFactor, 0, 1);

  // ───── SKY ─────
  const skyDay1   = '#000000';
  const skyDay2   = '#0a0500';
  const skyNight1 = '#000005';
  const skyNight2 = '#00000a';
  const sky1 = lerpColor(skyDay1, skyNight1, nightFactor);
  const sky2 = lerpColor(skyDay2, skyNight2, nightFactor);
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, sky1);
  skyGrad.addColorStop(1, sky2);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // ───── STARS (только ночью) ─────
  if (nightFactor > 0.05) {
    stars.forEach(s => {
      const twink = 0.6 + 0.4 * Math.sin(ts * 0.001 * 2 + s.twinkle);
      ctx.globalAlpha = nightFactor * twink * 0.9;
      ctx.fillStyle = '#cce8ff';
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ───── SUN ─────
  if (!isDayPhase === false || nightFactor < 0.95) {
    // Солнце видно в дневной фазе и на переходах
    const sunAlpha = isDayPhase ? clamp(1 - nightFactor * 2, 0, 1) : 0;
    if (sunAlpha > 0) {
      const sp = sunPos(phaseT > 1 ? 1 : phaseT);
      const sunR = W * 0.09;

      // Внешнее свечение
      const glowGrad = ctx.createRadialGradient(sp.x, sp.y, sunR * 0.5, sp.x, sp.y, sunR * 2.5);
      glowGrad.addColorStop(0, `rgba(255,180,0,${0.35 * sunAlpha})`);
      glowGrad.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.globalAlpha = sunAlpha;
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sunR * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Обод
      const rimGrad = ctx.createRadialGradient(sp.x, sp.y, sunR * 0.85, sp.x, sp.y, sunR);
      rimGrad.addColorStop(0, '#ffcc00');
      rimGrad.addColorStop(1, '#ff6600');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Ядро
      const coreGrad = ctx.createRadialGradient(sp.x - sunR*0.2, sp.y - sunR*0.2, 0, sp.x, sp.y, sunR * 0.85);
      coreGrad.addColorStop(0, '#fff0aa');
      coreGrad.addColorStop(0.5, '#ff9900');
      coreGrad.addColorStop(1, '#cc4400');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sunR * 0.88, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }
  }

  // ───── MOON ─────
  if (nightFactor > 0.05) {
    const mp = moonPos(phaseT);
    const moonR = W * 0.045;  // в два раза меньше солнца
    const moonAlpha = clamp(nightFactor * 1.4, 0, 1);

    // Свечение луны (синеватое)
    const moonGlow = ctx.createRadialGradient(mp.x, mp.y, moonR * 0.5, mp.x, mp.y, moonR * 3);
    moonGlow.addColorStop(0, `rgba(120,170,255,${0.25 * moonAlpha})`);
    moonGlow.addColorStop(1, 'rgba(50,80,180,0)');
    ctx.globalAlpha = moonAlpha;
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mp.x, mp.y, moonR * 3, 0, Math.PI * 2);
    ctx.fill();

    // Сама луна
    const moonGrad = ctx.createRadialGradient(mp.x - moonR*0.3, mp.y - moonR*0.3, 0, mp.x, mp.y, moonR);
    moonGrad.addColorStop(0, '#e8f0ff');
    moonGrad.addColorStop(0.6, '#b0c8f0');
    moonGrad.addColorStop(1, '#7090c8');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(mp.x, mp.y, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Тень на луне (серп)
    ctx.fillStyle = lerpColor('#000010', '#000018', 0.5);
    ctx.globalAlpha = moonAlpha * 0.55;
    ctx.beginPath();
    ctx.arc(mp.x + moonR * 0.25, mp.y, moonR * 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  // ───── SAND HORIZON GLOW ─────
  // Полоса горизонта — оранжевая днём, тёмно-синяя ночью
  const horizonY = H * 0.82;
  const horizonColorDay   = 'rgba(180,80,0,0.18)';
  const horizonColorNight = 'rgba(20,40,120,0.22)';
  const hGrad = ctx.createLinearGradient(0, horizonY - H*0.12, 0, horizonY + H*0.08);
  hGrad.addColorStop(0, 'rgba(0,0,0,0)');
  hGrad.addColorStop(0.5, nightFactor < 0.5
    ? horizonColorDay
    : lerpColor('#b45000', '#14287a', nightFactor).replace('rgb','rgba').replace(')',',0.18)')
  );
  hGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, horizonY - H*0.12, W, H*0.2);

  // ───── DUNE LAYERS ─────
  // Обновляем смещение (parallax)
  DUNE_LAYERS.forEach(layer => {
    layer.offset = (layer.offset + layer.speed * 16) % 1;
  });

  DUNE_LAYERS.forEach((layer, li) => {
    // Ночной цвет дюн — тёмно-синий оттенок
    const sandColor   = lerpColor(layer.color, '#0d1a2e', nightFactor * 0.7);
    const shadowColor = lerpColor(layer.shadow, '#060d18', nightFactor * 0.7);

    const baseY = H * layer.yBase;
    const amp   = H * layer.amplitude;

    ctx.beginPath();
    ctx.moveTo(0, H);

    // Генерируем плавную кривую через контрольные точки
    const points = layer.waves + 2;
    const segW = W / layer.waves;

    for (let i = 0; i <= layer.waves * 2; i++) {
      const rawX = (i / (layer.waves * 2) - layer.offset) * W * 2;
      const x = ((rawX % (W * 2)) + W * 2) % (W * 2) - W * 0.5;
      const y = baseY - amp * Math.pow(Math.sin((i / (layer.waves * 2)) * Math.PI * layer.waves), 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(W + W*0.5, H);
    ctx.lineTo(-W*0.5, H);
    ctx.closePath();

    // Основной градиент — подсвечивание верхней части дюны
    const dGrad = ctx.createLinearGradient(0, baseY - amp, 0, H);
    dGrad.addColorStop(0, sandColor);
    dGrad.addColorStop(0.4, shadowColor);
    dGrad.addColorStop(1, shadowColor);
    ctx.fillStyle = dGrad;
    ctx.fill();
  });

  // ───── SMOOTH DUNE OVERLAY (Bezier) ─────
  // Передний план — красивые плавные дюны через кривые Безье
  drawBeautifulDunes(ts, nightFactor);

  // ───── CAMELS ─────
  const legPhase = (ts * 0.003) % (Math.PI * 2);
  const cY = H * 0.88;
  const cScale = H * 0.0038;

  // Два верблюда по центру, чуть смещены
  drawCamel(W * 0.44, cY, cScale, legPhase, nightFactor);
  drawCamel(W * 0.56, cY, cScale, legPhase + Math.PI, nightFactor);

  // ───── MOONLIGHT OVERLAY ─────
  if (nightFactor > 0.1) {
    const moonlightGrad = ctx.createLinearGradient(0, 0, 0, H);
    moonlightGrad.addColorStop(0, `rgba(10,20,80,${nightFactor * 0.25})`);
    moonlightGrad.addColorStop(0.7, `rgba(5,10,50,${nightFactor * 0.15})`);
    moonlightGrad.addColorStop(1, `rgba(0,5,30,${nightFactor * 0.10})`);
    ctx.fillStyle = moonlightGrad;
    ctx.fillRect(0, 0, W, H);
  }

  animRAF = requestAnimationFrame(tick);
}

// ───── BEAUTIFUL DUNES (Bezier overlay) ─────
function drawBeautifulDunes(ts, nightFactor) {
  const speed = ts * 0.000055;
  const frontY = H * 0.91;
  const amp = H * 0.055;

  // Два слоя переднего плана
  [
    { yBase: 0.91, amp: 0.055, speed: 1.0,  colorDay: '#6b3a0a', colorNight: '#080f1c', shift: 0 },
    { yBase: 0.945, amp: 0.035, speed: 0.65, colorDay: '#7d4410', colorNight: '#0c1525', shift: 2.1 },
  ].forEach(layer => {
    const baseY = H * layer.yBase;
    const lAmp  = H * layer.amp;
    const off   = speed * layer.speed + layer.shift;

    ctx.beginPath();
    ctx.moveTo(-10, H + 10);
    ctx.lineTo(-10, baseY);

    const segs = 8;
    for (let i = 0; i <= segs; i++) {
      const x = (i / segs) * (W + 20) - 10;
      const y = baseY - lAmp * Math.pow(Math.sin(off + i * 0.9), 2);
      if (i === 0) { ctx.lineTo(x, y); continue; }
      const px = ((i-1) / segs) * (W + 20) - 10;
      const py = baseY - lAmp * Math.pow(Math.sin(off + (i-1) * 0.9), 2);
      const mx = (px + x) / 2;
      ctx.quadraticCurveTo(px, py, mx, (py + y) / 2);
    }
    ctx.lineTo(W + 10, baseY);
    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();

    const color = lerpColor(layer.colorDay, layer.colorNight, nightFactor * 0.75);
    const dg = ctx.createLinearGradient(0, baseY - lAmp, 0, H);
    dg.addColorStop(0, color);
    dg.addColorStop(1, lerpColor(layer.colorDay, layer.colorNight, 0.9));
    ctx.fillStyle = dg;
    ctx.fill();
  });
}

// ───── PUBLIC API ─────
window.initDesertAnimation = function() {
  if (running) return;
  running = true;
  startTime = null;
  animRAF = requestAnimationFrame(tick);
};

window.stopDesertAnimation = function() {
  running = false;
  if (animRAF) { cancelAnimationFrame(animRAF); animRAF = null; }
};

// Автостарт при загрузке, если mainMenu уже виден
if (document.getElementById('mainMenu').style.display !== 'none') {
  initDesertAnimation();
}

})();
