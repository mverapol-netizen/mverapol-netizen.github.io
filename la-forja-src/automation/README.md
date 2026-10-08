# La Forja — avisos por correo editorial (Google Apps Script)

**Cuenta propietaria y destinataria:** `revistalaforja@gmail.com`

Este mecanismo complementa la recepción de manuscritos, no la sustituye. La web guarda el archivo Word de forma privada en Supabase. La base de datos envía únicamente el título, nombre, categoría, fecha y UUID a una aplicación Google Apps Script que manda la alerta a la dirección editorial.

## Activación desde la cuenta editorial

1. Abre [Google Apps Script](https://script.google.com/home/projects/create) **con la sesión de `revistalaforja@gmail.com`**. Crea un proyecto titulado «La Forja — Notificaciones».
2. Sustituye el contenido de `Código.gs` por el archivo [notificaciones.gs](./notificaciones.gs). Guarda los cambios.
3. Selecciona y ejecuta `prepararNotificaciones`. Autoriza los permisos de envío de correo para **esa** cuenta. Debe llegar un mensaje de prueba. Copia la clave privada que aparece en el registro de ejecución; **no la envíes por chat ni la incorpores a GitHub**.
4. En Apps Script, elige **Implementar > Nueva implementación > Aplicación web**. Configura «Ejecutar como: **Yo**» y «Quién tiene acceso: **Cualquier persona**». Implementa y copia la URL terminada en `/exec`. Aunque el endpoint es públicamente accesible, el código exige la clave privada antes de enviar una notificación.
5. Abre el [Vault de Supabase](https://supabase.com/dashboard/project/jtgoumydocaleucuomaw/integrations/vault) con acceso de administrador y crea **dos secretos** con estos nombres exactos:
   - `laforja_apps_script_url` → URL `https://script.google.com/macros/s/.../exec` de la aplicación desplegada.
   - `laforja_apps_script_token` → clave privada mostrada en la ejecución inicial de Apps Script.
6. Opcional: ejecuta `probarNotificacion` en Apps Script para enviar un segundo mensaje de prueba con datos sintéticos.
7. Envía un formulario real de prueba desde La Forja con un `.docx` no sensible y comprueba la aparición del registro en el panel privado y el aviso en la bandeja `revistalaforja@gmail.com`.

## Funcionamiento del backend

La migración `laforja_prepare_editorial_mail_notifications` crea un disparador `AFTER INSERT` sobre `public.editorial_submissions`. El trigger consulta las dos claves en Supabase Vault y, solo si existen y son válidas, utiliza `pg_net` para entregar un mensaje a Google Apps Script.

Por seguridad:
- No se guardan contraseñas ni tokens en GitHub ni en la página pública.
- Solo se remiten metadatos mínimos de cada postulación, nunca archivos, textos ni el correo del postulante.
- El script tiene destino fijo y comprueba un secreto de al menos 32 caracteres antes de enviar.
- Cada UUID se notifica una sola vez en el script para reducir duplicados.
- La ausencia de los secretos deja inactivo el envío de notificaciones, pero no impide guardar nuevas postulaciones.

## Límites y seguimiento

La aplicación está sujeta a cuotas de envío de Google. El disparo con `pg_net` es asíncrono: errores de cuota, fallos temporales de Apps Script o respuestas de aplicación con error no detienen ni revierten el guardado de una postulación. Por tanto, el **panel editorial sigue siendo la fuente principal de verdad** y conviene revisarlo regularmente; este canal es un aviso auxiliar, no una garantía de entrega ni un sistema de reintentos completos.

Para examinar problemas posteriores se pueden revisar los registros de ejecución de Apps Script y los de `pg_net` en Supabase.

## Documentación de referencia

- [Web apps de Apps Script](https://developers.google.com/apps-script/guides/web)
- [Google MailApp](https://developers.google.com/apps-script/reference/mail/mail-app)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
