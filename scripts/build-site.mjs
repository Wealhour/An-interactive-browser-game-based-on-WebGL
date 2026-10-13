import { mkdir, cp } from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('../_site/',import.meta.url);
await mkdir(out,{recursive:true});
for(const name of ['index.html','.nojekyll','original','remastered','README.md','CREDITS.md'])await cp(new URL(name,root),new URL(name,out),{recursive:true});
await mkdir(new URL('docs/',out),{recursive:true});
for(const name of ['remaster-preview.png','original-manifest.json'])await cp(new URL(`docs/${name}`,root),new URL(`docs/${name}`,out));
console.log('Static site prepared in _site/ (edition selector, original, and remaster).');
