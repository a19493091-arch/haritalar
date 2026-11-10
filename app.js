"use strict";

/* ---------- Ayarlar ---------- */
const MAX_HEARTS = 5;
const HEART_REFILL_MS = 20 * 60 * 1000; // 20 dakikada 1 kalp
const DAILY_GOAL = 30;
const EXERCISES_PER_LESSON = 8;
const STORAGE_KEY = "kelimo-state-v1";

/* ---------- Durum ---------- */
const defaultState = () => ({
  lang: null,
  progress: {},       // dil -> tamamlanan ders sayısı
  xp: 0,
  xpToday: 0,
  lastActiveDay: null,
  streak: 0,
  hearts: MAX_HEARTS,
  heartsUpdatedAt: Date.now(),
  sound: true,
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { /* depolama yoksa varsayılan */ }
  return defaultState();
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* yoksay */ }
}

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
function dayDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function refreshDaily() {
  const today = todayKey();
  if (state.lastActiveDay !== today) {
    state.xpToday = 0;
    if (state.lastActiveDay && dayDiff(state.lastActiveDay, today) > 1) state.streak = 0;
  }
}

function refillHearts() {
  if (state.hearts >= MAX_HEARTS) { state.heartsUpdatedAt = Date.now(); return; }
  const elapsed = Date.now() - state.heartsUpdatedAt;
  const gained = Math.floor(elapsed / HEART_REFILL_MS);
  if (gained > 0) {
    state.hearts = Math.min(MAX_HEARTS, state.hearts + gained);
    state.heartsUpdatedAt += gained * HEART_REFILL_MS;
  }
}

/* ---------- Yardımcılar ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const app = $("#app");

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, n) => shuffle(arr).slice(0, n);

const tokenize = (s) => s.replace(/[.,!?¿¡]/g, "").split(/\s+/).filter(Boolean);
const normalize = (s) => tokenize(s.toLocaleLowerCase()).join(" ").replace(/[’']/g, "'");
const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/ß/g, "ss");

function course() { return COURSES[state.lang]; }

/* ---------- İkonlar ve maskot ---------- */
const ICONS = {
  flame: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.2 1-3.8 2.3-5 .2 1.6 1 2.7 2.2 3.2C11 8.5 11.2 5 12 2z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 2 4 14h7l-1.5 8L20 10h-7z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="m16 9 5 6m0-6-5 6"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2.5" d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 10h2V8h3v8H4v-2H2zm20 0h-2V8h-3v8h3v-2h2zM8 11h8v2H8z"/></svg>',
};
const icon = (name) => { const s = document.createElement("span"); s.style.display = "contents"; s.innerHTML = ICONS[name]; return s; };

function fox(mood = "happy") {
  const eyes = mood === "sad"
    ? '<path d="M38 66q6-5 12 0M70 66q6-5 12 0" stroke="#1d2340" stroke-width="4" fill="none" stroke-linecap="round"/>'
    : mood === "joy"
    ? '<path d="M38 66q6-8 12 0M70 66q6-8 12 0" stroke="#1d2340" stroke-width="4" fill="none" stroke-linecap="round"/>'
    : '<circle cx="44" cy="64" r="5.5" fill="#1d2340"/><circle cx="76" cy="64" r="5.5" fill="#1d2340"/><circle cx="46" cy="62" r="1.8" fill="#fff"/><circle cx="78" cy="62" r="1.8" fill="#fff"/>';
  const mouth = mood === "sad"
    ? '<path d="M53 96q7-5 14 0" stroke="#1d2340" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : '<path d="M52 92q8 7 16 0" stroke="#1d2340" stroke-width="3" fill="none" stroke-linecap="round"/>';
  const d = document.createElement("div");
  d.className = "fox";
  d.setAttribute("aria-hidden", "true");
  d.innerHTML = `<svg viewBox="0 0 120 120">
    <ellipse cx="60" cy="112" rx="34" ry="5" fill="#000" opacity=".08"/>
    <path d="M20 14 50 42 28 62Z" fill="#ff7a2f"/><path d="M100 14 70 42 92 62Z" fill="#ff7a2f"/>
    <path d="M27 25 42 41 32 51Z" fill="#7a2e0c"/><path d="M93 25 78 41 88 51Z" fill="#7a2e0c"/>
    <path d="M60 34c30 0 46 17 46 36 0 14-20 32-46 38-26-6-46-24-46-38 0-19 16-36 46-36Z" fill="#ff7a2f"/>
    <path d="M60 64c10 10 28 12 42 7-6 18-24 30-42 35-18-5-36-17-42-35 14 5 32 3 42-7Z" fill="#fff"/>
    ${eyes}
    <ellipse cx="60" cy="84" rx="7" ry="5" fill="#1d2340"/>
    ${mouth}
    <circle cx="30" cy="80" r="6" fill="#ff9aa5" opacity=".55"/><circle cx="90" cy="80" r="6" fill="#ff9aa5" opacity=".55"/>
  </svg>`;
  return d;
}

/* ---------- Onay penceresi (tarayıcı confirm() yerine) ---------- */
function askConfirm(title, text, yesLabel, noLabel, onYes) {
  const bg = el("div", { class: "modal-bg", role: "dialog", "aria-modal": "true" });
  const close = () => bg.remove();
  const keep = el("button", { class: "btn", type: "button", onclick: close }, noLabel);
  bg.append(el("div", { class: "modal" },
    fox("sad"), el("h2", {}, title), el("p", {}, text), keep,
    el("button", { class: "btn ghost", type: "button", onclick: () => { close(); onYes(); } }, yesLabel)));
  bg.addEventListener("click", (e) => { if (e.target === bg) close(); });
  document.body.append(bg);
  keep.focus();
}

/* ---------- Ses ---------- */
let audioCtx = null;
function beep(freqs, type = "sine", dur = 0.12) {
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = f;
      const t = audioCtx.currentTime + i * dur;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  } catch (e) { /* ses yok */ }
}
const sfx = {
  correct: () => beep([660, 880], "sine", 0.1),
  wrong: () => beep([220, 160], "square", 0.14),
  tap: () => beep([520], "triangle", 0.04),
  win: () => beep([523, 659, 784, 1047], "sine", 0.13),
};

const canSpeak = "speechSynthesis" in window;
function speak(text, slow = false) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = course().speechLang;
  u.rate = slow ? 0.6 : 0.95;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").startsWith(u.lang.slice(0, 2)));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}
const speakBtn = (text) =>
  el("button", { class: "speak", type: "button", title: "Dinle", "aria-label": "Dinle", onclick: (e) => { e.stopPropagation(); speak(text); } }, icon("sound"));

/* ---------- Alıştırma üreticileri ---------- */
// Her alıştırma: { type, prompt, render(container, setAnswer), check(answer) -> {ok, correct, note} }

function allCourseSentences() {
  return course().units.flatMap((u) => u.sentences);
}
function allCourseWords() {
  return course().units.flatMap((u) => u.words);
}

function makePickWord(unit, toTarget) {
  const [tr, tg] = pick(unit.words);
  const answer = toTarget ? tg : tr;
  const pool = (toTarget ? allCourseWords().map((w) => w[1]) : allCourseWords().map((w) => w[0]))
    .filter((w) => w !== answer);
  const options = shuffle([answer, ...sample([...new Set(pool)], 3)]);
  return {
    type: "pick", kind: "Yeni kelime",
    title: toTarget ? `“${tr}” nasıl denir?` : "Bu kelimenin anlamı ne?",
    solution: answer,
    render(box, setAnswer) {
      if (!toTarget) box.append(el("div", { class: "prompt-word" }, speakBtn(tg), el("span", {}, tg)));
      const grid = el("div", { class: "choices" });
      options.forEach((opt, i) => {
        const b = el("button", { class: "choice", type: "button" },
          el("span", { class: "key" }, String(i + 1)), opt);
        b.addEventListener("click", () => {
          grid.querySelectorAll(".choice").forEach((c) => c.classList.remove("selected"));
          b.classList.add("selected");
          sfx.tap();
          if (toTarget) speak(opt);
          setAnswer(opt);
        });
        grid.append(b);
      });
      box.append(grid);
      if (!toTarget) setTimeout(() => speak(tg), 300);
    },
    check: (ans) => ({ ok: ans === answer, correct: answer }),
  };
}

function makeBank(sentence, toTarget, listen = false) {
  const [tr, tg] = sentence;
  const source = toTarget ? tr : tg;
  const target = toTarget ? tg : tr;
  const answerTokens = tokenize(target);
  const answerLower = new Set(answerTokens.map((t) => t.toLocaleLowerCase()));
  const pool = [...new Set(allCourseSentences().flatMap((s) => tokenize(toTarget ? s[1] : s[0])))]
    .filter((w) => !answerLower.has(w.toLocaleLowerCase()));
  const tiles = shuffle([...answerTokens, ...sample(pool, Math.min(4, Math.max(2, 7 - answerTokens.length)))]);

  return {
    type: listen ? "listen" : "bank", kind: listen ? "Dinleme" : toTarget ? "Çeviri" : "Anlama",
    title: listen ? "Duyduğunu yaz" : "Bu cümleyi çevir",
    solution: target,
    render(box, setAnswer) {
      if (listen) {
        box.append(el("div", { class: "listen-row" },
          el("button", { class: "big-speak", type: "button", "aria-label": "Dinle", onclick: () => speak(tg) }, icon("sound")),
          el("button", { class: "slow-speak", type: "button", onclick: () => speak(tg, true) }, "YAVAŞ")));
        setTimeout(() => speak(tg), 300);
      } else {
        box.append(el("div", { class: "bubble-row" },
          fox(),
          el("div", { class: "bubble" }, toTarget ? null : speakBtn(tg), source)));
        if (!toTarget) setTimeout(() => speak(tg), 300);
      }
      const line = el("div", { class: "answer-line" });
      const bank = el("div", { class: "bank" });
      const chosen = [];
      const update = () => setAnswer(chosen.length ? chosen.map((c) => c.word).join(" ") : null);

      tiles.forEach((word) => {
        const slot = el("button", { class: "tile", type: "button" }, word);
        slot.addEventListener("click", () => {
          if (slot.classList.contains("used")) return;
          sfx.tap();
          if (toTarget || listen) speak(word);
          slot.classList.add("used");
          const placed = el("button", { class: "tile", type: "button" }, word);
          const entry = { word, placed, slot };
          placed.addEventListener("click", () => {
            sfx.tap();
            chosen.splice(chosen.indexOf(entry), 1);
            placed.remove();
            slot.classList.remove("used");
            update();
          });
          chosen.push(entry);
          line.append(placed);
          update();
        });
        bank.append(slot);
      });
      box.append(line, bank);
    },
    check(ans) {
      const ok = ans != null && normalize(ans) === normalize(target);
      return { ok, correct: target };
    },
  };
}

function makeType(unit) {
  const [tr, tg] = pick(unit.words);
  return {
    type: "type", kind: "Yazma",
    title: `“${tr}” kelimesini ${course().name} yaz`,
    solution: tg,
    render(box, setAnswer) {
      const input = el("input", {
        class: "text-input", type: "text", autocomplete: "off", autocapitalize: "off",
        spellcheck: "false", placeholder: `${course().name} yaz…`,
      });
      input.addEventListener("input", () => setAnswer(input.value.trim() || null));
      box.append(el("div", { class: "prompt-word" }, el("span", {}, tr)), input);
      setTimeout(() => input.focus(), 50);
    },
    check(ans) {
      if (ans == null) return { ok: false, correct: tg };
      const a = normalize(ans), b = normalize(tg);
      if (a === b) return { ok: true, correct: tg };
      if (stripAccents(a) === stripAccents(b)) return { ok: true, correct: tg, note: "Aksan işaretlerine dikkat et!" };
      return { ok: false, correct: tg };
    },
  };
}

function makeMatch(unit) {
  const pairs = sample(unit.words, 5);
  return {
    type: "match", kind: "Eşleştirme",
    title: "Eşleşen çiftlere dokun",
    solution: null,
    autoCheck: true,
    render(box, setAnswer, api) {
      const left = shuffle(pairs.map((p) => ({ text: p[1], id: p[1], side: "tg" })));
      const right = shuffle(pairs.map((p) => ({ text: p[0], id: p[1], side: "tr" })));
      const grid = el("div", { class: "match-grid" });
      let selected = null;
      let done = 0;
      let mistakes = 0;
      const buttons = [];
      const make = (item) => {
        const b = el("button", { class: "choice match", type: "button" }, item.text);
        b.item = item;
        b.addEventListener("click", () => {
          if (b.classList.contains("matched")) return;
          if (item.side === "tg") speak(item.text);
          else sfx.tap();
          if (!selected || selected.item.side === item.side) {
            if (selected) selected.classList.remove("selected");
            selected = b;
            b.classList.add("selected");
            return;
          }
          if (selected.item.id === item.id) {
            [selected, b].forEach((x) => { x.classList.remove("selected"); x.classList.add("matched"); });
            sfx.correct();
            done++;
            if (done === pairs.length) { setAnswer(mistakes === 0 ? "ok" : "mistake"); api.submit(); }
          } else {
            mistakes++;
            const s = selected;
            [s, b].forEach((x) => x.classList.add("wrong"));
            sfx.wrong();
            setTimeout(() => [s, b].forEach((x) => x.classList.remove("wrong", "selected")), 450);
          }
          selected = null;
        });
        buttons.push(b);
        return b;
      };
      for (let i = 0; i < pairs.length; i++) grid.append(make(left[i]), make(right[i]));
      box.append(grid);
    },
    // Eşleştirme oyunu her zaman tamamlanır; hatalar kalp kaybettirmez
    check: (ans) => ({ ok: true, correct: null, note: ans === "mistake" ? "Tümünü eşleştirdin!" : null }),
  };
}

function buildLesson(unitIdx, lessonIdx) {
  const unit = course().units[unitIdx];
  const ex = [];
  // Ders zorluğu: 0 = kelime odaklı, 1 = karışık, 2 = cümle odaklı
  const recipes = [
    ["pickR", "pickR", "match", "pickT", "type", "bankT", "pickR", "bankR"],
    ["pickT", "bankT", "match", "bankR", "type", "listen", "bankT", "pickR"],
    ["bankT", "bankR", "listen", "type", "bankT", "match", "listen", "bankR"],
  ];
  const recipe = recipes[lessonIdx % recipes.length].slice(0, EXERCISES_PER_LESSON);
  const sentences = shuffle(unit.sentences);
  let si = 0;
  const nextSentence = () => sentences[si++ % sentences.length];
  for (const r of recipe) {
    if (r === "pickR") ex.push(makePickWord(unit, false));
    else if (r === "pickT") ex.push(makePickWord(unit, true));
    else if (r === "match") ex.push(makeMatch(unit));
    else if (r === "type") ex.push(makeType(unit));
    else if (r === "bankT") ex.push(makeBank(nextSentence(), true));
    else if (r === "bankR") ex.push(makeBank(nextSentence(), false));
    else if (r === "listen") ex.push(canSpeak ? makeBank(nextSentence(), false, true) : makeBank(nextSentence(), true));
  }
  return ex;
}

function buildPractice() {
  const done = state.progress[state.lang] || 0;
  const unlockedUnits = Math.max(1, Math.ceil(done / LESSONS_PER_UNIT));
  const units = course().units.slice(0, unlockedUnits);
  const ex = [];
  for (let i = 0; i < EXERCISES_PER_LESSON; i++) {
    const u = pick(units);
    ex.push(pick([
      () => makePickWord(u, true), () => makePickWord(u, false), () => makeType(u),
      () => makeBank(pick(u.sentences), true), () => makeBank(pick(u.sentences), false),
    ])());
  }
  return ex;
}

/* ---------- Ekranlar ---------- */
function render() {
  refreshDaily();
  refillHearts();
  saveState();
  if (!state.lang) return renderLanguagePicker();
  renderHome();
}

function renderLanguagePicker() {
  const hellos = ["Hello", "Hallo", "Hola", "Merhaba"];
  app.replaceChildren(
    el("div", { class: "screen center welcome" },
      fox(),
      el("div", { class: "brand" }, "Kelimo"),
      el("h1", {}, "Hangi dili öğrenmek istersin?"),
      el("p", {}, "Günde birkaç dakika, kısa derslerle. İstediğin zaman dil değiştirebilirsin."),
      el("div", { class: "lang-grid" },
        Object.entries(COURSES).map(([code, c]) => {
          const done = state.progress[code] || 0;
          const total = c.units.length * LESSONS_PER_UNIT;
          return el("button", { class: "lang-card", type: "button", onclick: () => { state.lang = code; render(); } },
            el("span", { class: "flag" }, c.flag),
            el("strong", {}, c.name),
            el("small", {}, done ? `${done}/${total} ders tamamlandı` : `${c.units.length} ünite · ${total} ders`));
        })),
      el("div", { class: "hello-strip" }, hellos.map((h) => el("span", {}, h)))));
}

function heartTimerText() {
  if (state.hearts >= MAX_HEARTS) return "Kalplerin dolu";
  const left = HEART_REFILL_MS - (Date.now() - state.heartsUpdatedAt);
  const m = Math.max(0, Math.ceil(left / 60000));
  return `Sonraki kalp ${m} dk sonra`;
}

function topBar() {
  const c = course();
  const activeToday = state.lastActiveDay === todayKey();
  return el("header", { class: "topbar" },
    el("button", { class: "stat flag-btn", type: "button", title: "Dil değiştir", "aria-label": "Dil değiştir", onclick: () => { state.lang = null; render(); } }, c.flag),
    el("div", { class: `stat st-streak${activeToday ? "" : " st-off"}`, title: "Gün serisi" }, icon("flame"), String(state.streak)),
    el("div", { class: "stat st-xp", title: "Toplam XP" }, icon("bolt"), String(state.xp)),
    el("div", { class: "stat st-hearts", title: heartTimerText() }, icon("heart"), String(state.hearts)),
    el("button", { class: "stat", type: "button", title: "Ses efektleri", "aria-label": "Ses efektleri",
      onclick: () => { state.sound = !state.sound; render(); } }, icon(state.sound ? "sound" : "mute")));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Günaydın!";
  if (h < 18) return "İyi günler!";
  return "İyi akşamlar!";
}

function renderHome() {
  const c = course();
  const done = state.progress[state.lang] || 0;
  const goalPct = Math.min(100, Math.round((state.xpToday / DAILY_GOAL) * 100));
  const left = Math.max(0, DAILY_GOAL - state.xpToday);

  const hero = el("section", { class: "hero" },
    fox(goalPct >= 100 ? "joy" : "happy"),
    el("div", { style: "min-width:0" },
      el("h2", {}, greeting()),
      el("p", {}, left > 0 ? `Günlük hedefe ${left} XP kaldı. ${heartTimerText()}.` : "Bugünkü hedefini tamamladın. Harika gidiyorsun!"),
      el("div", { class: "hero-actions" },
        el("button", { class: "btn sky small", type: "button", disabled: done === 0,
          title: done === 0 ? "Önce bir ders bitir" : "Öğrendiklerini tekrar et, 1 kalp kazan",
          onclick: () => startLesson({ practice: true }) }, "Pratik yap +1 kalp"))),
    el("div", { class: "ring", style: `--p:${goalPct}`, title: "Günlük hedef" },
      el("div", {}, el("span", {}, `${state.xpToday}`), el("small", {}, `/ ${DAILY_GOAL} XP`))));

  const path = el("div", { class: "path" });
  let globalIdx = 0;
  const offsets = [0, 52, 78, 52, 0, -52, -78, -52];
  c.units.forEach((unit, ui) => {
    const unitDone = Math.min(LESSONS_PER_UNIT, Math.max(0, done - ui * LESSONS_PER_UNIT));
    path.append(el("div", { class: `unit-banner u${ui % 5}` },
      el("div", { style: "position:relative;z-index:1;min-width:0" },
        el("div", { class: "eyebrow" }, `Ünite ${ui + 1}`),
        el("h2", {}, unit.title),
        el("div", { class: "unit-prog" }, `${unitDone}/${LESSONS_PER_UNIT} ders · ${unit.words.length} kelime`)),
      el("span", { class: "unit-icon", "aria-hidden": "true" }, unit.icon)));
    for (let li = 0; li < LESSONS_PER_UNIT; li++, globalIdx++) {
      const status = globalIdx < done ? "done" : globalIdx === done ? "current" : "locked";
      const idx = globalIdx;
      const x = offsets[idx % offsets.length];
      const node = el("button", {
        class: `node ${status}`, type: "button",
        disabled: status === "locked",
        "aria-label": `Ünite ${ui + 1}, ders ${li + 1}${status === "done" ? " (tamamlandı)" : status === "locked" ? " (kilitli)" : ""}`,
        onclick: () => startLesson({ unitIdx: ui, lessonIdx: li, globalIdx: idx }),
      }, icon(status === "done" ? "check" : status === "locked" ? "lock" : "star"));
      const wrap = el("div", { class: `node-wrap u${ui % 5}${status === "current" ? " is-current" : ""}`, style: `transform: translateX(${x}px)` }, node);
      if (status === "current") wrap.prepend(el("div", { class: "start-tip" }, done === 0 ? "BAŞLA" : "SIRADAKİ"));
      path.append(wrap);
    }
  });
  const total = c.units.length * LESSONS_PER_UNIT;
  if (done >= total) path.append(el("div", { class: "trophy" },
    el("div", { class: "cup" }, "🏆"), el("h2", {}, "Kursu tamamladın!"), el("p", {}, "Pratik yaparak kelimeleri taze tut.")));

  app.replaceChildren(el("div", { class: "screen home" }, topBar(), hero, path));
  const cur = $(".node.current");
  if (cur && done > 0) cur.scrollIntoView({ block: "center" });
}

/* ---------- Ders akışı ---------- */
function startLesson(meta) {
  refillHearts();
  if (!meta.practice && state.hearts <= 0) return renderNoHearts();
  const queue = meta.practice ? buildPractice() : buildLesson(meta.unitIdx, meta.lessonIdx);
  const session = { meta, queue, total: queue.length, completed: 0, mistakes: 0, combo: 0, maxCombo: 0, start: Date.now() };
  nextExercise(session);
}

function renderNoHearts() {
  app.onkeydown = null;
  app.replaceChildren(
    el("div", { class: "screen center" },
      fox("sad"),
      el("h1", {}, "Kalbin kalmadı"),
      el("p", {}, `${heartTimerText()}. Beklemek istemiyorsan pratik yap; her pratik 1 kalp kazandırır.`),
      el("button", { class: "btn sky", type: "button", onclick: () => startLesson({ practice: true }) }, "Pratik yap"),
      el("button", { class: "btn ghost", type: "button", onclick: render }, "Ana sayfa")));
}

function nextExercise(session) {
  if (session.queue.length === 0) return finishLesson(session);
  const ex = session.queue[0];
  let answer = null;
  let checked = false;

  const progressPct = Math.round((session.completed / session.total) * 100);
  const checkBtn = el("button", { class: "btn", type: "button", disabled: true }, "KONTROL ET");
  const footer = el("footer", { class: "lesson-footer" },
    el("button", { class: "btn ghost skip", type: "button", onclick: () => submit(true) }, "ATLA"),
    checkBtn);
  const body = el("div", { class: "exercise" });

  const setAnswer = (a) => {
    if (checked) return;
    answer = a;
    checkBtn.disabled = a == null;
  };

  function submit(skipped = false) {
    if (checked) return;
    checked = true;
    const res = skipped ? { ok: false, correct: ex.solution } : ex.check(answer);
    body.classList.add("locked");
    session.queue.shift();
    if (res.ok) {
      sfx.correct();
      session.completed++;
      session.combo++;
      session.maxCombo = Math.max(session.maxCombo, session.combo);
    } else {
      sfx.wrong();
      session.mistakes++;
      session.combo = 0;
      if (!session.meta.practice) {
        state.hearts = Math.max(0, state.hearts - 1);
        if (state.hearts === MAX_HEARTS - 1) state.heartsUpdatedAt = Date.now();
        saveState();
        $(".lesson-hearts .hc").textContent = String(state.hearts);
      }
      session.queue.push(ex); // yanlış yapılan soru sona eklenir
    }
    const praise = pick(["Harika!", "Mükemmel!", "Çok iyi!", "Süper!", "Aferin!"]);
    const outOfHearts = !res.ok && !session.meta.practice && state.hearts <= 0;
    const fb = el("footer", { class: `lesson-footer feedback ${res.ok ? "ok" : "bad"}` },
      el("div", { class: "fb-text" },
        el("strong", {}, res.ok ? praise : "Doğru cevap:"),
        !res.ok && res.correct ? el("div", {}, res.correct) : null,
        res.note ? el("div", { class: "note" }, res.note) : null,
        res.ok && session.combo >= 3 ? el("div", { class: "note" }, `${session.combo} doğru üst üste!`) : null),
      el("button", { class: "btn", type: "button", onclick: () => outOfHearts ? renderNoHearts() : nextExercise(session) }, "DEVAM ET"));
    footer.replaceWith(fb);
    fb.querySelector(".btn").focus({ preventScroll: true });
  }

  checkBtn.addEventListener("click", () => submit());

  app.replaceChildren(
    el("div", { class: "screen lesson" },
      el("header", { class: "lesson-top" },
        el("button", { class: "close", type: "button", title: "Dersten çık", "aria-label": "Dersten çık",
          onclick: () => askConfirm("Dersten çıkılsın mı?", "Bu dersteki ilerlemen kaybolacak.", "Çık", "Devam et", () => { app.onkeydown = null; render(); }) }, "✕"),
        el("div", { class: "bar" }, el("div", { class: "fill", style: `width:${progressPct}%` })),
        el("div", { class: "lesson-hearts", title: session.meta.practice ? "Pratik: kalp kaybetmezsin" : "Kalpler" },
          session.meta.practice ? icon("dumbbell") : [icon("heart"), el("span", { class: "hc" }, String(state.hearts))])),
      el("main", { class: "lesson-main" },
        el("div", { class: "ex-kind" }, ex.kind),
        el("h2", { class: "ex-title" }, ex.title),
        body),
      footer));

  ex.render(body, setAnswer, { submit: () => submit() });

  // Klavye: Enter = kontrol / devam, 1-4 = seçenek
  app.onkeydown = (e) => {
    if (document.querySelector(".modal-bg")) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const btn = $(".lesson-footer .btn:not(.skip)");
      if (btn && !btn.disabled) btn.click();
    } else if (!checked && /^[1-9]$/.test(e.key) && document.activeElement.tagName !== "INPUT") {
      const choices = body.querySelectorAll(".choices .choice");
      const c = choices[Number(e.key) - 1];
      if (c) c.click();
    }
  };
}

function finishLesson(session) {
  app.onkeydown = null;
  const { meta } = session;
  const accuracy = Math.round((session.total / (session.total + session.mistakes)) * 100);
  let gained = 10 + (session.mistakes === 0 ? 5 : 0) + Math.floor(session.maxCombo / 4);
  if (meta.practice) gained = 5;

  const today = todayKey();
  if (state.lastActiveDay !== today) {
    state.streak = state.lastActiveDay && dayDiff(state.lastActiveDay, today) === 1 ? state.streak + 1 : 1;
    state.lastActiveDay = today;
  }
  state.xp += gained;
  state.xpToday += gained;
  if (meta.practice) state.hearts = Math.min(MAX_HEARTS, state.hearts + 1);
  if (!meta.practice) {
    const done = state.progress[state.lang] || 0;
    if (meta.globalIdx === done) state.progress[state.lang] = done + 1;
  }
  saveState();
  sfx.win();

  const secs = Math.round((Date.now() - session.start) / 1000);
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  app.replaceChildren(
    el("div", { class: "screen center finish" },
      fox("joy"),
      el("h1", {}, meta.practice ? "Pratik tamamlandı!" : "Ders tamamlandı!"),
      el("div", { class: "result-grid" },
        el("div", { class: "result r-xp" }, el("small", {}, "XP"), el("strong", {}, `+${gained}`)),
        el("div", { class: "result r-acc" }, el("small", {}, "Doğruluk"), el("strong", {}, `%${accuracy}`)),
        el("div", { class: "result r-time" }, el("small", {}, "Süre"), el("strong", {}, time))),
      el("div", { class: "streak-pill" }, icon("flame"), `${state.streak} günlük seri`),
      el("button", { class: "btn", type: "button", onclick: render }, "DEVAM ET")));
  confetti();
}

function confetti() {
  const colors = ["#ff7a2f", "#4b6cff", "#22b97b", "#f2545b", "#9b5cf6", "#ffb800"];
  for (let i = 0; i < 60; i++) {
    const p = el("div", { class: "confetti" });
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = pick(colors);
    p.style.animationDelay = Math.random() * 0.6 + "s";
    p.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
    document.body.append(p);
    setTimeout(() => p.remove(), 4000);
  }
}

if (canSpeak) speechSynthesis.getVoices(); // sesleri önceden yükle
setInterval(() => { if ($(".home")) { const before = state.hearts; refillHearts(); if (state.hearts !== before) render(); } }, 60000);
render();
