import { getCollection } from 'astro:content';
const esc=(s:string)=>s.replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c] as string));
const slugify=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export async function GET({site}:{site:URL|undefined}){
  const root=new URL('/la-forja/',site??new URL('https://mverapol-netizen.github.io'));
  const urls=new Set<string>(['','columnas/','ensayos/','debates/','educacion-popular/','archivo/','temas/','buscar/','autores/','sobre/','colabora/'].map(p=>new URL(p,root).toString()));
  const articulos=await getCollection('articulos',({data})=>!data.draft);
  for(const a of articulos){const folder=a.data.type==='ensayo'?'ensayos':'columnas';urls.add(new URL(`${folder}/${a.id}/`,root).toString());for(const topic of a.data.topics)urls.add(new URL(`temas/${slugify(topic)}/`,root).toString());}
  for(const a of await getCollection('autores',({data})=>!data.draft))urls.add(new URL(`autores/${a.id}/`,root).toString());
  for(const n of await getCollection('numeros',({data})=>!data.draft))urls.add(new URL(`archivo/${n.id}/`,root).toString());
  const body=[...urls].sort().map(url=>`<url><loc>${esc(url)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}