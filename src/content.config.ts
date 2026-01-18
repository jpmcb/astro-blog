import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  // Load Markdown and MDX files in the `src/content/posts/` directory.
  loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),

  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    isPopular: z.boolean().optional(),
    isFav: z.boolean().optional(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    isDraft: z.boolean().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    bskyPost: z.string().optional(),
  }),
});

const talks = defineCollection({
  loader: glob({ base: "./src/content/talks", pattern: "**/*.{md,mdx}" }),

  schema: z.object({
    year: z.number(),
    title: z.string(),
    event: z.string(),
    youtubeVideoId: z.string().optional(),
  }),
});

export const collections = { posts, talks };
