const $ = (id) => document.getElementById(id);

// Split text into spans so each letter or word can animate in sequence
function wrapLetters(el) {
  el.innerHTML = [...el.textContent].map((ch, i) =>
    `<span class="ch" style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
}
function wrapWords(el) {
  el.innerHTML = el.textContent.split(' ').map((w, i) =>
    `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
}

fetch('data.json')
  .then((r) => r.json())
  .then(init)
  .catch(() => {
    $('openBtn').insertAdjacentHTML('afterend',
      '<p style="position:absolute;bottom:20px;color:#2E4B7A;text-align:center;width:100%">Could not load data.json. Open this page through a local server (see README).</p>');
  });

function init(d) {
  document.title = d.pageTitle;
  const { pageTitle: p, couple: c, event: e, sections: s } = d;

  $('monogram').textContent = p[0] + ' & ' + p[0];
  $('eventType1').textContent = d.hero.label1;
  $('eventType2').textContent = d.hero.label2;
  $('p1').textContent = c.partner1;
  $('p2').textContent = c.partner2;
  wrapLetters($('p1'));
  wrapLetters($('p2'));
  $('intro').textContent = d.intro;
  wrapWords($('intro'));
  if (d.heroImage) {
    $('hero').style.setProperty('--hero', `url("${d.heroImage}")`);
    $('hero').classList.add('has-photo');
  }
  $('dateText').textContent = e.displayDate;
  $('timeText').textContent = e.displayTime;
  $('saveBtn').textContent = d.saveTheDate;
  $('saveBtn').addEventListener('click', () => downloadIcs(d));

  // Section toggles
  const map = { scratch: 'scratchSec', slideshow: 'slideSec', countdown: 'countSec', program: 'progSec',
                venue: 'venueSec', preEvents: 'preSec', transport: 'transSec', gifts: 'giftSec', rsvp: 'rsvpSec' };
  Object.entries(map).forEach(([k, id]) => { if (s[k] === false) $(id).hidden = true; });

  // Slideshow
  $('slideTitle').textContent = d.slideTitle;
  $('slides').innerHTML = d.slideshow.map((src, i) => `<img src="${src}" alt="Photo ${i + 1}" class="${i ? '' : 'on'}">`).join('');
  const imgs = [...document.querySelectorAll('#slides img')];
  let cur = 0;
  if (imgs.length > 1) setInterval(() => {
    imgs[cur].classList.remove('on');
    cur = (cur + 1) % imgs.length;
    imgs[cur].classList.add('on');
  }, 3500);

  // Countdown title
  $('countTitle').textContent = d.countTitle;

  // Program timeline (grouped by day)
  $('progTitle').textContent = d.programTitle;
  $('program').innerHTML = d.programTimeline.map((day) =>
    `<div class="day"><h4>${day.date}</h4>` +
    day.items.map((it) => `<div class="row"><span class="time">${it.time}</span><div class="info"><h3>${it.title}</h3><p>${it.desc}</p></div></div>`).join('') +
    `</div>`).join('');

  document.querySelectorAll('.row').forEach((r, i) => r.style.setProperty('--r', i));

  // Venue
  const v = d.venue;
  $('venueTitle').textContent = d.venueTitle;
  $('venueName').textContent = v.name;
  $('venueAddr').textContent = v.address;
  $('mapFrame').src = v.mapEmbed;
  $('mapLink').href = v.mapLink;
  $('mapLink').textContent = v.mapButton;

  // Pre-wedding events
  $('preTitle').textContent = d.preTitle;
  $('timeline').innerHTML = d.preEvents.map((p) =>
    `<div class="day"><h4>${p.date}</h4><div class="row"><span class="time">${p.time}</span><div class="info"><h3>${p.title}</h3><p>${p.place}</p></div></div></div>`).join('');

  // Transport & gifts
  $('transTitle').textContent = d.transport.title;
  $('transText').textContent = d.transport.text;
  $('giftTitle').textContent = d.gifts.title;
  $('giftText').textContent = d.gifts.text;

  // RSVP
  $('rsvpTitle').textContent = d.rsvp.title;
  $('sendBtn').textContent = d.rsvp.send;
  $('rsvpForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const entry = Object.fromEntries(new FormData(ev.target));
    entry.at = new Date().toISOString();
    try { // demo only: replace with a real backend call later
      const all = JSON.parse(localStorage.getItem('rsvps') || '[]');
      all.push(entry);
      localStorage.setItem('rsvps', JSON.stringify(all));
    } catch (_) {}
    ev.target.reset();
    $('thanks').textContent = d.rsvp.thankYou;
    $('thanks').hidden = false;
  });

  // Closing & footer
  $('closing').textContent = d.closing;
  $('closingNames').textContent = c.partner1 + ' & ' + c.partner2;
  $('footer').textContent = d.footer;

  setupCountdown(new Date(e.date));
  setupMusic(d.music);
  $('openBtn').addEventListener('click', () => openDoors(d.music));
}

function downloadIcs(d) {
  const start = new Date(d.event.date);
  const end = new Date(start.getTime() + 4 * 36e5);
  const f = (t) => t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    `SUMMARY:${d.couple.partner1} & ${d.couple.partner2} Wedding`,
    `LOCATION:${d.venue.name}, ${d.venue.address}`,
    `DTSTART:${f(start)}`, `DTEND:${f(end)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'save-the-date.ics';
  a.click();
}

function openDoors(music) {
  $('doors').classList.add('open');
  $('app').hidden = false;
  document.body.classList.remove('locked');
  $('hero').classList.add('play');
  setupScratch();
  if (music.autoplay) Music.play();
  setTimeout(() => window.scrollTo(0, 0), 50);
}

function setupMusic(m) {
  Music.src = m.src;
  const b = $('musicBtn');
  b.hidden = false;
  b.addEventListener('click', () => (Music.on ? Music.pause() : Music.play()));
}

function setupCountdown(target) {
  const box = $('count');
  const tick = () => {
    let t = Math.max(0, target - new Date());
    box.innerHTML = [['Days', 864e5], ['Hours', 36e5], ['Minutes', 6e4], ['Seconds', 1e3]].map(([l, ms]) => {
      const n = Math.floor(t / ms); t -= n * ms;
      return `<div><b>${String(n).padStart(2, '0')}</b><span>${l}</span></div>`;
    }).join('');
  };
  tick();
  setInterval(tick, 1000);
}

function setupScratch() {
  const cv = $('scratch');
  if (cv.dataset.ready) return;
  cv.dataset.ready = 1;
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const grad = g.createLinearGradient(0, 0, r.width, r.height);
  grad.addColorStop(0, '#DCE7F1'); grad.addColorStop(.5, '#8AA6C4'); grad.addColorStop(1, '#B9CDE2');
  g.fillStyle = grad; g.fillRect(0, 0, r.width, r.height);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .5})`; g.fillRect(Math.random() * r.width, Math.random() * r.height, 2, 2); }
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.font = '500 18px Lora, serif'; g.textAlign = 'center';
  g.fillText('\u2727 Scratch here \u2727', r.width / 2, r.height / 2 + 6);

  let down = false, n = 0;
  const scratch = (ev) => {
    if (!down) return;
    const b = cv.getBoundingClientRect();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(ev.clientX - b.left, ev.clientY - b.top, 22, 0, 7); g.fill();
    if (++n % 12 === 0) checkCleared();
  };
  const checkCleared = () => {
    const px = g.getImageData(0, 0, cv.width, cv.height).data;
    let clear = 0;
    for (let i = 3; i < px.length; i += 40) if (px[i] === 0) clear++;
    if (clear / (px.length / 40) > 0.45) cv.classList.add('done');
  };
  cv.addEventListener('pointerdown', (e) => { down = true; cv.setPointerCapture(e.pointerId); scratch(e); });
  cv.addEventListener('pointermove', scratch);
  cv.addEventListener('pointerup', () => { down = false; });
}

/* Petals */
(function () {
  const box = $('petals');
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('span');
    p.style.cssText = `left:${Math.random() * 100}%;width:${8 + Math.random() * 10}px;height:${12 + Math.random() * 12}px;` +
      `animation-duration:${9 + Math.random() * 9}s;animation-delay:${-Math.random() * 16}s;opacity:${.35 + Math.random() * .4}`;
    box.appendChild(p);
  }
  const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && x.target.classList.add('in')), { threshold: .15 });
  const vine = (c) => `<svg class="side bs ${c}" viewBox="0 0 140 420" aria-hidden="true"><use href="#branch"/></svg>`;
  document.querySelectorAll('.block').forEach((b) => {
    b.classList.add('reveal'); io.observe(b);
    b.insertAdjacentHTML('afterbegin', vine('l') + vine('r'));
    const h2 = b.querySelector('h2');
    if (h2) h2.insertAdjacentHTML('beforebegin', '<svg class="h2f" viewBox="-50 -50 100 100" aria-hidden="true"><use href="#fl"/></svg>');
  });
})();

/* Music: plays data.json music.src if set, otherwise a built-in music-box melody */
const Music = {
  on: false, src: '', ctx: null, timer: null, step: 0, audio: $('bgm'),
  chords: [
    { bass: 110, n: [220, 261.63, 329.63, 440] },
    { bass: 87.31, n: [220, 261.63, 349.23, 440] },
    { bass: 130.81, n: [261.63, 329.63, 392, 523.25] },
    { bass: 98, n: [246.94, 293.66, 392, 493.88] }
  ],
  pattern: [0, 1, 2, 3, 2, 1, 2, 3],
  play() {
    this.on = true;
    $('musicBtn').classList.remove('muted');
    if (this.src) {
      this.audio.src = this.src;
      this.audio.play().catch(() => this.synth());
      this.audio.onerror = () => this.synth();
    } else this.synth();
  },
  pause() {
    this.on = false;
    $('musicBtn').classList.add('muted');
    this.audio.pause();
    clearInterval(this.timer);
    if (this.ctx) this.ctx.suspend();
  },
  synth() {
    if (!this.on) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      const c = (this.ctx = new AC());
      this.out = c.createGain(); this.out.gain.value = .5;
      const dl = c.createDelay(); dl.delayTime.value = .38;
      const fb = c.createGain(); fb.gain.value = .38;
      this.out.connect(c.destination); this.out.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(c.destination);
    }
    this.ctx.resume();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 480);
  },
  note(f, vol, dur) {
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  tick() {
    const ch = this.chords[Math.floor(this.step / 8) % 4], i = this.step % 8;
    if (i === 0) this.note(ch.bass, .22, 3.2);
    this.note(ch.n[this.pattern[i]], .13, 1.8);
    if (i === 0) this.note(ch.n[3] * 2, .04, 2.4);
    this.step++;
  }
};
