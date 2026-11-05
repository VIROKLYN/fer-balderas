document.documentElement.classList.add("js");

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktopSeq = window.matchMedia("(min-width: 1080px)");

document.body.insertAdjacentHTML("afterbegin", `
  <div class="progress" aria-hidden="true"></div>
  <svg class="grain" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <filter id="grain-filter">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#grain-filter)"/>
  </svg>
`);

const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-menu-toggle]");
const panel = document.querySelector("[data-menu]");

if (toggle && panel) {
  panel.inert = true;
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    panel.inert = !open;
  };
  toggle.addEventListener("click", () => setMenu(!panel.classList.contains("is-open")));
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });
}

const revealItems = document.querySelectorAll("[data-reveal]");
if (reduce || !("IntersectionObserver" in window)) {
  revealItems.forEach((el) => el.classList.add("is-in"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.18 });
  revealItems.forEach((el) => revealObserver.observe(el));
}

if (window.matchMedia("(hover: hover)").matches) {
  document.querySelectorAll("[data-parallax]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--px", ((e.clientX - rect.left) / rect.width - 0.5).toFixed(3));
      el.style.setProperty("--py", ((e.clientY - rect.top) / rect.height - 0.5).toFixed(3));
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    });
  });
}

const sequence = document.querySelector("[data-sequence]");
if (sequence) {
  const steps = [...sequence.querySelectorAll("[data-step]")];
  const images = [...sequence.querySelectorAll("[data-seq-img]")];
  let current = -1;
  let token = 0;
  steps.forEach((step) => {
    const preload = new Image();
    preload.src = step.dataset.src;
  });

  const setFrame = (index) => {
    if (index === current || index < 0) return;
    current = index;
    const frameToken = ++token;
    steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
    const src = steps[index].dataset.src;
    const incoming = images.find((img) => !img.classList.contains("is-front")) || images[0];
    const outgoing = images.find((img) => img.classList.contains("is-front"));
    const show = () => {
      if (frameToken !== token) return;
      incoming.classList.add("is-front");
      if (outgoing && outgoing !== incoming) outgoing.classList.remove("is-front");
    };
    if (reduce || (incoming.src === src && incoming.complete)) {
      incoming.src = src;
      show();
      return;
    }
    incoming.onload = show;
    incoming.src = src;
    if (incoming.complete) show();
  };

  if (!desktopSeq.matches && "IntersectionObserver" in window) {
    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setFrame(steps.indexOf(entry.target));
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0.01 });
    steps.forEach((step) => stepObserver.observe(step));
  }
  sequence._setFrame = setFrame;
}

const cine = document.querySelector("[data-cine]");
const shifts = document.querySelectorAll("[data-shift]");

const update = () => {
  const height = document.documentElement.scrollHeight - window.innerHeight;
  document.documentElement.style.setProperty("--scroll", height > 0 ? (window.scrollY / height).toFixed(4) : "0");
  if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8);

  if (sequence && desktopSeq.matches && sequence._setFrame) {
    const total = sequence.offsetHeight - window.innerHeight;
    const passed = Math.min(Math.max(-sequence.getBoundingClientRect().top, 0), Math.max(total, 0));
    const progress = total > 0 ? passed / total : 0;
    const steps = sequence.querySelectorAll("[data-step]").length;
    const index = Math.min(steps - 1, Math.floor(progress * steps * 0.999));
    sequence._setFrame(index);
  }

  if (!reduce && cine) {
    const rect = cine.getBoundingClientRect();
    const view = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    const track = cine.querySelector(".cine-track");
    if (track) track.style.transform = `translate3d(${(0.5 - view) * 8}%, 0, 0)`;
  }

  if (!reduce) {
    shifts.forEach((el) => {
      const img = el.querySelector("img");
      if (!img) return;
      const rect = el.getBoundingClientRect();
      const delta = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      const amount = delta * Number(el.dataset.shift || 24);
      img.style.transform = `translate3d(0, ${amount.toFixed(1)}px, 0) scale(1.12)`;
    });
  }
};

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    update();
    ticking = false;
  });
};
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
update();

const zoomables = [...document.querySelectorAll("[data-zoom]")];
if (zoomables.length) {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.innerHTML = `
    <button class="prev" type="button" aria-label="Anterior">‹</button>
    <img alt="">
    <button class="next" type="button" aria-label="Siguiente">›</button>
    <button class="close" type="button">Cerrar</button>
  `;
  document.body.appendChild(box);
  const shot = box.querySelector("img");
  let index = 0;

  const sources = zoomables.map((el) => el.getAttribute("href") || el.dataset.zoom);
  const render = () => {
    shot.src = sources[index];
    shot.alt = zoomables[index].querySelector("img")?.alt || "Fotografía de Fer Balderas";
  };
  const open = (i) => {
    index = i;
    render();
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add("is-open"));
    document.body.style.overflow = "hidden";
    box.querySelector(".close").focus();
  };
  const close = () => {
    box.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(() => { box.hidden = true; }, 280);
  };

  zoomables.forEach((el, i) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      open(i);
    });
  });
  box.querySelector(".close").addEventListener("click", close);
  box.querySelector(".next").addEventListener("click", () => { index = (index + 1) % sources.length; render(); });
  box.querySelector(".prev").addEventListener("click", () => { index = (index - 1 + sources.length) % sources.length; render(); });
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") { index = (index + 1) % sources.length; render(); }
    if (e.key === "ArrowLeft") { index = (index - 1 + sources.length) % sources.length; render(); }
  });
}

const form = document.querySelector("[data-form]");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const read = (name) => (form.elements[name]?.value || "").trim();
    const rawDate = read("fecha");
    const fecha = rawDate
      ? new Date(`${rawDate}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const lines = [
      `Hola, Fer. Soy ${read("nombre")} ${read("apellido")}.`,
      `Correo: ${read("correo")}`,
      read("telefono") ? `WhatsApp: ${read("telefono")}` : "",
      fecha ? `Fecha de la celebración: ${fecha}` : "",
      `Ciudad / destino: ${read("ciudad")}`,
      read("venue") ? `Venue: ${read("venue")}` : "",
      read("planner") ? `Wedding planner: ${read("planner")}` : "",
      `Inversión aproximada: $${read("inversion")} MXN`,
      "",
      read("historia")
    ].filter(Boolean);
    const url = `https://wa.me/524492116287?text=${encodeURIComponent(lines.join("\n"))}`;
    const status = form.querySelector("[data-status]");
    const opened = window.open(url, "_blank", "noopener");
    if (status) {
      status.innerHTML = opened
        ? "Listo. WhatsApp debe abrirse en otra pestaña."
        : `Si no se abrió, <a href="${url}" target="_blank" rel="noopener">continúa por WhatsApp</a>.`;
    }
  });
}
