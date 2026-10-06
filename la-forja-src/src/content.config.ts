import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artStyle=z.enum(['crowd','constructivist','type','archive','rays']).default('constructivist');

const articulos=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/articulos'}),schema:z.object({
  title:z.string(),subtitle:z.string().optional(),author:z.string(),type:z.enum(['columna','ensayo','editorial']),
  date:z.coerce.date(),issue:z.string(),topics:z.array(z.string()).default([]),featured:z.boolean().default(false),
  readingTime:z.number().optional(),artStyle,artLabel:z.string().optional(),imageCredit:z.string().optional()
})});
const autores=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/autores'}),schema:z.object({name:z.string(),bio:z.string(),location:z.string().optional()})});
const debates=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/debates'}),schema:z.object({
  title:z.string(),subtitle:z.string().optional(),date:z.coerce.date(),issue:z.string(),participants:z.array(z.string()).default([]),
  artStyle,artLabel:z.string().optional()
})});
const cuadernos=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/cuadernos'}),schema:z.object({
  number:z.number(),title:z.string(),subtitle:z.string().optional(),author:z.string(),series:z.string(),date:z.coerce.date(),issue:z.string(),
  artStyle,artLabel:z.string().optional()
})});
const numeros=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/numeros'}),schema:z.object({number:z.number(),year:z.number(),month:z.string(),date:z.coerce.date(),status:z.enum(['actual','archivo','proximo']),coverTitle:z.string().optional()})});
export const collections={articulos,autores,debates,cuadernos,numeros};