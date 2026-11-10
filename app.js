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
const speakBtn = (text, label = "🔊") =>
  el("button", { class: "speak", type: "button", title: "Dinle", onclick: (e) => { e.stopPropagation(); speak(text); } }, label);

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
    type: "pick",
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
    type: listen ? "listen" : "bank",
    title: listen ? "Duyduğunu yaz" : "Bu cümleyi çevir",
    solution: target,
    render(box, setAnswer) {
      if (listen) {
        box.append(el("div", { class: "listen-row" },
          el("button", { class: "big-speak", type: "button", onclick: () => speak(tg) }, "🔊"),
          el("button", { class: "slow-speak", type: "button", onclick: () => speak(tg, true) }, "🐢")));
        setTimeout(() => speak(tg), 300);
      } else {
        box.append(el("div", { class: "bubble-row" },
          el("div", { class: "mascot" }, "🦊"),
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
    type: "type",
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
    type: "match",
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
  app.replaceChildren(
    el("div", { class: "screen center" },
      el("div", { class: "logo" }, "🦊 Kelimo"),
      el("h1", {}, "Hangi dili öğrenmek istersin?"),
      el("div", { class: "lang-grid" },
        Object.entries(COURSES).map(([code, c]) =>
          el("button", { class: "lang-card", type: "button", onclick: () => { state.lang = code; render(); } },
            el("span", { class: "flag" }, c.flag), c.name,
            el("small", {}, `${c.units.length} ünite`))))));
}

function heartTimerText() {
  if (state.hearts >= MAX_HEARTS) return "Kalplerin dolu";
  const left = HEART_REFILL_MS - (Date.now() - state.heartsUpdatedAt);
  const m = Math.max(0, Math.ceil(left / 60000));
  return `Sonraki kalp: ${m} dk`;
}

function topBar() {
  const c = course();
  return el("header", { class: "topbar" },
    el("button", { class: "stat flag-btn", type: "button", title: "Dil değiştir", onclick: () => { state.lang = null; render(); } }, c.flag),
    el("div", { class: "stat streak", title: "Seri" }, "🔥 ", String(state.streak)),
    el("div", { class: "stat xp", title: "Toplam XP" }, "⚡ ", String(state.xp)),
    el("div", { class: "stat hearts", title: heartTimerText() }, "❤️ ", String(state.hearts)),
    el("button", { class: "stat", type: "button", title: "Ses", onclick: () => { state.sound = !state.sound; render(); } }, state.sound ? "🔔" : "🔕"));
}

function renderHome() {
  const c = course();
  const done = state.progress[state.lang] || 0;
  const goalPct = Math.min(100, Math.round((state.xpToday / DAILY_GOAL) * 100));

  const path = el("div", { class: "path" });
  let globalIdx = 0;
  const offsets = [0, 60, 90, 60, 0, -60, -90, -60];
  c.units.forEach((unit, ui) => {
    path.append(el("div", { class: `unit-banner u${ui % 5}` },
      el("div", {}, el("small", {}, `Ünite ${ui + 1}`), el("h2", {}, unit.title)),
      el("span", { class: "unit-icon" }, unit.icon)));
    for (let li = 0; li < LESSONS_PER_UNIT; li++, globalIdx++) {
      const status = globalIdx < done ? "done" : globalIdx === done ? "current" : "locked";
      const idx = globalIdx;
      const node = el("button", {
        class: `node ${status} u${ui % 5}`, type: "button",
        style: `transform: translateX(${offsets[idx % offsets.length]}px)`,
        disabled: status === "locked",
        "aria-label": `Ünite ${ui + 1}, ders ${li + 1}`,
        onclick: () => startLesson({ unitIdx: ui, lessonIdx: li, globalIdx: idx }),
      }, status === "done" ? "✓" : status === "locked" ? "🔒" : "★");
      const wrap = el("div", { class: "node-wrap" }, node);
      if (status === "current") wrap.prepend(el("div", { class: "start-tip", style: `transform: translateX(${offsets[idx % offsets.length]}px)` }, "BAŞLA"));
      path.append(wrap);
    }
  });
  const total = c.units.length * LESSONS_PER_UNIT;
  if (done >= total) path.append(el("div", { class: "trophy" }, "🏆", el("p", {}, "Kursu tamamladın! Pratik yapmaya devam et.")));

  app.replaceChildren(
    el("div", { class: "screen home" },
      topBar(),
      el("section", { class: "cards" },
        el("div", { class: "card goal" },
          el("div", { class: "card-title" }, "🎯 Günlük hedef"),
          el("div", { class: "bar" }, el("div", { class: "fill", style: `width:${goalPct}%` })),
          el("small", {}, `${state.xpToday} / ${DAILY_GOAL} XP`)),
        el("div", { class: "card" },
          el("div", { class: "card-title" }, "❤️ Kalpler"),
          el("small", {}, heartTimerText()),
          el("button", { class: "btn secondary small", type: "button", disabled: done === 0,
            onclick: () => startLesson({ practice: true }) }, "Pratik yap (+1 ❤️)"))),
      path));
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
  app.replaceChildren(
    el("div", { class: "screen center" },
      el("div", { class: "big-emoji" }, "💔"),
      el("h1", {}, "Kalbin kalmadı"),
      el("p", {}, heartTimerText() + ". Pratik yaparak kalp kazanabilirsin."),
      el("button", { class: "btn", type: "button", onclick: () => startLesson({ practice: true }) }, "Pratik yap"),
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
        $(".lesson-hearts").textContent = `❤️ ${state.hearts}`;
      }
      session.queue.push(ex); // yanlış yapılan soru sona eklenir
    }
    const praise = pick(["Harika!", "Mükemmel!", "Çok iyi!", "Süper!", "Aferin!"]);
    const outOfHearts = !res.ok && !session.meta.practice && state.hearts <= 0;
    const fb = el("footer", { class: `lesson-footer feedback ${res.ok ? "ok" : "bad"}` },
      el("div", { class: "fb-text" },
        el("strong", {}, res.ok ? `✅ ${praise}` : "❌ Doğru cevap:"),
        !res.ok && res.correct ? el("div", {}, res.correct) : null,
        res.note ? el("div", { class: "note" }, res.note) : null,
        res.ok && session.combo >= 3 ? el("div", { class: "note" }, `🔥 ${session.combo} doğru üst üste!`) : null),
      el("button", { class: "btn", type: "button", onclick: () => outOfHearts ? renderNoHearts() : nextExercise(session) }, "DEVAM ET"));
    footer.replaceWith(fb);
    fb.querySelector(".btn").focus();
  }

  checkBtn.addEventListener("click", () => submit());

  app.replaceChildren(
    el("div", { class: "screen lesson" },
      el("header", { class: "lesson-top" },
        el("button", { class: "close", type: "button", title: "Çık", onclick: () => { if (confirm("Dersten çıkmak istiyor musun? İlerlemen kaybolacak.")) render(); } }, "✕"),
        el("div", { class: "bar" }, el("div", { class: "fill", style: `width:${progressPct}%` })),
        el("div", { class: "lesson-hearts" }, session.meta.practice ? "🏋️" : `❤️ ${state.hearts}`)),
      el("main", { class: "lesson-main" },
        el("h2", { class: "ex-title" }, ex.title),
        body),
      footer));

  ex.render(body, setAnswer, { submit: () => submit() });

  // Klavye: Enter = kontrol / devam, 1-4 = seçenek
  app.onkeydown = (e) => {
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
      el("div", { class: "big-emoji bounce" }, meta.practice ? "💪" : "🎉"),
      el("h1", {}, meta.practice ? "Pratik tamamlandı!" : "Ders tamamlandı!"),
      el("div", { class: "result-grid" },
        el("div", { class: "result xp" }, el("small", {}, "XP"), el("strong", {}, `+${gained}`)),
        el("div", { class: "result acc" }, el("small", {}, "Doğruluk"), el("strong", {}, `%${accuracy}`)),
        el("div", { class: "result time" }, el("small", {}, "Süre"), el("strong", {}, time))),
      el("p", {}, `🔥 ${state.streak} günlük seri`),
      el("button", { class: "btn", type: "button", onclick: render }, "DEVAM ET")));
  confetti();
}

function confetti() {
  const colors = ["#58cc02", "#1cb0f6", "#ff9600", "#ff4b4b", "#ce82ff", "#ffc800"];
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
