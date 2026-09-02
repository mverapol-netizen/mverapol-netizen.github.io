(() => {
  "use strict";

  const els = {
    setupPanel: document.querySelector("#setupPanel"),
    authPanel: document.querySelector("#authPanel"),
    appPanel: document.querySelector("#appPanel"),
    logoutButton: document.querySelector("#logoutButton"),
    refreshButton: document.querySelector("#refreshButton"),
    welcomeTitle: document.querySelector("#welcomeTitle"),
    countRecommended: document.querySelector("#countRecommended"),
    countReview: document.querySelector("#countReview"),
    countActive: document.querySelector("#countActive"),
    searchInput: document.querySelector("#searchInput"),
    filterChips: document.querySelector("#filterChips"),
    feedTitle: document.querySelector("#feedTitle"),
    feedSubtitle: document.querySelector("#feedSubtitle"),
    loadingState: document.querySelector("#loadingState"),
    emptyState: document.querySelector("#emptyState"),
    jobList: document.querySelector("#jobList"),
    jobDialog: document.querySelector("#jobDialog"),
    detailSource: document.querySelector("#detailSource"),
    detailTitle: document.querySelector("#detailTitle"),
    detailBody: document.querySelector("#detailBody"),
  };

  const VIEW_META = {
    recommended: ["Recomendadas", "Campo profesional claramente pertinente y sin señales fuertes de incompatibilidad."],
    review: ["Vale la pena revisar", "Vacantes cercanas al campo o con información insuficiente para decidir automáticamente."],
    all: ["Explorar todas", "Todo el universo vigente detectado, incluidos cargos que el radar considera lejanos al campo."],
    new: ["Nuevas", "Vacantes incorporadas recientemente por el radar."],
    week: ["Esta semana", "Publicadas o detectadas desde el lunes."],
    high_match: ["Alta compatibilidad personal", "Coincidencia profesional ≥ 75%, solo cuando existe evidencia suficiente."],
    closing_soon: ["Cierran pronto", "Vacantes con cierre dentro de los próximos 7 días."],
    saved: ["Guardadas", "Tu lista personal para revisar con calma."],
    interested: ["Me interesan", "Oportunidades que marcaste como interesantes."],
    will_apply: ["Voy a postular", "Tu cola activa de postulaciones."],
    applied: ["Postulé", "Vacantes a las que ya enviaste postulación."],
    dismissed: ["Descartadas", "Vacantes que apartaste de las vistas normales."],
  };

  const state = {
    client: null,
    session: null,
    profile: null,
    jobs: [],
    interactions: new Map(),
    view: "recommended",
    query: "",
    loading: false,
  };

  function clean(value) { return String(value ?? "").trim(); }
  function showOnly(name) {
    els.setupPanel?.classList.toggle("hidden", name !== "setup");
    els.authPanel?.classList.toggle("hidden", name !== "auth");
    els.appPanel?.classList.toggle("hidden", name !== "app");
  }
  function isoToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function mondayIso() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function dayNumber(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(iso))) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }
  function daysUntil(iso) {
    const target = dayNumber(iso), today = dayNumber(isoToday());
    return target === null || today === null ? null : target - today;
  }
  function shortDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function fitValue(job) {
    const n = Number(job.professional_fit);
    return job.professional_fit === null || job.professional_fit === undefined || !Number.isFinite(n) ? null : n;
  }
  function semanticScore(job) {
    const n = Number(job.general_social_science_score);
    return Number.isFinite(n) ? n : 0;
  }
  function eligibilityRank(value) {
    return { CUMPLE: 0, PROBABLEMENTE_CUMPLE: 1, INCIERTO: 2, INDETERMINADO: 2, PROBABLEMENTE_NO_CUMPLE: 3, NO_CUMPLE: 4 }[value] ?? 5;
  }
  function eligibilityLabel(value) {
    return {
      CUMPLE: "Cumple",
      PROBABLEMENTE_CUMPLE: "Probablemente cumple",
      INCIERTO: "Revisar requisitos",
      INDETERMINADO: "Revisar requisitos",
      PROBABLEMENTE_NO_CUMPLE: "Probablemente no cumple",
      NO_CUMPLE: "No cumple",
    }[value] || "Sin evaluación";
  }
  function isOffDomain(job) {
    return clean(job.classification).includes("Fuera de campo") || Boolean(clean(job.exclusion_reason));
  }
  function hasBadEligibility(job) {
    return ["NO_CUMPLE", "PROBABLEMENTE_NO_CUMPLE"].includes(job.eligibility);
  }
  function hasUncertainEligibility(job) {
    return ["INCIERTO", "INDETERMINADO", ""].includes(clean(job.eligibility));
  }
  function isRecommended(job) {
    return !isOffDomain(job) && semanticScore(job) >= 65 && !hasBadEligibility(job) && !hasUncertainEligibility(job);
  }
  function isReview(job) {
    if (isOffDomain(job) || isRecommended(job)) return false;
    return semanticScore(job) >= 40 || (semanticScore(job) >= 65 && !hasBadEligibility(job));
  }
  function isHighMatch(job) {
    const fit = fitValue(job);
    return !isOffDomain(job) && fit !== null && fit >= 75 && !hasBadEligibility(job);
  }
  function isClosingSoon(job) {
    const left = daysUntil(job.deadline);
    return left !== null && left >= 0 && left <= 7;
  }

  function interactionFor(jobId) {
    return state.interactions.get(jobId) || {
      profile_id: state.profile?.profile_id || "",
      job_id: jobId,
      saved: false,
      status: "none",
      note: "",
      updated_at: null,
    };
  }
  function notDismissed(job) { return interactionFor(job.job_id).status !== "dismissed"; }

  function normalizeMatch(row) {
    return {
      ...(row.jobs || {}),
      job_id: row.job_id,
      profile_id: row.profile_id,
      display_name: row.display_name,
      eligibility: row.eligibility,
      professional_fit: row.professional_fit,
      direct_fit: row.direct_fit,
      transition_potential: row.transition_potential,
      preference_fit: row.preference_fit,
      preference_state: row.preference_state,
      evidence_coverage: row.evidence_coverage,
      direct_matches: row.direct_matches,
      transferable_matches: row.transferable_matches,
      unresolved_concepts: row.unresolved_concepts,
      mandatory_detail: row.mandatory_detail,
      scored_at: row.scored_at,
    };
  }

  async function resolveProfile() {
    const { data, error } = await state.client.from("profile_accounts").select("profile_id,display_name").limit(2);
    if (error) throw error;
    if (!data || data.length !== 1) throw new Error("Tu cuenta no está asociada a exactamente un perfil del radar.");
    state.profile = data[0];
  }

  async function loadJobs() {
    setLoading(true);
    try {
      await resolveProfile();
      const { data: matchRows, error: matchError } = await state.client
        .from("job_matches")
        .select(`job_id,profile_id,display_name,eligibility,professional_fit,direct_fit,transition_potential,preference_fit,preference_state,evidence_coverage,direct_matches,transferable_matches,unresolved_concepts,mandatory_detail,scored_at,jobs!inner(job_id,source,title,organization,location,deadline,posted_date,url,description,category,general_social_science_score,classification,matched_terms,exclusion_reason,first_seen,last_seen,last_changed,source_state,active)`)
        .eq("current", true)
        .eq("jobs.active", true);
      if (matchError) throw matchError;

      const { data: interactionRows, error: interactionError } = await state.client
        .from("user_job_state")
        .select("profile_id,job_id,saved,status,note,updated_at")
        .eq("profile_id", state.profile.profile_id);
      if (interactionError) throw interactionError;

      state.jobs = (matchRows || []).map(normalizeMatch);
      state.interactions = new Map((interactionRows || []).map((row) => [row.job_id, row]));
      els.welcomeTitle.textContent = `Hola, ${state.profile.display_name}`;
      render();
    } catch (error) {
      console.error(error);
      els.jobList.replaceChildren(messageCard("No pudimos cargar el radar", error.message || "Error de conexión."));
    } finally {
      setLoading(false);
    }
  }

  function setLoading(value) {
    state.loading = value;
    els.loadingState?.classList.toggle("hidden", !value);
    if (els.refreshButton) els.refreshButton.disabled = value;
  }

  function filterJobs() {
    const monday = mondayIso();
    let rows = state.jobs.filter((job) => {
      const interaction = interactionFor(job.job_id);
      if (state.view !== "dismissed" && interaction.status === "dismissed") return false;
      switch (state.view) {
        case "recommended": return isRecommended(job);
        case "review": return isReview(job);
        case "all": return true;
        case "week": return (job.posted_date || job.first_seen || "") >= monday;
        case "new": return job.source_state === "new";
        case "high_match": return isHighMatch(job);
        case "closing_soon": return isClosingSoon(job);
        case "saved": return Boolean(interaction.saved);
        case "interested":
        case "will_apply":
        case "applied":
        case "dismissed": return interaction.status === state.view;
        default: return isRecommended(job);
      }
    });

    if (state.query) {
      const q = state.query.toLocaleLowerCase("es");
      rows = rows.filter((job) => [
        job.title, job.organization, job.location, job.source, job.category,
        job.classification, job.matched_terms,
      ].some((value) => clean(value).toLocaleLowerCase("es").includes(q)));
    }

    return rows.sort((a, b) => {
      const sem = semanticScore(b) - semanticScore(a); if (sem) return sem;
      const e = eligibilityRank(a.eligibility) - eligibilityRank(b.eligibility); if (e) return e;
      const f = (fitValue(b) ?? -1) - (fitValue(a) ?? -1); if (f) return f;
      const ad = a.deadline || "9999-99-99", bd = b.deadline || "9999-99-99"; if (ad !== bd) return ad.localeCompare(bd);
      return clean(a.title).localeCompare(clean(b.title), "es");
    });
  }

  function render() {
    const rows = filterJobs();
    const meta = VIEW_META[state.view] || VIEW_META.recommended;
    els.feedTitle.textContent = meta[0];
    els.feedSubtitle.textContent = state.query ? `${meta[1]} Filtrando por “${state.query}”.` : meta[1];

    const visible = state.jobs.filter(notDismissed);
    if (els.countRecommended) els.countRecommended.textContent = visible.filter(isRecommended).length;
    if (els.countReview) els.countReview.textContent = visible.filter(isReview).length;
    if (els.countActive) els.countActive.textContent = visible.length;

    els.filterChips?.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === state.view);
    });
    els.jobList.replaceChildren(...rows.map(jobCard));
    els.emptyState?.classList.toggle("hidden", rows.length > 0 || state.loading);
  }

  function fact(text, urgent = false) {
    const span = document.createElement("span");
    span.className = urgent ? "fact urgent" : "fact";
    span.textContent = text;
    return span;
  }

  function semanticLabel(job) {
    if (isOffDomain(job)) return "Fuera de campo";
    if (isRecommended(job)) return "Recomendada";
    if (isReview(job)) return "Revisar";
    return "Explorar";
  }

  function jobCard(job) {
    const interaction = interactionFor(job.job_id);
    const article = document.createElement("article");
    article.className = "job-card";
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute("aria-label", `Abrir ${clean(job.title)}`);
    article.addEventListener("click", () => openDetail(job.job_id));
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetail(job.job_id);
      }
    });

    const meta = document.createElement("div");
    meta.className = "job-meta-row";
    const source = document.createElement("span");
    source.className = "source-label";
    source.textContent = clean(job.source) || "Fuente";
    const badge = document.createElement("span");
    badge.className = "fit-badge";
    const fit = fitValue(job);
    badge.textContent = fit === null
      ? `${semanticLabel(job)} · ${eligibilityLabel(job.eligibility)}`
      : `${semanticLabel(job)} · fit ${fit}%`;
    meta.append(source, badge);

    const title = document.createElement("h3");
    title.className = "job-title";
    title.textContent = clean(job.title) || "Cargo sin título";
    const org = document.createElement("p");
    org.className = "job-org";
    org.textContent = [clean(job.organization), clean(job.location)].filter(Boolean).join(" · ") || "Ubicación no informada";

    const facts = document.createElement("div");
    facts.className = "job-facts";
    facts.append(fact(`Pertinencia ${semanticScore(job)}/100`));
    if (job.deadline) {
      const left = daysUntil(job.deadline);
      const label = left === 0 ? "Cierra hoy" : left === 1 ? "Cierra mañana" : left !== null && left >= 0 ? `Cierra en ${left} días` : `Cierre ${shortDate(job.deadline)}`;
      facts.append(fact(label, left !== null && left >= 0 && left <= 7));
    } else if (job.posted_date) {
      facts.append(fact(`Publicado ${shortDate(job.posted_date)}`));
    } else if (job.first_seen) {
      facts.append(fact(`Detectado ${shortDate(job.first_seen)}`));
    }

    const match = document.createElement("div");
    match.className = "match-line";
    if (isOffDomain(job)) {
      match.textContent = clean(job.exclusion_reason) || "El cargo parece pertenecer a otro campo profesional.";
    } else if (clean(job.direct_matches)) {
      match.textContent = `Coincidencias personales: ${job.direct_matches}`;
    } else if (clean(job.matched_terms)) {
      match.textContent = `Evidencia de campo: ${job.matched_terms}`;
    } else {
      match.textContent = "Abre la ficha para revisar por qué aparece en esta categoría.";
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.append(
      actionButton(interaction.saved ? "★ Guardada" : "☆ Guardar", interaction.saved, () => updateInteraction(job.job_id, { saved: !interactionFor(job.job_id).saved })),
      actionButton("Me interesa", interaction.status === "interested", () => toggleStatus(job.job_id, "interested")),
      actionButton("Voy a postular", interaction.status === "will_apply", () => toggleStatus(job.job_id, "will_apply")),
      actionButton("Postulé", interaction.status === "applied", () => toggleStatus(job.job_id, "applied")),
      actionButton(interaction.status === "dismissed" ? "Recuperar" : "Descartar", interaction.status === "dismissed", () => toggleStatus(job.job_id, "dismissed"), true),
    );

    article.append(meta, title, org, facts, match, actions);
    return article;
  }

  function actionButton(label, selected, handler, dismiss = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action-button${selected ? " selected" : ""}${dismiss ? " dismiss" : ""}`;
    button.textContent = label;
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      button.disabled = true;
      try { await handler(); } finally { button.disabled = false; }
    });
    return button;
  }

  function toggleStatus(jobId, target) {
    const current = interactionFor(jobId).status;
    return updateInteraction(jobId, { status: current === target ? "none" : target });
  }

  async function updateInteraction(jobId, patch) {
    const current = interactionFor(jobId);
    const next = {
      profile_id: state.profile.profile_id,
      job_id: jobId,
      saved: patch.saved ?? Boolean(current.saved),
      status: patch.status ?? current.status ?? "none",
      note: current.note || "",
    };
    const { data, error } = await state.client
      .from("user_job_state")
      .upsert(next, { onConflict: "profile_id,job_id" })
      .select("profile_id,job_id,saved,status,note,updated_at")
      .single();
    if (error) {
      console.error(error);
      alert(`No se pudo guardar el cambio: ${error.message}`);
      return;
    }
    state.interactions.set(jobId, data);
    render();
    if (els.jobDialog.open && els.jobDialog.dataset.jobId === jobId) openDetail(jobId, true);
  }

  function detailStat(label, value) {
    const box = document.createElement("div");
    box.className = "detail-stat";
    const k = document.createElement("span"); k.textContent = label;
    const v = document.createElement("strong"); v.textContent = value || "No informado";
    box.append(k, v);
    return box;
  }

  function detailText(label, value) {
    if (!clean(value)) return null;
    const section = document.createElement("section");
    const h = document.createElement("h3"); h.textContent = label;
    const p = document.createElement("p"); p.textContent = clean(value);
    section.append(h, p);
    return section;
  }

  function openDetail(jobId, rerender = false) {
    const job = state.jobs.find((row) => row.job_id === jobId);
    if (!job) return;
    els.jobDialog.dataset.jobId = jobId;
    els.detailSource.textContent = clean(job.source);
    els.detailTitle.textContent = clean(job.title);
    els.detailBody.replaceChildren();

    const stats = document.createElement("div");
    stats.className = "detail-grid";
    stats.append(
      detailStat("Categoría", semanticLabel(job)),
      detailStat("Pertinencia de campo", `${semanticScore(job)}/100`),
      detailStat("Compatibilidad personal", fitValue(job) === null ? "Sin puntaje fiable" : `${fitValue(job)}%`),
      detailStat("Requisitos", eligibilityLabel(job.eligibility)),
      detailStat("Cierre", job.deadline ? shortDate(job.deadline) : "No informado"),
      detailStat("Ubicación", clean(job.location) || "No informada"),
    );
    els.detailBody.append(stats);

    [
      detailText("Por qué aparece aquí", job.matched_terms || job.exclusion_reason),
      detailText("Coincidencias directas", job.direct_matches),
      detailText("Capacidades transferibles", job.transferable_matches),
      detailText("Requisitos a revisar", job.mandatory_detail),
      detailText("Descripción", job.description),
    ].filter(Boolean).forEach((node) => els.detailBody.append(node));

    if (job.url) {
      const link = document.createElement("a");
      link.href = job.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "primary";
      link.textContent = "Abrir oferta original";
      link.addEventListener("click", (event) => event.stopPropagation());
      els.detailBody.append(link);
    }

    const interaction = interactionFor(jobId);
    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.append(
      actionButton(interaction.saved ? "★ Guardada" : "☆ Guardar", interaction.saved, () => updateInteraction(jobId, { saved: !interactionFor(jobId).saved })),
      actionButton("Me interesa", interaction.status === "interested", () => toggleStatus(jobId, "interested")),
      actionButton("Voy a postular", interaction.status === "will_apply", () => toggleStatus(jobId, "will_apply")),
      actionButton("Postulé", interaction.status === "applied", () => toggleStatus(jobId, "applied")),
      actionButton(interaction.status === "dismissed" ? "Recuperar" : "Descartar", interaction.status === "dismissed", () => toggleStatus(jobId, "dismissed"), true),
    );
    els.detailBody.append(actions);

    if (!rerender) {
      if (typeof els.jobDialog.showModal === "function") els.jobDialog.showModal();
      else els.jobDialog.setAttribute("open", "");
    }
  }

  function messageCard(title, body) {
    const article = document.createElement("article");
    article.className = "job-card";
    const h = document.createElement("h3"); h.className = "job-title"; h.textContent = title;
    const p = document.createElement("p"); p.className = "job-org"; p.textContent = body;
    article.append(h, p);
    return article;
  }

  function bindEvents() {
    els.refreshButton?.addEventListener("click", loadJobs);
    els.logoutButton?.addEventListener("click", async () => {
      await state.client.auth.signOut();
      state.session = null; state.profile = null; state.jobs = [];
      showOnly("auth");
    });
    els.searchInput?.addEventListener("input", (event) => {
      state.query = clean(event.target.value);
      render();
    });
    els.filterChips?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-view]");
      if (!button) return;
      state.view = button.dataset.view;
      render();
    });
  }

  async function init() {
    const config = window.RADAR_CONFIG || {};
    const url = clean(config.supabaseUrl);
    const key = clean(config.supabasePublishableKey);
    if (!url || !key || !window.supabase?.createClient) {
      showOnly("setup");
      return;
    }

    state.client = window.supabase.createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
    bindEvents();

    const { data: { session } } = await state.client.auth.getSession();
    state.session = session;
    if (session) {
      showOnly("app");
      await loadJobs();
    } else {
      showOnly("auth");
    }

    state.client.auth.onAuthStateChange(async (event, sessionNow) => {
      state.session = sessionNow;
      if (!sessionNow) {
        showOnly("auth");
        return;
      }
      if (event === "SIGNED_IN" && !state.profile) {
        showOnly("app");
        await loadJobs();
      }
    });
  }

  init().catch((error) => {
    console.error(error);
    showOnly("setup");
  });
})();
