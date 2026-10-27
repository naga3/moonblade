import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {ROOT,PX13H} from '../tools/px13h.mjs';
import {pathToFileURL} from 'node:url';
const read=(root,name)=>readFileSync(join(root,name),'utf8');
function generated(root,file,key){const scope={window:{}};vm.runInNewContext(read(root,`dist/${file}`),scope);return scope.window[key];}
test('Pixelの全素材がゲームの共通64色に収まり、キャラクターと地形が16×16',()=>{
 const a=generated(ROOT,'art-data.js','MOONBLADE_ART');assert.equal(a.palette.length,64);
 for(const[id,p]of Object.entries(a.pics)){
  assert.equal(p.data.length,p.w*p.h,id);assert.ok(p.data.every(n=>Number.isInteger(n)&&n>=-1&&n<64),id);
  if(/^(characters|enemies|tiles)\//.test(id))assert.deepEqual([p.w,p.h],[16,16],id);
 }
 for(const[id,frames]of Object.entries(a.anims))for(const f of frames){assert.ok(a.pics[f.pic],`${id}: ${f.pic}`);assert.ok(f.ms>=10);}
});
test('Musicの9ファイルを公式check.jsで検証し、実際のWAVを確認',()=>{
 const audio=generated(ROOT,'audio-data.js','MOONBLADE_AUDIO');assert.equal(Object.keys(audio).length,9);
 for(const[name,a]of Object.entries(audio)){
  execFileSync(process.execPath,[join(PX13H,'tools/music/check.js'),join(ROOT,'music',`${name}.song`)],{stdio:'pipe'});
  const wav=Buffer.from(a.data,'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.equal(wav.readUInt32LE(24),48000);assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(40),wav.length-44);
  let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));assert.ok(peak>1000&&peak<16000,`${name}: audible, unclipped`);
  assert.ok(Math.abs(a.seconds-(wav.length-44)/96000)<1e-9);
 }
 assert.equal(audio.field.loop,true);for(const n of Object.keys(audio).filter(n=>n!=='field'))assert.equal(audio[n].loop,false);
});
test('Pixel/Musicのグループに実ファイルと保存後フックが登録されている',async()=>{
 const pixel=await import(pathToFileURL(join(PX13H,'tools/pixel/groups.js')));
 const music=await import(pathToFileURL(join(PX13H,'tools/music/lib.js')));
 const p=pixel.loadGroups().moonblade,m=music.loadGroups().moonblade;
 assert.equal(p.root,join(ROOT,'art'));assert.equal(m.root,join(ROOT,'music'));assert.equal(p.palette.palette.length,64);
 assert.equal(p.after,'node tools/art.mjs');assert.equal(m.after,'node tools/audio.mjs');assert.equal(p.cwd,ROOT);assert.equal(m.cwd,ROOT);
 assert.ok(pixel.groupFiles(p).some(f=>f.ref==='moonblade/characters/hero'));
 assert.equal(music.songPath('moonblade/field'),join(ROOT,'music/field.song'));
});
test('絵・アニメの編集とMusicの採用候補が生成データへ反映される',()=>{
 const temp=mkdtempSync(join(tmpdir(),'moonblade-assets-'));
 try{
  for(const dir of ['tools','art','music'])cpSync(join(ROOT,dir),join(temp,dir),{recursive:true});mkdirSync(join(temp,'dist'));
  const build=which=>execFileSync(process.execPath,[join(temp,`tools/${which}.mjs`)],{env:{...process.env,PX13H},stdio:'pipe'});
  build('art');build('audio');assert.equal(read(temp,'dist/art-data.js'),read(ROOT,'dist/art-data.js'),'reproducible pixels');assert.equal(read(temp,'dist/audio-data.js'),read(ROOT,'dist/audio-data.js'),'reproducible PCM');
  const hero=read(temp,'art/characters/hero.pic').replace('  ......3333......','  ......DDDD......').replace('stand:200','stand:350');
  writeFileSync(join(temp,'art/characters/hero.pic'),hero);build('art');
  const art=generated(temp,'art-data.js','MOONBLADE_ART');assert.equal(art.pics['characters/hero/stand'].data[6],13);assert.equal(art.anims['characters/hero/idle'][0].ms,350);
  writeFileSync(join(temp,'music/field.song'),read(temp,'music/field.song')+'\nchoice test bars 1 parts 0 "採用反映テスト"\n  A: o4 c1\n  B: o4 d1\n');
  writeFileSync(join(temp,'music/field.picks.json'),JSON.stringify({choices:{test:{pick:'B'}}}));build('audio');const b=generated(temp,'audio-data.js','MOONBLADE_AUDIO').field.data;
  writeFileSync(join(temp,'music/field.picks.json'),JSON.stringify({choices:{test:{pick:'A'}}}));build('audio');const a=generated(temp,'audio-data.js','MOONBLADE_AUDIO').field.data;
  assert.notEqual(a,b,'Musicの採用候補がゲームの波形を変える');assert.notEqual(a,generated(ROOT,'audio-data.js','MOONBLADE_AUDIO').field.data);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
