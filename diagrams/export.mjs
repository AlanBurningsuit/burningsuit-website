// Run from the repository root: node diagrams/export.mjs
// Exports each diagram's Wide and Narrow pages to src/assets/diagrams/ with the draw.io
// desktop app, embedding Albert Sans from the brand repo. Prints the sizes for
// the consuming markup. Sources are read, never rewritten.
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir,homedir} from 'node:os';
import {brandRoot} from '../scripts/brand-path.mjs';
const exe=[process.env.DRAWIO_EXE,join(homedir(),'.local/bin/drawio'),'/opt/drawio/drawio'].find(p=>p&&existsSync(p));
if(!exe)throw new Error('draw.io desktop not found. Install it and put it (or a wrapper) at ~/.local/bin/drawio, or set DRAWIO_EXE.');
const font=join(brandRoot,'fonts/albert-sans.woff2');
if(!existsSync(font))throw new Error('Missing Albert Sans: check the brand checkout or BURNINGSUIT_BRAND_DIR.');
const fontCss=`@font-face{font-family:Albert Sans;src:url(data:font/woff2;base64,${(await readFile(font)).toString('base64')}) format("woff2");font-weight:100 900;font-style:normal;}`;
const tmp=await mkdtemp(join(tmpdir(),'drawio-'));
const sizes={};
try{
  for(const name of ['agent-system','visual-validation','delegation','domain-experience','agent-anatomy','power-bi-parts']){
    const source=`diagrams/${name}.drawio`;
    const pages=[...(await readFile(source,'utf8')).matchAll(/<diagram id="(wide|narrow)"/g)].map(m=>m[1]);
    if(pages.join()!=='wide,narrow')throw new Error(`${source}: expected uncompressed Wide then Narrow pages`);
    for(const [i,page] of pages.entries()){
      const out=join(tmp,`${name}-${page}.svg`);
      const args=['--no-sandbox','--export','--format','svg','--page-index',String(i+1),'--border','11','--theme','light','--output',out,source];
      // headless on tilion: run under a virtual display unless one exists
      const [cmd,cmdArgs]=process.env.DISPLAY?[exe,args]:['xvfb-run',['-a',exe,...args]];
      execFileSync(cmd,cmdArgs,{stdio:'ignore'});
      let svg=(await readFile(out,'utf8')).replace(/^<\?xml[^>]*>\s*<!DOCTYPE[^>]*>\s*/,'');
      // drop the PNG fallbacks draw.io adds beside each text label; browsers render the foreignObject text
      svg=svg.replace(/<image\b[^>]*xlink:href="data:image\/png;base64,[^"]*"[^>]*\/>/g,'');
      if(/light-dark\(/.test(svg))throw new Error(`${name}-${page}: dark-mode colours exported; set adaptiveColors="none"`);
      svg=svg.replace(/(<svg\b[^>]*>)/,`$1<defs><style>${fontCss}</style></defs>`);
      await writeFile(`src/assets/diagrams/${name}-${page}.svg`,svg.trimEnd()+'\n');
      sizes[`${name}-${page}`]=svg.match(/viewBox="0 0 ([^"]+)"/)[1].replace(' ','×');
    }
  }
}finally{await rm(tmp,{recursive:true,force:true});}
console.table(sizes);
