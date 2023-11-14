import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    date: z.coerce.date(),
    last_modified: z.coerce.date().optional(),
    hero_image: z.string().optional(),
  }),
});

export const collections = { blog };
