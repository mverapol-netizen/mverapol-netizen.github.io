import { getCollection } from 'astro:content';
const esc=(s:string)=>s.replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c] as string));
const slugify=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export async function GET({site}:{site:URL|undefined}){
  const root=new URL('/la-forja/',site??new URL('https://mverapol-netizen.github.io'));
  const urls=new Set<string>(['','educacion-popular/','sobre/','colabora/'].map(p=>new URL(p,root).toString()));
  const articulos=await getCollection('articulos',({data})=>!data.draft);
  if(articulos.some(a=>a.data.type==='columna'))urls.add(new URL('columnas/',root).toString());
  if(articulos.some(a=>a.data.type==='ensayo'))urls.add(new URL('ensayos/',root).toString());
  if(articulos.length){urls.add(new URL('temas/',root).toString());urls.add(new URL('buscar/',root).toString());}
  for(const a of articulos){const folder=a.data.type==='ensayo'?'ensayos':'columnas';urls.add(new URL(folder+'/'+a.id+'/',root).toString());for(const t of a.data.topics)urls.add(new URL('temas/'+slugify(t)+'/',root).toString());}
  if(articulos.length){const autores=await getCollection('autores',({data})=>!data.draft);if(autores.length)urls.add(new URL('autores/',root).toString());for(const a of autores)urls.add(new URL('autores/'+a.id+'/',root).toString());}
  const numeros=await getCollection('numeros',({data})=>!data.draft&&data.status!=='proximo');
  if(numeros.length)urls.add(new URL('archivo/',root).toString());
  for(const n of numeros)urls.add(new URL('archivo/'+n.id+'/',root).toString());
  const body=[...urls].sort().map(url=>'<url><loc>'+esc(url)+'</loc></url>').join('');
  return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+body+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
