(() => {
  "use strict";

  const APP_URL = "https://mverapol-netizen.github.io/empleos/";
  const config = window.RADAR_CONFIG || {};
  const url = String(config.supabaseUrl || "").trim();
  const key = String(config.supabasePublishableKey || "").trim();
  if (!url || !key || !window.supabase?.createClient) return;

  const auth = window.supabase.createClient(url, key, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  });

  function clean(value) { return String(value || "").trim(); }

  function enhanceLogin() {
    const original = document.querySelector("#loginForm");
    if (!original || original.dataset.passwordAuthReady === "1") return;

    // Clone removes the old magic-link submit listener installed by app.js.
    const form = original.cloneNode(true);
    original.replaceWith(form);
    form.dataset.passwordAuthReady = "1";

    const email = form.querySelector("#emailInput");
    const primary = form.querySelector("#magicLinkButton");
    const message = form.querySelector("#authMessage");
    if (!email || !primary || !message) return;

    const passwordLabel = document.createElement("label");
    passwordLabel.textContent = "Contraseña";
    const password = document.createElement("input");
    password.id = "passwordInput";
    password.type = "password";
    password.autocomplete = "current-password";
    password.required = true;
    password.minLength = 8;
    password.placeholder = "Mínimo 8 caracteres";
    passwordLabel.append(password);
    form.insertBefore(passwordLabel, primary);

    primary.textContent = "Entrar";

    const firstTime = document.createElement("button");
    firstTime.type = "button";
    firstTime.className = "secondary";
    firstTime.textContent = "Primera vez: crear cuenta";
    primary.insertAdjacentElement("afterend", firstTime);

    const recover = document.createElement("button");
    recover.type = "button";
    recover.className = "secondary";
    recover.textContent = "Crear o recuperar contraseña";
    firstTime.insertAdjacentElement("afterend", recover);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const userEmail = clean(email.value);
      const userPassword = password.value;
      if (!userEmail || userPassword.length < 8) {
        message.textContent = "Escribe tu correo y una contraseña de al menos 8 caracteres.";
        return;
      }
      primary.disabled = true;
      message.textContent = "Ingresando…";
      const { error } = await auth.auth.signInWithPassword({ email: userEmail, password: userPassword });
      primary.disabled = false;
      if (error) {
        message.textContent = "No pudimos iniciar sesión. Si es tu primera vez, usa “Crear o recuperar contraseña”.";
        return;
      }
      window.location.replace(APP_URL);
    });

    firstTime.addEventListener("click", async () => {
      const userEmail = clean(email.value);
      const userPassword = password.value;
      if (!userEmail || userPassword.length < 8) {
        message.textContent = "Para crear la cuenta, escribe tu correo y una contraseña de al menos 8 caracteres.";
        return;
      }
      firstTime.disabled = true;
      message.textContent = "Creando cuenta…";
      const { data, error } = await auth.auth.signUp({
        email: userEmail,
        password: userPassword,
        options: { emailRedirectTo: APP_URL },
      });
      firstTime.disabled = false;
      if (error) {
        message.textContent = error.message;
        return;
      }
      message.textContent = data.session
        ? "Cuenta creada. Entrando…"
        : "Revisa tu correo para confirmar la cuenta. Después podrás entrar siempre con contraseña.";
      if (data.session) window.location.replace(APP_URL);
    });

    recover.addEventListener("click", async () => {
      const userEmail = clean(email.value);
      if (!userEmail) {
        message.textContent = "Escribe primero tu correo.";
        return;
      }
      recover.disabled = true;
      message.textContent = "Enviando correo para crear o cambiar tu contraseña…";
      const { error } = await auth.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${APP_URL}?recovery=1`,
      });
      recover.disabled = false;
      message.textContent = error
        ? error.message
        : "Te enviamos un correo. Ábrelo una sola vez; volverás al Radar para elegir tu contraseña.";
    });
  }

  function showRecovery() {
    if (document.querySelector("#passwordRecoveryOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "passwordRecoveryOverlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:#f5f3ee;display:grid;place-items:center;padding:18px";
    overlay.innerHTML = `
      <form id="passwordRecoveryForm" class="panel auth-card" style="width:min(100%,520px)">
        <div class="eyebrow">Radar Laboral</div>
        <h1 style="margin:0">Crea tu contraseña</h1>
        <p class="status-text" style="margin:0">Esta será la contraseña que usarás normalmente desde ahora.</p>
        <label>Nueva contraseña
          <input id="newPasswordInput" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo 8 caracteres">
        </label>
        <label>Repetir contraseña
          <input id="repeatPasswordInput" type="password" autocomplete="new-password" minlength="8" required placeholder="Repite la contraseña">
        </label>
        <button class="primary" type="submit">Guardar contraseña</button>
        <p id="recoveryMessage" class="status-text" role="status"></p>
      </form>`;
    document.body.append(overlay);

    const form = overlay.querySelector("#passwordRecoveryForm");
    const message = overlay.querySelector("#recoveryMessage");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const p1 = overlay.querySelector("#newPasswordInput").value;
      const p2 = overlay.querySelector("#repeatPasswordInput").value;
      if (p1.length < 8) { message.textContent = "La contraseña debe tener al menos 8 caracteres."; return; }
      if (p1 !== p2) { message.textContent = "Las contraseñas no coinciden."; return; }
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      message.textContent = "Guardando…";
      const { data: { session } } = await auth.auth.getSession();
      if (!session) {
        button.disabled = false;
        message.textContent = "El enlace ya no es válido. Vuelve al Radar y solicita otro correo de recuperación.";
        return;
      }
      const { error } = await auth.auth.updateUser({ password: p1 });
      button.disabled = false;
      if (error) { message.textContent = error.message; return; }
      message.textContent = "Contraseña guardada. Entrando al Radar…";
      setTimeout(() => window.location.replace(APP_URL), 500);
    });
  }

  enhanceLogin();

  const params = new URL(window.location.href).searchParams;
  if (params.get("recovery") === "1") showRecovery();
  auth.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") showRecovery();
  });
})();
