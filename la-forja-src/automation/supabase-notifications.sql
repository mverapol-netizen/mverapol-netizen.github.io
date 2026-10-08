-- La Forja · notificaciones por correo desde una nueva postulación
-- Migración aplicada en Supabase: laforja_prepare_editorial_mail_notifications
-- Este disparador permanece inactivo hasta registrar los dos secretos en Vault.
-- La URL del Apps Script y la clave NUNCA se guardan en GitHub.
create extension if not exists pg_net with schema extensions;

create or replace function private.laforja_notify_new_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  webhook_url text;
  webhook_token text;
begin
  select ds.decrypted_secret into webhook_url
  from vault.decrypted_secrets as ds
  where ds.name = 'laforja_apps_script_url'
  limit 1;

  select ds.decrypted_secret into webhook_token
  from vault.decrypted_secrets as ds
  where ds.name = 'laforja_apps_script_token'
  limit 1;

  if webhook_url is null or webhook_token is null then
    return new;
  end if;

  if webhook_url !~ '^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$'
      or char_length(webhook_token) < 32 then
    raise warning 'La Forja: notification credentials are not configured correctly';
    return new;
  end if;

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'token', webhook_token,
      'submission_id', new.id,
      'created_at', new.created_at,
      'name', new.name,
      'title', new.title,
      'contribution_type', new.contribution_type
    ),
    timeout_milliseconds := 8000
  );

  return new;
end;
$function$;

revoke all on function private.laforja_notify_new_submission()
  from public, anon, authenticated;

drop trigger if exists laforja_new_editorial_submission_notification
  on public.editorial_submissions;

create trigger laforja_new_editorial_submission_notification
after insert on public.editorial_submissions
for each row when (new.status = 'received')
execute function private.laforja_notify_new_submission();
