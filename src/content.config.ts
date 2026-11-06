import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { workSchema, writingSchema } from "./lib/content-schema";

const work = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/work" }),
  schema: workSchema,
});
const writing = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/writing" }),
  schema: writingSchema,
});
export const collections = { work, writing };
