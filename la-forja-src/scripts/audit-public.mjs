// La Forja · auditoría de publicación provisional
// npm run build && node scripts/audit-public.mjs
// Se ejecuta en GitHub Actions ANTES de publicar una versión del sitio.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dist=path.resolve(here,'../dist');
const source=path.resolve(here,'../src/content');
const base='/la-forja/';
const expectedPages=[
 'index.html','educacion-popular/index.html','sobre/index.html',
 'colabora/index.html','admin/index.html','columnas/index.html',
 'ensayos/index.html','archivo/index.html','autores/index.html',
 'temas/index.html','buscar/index.html'
];
const publicPaths=new Set(['','educacion-popular/','sobre/','colabora/']);
const hiddenPages=['admin/index.html','columnas/index.html','ensayos/index.html',
 'archivo/index.html','autores/index.html','temas/index.html','buscar/index.html'];
const failures=[];
const assert=(condition,description)=>{if(!condition)failures.push(description)};
const load=(p)=>fs.readFileSync(path.join(dist,p),'utf8');
const walk=(dir)=>fs.existsSync(dir)
  ?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    return e.isDirectory()?walk(p):[p]})
  :[];
const htmlFiles=walk(dist).filter(f=>f.endsWith('.html')).map(f=>path.relative(dist,f).replaceAll(path.sep,'/'));
assert(fs.existsSync(dist),'No existe el directorio compilado dist.');
assert(htmlFiles.length===expectedPages.length,'Cantidad de páginas inesperada: '+htmlFiles.length);
for(const page of expectedPages)assert(htmlFiles.includes(page),'Falta ruta: '+page);
for(const page of htmlFiles)assert(expectedPages.includes(page),'Ruta ajena a la primera convocatoria: '+page);

const forbidden=/camila-torres|equipo-la-forja|a-quien-representa-la-izquierda|progresismo-y-sus-limites|que-izquierda-para-nuestro-tiempo|vivienda-conflicto-politico|que-es-la-plusvalia|clase-y-la-izquierda/i;
for(const section of ['articulos','autores','cuadernos','debates','numeros']){
  const files=walk(path.join(source,section)).filter(f=>f.endsWith('.md'));
  assert(files.length===0,'La sección '+section+' contiene publicaciones durante la fase provisional.');
}
for(const page of expectedPages){
  if(!htmlFiles.includes(page))continue;
  const html=load(page);
  assert(!forbidden.test(html),'Contenido ficticio reintroducido en '+page);
  assert(html.includes('Primera convocatoria editorial'),'Falta la cabecera de convocatoria en '+page);
  assert(html.includes('la-forja-version'),'Falta la marca de versión en '+page);
  assert(html.includes('lfv'),'Falta protección contra HTML en caché en '+page);
  assert(!/Año I\s*·\s*N.º\s*1\b/.test(html),'Número ficticio en '+page);
  if(hiddenPages.includes(page))assert(html.includes('noindex,nofollow'),'Debe quedar fuera de buscadores: '+page);
  const navigation=html.match(/<nav class="nav">([\s\S]*?)<\/nav>/)?.[1]??'';
  const navLinks=[...navigation.matchAll(/\bhref="([^"]+)"/g)].map(x=>new URL(x[1],'https://example.invalid').pathname);
  const expectedNav=[base,base+'educacion-popular/',base+'sobre/',base+'colabora/'];
  assert(navLinks.length===expectedNav.length && expectedNav.every(x=>navLinks.includes(x)),
    'Navegación provisional incorrecta en '+page+': '+navLinks.join(', '));

  for(const [,href] of html.matchAll(/\bhref="([^"]+)"/g)){
    if(!href.startsWith(base))continue;
    const u=new URL(href,'https://example.invalid');
    let local=decodeURIComponent(u.pathname.slice(base.length));
    if(!local||local.endsWith('/'))local+='index.html';
    const target=path.resolve(dist,local);
    assert(target.startsWith(dist+path.sep) && fs.existsSync(target),
      'Enlace roto en '+page+': '+href);
  }
}
const home=htmlFiles.includes('index.html')?load('index.html'):'';
const education=htmlFiles.includes('educacion-popular/index.html')?load('educacion-popular/index.html'):'';
const form=htmlFiles.includes('colabora/index.html')?load('colabora/index.html'):'';
const admin=htmlFiles.includes('admin/index.html')?load('admin/index.html'):'';
assert(home.includes('Una revista para pensar el presente'),'Portada provisional incorrecta');
assert(education.includes('Próximamente')&&education.includes('La política y los sistemas políticos'),
  'Cuadernos populares debe anunciar su contenido en preparación');
assert(form.includes('id="submission-form"')&&form.includes('onsubmit="return false"'),
  'El formulario público debe impedir GET si falla JavaScript');
assert(admin.includes('id="admin-login-form" onsubmit="return false"') && admin.includes('ensureSession().then(ok=>'),
  'El panel editorial no conserva la corrección de inicio de sesión');
assert(fs.existsSync(path.join(dist,'sitemap.xml')),'Falta sitemap');
if(fs.existsSync(path.join(dist,'sitemap.xml'))){
  const sitemap=load('sitemap.xml');
  const entries=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>{
    const u=new URL(x[1]);return u.pathname.slice(base.length)});
  assert(entries.length===publicPaths.size && entries.every(x=>publicPaths.has(x)),
    'El sitemap incluye páginas no publicadas: '+entries.join(', '));
}
if(failures.length){
  console.error('La Forja: ERROR DE AUDITORÍA ('+failures.length+')');
  for(const failure of failures)console.error(' - '+failure);
  process.exit(1);
}
console.log('La Forja: auditoría aprobada ('+expectedPages.length+' rutas, '
 +publicPaths.size+' públicas, '+hiddenPages.length+' sin indexar).');
