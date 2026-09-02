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

  const original = document.querySelector("#loginForm");
  if (!original || original.dataset.passwordAuthReady === "1") return;

  // Clone removes the legacy magic-link submit listener installed by app.js.
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
  password.placeholder = "Tu contraseña";
  passwordLabel.append(password);
  form.insertBefore(passwordLabel, primary);

  primary.textContent = "Entrar";
  message.textContent = "Las cuentas se crean directamente en el panel privado; este acceso no envía correos.";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const userEmail = clean(email.value);
    const userPassword = password.value;
    if (!userEmail || userPassword.length < 8) {
      message.textContent = "Escribe tu correo y tu contraseña.";
      return;
    }
    primary.disabled = true;
    message.textContent = "Ingresando…";
    const { error } = await auth.auth.signInWithPassword({ email: userEmail, password: userPassword });
    primary.disabled = false;
    if (error) {
      message.textContent = "Correo o contraseña incorrectos.";
      return;
    }
    window.location.replace(APP_URL);
  });
})();
