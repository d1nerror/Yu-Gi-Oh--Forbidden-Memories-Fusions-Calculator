"use strict";
/* FM Fusion Calculator. Data: c = cards [id,name,type,atk,def,starA,starB,level], f = fusions [a,b,result],
   e = equips per monster, r = rituals [ritualCard,m1,m2,m3,result]. */
const D = __DATA__;
const ICON = __ICONS__;          // type icons as data URIs (work offline)
const ONLINE_ART = __ONLINEART__; // true: show card pictures from YGOPRODeck when online

const TYPES = ["Dragon","Spellcaster","Zombie","Warrior","Beast-Warrior","Beast","Winged Beast","Fiend","Fairy","Insect","Dinosaur","Reptile","Fish","Sea Serpent","Machine","Thunder","Aqua","Pyro","Rock","Plant","Magic","Trap","Ritual","Equip"];
const KINDS = ["magic","trap","ritual","equip"];
/* Guardian Stars: 1-10 in the data, 0 = none. Each star beats the next one in its cycle (+500 ATK/DEF). */
const STARS = [null,"Mars","Jupiter","Saturn","Uranus","Pluto","Neptune","Mercury","Sun","Moon","Venus"];
const BEATS = {8:9,9:10,10:7,7:8,1:2,2:3,3:4,4:5,5:6,6:1};
const LOSES = {}; for (const k in BEATS) LOSES[BEATS[k]] = +k;
/* Astrological symbols, as used for Guardian Stars in the game. ︎ keeps them as text, not emoji. */
const SYM = [null,"♂","♃","♄","♅","♇","♆","☿","☉","☽","♀"].map(s => s && s+"︎");
function starName(s, cls){ const b = el("b", cls || "star"); const g = el("span","sym",SYM[s]); g.setAttribute("aria-hidden","true"); b.append(g, STARS[s]); return b; }
const CYCLES = [[8,9,10,7],[1,2,3,4,5,6]];

const C = {}; D.c.forEach(r => { C[r[0]] = {id:r[0], name:r[1], type:r[2], atk:r[3], def:r[4], gs:[r[5], r[6]], lv:r[7]}; });
const ALL = D.c.map(r => C[r[0]]);
const F = new Map(); D.f.forEach(([a,b,r]) => F.set(a*1000+b, r));
const fuse = (a,b) => F.get(a < b ? a*1000+b : b*1000+a);
const EQ = {}; for (const k in D.e) EQ[k] = new Set(D.e[k]);
const isMon = c => c.type < 20;
const kind = c => c.type < 20 ? "mon" : KINDS[c.type-20];
const byName = n => { n = n.trim().toLowerCase(); return ALL.find(c => c.name.toLowerCase() === n); };
const metaOf = c => isMon(c) ? TYPES[c.type]+" · "+c.atk+" / "+c.def : TYPES[c.type]+" card";
const plural = (n, w) => n+" "+w+(n === 1 ? "" : "s");

const $ = id => document.getElementById(id);
function el(tag, cls, text){ const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function btn(cls, text, onClick, label){ const b = el("button", cls, text); b.type = "button"; if (label) b.setAttribute("aria-label", label); if (onClick) b.addEventListener("click", onClick); return b; }
const SVG = {
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};
function icon(name){ const s = el("span","ic"); s.innerHTML = SVG[name]; return s; }
const store = {
  get(k){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: app still works */ } }
};

/* ---------- feedback ---------- */
let toastTimer = 0;
function toast(msg, undo){
  const t = $("toast"); t.textContent = "";
  t.append(el("span","",msg));
  if (undo) t.append(btn("toast-undo","Undo",() => { hideToast(); undo(); }));
  t.hidden = false; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, undo ? 5000 : 2800);
}
function hideToast(){ $("toast").hidden = true; }

/* ---------- card thumbnails ----------
   Pictures come from YGOPRODeck, looked up by card name. Each small one is downloaded once and kept in this
   browser (IndexedDB, up to ART_KEEP pictures), as their API guide asks. Offline, or for cards they don't have, the type icon shows. */
const ART_API = "https://db.ygoprodeck.com/api/v7/cardinfo.php?name=";
const ART_IMG = id => "https://images.ygoprodeck.com/images/cards_small/"+id+".jpg";
const ART_BIG = id => "https://images.ygoprodeck.com/images/cards/"+id+".jpg";
const artIds = store.get("fmart") || {}; // lower-case card name -> picture id, 0 = no picture
const ART = new Map();                    // card id -> Promise of a URL to show ("" = none)
const lookQ = new Map(); let lookT = 0;
const pause = ms => new Promise(r => setTimeout(r, ms));

function lookupId(name){
  name = name.toLowerCase();
  if (name in artIds) return Promise.resolve(artIds[name]);
  return new Promise(res => {
    if (!lookQ.has(name)) lookQ.set(name, []);
    lookQ.get(name).push(res); clearTimeout(lookT); lookT = setTimeout(flushLook, 40);
  });
}
async function flushLook(){
  const names = [...lookQ.keys()];
  for (let i = 0; i < names.length; i += 20) await askApi(names.slice(i, i+20));
  store.set("fmart", artIds);
}
async function askApi(names){
  let j;
  try { const r = await fetch(ART_API + encodeURIComponent(names.join("|"))); j = await r.json(); }
  catch (e) { names.forEach(n => answer(n, 0, false)); return; } // offline: try again next visit
  if (j.error && names.length > 1) { // one unknown name can fail the whole batch: split it up
    const h = names.length >> 1; await pause(120); await askApi(names.slice(0, h)); await pause(120); await askApi(names.slice(h)); return;
  }
  const got = {};
  for (const d of j.data || []) if (d.card_images && d.card_images[0]) got[d.name.toLowerCase()] = d.card_images[0].id;
  names.forEach(n => answer(n, got[n] || 0, true));
  await pause(120);
}
function answer(name, id, keep){
  if (keep) artIds[name] = id;
  (lookQ.get(name) || []).forEach(res => res(id)); lookQ.delete(name);
}

let dbP = null;
function artDb(){
  return dbP || (dbP = new Promise(res => {
    try { const q = indexedDB.open("fmart", 1); q.onupgradeneeded = () => q.result.createObjectStore("img"); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }
    catch (e) { res(null); }
  }));
}
async function idb(mode, fn){
  const d = await artDb(); if (!d) return null;
  return new Promise(res => {
    try { const tx = d.transaction("img", mode); const r = fn(tx.objectStore("img")); tx.oncomplete = () => res(r.result); tx.onerror = tx.onabort = () => res(null); }
    catch (e) { res(null); }
  });
}
const ART_KEEP = 150; // most pictures kept in the browser (about 2 MB); the oldest seen are dropped first
const recent = (store.get("fmartrecent") || []).filter(Number.isInteger);
function seen(id){
  const i = recent.indexOf(id); if (i >= 0) recent.splice(i, 1); recent.push(id);
  const old = recent.splice(0, Math.max(0, recent.length - ART_KEEP));
  old.forEach(o => idb("readwrite", s => s.delete(o)));
  store.set("fmartrecent", recent);
}
async function findArt(c, big){
  const id = await lookupId(c.name); if (!id) return "";
  if (big) return ART_BIG(id); // large pictures aren't kept: the browser's normal cache handles them
  let blob = await idb("readonly", s => s.get(id));
  if (!blob) {
    try { const r = await fetch(ART_IMG(id)); if (!r.ok) return ""; blob = await r.blob(); idb("readwrite", s => s.put(blob, id)); }
    catch (e) { return ART_IMG(id); } // can't keep a copy: let the browser load it directly
  }
  seen(id);
  return URL.createObjectURL(blob);
}
function thumb(c, size){
  const t = el("span", "thumb is-icon "+(size||"")+" k-"+kind(c)); const im = el("img"); im.alt = ""; t.append(im);
  t.dataset.card = c.id;
  im.src = ICON[TYPES[c.type]] || "";
  if (!ONLINE_ART) return t;
  if (!ART.has(c.id)) ART.set(c.id, findArt(c).catch(() => ""));
  ART.get(c.id).then(url => {
    if (!url) return;
    const pic = new Image(); pic.onload = () => { im.src = url; t.classList.remove("is-icon"); t.classList.add("has-art"); }; pic.src = url;
  });
  return t;
}

/* ---------- closer look: hover a card picture on desktop ---------- */
const BIG = new Map(); // card id -> Promise of a large picture URL
function peekCard(t){
  const c = C[t.dataset.card], box = $("peek"); if (!c) return;
  box.textContent = ""; box.className = "peek k-"+kind(c);
  const fr = el("div","peek-art"), im = el("img"); im.alt = "";
  const th = t.classList.contains("thumb") ? t : t.querySelector(".thumb"); im.src = th.querySelector("img").src; if (th.classList.contains("is-icon")) fr.classList.add("is-icon");
  fr.append(im);
  const info = el("div","peek-info"); info.append(el("b","peek-name",c.name), el("span","peek-meta",metaOf(c)));
  if (isMon(c)) { const gs = el("span","peek-stars"); c.gs.filter(Boolean).forEach(g => gs.append(starName(g))); info.append(gs); }
  box.append(fr, info);
  if (ONLINE_ART && th.classList.contains("has-art")) {
    if (!BIG.has(c.id)) BIG.set(c.id, findArt(c, true).catch(() => ""));
    BIG.get(c.id).then(url => { if (url && box.dataset.card == c.id) { const p = new Image(); p.onload = () => { if (box.dataset.card == c.id) im.src = url; }; p.src = url; } });
  }
  box.dataset.card = c.id; box.hidden = false;
  const r = t.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight, gap = 14;
  let x = r.right + gap; if (x + w > innerWidth - 8) x = r.left - gap - w;
  const y = Math.max(8, Math.min(r.top + r.height/2 - h/2, innerHeight - h - 8));
  box.style.left = Math.max(8, x)+"px"; box.style.top = y+"px";
}
function hidePeek(){ const b = $("peek"); b.hidden = true; b.dataset.card = ""; }
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.addEventListener("mouseover", e => { const t = e.target.closest && e.target.closest("[data-card]:not(#peek)"); if (t && t.dataset.card !== $("peek").dataset.card) peekCard(t); else if (!t) hidePeek(); });
  addEventListener("scroll", hidePeek, {passive:true}); document.addEventListener("click", hidePeek);
}

/* ---------- search with suggestions (mouse, touch and keyboard) ---------- */
function match(q){
  q = q.trim().toLowerCase(); if (!q) return [];
  const starts = [], has = [];
  for (const c of ALL) { const i = c.name.toLowerCase().indexOf(q); if (i === 0) starts.push(c); else if (i > 0) has.push(c); }
  return starts.concat(has).slice(0, 8);
}
function wire(inp, ul, pick){
  let items = [], act = 0;
  const close = () => { ul.hidden = true; inp.setAttribute("aria-expanded","false"); inp.removeAttribute("aria-activedescendant"); };
  const choose = c => { inp.value = ""; close(); pick(c); };
  const draw = () => {
    const q = inp.value.trim(); ul.textContent = "";
    if (!q) { close(); return; }
    items = match(q); act = Math.max(0, Math.min(act, items.length-1));
    if (!items.length) ul.append(el("li","sug-none","No card matches “"+q+"”. Check the spelling."));
    items.forEach((c, i) => {
      const li = el("li", "sug-item"+(i === act ? " act" : "")); li.id = ul.id+"-"+i; li.setAttribute("role","option"); li.setAttribute("aria-selected", i === act);
      li.append(el("span","dot k-"+kind(c)), el("span","sug-name",c.name), el("span","sug-meta",metaOf(c)));
      li.addEventListener("mousedown", e => e.preventDefault());
      li.addEventListener("click", () => choose(c));
      ul.append(li);
    });
    ul.hidden = false; inp.setAttribute("aria-expanded","true");
    if (items.length) inp.setAttribute("aria-activedescendant", ul.id+"-"+act);
  };
  inp.addEventListener("input", () => { act = 0; draw(); });
  inp.addEventListener("focus", () => { if (inp.value.trim()) draw(); });
  inp.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (ul.hidden || !items.length) return; e.preventDefault();
      act = Math.max(0, Math.min(items.length-1, act + (e.key === "ArrowDown" ? 1 : -1))); draw();
      const a = $(ul.id+"-"+act); if (a) a.scrollIntoView({block:"nearest"});
    } else if (e.key === "Enter") {
      e.preventDefault(); const q = inp.value.trim(); if (!q) return;
      if (items.length && !ul.hidden) choose(items[act]); else toast("No card matches “"+q+"”.");
    } else if (e.key === "Escape") close();
  });
  document.addEventListener("click", e => { if (!inp.parentElement.contains(e.target)) close(); });
}

/* ---------- shared pieces ---------- */
function starBlock(c){
  const d = el("div"); d.append(el("span","label","Guardian Stars"));
  const ul = el("ul","star-list");
  [...new Set(c.gs)].forEach(s => {
    const li = el("li"), rel = el("span","star-rel");
    rel.append(el("span","win","beats "+STARS[BEATS[s]]), el("span","lose","weak to "+STARS[LOSES[s]]));
    li.append(starName(s), rel);
    ul.append(li);
  });
  d.append(ul); return d;
}
function recipe(o){
  if (o.ritual) return "Ritual · "+[o.ritual.card, ...o.ritual.mats].map(c => c.name).join(" + ");
  if (o.steps.length === 1) return C[o.steps[0].a].name+" + "+C[o.steps[0].b].name;
  return o.steps.length+" fusions in a row · uses "+(o.steps.length+1)+" cards";
}
/* One fusion result: summary row, tap to open steps, stars and equips. */
function resultRow(o, opt){
  const c = o.card, li = el("li", "res"+(opt.tag ? " top" : ""));
  const head = btn("res-head", "", null); head.setAttribute("aria-expanded","false");
  const main = el("span","res-main");
  if (opt.tag) main.append(el("span","tag",opt.tag));
  main.append(el("span","res-name",c.name), el("span","res-recipe",recipe(o)));
  const st = el("span","res-stats");
  if (isMon(c)) {
    const a = el("span","atk"); a.append(el("small","","ATK/"), String(c.atk));
    const d = el("span","def"); d.append(el("small","","DEF/"), String(c.def));
    st.append(a, d);
  } else st.append(el("span","kind",TYPES[c.type]));
  head.append(thumb(c), main, st, icon("chev"));
  const more = el("div","res-more"); more.hidden = true;
  if (o.ritual || o.steps.length > 1) {
    const ol = el("ol","steps");
    if (o.ritual) { const s = el("li"); s.append([o.ritual.card, ...o.ritual.mats].map(x => x.name).join(" + ")+" → ", el("b","",c.name)); ol.append(s); }
    o.steps.forEach(s => { const r = el("li"); r.append(C[s.a].name+" + "+C[s.b].name+" → ", el("b","",C[s.r].name)); ol.append(r); });
    more.append(ol);
  }
  if (isMon(c) && c.gs[0]) more.append(starBlock(c));
  if (opt.equips && opt.equips.length) more.append(el("p","note good","Equip from your "+opt.where+": "+opt.equips.join(", ")));
  more.append(btn("link","See all fusions for "+c.name, () => showLook(c)));
  head.addEventListener("click", () => { const open = more.hidden; more.hidden = !open; head.setAttribute("aria-expanded", open); li.classList.toggle("open", open); });
  li.append(head, more); return li;
}
function empty(text, action){ const e = el("div","empty"); e.append(el("p","",text)); if (action) e.append(action); return e; }
/* Collapsible section that remembers whether it was open across re-renders. */
const openFolds = new Set(store.get("fmfolds") || []);
function fold(key, title, meta, metaCls, body, openByDefault){
  const d = el("details","fold"); d.open = openFolds.has(key) || (openByDefault && !openFolds.has("closed:"+key));
  const s = el("summary"); s.append(el("span","",title), el("span","fold-meta"+(metaCls ? " "+metaCls : ""),meta), icon("chev"));
  const b = el("div","fold-body"); b.append(...[].concat(body));
  d.append(s, b);
  d.addEventListener("toggle", () => {
    openFolds.delete(key); openFolds.delete("closed:"+key);
    if (d.open) openFolds.add(key); else if (openByDefault) openFolds.add("closed:"+key);
    store.set("fmfolds", [...openFolds]);
  });
  return d;
}

/* ---------- hand ---------- */
const MAXHAND = 5;
const EXAMPLE = ["Summoned Skull","Red-eyes B. Dragon","Time Wizard","Baby Dragon","Megamorph"];
let hand = [], sortBy = "atk", showAllRes = false, justAdded = -1;
function loadHand(){ const v = store.get("fmhand"); return Array.isArray(v) && v.every(i => C[i]) ? v.slice(0, MAXHAND) : null; }
function setHand(next, msg, undoTo){
  hand = next; showAllRes = false; store.set("fmhand", hand); renderHand();
  if (msg) toast(msg, undoTo ? () => setHand(undoTo) : null);
}
function addHand(c){
  if (hand.length >= MAXHAND) { toast("Your hand is full. Remove a card first."); return false; }
  const prev = hand.slice(); justAdded = hand.length; setHand(hand.concat(c.id), "Added "+c.name, prev); return true;
}
/* Every fusion order from the hand, keeping the shortest path to each result, plus rituals. */
function outcomes(ids){
  const best = new Map();
  (function rec(items, steps){
    if (steps.length) { const l = steps[steps.length-1], cur = best.get(l.r); if (!cur || steps.length < cur.length) best.set(l.r, steps); }
    if (items.length < 2) return;
    for (let i = 0; i < items.length; i++) for (let j = i+1; j < items.length; j++) {
      const r = fuse(items[i], items[j]); if (r === undefined) continue;
      const rest = items.filter((_, k) => k !== i && k !== j); rest.push(r);
      rec(rest, steps.concat({a:items[i], b:items[j], r}));
    }
  })(ids, []);
  const list = [...best.entries()].map(([r, steps]) => ({card:C[r], steps}));
  D.r.forEach(([rc, a, b, c3, res]) => {
    const pool = ids.slice();
    if ([rc, a, b, c3].every(n => { const i = pool.indexOf(n); if (i < 0) return false; pool.splice(i, 1); return true; }))
      list.push({card:C[res], steps:[], ritual:{card:C[rc], mats:[C[a], C[b], C[c3]]}});
  });
  return list;
}
const SORT_TAG = {atk:"Strongest", def:"Best defense", cards:"Fewest cards"};
function renderHand(){
  const list = $("hand-list"); list.textContent = "";
  $("hand-count").textContent = hand.length+" of "+MAXHAND;
  const ex = EXAMPLE.map(byName).filter(Boolean).map(c => c.id);
  $("hand-ex").hidden = !(hand.length === ex.length && hand.every((id, i) => id === ex[i]));
  $("hand-clear").hidden = !hand.length;
  hand.forEach((id, i) => {
    const c = C[id], li = el("li", "chip"+(i === justAdded ? " new" : ""));
    li.dataset.card = c.id; li.append(thumb(c,"xs"), el("span","chip-name",c.name));
    li.append(el("span","chip-stat", isMon(c) ? String(c.atk) : ""));
    const x = btn("chip-x", "", () => { const prev = hand.slice(), n = hand.slice(); n.splice(i, 1); setHand(n, "Removed "+c.name, prev); }, "Remove "+c.name);
    x.append(icon("x")); li.append(x); list.append(li);
  });
  justAdded = -1;
  const out = $("hand-results"), head = $("res-head"); out.textContent = "";
  if (hand.length < 2) {
    head.hidden = true;
    out.append(hand.length
      ? empty("Add one more card to see what it fuses into.")
      : empty("Add the cards you're holding. Fusions show up here as you go.",
          btn("btn ghost","Try an example hand",() => setHand(EXAMPLE.map(byName).filter(Boolean).map(c => c.id), "Loaded an example hand", []))));
    return;
  }
  const res = outcomes(hand);
  const L = o => o.ritual ? 4 : o.steps.length+1;
  res.sort({atk:(a,b) => b.card.atk-a.card.atk || L(a)-L(b), def:(a,b) => b.card.def-a.card.def || L(a)-L(b), cards:(a,b) => L(a)-L(b) || b.card.atk-a.card.atk}[sortBy]);
  head.hidden = !res.length;
  $("res-count").textContent = plural(res.length, "fusion");
  if (!res.length) { out.append(empty("None of these cards fuse together. Swap one and try again.")); return; }
  const equips = hand.map(i => C[i]).filter(c => c.type === 23);
  const ul = el("ul","results");
  (showAllRes ? res : res.slice(0, 6)).forEach((o, i) => {
    const fits = [...new Set(equips.filter(e => EQ[o.card.id] && EQ[o.card.id].has(e.id)).map(e => e.name))];
    ul.append(resultRow(o, {tag: i === 0 ? SORT_TAG[sortBy] : null, equips: fits, where: "hand"}));
  });
  out.append(ul);
  if (res.length > 6) out.append(btn("btn ghost more", showAllRes ? "Show fewer" : "Show all "+res.length, () => { showAllRes = !showAllRes; renderHand(); }));
}

/* ---------- lookup ---------- */
let lookCard = null, lookTab = "with", lookAll = false;
function showLook(c){ lookCard = c; lookTab = "with"; lookAll = false; renderLook(); setTab("look", true); window.scrollTo({top:0, behavior:"smooth"}); }
function relRow(cards, result){
  const li = el("li","rel-row"), left = el("span","rel-left");
  cards.forEach((x, i) => { if (i) left.append(el("span","plus","+")); left.append(btn("rel-link", x.name, () => showLook(x))); });
  li.append(left);
  if (result) {
    const r = el("span","rel-res"); r.append(el("span","arrow","→"), btn("rel-link strong", result.name, () => showLook(result)));
    if (isMon(result)) r.append(el("span","rel-atk",String(result.atk)));
    li.append(r);
  }
  return li;
}
function renderLook(){
  const c = lookCard, box = $("look-card"); box.textContent = "";
  const head = el("div","look-head framed"), info = el("div","look-info");
  head.append(thumb(c,"lg"));
  info.append(el("h2","look-name",c.name));
  if (isMon(c) && c.lv > 0) { const lv = el("span","level","★".repeat(c.lv)); lv.setAttribute("role","img"); lv.setAttribute("aria-label","Level "+c.lv); info.append(lv); }
  const meta = el("p","look-meta");
  if (isMon(c)) { meta.append("["+TYPES[c.type]+"]  ATK/", el("b","",String(c.atk)), "  DEF/", el("b","",String(c.def))); }
  else meta.textContent = "["+TYPES[c.type]+" card]";
  info.append(meta);
  if (c.type === 23) info.append(el("p","look-meta","Can be equipped to "+plural(ALL.filter(x => EQ[x.id] && EQ[x.id].has(c.id)).length, "monster")+"."));
  const wide = el("div","look-wide");
  if (isMon(c) && c.gs[0]) wide.append(starBlock(c));
  wide.append(btn("btn primary","Add to hand",() => { if (addHand(c)) { window.scrollTo(0, 0); setTab("hand", true); } }));
  head.append(info, wide); box.append(head);

  const fw = [], mk = [];
  F.forEach((r, k) => { const a = Math.floor(k/1000), b = k%1000;
    if (a === c.id || b === c.id) fw.push({p:C[a === c.id ? b : a], r:C[r]});
    if (r === c.id) mk.push([C[a], C[b]]); });
  fw.sort((x, y) => y.r.atk-x.r.atk || x.p.name.localeCompare(y.p.name));
  mk.sort((a, z) => (a[0].atk+a[1].atk)-(z[0].atk+z[1].atk));
  const rit = D.r.filter(r => r.includes(c.id));
  const tabs = [["with","Fuses with",fw.length], ["from","Made from",mk.length]];
  if (rit.length) tabs.push(["rit","Ritual",rit.length]);
  if (isMon(c) && EQ[c.id]) tabs.push(["eq","Equips",EQ[c.id].size]);
  if (!tabs.some(t => t[0] === lookTab)) lookTab = "with";
  if (lookTab === "with" && !fw.length) { const firstFull = tabs.find(t => t[2]); if (firstFull) lookTab = firstFull[0]; }
  const seg = el("div","seg"); seg.setAttribute("role","tablist"); seg.setAttribute("aria-label","Card relations");
  tabs.forEach(([k, label, n]) => {
    const b = btn("seg-btn", label, () => { lookTab = k; lookAll = false; renderLook(); });
    b.setAttribute("role","tab"); b.setAttribute("aria-selected", k === lookTab); b.append(el("span","seg-n",String(n))); seg.append(b);
  });
  box.append(seg);
  let rows;
  if (lookTab === "with") rows = fw.map(x => relRow([x.p], x.r));
  else if (lookTab === "from") rows = mk.map(p => relRow(p, null));
  else if (lookTab === "rit") rows = rit.map(r => relRow([C[r[0]], C[r[1]], C[r[2]], C[r[3]]], C[r[4]]));
  else rows = [...EQ[c.id]].map(i => relRow([C[i]], null));
  const ul = el("ul","rel");
  if (!rows.length) ul.append(el("li","rel-empty", lookTab === "with" ? "This card doesn't fuse with anything." : "No two cards fuse into this one."));
  const LIM = 25; (lookAll ? rows : rows.slice(0, LIM)).forEach(r => ul.append(r));
  box.append(ul);
  if (rows.length > LIM) box.append(btn("btn ghost more", lookAll ? "Show fewer" : "Show all "+rows.length, () => { lookAll = !lookAll; renderLook(); }));
  renderGuide();
}
/* Star guide: the two cycles (current card's stars highlighted) and which types carry each star. */
function renderGuide(){
  const g = $("guide"); g.textContent = "";
  const mine = lookCard && isMon(lookCard) ? lookCard.gs : [];
  g.append(el("p","note","Each star beats the next one in its cycle. The winner gets +500 ATK and DEF for that battle. You pick one of a monster's two stars when you play it."));
  CYCLES.forEach(cy => { const p = el("p","cycle"); cy.concat(cy[0]).forEach((s, i) => { if (i) p.append(el("span","arrow","→")); p.append(starName(s, mine.includes(s) ? "on" : "")); }); g.append(p); });
  g.append(el("span","label","Monster types that carry each star most"));
  const cnt = {};
  ALL.forEach(c => { if (!isMon(c)) return; c.gs.forEach(s => { if (!s) return; const k = cnt[s] || (cnt[s] = {n:0, t:{}}); k.n++; k.t[c.type] = (k.t[c.type] || 0)+1; }); });
  const ul = el("ul","plain");
  for (let s = 1; s <= 10; s++) {
    const k = cnt[s] || {n:0, t:{}}, top = Object.entries(k.t).sort((x, y) => y[1]-x[1]).slice(0, 3);
    const li = el("li"); li.append(starName(s), el("span","val", top.map(([t, n]) => TYPES[t]+" "+Math.round(100*n/k.n)+"%").join(" · ")));
    ul.append(li);
  }
  g.append(ul, el("p","note","Percent is the share of that star's monster slots held by each type."));
}

/* ---------- deck synergy ---------- */
const MAXDECK = 40, MAXCOPY = 3;
const DECK_EXAMPLE = [["Baby Dragon",2],["Winged Dragon #1",1],["Time Wizard",2],["Thunder Dragon",1],["Summoned Skull",1],["Red-eyes B. Dragon",1],["Gaia the Fierce Knight",1],["Skull Servant",2],["Mushroom Man",1],["Megamorph",2],["Dragon Treasure",1],["Kuriboh",1],["Mystical Elf",1]];
let deck = {};
const deckSize = () => Object.values(deck).reduce((a, b) => a+b, 0);
function loadDeck(){
  const v = store.get("fmdeck"); if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = {}; let total = 0;
  for (const k in v) { const n = Math.min(MAXCOPY, MAXDECK-total, Math.floor(Number(v[k]))); if (C[k] && n >= 1) { o[k] = n; total += n; } }
  return o;
}
function addDeck(c, n = 1){ let added = 0; while (added < n && deckSize() < MAXDECK && (deck[c.id] || 0) < MAXCOPY) { deck[c.id] = (deck[c.id] || 0)+1; added++; } return added; }
function setDeck(next, msg, undoTo){ deck = next; store.set("fmdeck", deck); renderDeck(); if (msg) toast(msg, undoTo ? () => setDeck(undoTo) : null); }
function exampleDeck(){ const prev = deck; deck = {}; DECK_EXAMPLE.forEach(([n, k]) => { const c = byName(n); if (c) addDeck(c, k); }); const d = deck; deck = prev; return d; }
function addToDeck(c, quiet){
  const prev = {...deck};
  if (!addDeck(c, 1)) { toast(deckSize() >= MAXDECK ? "Your deck is full (40 cards)." : "You already have 3 copies of "+c.name+"."); return; }
  setDeck(deck, quiet ? null : "Added "+c.name, prev);
}
function analyze(){
  const ids = Object.keys(deck).map(Number);
  const has = (id, k) => (deck[id] || 0) >= k;
  const pairs = [], partners = {}; ids.forEach(i => partners[i] = new Set());
  for (let i = 0; i < ids.length; i++) for (let j = i; j < ids.length; j++) {
    const a = ids[i], b = ids[j]; if (a === b && !has(a, 2)) continue;
    const r = fuse(a, b); if (r === undefined) continue;
    pairs.push({a, b, r}); if (a !== b) { partners[a].add(b); partners[b].add(a); } else partners[a].add(a);
  }
  /* best way to reach each result: one fusion, or a second fusion onto it using a third deck card */
  const best = new Map();
  const put = (r, steps) => { const cur = best.get(r); if (!cur || steps.length < cur.length) best.set(r, steps); };
  pairs.forEach(p => {
    put(p.r, [p]);
    ids.forEach(d => {
      const used = (p.a === d ? 1 : 0)+(p.b === d ? 1 : 0); if (!has(d, used+1)) return;
      const r2 = fuse(p.r, d); if (r2 !== undefined && C[r2].atk > C[p.r].atk) put(r2, [p, {a:p.r, b:d, r:r2}]);
    });
  });
  const reach = [...best.entries()].map(([r, steps]) => ({card:C[r], steps})).sort((x, y) => y.card.atk-x.card.atk || x.steps.length-y.steps.length);
  const mons = ids.filter(i => isMon(C[i])), equips = ids.filter(i => C[i].type === 23);
  const resIds = reach.map(o => o.card.id);
  const deadMon = mons.filter(m => !partners[m].size && !equips.some(e => EQ[m] && EQ[m].has(e)));
  const deadEq = equips.filter(e => !mons.concat(resIds).some(m => EQ[m] && EQ[m].has(e)));
  const dead = new Set(deadMon.concat(deadEq));
  const monCopies = mons.reduce((s, m) => s+deck[m], 0);
  const linked = mons.filter(m => partners[m].size).reduce((s, m) => s+deck[m], 0);
  const rituals = D.r.map(r => {
    const need = {}; [r[0], r[1], r[2], r[3]].forEach(x => need[x] = (need[x] || 0)+1);
    const miss = Object.keys(need).flatMap(x => Array(Math.max(0, need[x]-(deck[x] || 0))).fill(C[x]));
    return {r, miss};
  }).filter(x => x.miss.length <= 2).sort((a, b) => a.miss.length-b.miss.length || C[b.r[4]].atk-C[a.r[4]].atk);
  const sugg = [];
  if (ids.length && deckSize() < MAXDECK) ALL.forEach(c => {
    if (!isMon(c) || deck[c.id]) return;
    let n = 0, bestR = null;
    ids.forEach(d => { const r = fuse(c.id, d); if (r === undefined) return; const R = C[r]; if (R.atk > Math.max(c.atk, C[d].atk)) { n++; if (!bestR || R.atk > bestR.atk) bestR = R; } });
    if (n) sugg.push({c, n, bestR, score:n*100+bestR.atk/10});
  });
  sugg.sort((a, b) => b.score-a.score);
  return {ids, pairs, reach, partners, dead, deadMon, deadEq, monCopies, linked, rituals, sugg:sugg.slice(0, 8), equips};
}
function renderDeck(){
  const n = deckSize(); $("deck-count").textContent = n+" of "+MAXDECK; $("deck-clear").hidden = !n;
  const ex = exampleDeck(), ek = Object.keys(ex);
  $("deck-ex").hidden = !(ek.length === Object.keys(deck).length && ek.every(k => deck[k] === ex[k]));
  const A = analyze();
  const dl = $("deck-list"); dl.textContent = "";
  A.ids.slice().sort((a, b) => C[a].type-C[b].type || C[b].atk-C[a].atk).forEach(id => {
    const c = C[id], li = el("li","dchip k-"+kind(c)), nm = el("span","dchip-name",c.name);
    if (A.dead.has(id)) nm.append(el("span","dchip-flag", isMon(c) ? "No fusion partner here" : "Fits nothing here"));
    const step = el("span","stepper");
    step.append(
      btn("step-btn","−",() => { const prev = {...deck}; deck[id]--; if (!deck[id]) { delete deck[id]; setDeck(deck, "Removed "+c.name, prev); } else setDeck(deck); }, "Remove one "+c.name),
      el("span","step-n",String(deck[id])),
      btn("step-btn","+",() => addToDeck(c, true), "Add one "+c.name));
    li.append(nm, step); dl.append(li);
  });
  const out = $("deck-out"); out.textContent = "";
  if (!A.ids.length) { out.append(empty("Add the cards in your deck to see how well they fuse together.", btn("btn ghost","Try an example deck",() => setDeck(exampleDeck(), "Loaded an example deck", {})))); return; }
  if (A.ids.length < 2) { out.append(empty("Add one more card to check synergy.")); return; }

  const pct = A.monCopies ? A.linked/A.monCopies*100 : 0;
  const sum = el("section","summary framed"); sum.setAttribute("aria-label","Deck summary");
  const top = el("div","sum-top"); top.append(el("p","sum-big",Math.round(pct)+"%"), el("p","sum-label","of your monsters have a fusion partner"));
  const meter = el("div","meter"); const bar = el("i"); bar.style.width = Math.round(pct)+"%"; meter.append(bar);
  const facts = el("ul","facts");
  const fact = (v, label, cls) => { const li = el("li",cls||""); li.append(el("b","",String(v)), el("span","",label)); return li; };
  facts.append(fact(A.pairs.length,"fusion pairs"), fact(A.reach.length ? A.reach[0].card.atk : "–","best ATK"), fact(A.dead.size,"dead cards", A.dead.size ? "bad" : ""));
  sum.append(top, meter, facts); out.append(sum);

  const h = el("div","row-head"); h.append(el("h2","","Strongest fusions"), el("span","count",plural(A.reach.length,"result"))); out.append(h);
  if (!A.reach.length) out.append(empty("No two cards in this deck fuse together."));
  else {
    const ul = el("ul","results");
    A.reach.slice(0, 5).forEach((r, i) => ul.append(resultRow(r, {tag: i === 0 ? "Strongest" : null, equips: A.equips.filter(e => EQ[r.card.id] && EQ[r.card.id].has(e)).map(e => C[e].name), where: "deck"})));
    out.append(ul);
  }

  const mons = A.ids.filter(i => isMon(C[i]) && C[i].gs[0]);
  if (mons.length) {
    const grid = el("div","cover"), gaps = [];
    [8,9,10,7,1,2,3,4,5,6].forEach(s => {
      const beat = mons.filter(m => C[m].gs.includes(LOSES[s])).reduce((a, m) => a+deck[m], 0);
      const cell = el("div","cv"+(beat ? "" : " gap"));
      cell.append(starName(s, ""), el("span","", beat ? "beaten by "+plural(beat,"card") : "nothing beats it"));
      if (!beat) gaps.push(s); grid.append(cell);
    });
    const body = [el("p","note"+(gaps.length ? " warn" : " good"), gaps.length
      ? "Nothing in your deck beats "+gaps.map(s => STARS[s]).join(", ")+". Add a monster with "+gaps.map(s => STARS[LOSES[s]]).join(" or ")+"."
      : "Every enemy star can be beaten by at least one of your monsters."), grid];
    out.append(fold("cover","Guardian Star coverage", gaps.length ? plural(gaps.length,"gap") : "No gaps", gaps.length ? "bad" : "good", body, gaps.length > 0));
  }
  if (A.dead.size) {
    const ul = el("ul","plain");
    A.deadMon.forEach(i => { const li = el("li"); li.append(el("span","nm",C[i].name), el("span","val",C[i].atk+" ATK")); ul.append(li); });
    A.deadEq.forEach(i => { const li = el("li"); li.append(el("span","nm",C[i].name), el("span","val","Equip")); ul.append(li); });
    out.append(fold("dead","Dead cards", plural(A.dead.size,"card"), "bad", [el("p","note","These don't fuse with anything else in your deck. Consider swapping them."), ul]));
  }
  if (A.sugg.length) {
    const ul = el("ul","plain");
    A.sugg.forEach(s => {
      const li = el("li"), nm = el("span","nm",s.c.name);
      nm.append(el("span","sub","+"+plural(s.n,"fusion")+" · best "+s.bestR.name+" ("+s.bestR.atk+")"));
      li.append(nm, btn("btn ghost sm","Add",() => addToDeck(s.c), "Add "+s.c.name+" to deck")); ul.append(li);
    });
    out.append(fold("sugg","Cards that add fusions", plural(A.sugg.length,"idea"), "", [el("p","note","Only counts fusions stronger than both cards used."), ul]));
  }
  if (A.rituals.length) {
    const ul = el("ul","plain");
    A.rituals.forEach(x => {
      const li = el("li"), nm = el("span","nm",C[x.r[4]].name);
      nm.append(el("span","sub", x.miss.length ? "Missing: "+x.miss.map(m => m.name).join(", ") : "You have every card"));
      li.append(nm, el("span","val", x.miss.length ? "missing "+x.miss.length : "ready")); ul.append(li);
    });
    out.append(fold("rit","Rituals within reach", plural(A.rituals.length,"ritual"), "", ul));
  }
}
function pasteList(){
  const miss = []; let added = 0, skipped = 0; const prev = {...deck};
  $("deck-paste").value.split(/\n/).map(s => s.trim()).filter(Boolean).forEach(line => {
    let k = 1, name = line;
    const m = line.match(/^(\d+)\s*x\s+(.+)$/i) || line.match(/^(.+?)\s+x\s*(\d+)$/i);
    if (m) { if (/^\d+$/.test(m[1])) { k = +m[1]; name = m[2]; } else { name = m[1]; k = +m[2]; } }
    const c = byName(name); if (!c) { miss.push(name.trim()); return; }
    const a = addDeck(c, k); added += a; skipped += k-a;
  });
  const msg = $("deck-paste-msg");
  msg.textContent = "Added "+plural(added,"card")+"."
    + (skipped ? " Skipped "+skipped+(deckSize() >= MAXDECK ? " because the deck is full (40)." : " because of the 3-copy limit.") : "")
    + (miss.length ? " Not found: "+miss.join(", ")+"." : "");
  msg.className = "note"+(miss.length || skipped ? " warn" : added ? " good" : "");
  if (added) { $("deck-paste").value = ""; setDeck(deck, "Added "+plural(added,"card")+" to your deck", prev); }
}

/* ---------- tabs + start ---------- */
const TABS = ["hand","look","deck"];
let curTab = "";
function setTab(t, animate){
  animate = animate && t !== curTab; curTab = t;
  TABS.forEach(k => { const b = $("tab-"+k); b.setAttribute("aria-selected", k === t); b.tabIndex = k === t ? 0 : -1; $("view-"+k).hidden = k !== t; });
  const v = $("view-"+t); v.classList.remove("enter"); if (animate) { void v.offsetWidth; v.classList.add("enter"); }
  store.set("fmtab", t);
}
TABS.forEach((k, i) => {
  const b = $("tab-"+k);
  b.addEventListener("click", () => { if (b.getAttribute("aria-selected") === "true") return; window.scrollTo(0, 0); setTab(k, true); });
  /* standard tab keys: arrows move between tabs, Tab goes into the screen */
  b.addEventListener("keydown", e => {
    const step = {ArrowRight:1, ArrowLeft:-1}[e.key]; if (!step) return;
    e.preventDefault(); const n = TABS[(i + step + TABS.length) % TABS.length]; window.scrollTo(0, 0); setTab(n, true); $("tab-"+n).focus();
  });
});
wire($("hand-search"), $("hand-sug"), addHand);
wire($("look-search"), $("look-sug"), c => { showLook(c); $("look-search").blur(); });
wire($("deck-search"), $("deck-sug"), c => addToDeck(c));
$("hand-clear").addEventListener("click", () => setHand([], "Cleared your hand", hand.slice()));
$("deck-clear").addEventListener("click", () => setDeck({}, "Cleared your deck", {...deck}));
$("sort").addEventListener("change", e => { sortBy = e.target.value; showAllRes = false; renderHand(); });
$("deck-paste-go").addEventListener("click", pasteList);

hand = loadHand() || EXAMPLE.map(byName).filter(Boolean).map(c => c.id);
renderHand();
lookCard = byName("Baby Dragon") || ALL[0]; renderLook();
deck = loadDeck() || exampleDeck(); renderDeck();
const savedTab = store.get("fmtab"); setTab(TABS.includes(savedTab) ? savedTab : "hand");
