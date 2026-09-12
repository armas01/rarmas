import { readFile, writeFile, rename } from 'node:fs/promises';
import { z } from 'zod';
const seedPath = new URL('../src/data/github.seed.json', import.meta.url);
const outputPath = new URL('../src/generated/github.json', import.meta.url);
const repoSchema = z.object({ name:z.string(), html_url:z.url(), description:z.string().nullable(), language:z.string().nullable(), fork:z.boolean() });
const payloadSchema = z.array(repoSchema);
const fetchWithTimeout = async (url) => { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000); try { return await fetch(url,{headers:{Accept:'application/vnd.github+json',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`} : {})},signal:controller.signal}); } finally { clearTimeout(timer); } };
let fallback = JSON.parse(await readFile(seedPath,'utf8')); try { const response=await fetchWithTimeout('https://api.github.com/users/armas01/repos?per_page=100&type=owner'); if(!response.ok) throw new Error(`GitHub ${response.status}`); const repos=payloadSchema.parse(await response.json()); const curated=new Set(['ICS1113','macropad']); fallback={profile:fallback.profile,repositories:repos.filter((repo)=>curated.has(repo.name)).map((repo)=>({name:repo.name,description:repo.description,url:repo.html_url,language:repo.language,fork:repo.fork})),lastSuccessfulFetchAt:new Date().toISOString()}; } catch(error) { console.warn(`GitHub sync kept fallback: ${error.message}`); }
await writeFile(new URL('../src/generated/github.json.tmp', import.meta.url),JSON.stringify(fallback,null,2)+'\n'); await rename(new URL('../src/generated/github.json.tmp', import.meta.url),outputPath);
