// La Noche de los Teatros 2026 — mapa de zonas.
// Dibuja el mapa SVG desde ../data (coordenadas de la maqueta: 1000 x 931). Al elegir una zona el mapa se acerca a ella,
// muestra pines numerados y abre la ventana de la zona (hoja inferior en celular, panel flotante en escritorio).
const NS = "http://www.w3.org/2000/svg";
const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); p && p.appendChild(e); return e; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = id => document.getElementById(id);

const map = $("map"), wrap = $("mapwrap"), pop = $("pop"), verTodo = $("ver-todo"), pista = $("pista");
const zl = $("zones"), dl = $("dots"), ll = $("labels"), ml = $("marks");
const VB0 = [40, 30, 890, 830];
const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
const escritorio = () => matchMedia("(min-width:760px)").matches;
const compactoAhora = () => map.clientWidth < 560;

let ZONES = [], cur = null, opener = null, vb = [...VB0], anim = 0, compacto = null, sala = -1;

/* ---------- intro ---------- */
(function intro() {
  const html = document.documentElement;
  if (!html.classList.contains("con-intro")) return;
  const box = $("intro");
  const fin = () => {
    if (box.classList.contains("fuera")) return;
    box.classList.add("fuera");
    try { sessionStorage.setItem("intro-vista", "1"); } catch (e) {}
    setTimeout(() => html.classList.remove("con-intro"), 500);
  };
  box.addEventListener("click", fin);
  addEventListener("keydown", fin, { once: true });
  setTimeout(fin, reduce ? 900 : 2900);
})();

/* ---------- mapa base ---------- */
// "x,y x,y …" → "Mx,y Lx,y …"
const pathOf = lines => lines.map(pts => "M" + pts.split(" ").join(" L")).join("");

function T(p, x, y, s, a) {
  const t = el("text", Object.assign({ "font-family": "Poppins,sans-serif", x, y }, a), p);
  t.textContent = s;
  return t;
}

function drawBase(calles) {
  const r = calles.roads;
  $("prim").setAttribute("d", pathOf([...(r.motorway || []), ...(r.primary || [])].map(x => x[1])));
  $("sec").setAttribute("d", pathOf((r.secondary || []).map(x => x[1])));
  const rio = calles.water.filter(([n, t]) => t === "river" || /Suqu|Primero/.test(n));
  $("riv").setAttribute("d", pathOf(rio.map(x => x[2])));
}

function drawZones() {
  ZONES.forEach((z, i) => {
    z.i = i;
    const g = el("g", { class: "sector", tabindex: 0, role: "button", "aria-haspopup": "dialog", "aria-expanded": "false",
      "aria-label": `${z.name}, ${z.barrio}, ${z.venues.length} salas` }, zl);
    el("path", { d: z.mockupSector.svgPath, fill: z.color }, g);
    z.g = g;
    g.addEventListener("click", () => show(z, g));
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(z, g); } });

    // tarjeta equivalente debajo del mapa
    const li = document.createElement("li");
    li.innerHTML = `<button type="button" aria-haspopup="dialog" aria-expanded="false" style="--c:${z.color}">
      <span class="z-n">${esc(z.group)}</span><span class="z-b">${esc(z.barrio)}</span><span class="z-s">${z.venues.length} salas →</span></button>`;
    z.btn = li.firstElementChild;
    z.btn.addEventListener("click", () => show(z, z.btn));
    $("zonas").appendChild(li);
  });
  const salas = ZONES.reduce((n, z) => n + z.venues.length, 0);
  $("cifras").innerHTML = `<span><b>${ZONES.length}</b> zonas</span><span><b>${salas}</b> salas</span>`;
}

// puntos y etiquetas: en pantallas chicas solo el nombre del grupo, más grande, y puntos más visibles
function drawOverlay() {
  compacto = compactoAhora();
  dl.textContent = ""; ll.textContent = "";
  ZONES.forEach(z => {
    z.dots = z.venues.map(v => el("circle", { cx: v.mockupXY[0], cy: v.mockupXY[1], r: compacto ? 6.5 : 4.5, fill: "#fff", stroke: "#181818", "stroke-width": 2 }, dl));
    const s = z.mockupSector, ink = z.labelTextColor, r = s.labelRadius, n = z.group.length;
    const g = el("g", { class: "lb" }, ll);
    if (compacto) {
      const fs = Math.max(20, Math.min(56, (r * 1.9) / (n * 0.62), r * 0.8));
      T(g, s.labelX, s.labelY + fs * 0.35, z.group.toUpperCase(), { fill: ink, "font-size": fs, "font-weight": 800, "text-anchor": "middle" });
    } else {
      const fs = Math.max(14, Math.min(42, (r * 1.75) / (n * 0.62), r * 0.55));
      T(g, s.labelX, s.labelY - fs * 0.78, "ZONA", { fill: ink, "font-size": fs * 0.42, "font-weight": 700, "text-anchor": "middle", "letter-spacing": 2 });
      T(g, s.labelX, s.labelY + fs * 0.28, z.group.toUpperCase(), { fill: ink, "font-size": fs, "font-weight": 800, "text-anchor": "middle" });
      T(g, s.labelX, s.labelY + fs * 0.9, z.barrio, { fill: ink, "font-size": Math.max(10, fs * 0.34), "font-weight": 500, "text-anchor": "middle" });
    }
    z.lb = g;
  });
  if (!compacto) T(ll, 320, 452, "Río Suquía", { fill: "#181818", "font-size": 12, "font-style": "italic", "font-weight": 500, transform: "rotate(-12 320 452)", opacity: 0.75 });
  if (cur) marcar(cur);
}

/* ---------- zoom (animando el viewBox; siempre con la proporción original) ---------- */
function setVB(v) { vb = v; map.setAttribute("viewBox", v.map(n => n.toFixed(2)).join(" ")); }
// vista completa: el encuadre de la maqueta (VB0) centrado y con la proporción real del mapa en pantalla
function vbFull() {
  const W = map.clientWidth, H = map.clientHeight, s = Math.max(VB0[2] / W, VB0[3] / H);
  return [VB0[0] + VB0[2] / 2 - s * W / 2, VB0[1] + VB0[3] / 2 - s * H / 2, s * W, s * H];
}
function zoomTo(t, ms = 650) {
  cancelAnimationFrame(anim);
  if (reduce || !ms) return setVB(t);
  const a = [...vb], t0 = performance.now();
  const paso = now => {
    let k = Math.min(1, (now - t0) / ms);
    k = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    setVB(a.map((x, i) => x + (t[i] - x) * k));
    if (k < 1) anim = requestAnimationFrame(paso);
  };
  anim = requestAnimationFrame(paso);
}

// encuadre de la zona dentro del área del mapa que queda libre (a la izquierda del panel o arriba de la hoja)
function vistaZona(z) {
  const b = z.g.getBBox(), W = map.clientWidth, H = map.clientHeight;
  let x0 = 0, y0 = 0, x1 = W, y1 = H;
  if (escritorio()) x1 = Math.max(W * 0.45, W - pop.offsetWidth - 24);
  else y1 = Math.max(H * 0.45, Math.min(H, innerHeight - pop.offsetHeight - 8));
  const fw = x1 - x0, fh = y1 - y0, full = vbFull()[2] / W;
  const s = Math.min(full, Math.max(full / 3.2, b.width * 1.2 / fw, b.height * 1.2 / fh)); // unidades por píxel
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  z.escala = s;
  return [cx - s * (x0 + fw / 2), cy - s * (y0 + fh / 2), s * W, s * H];
}

/* ---------- pines numerados de la zona elegida ---------- */
function marcar(z) {
  ml.textContent = "";
  const u = (z.escala || vbFull()[2] / map.clientWidth) * (compacto ? 13 : 12); // medio lado del pin ≈ 12-13 px en pantalla
  const puestos = []; // pines ya ubicados: si se pisan, el nuevo se corre al costado libre más cercano
  z.marks = z.venues.map((v, i) => {
    const [x, y] = v.mockupXY, py = y - u * 1.6;
    let px = x;
    for (let k = 1; puestos.some(p => Math.abs(p[0] - px) < u * 2.15 && Math.abs(p[1] - py) < u * 2.15); k++)
      px = x + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * u * 2.3;
    puestos.push([px, py]);
    const g = el("g", { class: "mk", role: "button", tabindex: -1, "aria-label": `${i + 1}. ${v.name}` }, ml);
    el("line", { class: "mk-l", x1: x, y1: y, x2: px, y2: py, stroke: "#fff", "stroke-width": u * 0.14 }, g);
    el("circle", { cx: x, cy: y, r: u * 0.32, fill: "#fff", stroke: "#181818", "stroke-width": u * 0.12 }, g);
    const f = el("g", { class: "mk-f", style: `transform-origin:${px}px ${py}px` }, g);
    el("path", { class: "mk-p", fill: z.color, stroke: "#181818", "stroke-width": u * 0.14,
      d: `M${px - u},${py - u}H${px + u}V${py + u * 0.4}L${px + u * 0.4},${py + u}H${px - u}Z` }, f);
    T(f, px, py + u * 0.36, String(i + 1), { fill: z.labelTextColor, "font-size": u * 1.05, "font-weight": 800, "text-anchor": "middle", "pointer-events": "none" });
    g.addEventListener("click", () => elegirSala(i, true));
    return g;
  });
  z.dots.forEach(d => d.classList.add("on"));
}

function elegirSala(i, desdeMapa) {
  if (!cur) return;
  sala = sala === i && !desdeMapa ? -1 : i;
  cur.marks.forEach((m, k) => { m.classList.toggle("on", k === sala); if (k === sala) ml.appendChild(m); });
  pop.querySelectorAll(".sala").forEach((b, k) => { b.classList.toggle("on", k === sala); b.setAttribute("aria-pressed", k === sala); });
  if (desdeMapa && sala >= 0) {
    if (!escritorio() && !pop.classList.contains("grande")) pop.querySelector(".pop-body").scrollTop = 0;
    pop.querySelectorAll(".sala")[sala].scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }
}

/* ---------- ventana de la zona ---------- */
function render(z) {
  pop.style.setProperty("--c", z.color);
  pop.style.setProperty("--ink", z.labelTextColor);
  pop.innerHTML = `
    <button type="button" class="pop-grip" aria-label="Agrandar o achicar la ventana"></button>
    <div class="pop-h">
      <img src="../${esc(z.careta)}" alt="">
      <div class="tit"><div class="zona">ZONA</div><h2 id="pop-title">${esc(z.group)}</h2><div class="bar">${esc(z.barrio)} · ${z.venues.length} salas</div></div>
      <div class="pop-nav">
        <button type="button" data-ir="-1" aria-label="Zona anterior">‹</button>
        <button type="button" data-ir="1" aria-label="Zona siguiente">›</button>
        <button type="button" class="close" aria-label="Cerrar">✕</button>
      </div>
    </div>
    <div class="pop-body">
      <ol class="stops">${z.venues.map((v, i) => `
        <li><button type="button" class="sala" aria-pressed="false"><b>${esc(v.name)}</b><small>${esc(v.address)}</small></button><a class="ir" href="${esc(v.mapsUrl)}" target="_blank" rel="noopener" aria-label="Cómo llegar a ${esc(v.name)} (abre Google Maps)"><span>↗</span>Cómo llegar</a></li>`).join("")}
      </ol>
      <div>
        <p class="gmap-t">Las salas en Google Maps</p>
        <div class="gmap"><iframe src="${esc(z.googleMyMaps.embed)}" title="Mapa de Google con las salas de la ${esc(z.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
      </div>
      <div class="acciones">
        <a href="${esc(z.googleMyMaps.viewer)}" target="_blank" rel="noopener">Abrir en Google Maps ↗</a>
        <button type="button" class="compartir">Compartir esta zona</button>
      </div>
    </div>`;
  pop.querySelector(".close").addEventListener("click", hide);
  pop.querySelectorAll("[data-ir]").forEach(b => b.addEventListener("click", () => {
    show(ZONES[(z.i + Number(b.dataset.ir) + ZONES.length) % ZONES.length], opener, b.dataset.ir === "1" ? 1 : 2);
  }));
  pop.querySelectorAll(".sala").forEach((b, i) => {
    b.addEventListener("click", () => elegirSala(i, false));
    b.addEventListener("mouseenter", () => z.marks && z.marks[i].classList.add("on"));
    b.addEventListener("mouseleave", () => z.marks && i !== sala && z.marks[i].classList.remove("on"));
  });
  pop.querySelector(".compartir").addEventListener("click", () => compartir(z));
  arrastre();
}

// celular: la hoja se arrastra desde la manija o el encabezado (abajo cierra, arriba agranda); tocar la manija alterna el tamaño
function arrastre() {
  const zonaToque = [pop.querySelector(".pop-grip"), pop.querySelector(".pop-h")];
  let y0 = null, dy = 0;
  zonaToque.forEach(h => {
    h.addEventListener("pointerdown", e => {
      if (escritorio() || e.target.closest(".pop-nav")) return;
      y0 = e.clientY; dy = 0;
      pop.classList.add("arrastrando");
      h.setPointerCapture(e.pointerId);
    });
    h.addEventListener("pointermove", e => {
      if (y0 === null) return;
      dy = e.clientY - y0;
      pop.style.transform = dy > 0 ? `translateY(${dy}px)` : "";
    });
    const fin = () => {
      if (y0 === null) return;
      y0 = null;
      pop.classList.remove("arrastrando");
      pop.style.transform = "";
      if (dy > 90) hide();
      else if (dy < -40) tamHoja(true);
      else if (dy > 30) tamHoja(false);
    };
    h.addEventListener("pointerup", fin);
    h.addEventListener("pointercancel", fin);
  });
  zonaToque[0].addEventListener("click", () => { if (Math.abs(dy) < 6) tamHoja(!pop.classList.contains("grande")); });
}
function tamHoja(grande) {
  pop.classList.toggle("grande", grande);
  setTimeout(() => document.body.style.setProperty("--hoja-h", pop.offsetHeight + "px"), 260);
}

function setOn(z) {
  map.classList.toggle("focus", !!z);
  ZONES.forEach(q => {
    const on = q === z;
    q.g.classList.toggle("on", on);
    q.lb.classList.toggle("on", on);
    q.g.setAttribute("aria-expanded", on);
    q.btn.setAttribute("aria-expanded", on);
    if (!on) q.dots.forEach(d => d.classList.remove("on"));
  });
}

// dir: 0 = desde el mapa o la lista, 1/2 = con las flechas de la ventana (el foco queda en la flecha)
function show(z, from, dir = 0) {
  opener = from || z.g;
  pista.classList.add("listo");
  const cambia = cur !== z;
  if (cambia) { cur = z; sala = -1; render(z); }
  setOn(z);
  pop.hidden = false;
  verTodo.hidden = false;
  z.g.classList.remove("toque"); void z.g.getBoundingClientRect(); z.g.classList.add("toque");
  try { history.replaceState(null, "", "#" + z.id); } catch (e) {}

  if (!escritorio()) {
    document.body.classList.add("hoja-abierta");
    document.body.style.setProperty("--hoja-h", pop.offsetHeight + "px");
    const top = wrap.getBoundingClientRect().top + scrollY;
    if (Math.abs(scrollY - top) > 4) scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  } else {
    const r = wrap.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) wrap.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }
  zoomTo(vistaZona(z));
  marcar(z);
  if (dir) pop.querySelectorAll("[data-ir]")[dir === 1 ? 1 : 0].focus({ preventScroll: true });
  else pop.querySelector(".close").focus({ preventScroll: true });
}

function hide() {
  if (pop.hidden) return;
  pop.hidden = true; pop.innerHTML = ""; pop.classList.remove("grande");
  verTodo.hidden = true;
  ml.textContent = "";
  cur = null; sala = -1;
  setOn(null);
  document.body.classList.remove("hoja-abierta");
  zoomTo(vbFull());
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  if (opener && opener.isConnected) opener.focus({ preventScroll: true });
}

async function compartir(z) {
  const url = location.href.split("#")[0] + "#" + z.id;
  try {
    if (navigator.share) return await navigator.share({ title: `${z.name} · La Noche de los Teatros 2026`, text: `${z.name} (${z.barrio}): ${z.venues.length} salas.`, url });
    await navigator.clipboard.writeText(url);
    aviso("Link de la zona copiado");
  } catch (e) {
    if (e.name !== "AbortError") aviso("No se pudo copiar el link");
  }
}

let avisoT = 0;
function aviso(txt) {
  const a = $("aviso");
  a.textContent = txt; a.classList.add("ver");
  clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove("ver"), 2200);
}

/* ---------- eventos generales ---------- */
verTodo.addEventListener("click", hide);
document.addEventListener("keydown", e => {
  if (e.key === "Escape") hide();
  if (cur && pop.contains(document.activeElement) && (e.key === "ArrowRight" || e.key === "ArrowLeft"))
    pop.querySelector(`[data-ir="${e.key === "ArrowRight" ? 1 : -1}"]`).click();
});
document.addEventListener("click", e => {
  // (un botón que se redibujó al cambiar de zona ya no está en la página: no cuenta como clic afuera)
  if (!pop.hidden && e.target.isConnected && !pop.contains(e.target) &&!e.target.closest(".sector, .zonas button, .mk, .ver-todo, .intro")) hide();
});
// links por zona (#siripo, #teuc…): abren esa zona aunque la página ya esté abierta
addEventListener("hashchange", () => {
  const z = ZONES.find(q => "#" + q.id === location.hash);
  if (z) { if (z !== cur) show(z); } else hide();
});
let rT = 0;
addEventListener("resize", () => {
  clearTimeout(rT);
  rT = setTimeout(() => {
    if (!ZONES.length) return;
    if (compactoAhora() !== compacto) drawOverlay();
    if (cur) { zoomTo(vistaZona(cur), 0); marcar(cur); setOn(cur); }
    else zoomTo(vbFull(), 0);
  }, 120);
});

Promise.all([fetch("../data/zones.json"), fetch("../data/calles-cordoba.json")].map(p => p.then(r => {
  if (!r.ok) throw new Error(r.url + " → " + r.status);
  return r.json();
})))
  .then(([data, calles]) => {
    ZONES = data.zones;
    drawBase(calles);
    drawZones();
    drawOverlay();
    setVB(vbFull());
    $("estado").remove();
    const z = ZONES.find(q => "#" + q.id === location.hash);
    if (z) show(z);
  })
  .catch(err => {
    console.error(err);
    $("estado").textContent = "No se pudo cargar el mapa. Abrilo desde un servidor (por ejemplo: python3 -m http.server).";
  });
