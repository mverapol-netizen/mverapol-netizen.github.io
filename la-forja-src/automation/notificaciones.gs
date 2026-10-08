/**
 * La Forja · Avisos de recepción editorial
 * Copia este archivo al proyecto Apps Script creado desde
 * revistalaforja@gmail.com. Nunca publiques tu clave ni la URL privada.
 */
const LF_DESTINO = 'revistalaforja@gmail.com';
const LF_PANEL = 'https://mverapol-netizen.github.io/la-forja/admin/';
const LF_TOKEN_PROP = 'LA_FORJA_WEBHOOK_TOKEN';
const LF_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respuesta_(texto) {
  return ContentService.createTextOutput(texto)
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * EJECUTAR UNA VEZ al crear el proyecto.
 * Genera una clave secreta en las propiedades privadas del script,
 * la muestra en el registro de ejecución para copiarla al Vault de
 * Supabase y envía un correo de prueba para solicitar autorización.
 */
function prepararNotificaciones() {
  const propiedades = PropertiesService.getScriptProperties();
  let token = propiedades.getProperty(LF_TOKEN_PROP);
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') +
      Utilities.getUuid().replace(/-/g, '');
    propiedades.setProperty(LF_TOKEN_PROP, token);
  }

  MailApp.sendEmail({
    to: LF_DESTINO,
    subject: '[La Forja] Canal editorial preparado',
    body: 'El envío de avisos de La Forja fue autorizado desde la cuenta editorial.\n\n' +
      'Este mensaje solo verifica Google Apps Script. Las notificaciones ' +
      'del formulario aún requieren completar la configuración en Supabase.',
    name: 'La Forja | Redacción'
  });

  // Este registro pertenece al propietario del script: no compartirlo.
  console.log('CLAVE PARA SUPABASE VAULT (laforja_apps_script_token): ' + token);
}

function doGet() {
  return respuesta_('La Forja: canal de notificación editorial disponible.');
}

/**
 * Endpoint HTTPS llamado exclusivamente por el disparador de Supabase.
 * No acepta Word, cuerpo de manuscritos ni datos de contacto del autor.
 * Verifica la clave privada y evita avisos repetidos para el mismo ID.
 */
function doPost(e) {
  const raw = e && e.postData && e.postData.contents;
  if (typeof raw !== 'string' || raw.length < 2 || raw.length > 3500) {
    return respuesta_('Solicitud no válida');
  }

  let datos;
  try {
    datos = JSON.parse(raw);
  } catch (_) {
    return respuesta_('Solicitud no válida');
  }

  const propiedades = PropertiesService.getScriptProperties();
  const token = propiedades.getProperty(LF_TOKEN_PROP);
  if (!token || token.length < 32 || datos.token !== token) {
    return respuesta_('No autorizado');
  }

  const id = String(datos.submission_id || '');
  if (!LF_ID_PATTERN.test(id)) {
    return respuesta_('ID no válido');
  }

  const candado = LockService.getScriptLock();
  if (!candado.tryLock(10000)) {
    return respuesta_('Ocupado: volver a intentar');
  }

  try {
    const claveEnvio = 'lf_enviado_' + id;
    if (propiedades.getProperty(claveEnvio)) {
      return respuesta_('Ya notificado');
    }

    const limpiar = (valor, maximo) => String(valor || '')
      .replace(/[\r\n\t]+/g, ' ')
      .trim().slice(0, maximo);

    const titulo = limpiar(datos.title, 240) || '(Sin título)';
    const autor = limpiar(datos.name, 160) || '(Sin nombre)';
    const categoria = limpiar(datos.contribution_type, 40) || '(Sin categoría)';
    const fecha = limpiar(datos.created_at, 60);
    const asunto = '[La Forja] Nueva propuesta recibida: ' + titulo.slice(0, 100);
    const cuerpo =
      'Se ha recibido una nueva colaboración para La Forja.\n\n' +
      'Título: ' + titulo + '\n' +
      'Autor/a: ' + autor + '\n' +
      'Categoría: ' + categoria + '\n' +
      'Fecha de recepción: ' + fecha + '\n' +
      'Identificador: ' + id + '\n\n' +
      'Revisar en el panel editorial: ' + LF_PANEL + '\n\n' +
      'El manuscrito Word y su texto se conservan de forma privada en Supabase. ' +
      'No se adjuntan ni se envían por correo electrónico.';

    if (MailApp.getRemainingDailyQuota() < 1) {
      return respuesta_('Cuota de correo agotada');
    }
    MailApp.sendEmail({
      to: LF_DESTINO,
      subject: asunto,
      body: cuerpo,
      name: 'La Forja | Redacción'
    });
    propiedades.setProperty(claveEnvio, new Date().toISOString());
    return respuesta_('Enviado');
  } catch (error) {
    console.error('Error en aviso editorial', error);
    return respuesta_('No se pudo completar el aviso');
  } finally {
    candado.releaseLock();
  }
}

/**
 * PRUEBA MANUAL opcional desde el editor de Apps Script.
 * Simula una sola notificación sin crear postulaciones reales.
 */
function probarNotificacion() {
  const token = PropertiesService.getScriptProperties().getProperty(LF_TOKEN_PROP);
  if (!token) throw new Error('Ejecuta prepararNotificaciones primero.');
  const prueba = {
    token: token,
    submission_id: Utilities.getUuid(),
    created_at: new Date().toISOString(),
    name: 'Prueba técnica',
    title: 'Verificación del canal editorial',
    contribution_type: 'columna'
  };
  const salida = doPost({postData: {contents: JSON.stringify(prueba)}});
  console.log('RESULTADO DE PRUEBA: ' + salida.getContent());
}
