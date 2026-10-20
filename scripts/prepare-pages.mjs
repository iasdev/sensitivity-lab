import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=join(root,'dist'),output=join(root,'.pages-dist');
async function files(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(join(directory,entry.name)):[join(directory,entry.name)]))).flat().sort();
}
const paths=await files(source);
const hash=createHash('sha256');
for(const path of paths)hash.update(relative(source,path)).update(await readFile(path));
const revision=hash.digest('hex').slice(0,16);
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(source,output,{recursive:true});
for(const path of paths){
  const destination=join(output,relative(source,path));
  if(path.endsWith('.js')){
    const content=await readFile(path,'utf8');
    // Version every local ES module, not only the entry point.
    await writeFile(destination,content.replace(/(['"])(\.\.?\/[^'"?]+\.js)\1/g,(_,quote,url)=>`${quote}${url}?v=${revision}${quote}`));
  }else if(path.endsWith('.html')){
    const content=await readFile(path,'utf8');
    await writeFile(destination,content.replace(/(src|href)=(['"])(\.\/?[^'"?]+\.(?:js|css))\2/g,(_,attribute,quote,url)=>`${attribute}=${quote}${url}?v=${revision}${quote}`));
  }
}
console.log(`Prepared GitHub Pages assets: ${revision}`);
