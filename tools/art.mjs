// Pixelの正規パーサーで読む。保存時のafterフックと npm run art から使う。
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT,PX13H,writeChanged} from './px13h.mjs';
const {parsePic,parseGpl,usePalettes,pixels}=await import(pathToFileURL(join(PX13H,'tools/pixel/web/pic.js')));
const root=join(ROOT,'art');
const pal=parseGpl(readFileSync(join(root,'moonblade.gpl'),'utf8'));
if(pal.palette.length!==64)throw Error('moonblade.gpl は共通64色にしてください');
usePalettes({moonblade:pal});
const result={palette:pal.palette.map(c=>'#'+c.map(n=>n.toString(16).padStart(2,'0')).join('')),pics:{},anims:{}};
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
 const f=join(dir,e.name);if(e.isDirectory()){walk(f);continue;}if(!e.name.endsWith('.pic'))continue;
 const name=relative(root,f).replaceAll('\\','/').replace(/\.pic$/,'');
 const doc=parsePic(readFileSync(f,'utf8'));
 if(doc.errors.length)throw Error(`${f}:\n${doc.errors.join('\n')}`);
 if(doc.paletteName!=='moonblade')throw Error(`${f}: palette moonblade を使ってください`);
 for(const p of doc.pics){if(p.key!==null)continue;
  if(/^(characters|enemies|tiles)\//.test(name)&&(p.w!==16||p.h!==16))throw Error(`${f}: ${p.name} は16×16にしてください`);
  result.pics[`${name}/${p.name}`]={w:p.w,h:p.h,data:Array.from(pixels(doc,p))};
 }
 for(const a of doc.anims){for(const f of a.frames)if(!result.pics[`${name}/${f.pic}`])throw Error(`${name}: 動き ${a.name} のコマ ${f.pic} がありません`);
  result.anims[`${name}/${a.name}`]=a.frames.map(f=>({pic:`${name}/${f.pic}`,ms:f.ms}));
 }
}}
walk(root);
const required=['characters/hero/stand','characters/hero/attack_side','characters/hero/attack_up','characters/hero/attack_down','enemies/knight/stand','enemies/sentinel/stand','enemies/king/stand','enemies/king/float','enemies/king/guard','items/icons/heart','items/icons/empty','items/icons/gem','background/moon/disc',...['aqueduct','keep','belfry','throne','column','post'].map(n=>'background/scenery/'+n)];
for(const stage of ['grove','ruins','keep'])for(const tile of ['top_even','top_odd','ground_even','ground_odd','platform','spikes'])required.push(`tiles/${stage}/${tile}`);
for(const kind of ['side','up','down'])for(const prefix of ['','enemy_'])required.push(`weapons/sword/${prefix}${kind}`);
for(const id of required)if(!result.pics[id])throw Error(`必要な絵がありません: ${id}`);
for(const id of ['characters/hero/idle','characters/hero/walk','characters/hero/air','enemies/slime/idle','enemies/bat/idle','enemies/wisp/idle','enemies/beetle/idle'])if(!result.anims[id]?.length)throw Error(`必要な動きがありません: ${id}`);
writeChanged(join(ROOT,'dist/art-data.js'),`// Generated from art/*.pic and moonblade.gpl by tools/art.mjs. Edit in PX-13h Pixel.\nwindow.MOONBLADE_ART=${JSON.stringify(result)};\n`);
console.log(`Pixel: ${Object.keys(result.pics).length}枚、${Object.keys(result.anims).length}アニメ、共通64色 → dist/art-data.js`);
