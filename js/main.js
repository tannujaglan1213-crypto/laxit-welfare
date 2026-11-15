// Page behaviour: shows events from config.js / Supabase, handles the registration form,
// the mobile menu, dark-mode toggle and scroll animations.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayStr = () => new Date().toISOString().slice(0, 10);
const isUpcoming = e => e.date >= todayStr();
const longDate = d => new Date(d + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const backendConfigured = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase);
const db = backendConfigured ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey) : null;
let EVENTS = [...LOCAL_EVENTS];

/* ---------------------------------------------------------------
   EVENTS
   Buttons carry data-reg="<event id>"; one click listener (below)
   opens the form, so no inline onclick is needed.
   --------------------------------------------------------------- */
function eventCard(e) {
  const d = new Date(e.date + "T00:00"), up = isUpcoming(e);
  return `<article class="ev"><div class="dt" aria-hidden="true"><b>${d.getDate()}</b>${d.toLocaleString("en-IN", { month: "short" })}</div><div>
    <span class="badge ${up ? "" : "p"}">${up ? "Upcoming" : "Completed"}</span> <span class="mu">${esc(e.category)}</span>
    <h3>${esc(e.title)}</h3>
    <p class="mu">${esc(longDate(e.date))}${e.time ? " · " + esc(e.time) : ""} · ${esc(e.venue)}${CONFIG.registrationFeesEnabled ? " · " + (+e.fee ? "Fee ₹" + esc(e.fee) : "Free entry") : ""}</p>
    <p>${esc(e.desc)}</p>
    ${up && e.open !== false ? `<button class="btn g sm" type="button" data-reg="${esc(e.id)}">Register</button>` : ""}</div></article>`;
}

async function renderEvents() {
  // Loading state while events are fetched
  $("#events-upcoming").innerHTML = '<p class="mu">Loading activities…</p>';
  if (backendConfigured) {
    const { data, error } = await db.from("events")
      .select("id,title,event_date,event_time,venue,category,fee,is_open,description")
      .order("event_date");
    if (error) {
      console.error("Could not load events:", error.message);
      $("#events-upcoming").innerHTML = '<p class="mu">Activities could not be loaded right now. Please try again later.</p>';
      $("#events-past").innerHTML = "";
      $("#next-event").innerHTML = "";
      return;
    }
    EVENTS = data.map(e => ({
      id: e.id, title: e.title, date: e.event_date, time: e.event_time || "",
      venue: e.venue, category: e.category, fee: CONFIG.registrationFeesEnabled ? e.fee : 0, open: e.is_open, desc: e.description
    }));
  }
  const sorted = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date));
  const up = sorted.filter(isUpcoming), past = sorted.filter(e => !isUpcoming(e)).reverse();
  $("#events-upcoming").innerHTML = up.length ? up.map(eventCard).join("") : '<p class="mu">New activities will be announced soon.</p>';
  $("#events-past").innerHTML = past.length ? past.map(eventCard).join("") : '<p class="mu">Past activities will appear here.</p>';
  const next = up[0];
  $("#next-event").innerHTML = next ? `<div class="next"><div class="eb">Next event</div><h3>${esc(next.title)}</h3><p class="mu">${esc(longDate(next.date))}<br>${esc(next.venue)}</p>${next.open !== false ? `<button class="btn g" type="button" data-reg="${esc(next.id)}">Register now</button>` : ""}</div>` : "";
}

/* ---------------------------------------------------------------
   REGISTRATION MODAL (accessible: dialog role, focus trap, Esc to close)
   --------------------------------------------------------------- */
let lastFocus = null;   // element to return focus to when the dialog closes

function showModal(inner, focusSel) {
  $("#modal").innerHTML = `<div class="modal" id="modal-overlay"><div role="dialog" aria-modal="true" aria-labelledby="modal-title">${inner}</div></div>`;
  document.body.style.overflow = "hidden";
  const target = (focusSel && $(focusSel)) || $("#modal [role=dialog] h2");
  if (target) { target.tabIndex = target.tabIndex < 0 ? -1 : target.tabIndex; target.focus(); }
}

function openReg(id) {
  const e = EVENTS.find(x => x.id === id);
  if (!e) return;
  const fee = CONFIG.registrationFeesEnabled ? +e.fee : 0;
  lastFocus = document.activeElement;
  showModal(`
    <h2 id="modal-title" tabindex="-1">Register: ${esc(e.title)}</h2>
    <p class="mu">${esc(longDate(e.date))}${CONFIG.registrationFeesEnabled ? " · " + (fee ? "Fee ₹" + fee : "Free") : ""}</p>
    <form id="reg-form" novalidate data-id="${esc(id)}">
      <label for="f_name">Full name <span class="req">*</span></label>
      <input id="f_name" autocomplete="name" aria-describedby="e_name"><div class="field-error" id="e_name" role="alert"></div>
      <label for="f_phone">Mobile number <span class="req">*</span></label>
      <input id="f_phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="15" placeholder="10-digit mobile number" aria-describedby="e_phone"><div class="field-error" id="e_phone" role="alert"></div>
      <label for="f_email">Email (optional)</label>
      <input id="f_email" type="email" autocomplete="email" aria-describedby="e_email"><div class="field-error" id="e_email" role="alert"></div>
      <label for="f_age">Age (optional)</label>
      <input id="f_age" type="number" inputmode="numeric" min="1" max="120" aria-describedby="e_age"><div class="field-error" id="e_age" role="alert"></div>
      <label for="f_city">Village / City (optional)</label>
      <input id="f_city" autocomplete="address-level2">
      <label for="f_note">Anything else (optional)</label>
      <textarea id="f_note" rows="2"></textarea>
      ${fee ? `<div class="note">Pay ₹${fee} ${CONFIG.upi ? `to UPI <b>${esc(CONFIG.upi)}</b> (<a href="upi://pay?pa=${esc(CONFIG.upi)}&pn=Laxit%20Welfare%20Foundation&am=${fee}&cu=INR">open UPI app</a>)` : "as told by the foundation"}, then enter the transaction ID.</div>
      <label for="f_txn">UPI transaction ID <span class="req">*</span></label><input id="f_txn" aria-describedby="e_txn"><div class="field-error" id="e_txn" role="alert"></div>` : ""}
      <p id="f_msg" class="form-error" role="alert"></p>
      <div class="modal-actions">
        <button class="btn" type="submit" id="f_submit">Submit registration</button>
        <button class="btn o" type="button" data-close>Cancel</button>
      </div>
    </form>`, "#f_name");
}

function closeModal() {
  $("#modal").innerHTML = "";
  document.body.style.overflow = "";
  if (lastFocus && lastFocus.focus) lastFocus.focus();
  lastFocus = null;
}

// Show / clear an error under one field
function fieldError(key, msg) {
  const input = $("#f_" + key), box = $("#e_" + key);
  if (box) box.textContent = msg || "";
  if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
}

// Validate the form; returns true when everything is fine
function validateReg(r, e) {
  let first = null;
  const bad = (key, msg) => { fieldError(key, msg); first = first || key; };
  ["name", "phone", "email", "age", "txn"].forEach(k => fieldError(k, ""));
  if (r.name.length < 2) bad("name", "Please enter your full name.");
  const digits = r.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) bad("phone", "Please enter a valid 10-digit mobile number.");
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) bad("email", "This email address doesn't look right.");
  if (r.age && !(+r.age >= 1 && +r.age <= 120)) bad("age", "Please enter an age between 1 and 120.");
  if (+e.fee && !r.txn) bad("txn", "Please enter the payment transaction ID.");
  if (first) $("#f_" + first).focus();
  return !first;
}

async function submitReg(id) {
  const e = EVENTS.find(x => x.id === id), g = k => ($("#f_" + k) || { value: "" }).value.trim();
  const r = { event: e.title, date: e.date, name: g("name"), phone: g("phone"), email: g("email"), age: g("age"), city: g("city"), note: g("note"), txn: g("txn"), fee: e.fee };
  const err = m => { $("#f_msg").textContent = m; };
  err("");
  if (!validateReg(r, e)) return;

  // Loading state: disable the button so it can't be pressed twice
  const btn = $("#f_submit");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Saving…';
  const restore = () => { btn.disabled = false; btn.textContent = "Submit registration"; };

  const ref = "LWF" + Date.now().toString(36).toUpperCase();
  let saved = false;
  if (backendConfigured) {
    const { error } = await db.from("registrations").insert({
      ref, event_id: e.id, full_name: r.name, phone: r.phone, email: r.email || null,
      age: r.age ? Number(r.age) : null, city: r.city || null, note: r.note || null,
      ...(CONFIG.registrationFeesEnabled ? { transaction_id: r.txn || null } : {})
    });
    if (error) { restore(); return err("We couldn't save your registration. Please try again or contact the foundation. " + error.message); }
    saved = true;
  } else if (CONFIG.formEndpoint) {
    try { saved = (await fetch(CONFIG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ref, ...r }) })).ok; } catch { saved = false; }
  }
  const text = `Hello Laxit Welfare Foundation, I want to register for ${e.title} (${e.date}).\nName: ${r.name}\nMobile: ${r.phone}\nAge: ${r.age}\nCity: ${r.city}\nRef: ${ref}${+e.fee ? "\nUPI Txn ID: " + r.txn : ""}`;
  showModal(`<div class="success-icon"><svg aria-hidden="true"><use href="#i-check"/></svg></div>
    <h2 id="modal-title" tabindex="-1">Almost done</h2>
    <p>Thank you, <b>${esc(r.name)}</b>. Your reference number is:</p>
    <p><span class="ref-box">${ref}</span></p>
    ${saved ? '<p class="note">✔ Your details were saved.</p>' : ""}
    <p class="note"><b>Last step:</b> please send your details to the foundation so we can confirm your seat.</p>
    <div class="modal-actions">
      <a class="btn s" target="_blank" rel="noopener" href="https://wa.me/${esc(CONFIG.whatsapp)}?text=${encodeURIComponent(text)}">Send on WhatsApp</a>
      <a class="btn o" href="mailto:${esc(CONFIG.email)}?subject=${encodeURIComponent("Registration " + ref)}&body=${encodeURIComponent(text)}">Send by email</a>
    </div>
    <p style="margin:14px 0 0"><button class="btn o sm" type="button" data-close>Close</button></p>`);
}

/* ---------------------------------------------------------------
   EVENT LISTENERS (clicks, keyboard)
   --------------------------------------------------------------- */
document.addEventListener("click", ev => {
  const reg = ev.target.closest("[data-reg]");
  if (reg) return openReg(reg.dataset.reg);
  if (ev.target.closest("[data-close]")) return closeModal();
  if (ev.target.id === "modal-overlay") return closeModal();          // click on dark backdrop
  // Close the mobile menu after choosing a link
  if (ev.target.closest("#nav-links a")) setMenu(false);
});
document.addEventListener("submit", ev => {
  if (ev.target.id === "reg-form") { ev.preventDefault(); submitReg(ev.target.dataset.id); }
});
document.addEventListener("keydown", ev => {
  const dlg = $("#modal [role=dialog]");
  if (ev.key === "Escape") { if (dlg) closeModal(); else setMenu(false); return; }
  // Keep Tab inside the open dialog
  if (ev.key === "Tab" && dlg) {
    const f = [...dlg.querySelectorAll("a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex='-1'])")].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }
});

/* ---------------------------------------------------------------
   MOBILE MENU
   --------------------------------------------------------------- */
function setMenu(open) {
  const btn = $("#menu-btn"), nav = $("#nav-links");
  if (!btn || !nav) return;
  nav.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", String(open));
  btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  btn.textContent = open ? "✕" : "☰";
}
$("#menu-btn")?.addEventListener("click", () => setMenu(!$("#nav-links").classList.contains("open")));

/* ---------------------------------------------------------------
   LIGHT / DARK MODE (choice is remembered on this device)
   --------------------------------------------------------------- */
function toggleTheme() {
  const d = document.documentElement, dark = d.dataset.theme ? d.dataset.theme === "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
  d.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("lwf-theme", d.dataset.theme); } catch (_) { /* storage blocked: ignore */ }
}
try { const t = localStorage.getItem("lwf-theme"); if (t) document.documentElement.dataset.theme = t; } catch (_) { /* ignore */ }

/* ---------------------------------------------------------------
   SCROLL REVEAL (subtle fade-in; skipped if user prefers reduced motion)
   Elements get "reveal" in the HTML; content stays visible without JS.
   --------------------------------------------------------------- */
(function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(el => el.classList.add("in")); return;
  }
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: .12 });
  items.forEach(el => io.observe(el));
})();

renderEvents();
