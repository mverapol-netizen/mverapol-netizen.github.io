import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artStyle=z.enum(['crowd','constructivist','type','archive','rays']).default('constructivist');
const imageTreatment=z.enum(['bw','red','blue','natural']).default('bw');
const imageFields={
  image:z.string().optional(),
  imageAlt:z.string().optional(),
  imageCredit:z.string().optional(),
  imageTreatment
};
const editorialState={draft:z.boolean().default(false)};

const articulos=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/articulos'}),schema:z.object({
  ...editorialState,title:z.string(),subtitle:z.string().optional(),author:z.string(),type:z.enum(['columna','ensayo','editorial']),
  date:z.coerce.date(),issue:z.string(),topics:z.array(z.string()).default([]),featured:z.boolean().default(false),
  readingTime:z.number().optional(),artStyle,artLabel:z.string().optional(),...imageFields
})});
const autores=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/autores'}),schema:z.object({
  ...editorialState,name:z.string(),bio:z.string(),location:z.string().optional()
})});
const debates=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/debates'}),schema:z.object({
  ...editorialState,title:z.string(),subtitle:z.string().optional(),date:z.coerce.date(),issue:z.string(),participants:z.array(z.string()).default([]),
  artStyle,artLabel:z.string().optional(),...imageFields
})});
const cuadernos=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/cuadernos'}),schema:z.object({
  ...editorialState,number:z.number(),title:z.string(),subtitle:z.string().optional(),author:z.string(),series:z.string(),date:z.coerce.date(),issue:z.string(),
  artStyle,artLabel:z.string().optional(),...imageFields
})});
const numeros=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/numeros'}),schema:z.object({
  ...editorialState,number:z.number(),year:z.number(),month:z.string(),date:z.coerce.date(),status:z.enum(['actual','archivo','proximo']),
  coverTitle:z.string().optional(),coverStyle:artStyle
})});
export const collections={articulos,autores,debates,cuadernos,numeros};