import { getCollection } from 'astro:content';
const esc=(s:string)=>s.replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c] as string));
export async function GET({site}:{site:URL|undefined}){
  const root=new URL('/la-forja/',site??new URL('https://mverapol-netizen.github.io'));
  const articulos=(await getCollection('articulos',({data})=>!data.draft)).sort((a,b)=>b.data.date.valueOf()-a.data.date.valueOf());
  const items=articulos.map(a=>{const folder=a.data.type==='ensayo'?'ensayos':'columnas';const url=new URL(`${folder}/${a.id}/`,root).toString();return `<item><title>${esc(a.data.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${a.data.date.toUTCString()}</pubDate><description>${esc(a.data.subtitle??'')}</description></item>`;}).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>La Forja</title><link>${root}</link><description>Opinión, pensamiento crítico, debate y educación popular.</description><language>es-cl</language>${items}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}