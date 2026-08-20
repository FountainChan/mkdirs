import "dotenv/config";
import { createClient } from "next-sanity";
const client = createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: "2024-08-01", useCdn: false, token: process.env.SANITY_API_TOKEN });
const total = await client.fetch('count(*[_type == "item"])');
const unpublished = await client.fetch('count(*[_type == "item"][publishDate == null])');
console.log({ total, unpublished, published: total - unpublished });