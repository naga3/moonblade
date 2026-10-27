// Musicの正規パーサー・音源を使い、選んだ候補も含めて書き出す。
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT,PX13H,writeChanged} from './px13h.mjs';
const {Engine}=await import(pathToFileURL(join(PX13H,'tools/music/web/engine.js')));
const {parseSong,compose,analyze,buildTracks,engineSong}=await import(pathToFileURL(join(PX13H,'tools/music/web/song.js')));
const wasm=readFileSync(join(PX13H,'tools/music/web/engine.wasm'));
const RATE=48000;
const defs={field:{loop:true,peak:.28},jump:{peak:.25},sword:{peak:.28},hit:{peak:.32},hurt:{peak:.28},gem:{peak:.24},bounce:{peak:.26},check:{peak:.25},win:{peak:.28}};
const out={};
for(const[name,def]of Object.entries(defs)){
 const file=join(ROOT,'music',`${name}.song`),song=parseSong(readFileSync(file,'utf8'));
 const picksFile=file.replace(/\.song$/,'.picks.json');
 const composed=compose(song,existsSync(picksFile)?JSON.parse(readFileSync(picksFile,'utf8')):{}),analysis=analyze(song,composed);
 if(song.errors.length||analysis.errors.length)throw Error(`${name}:\n${[...song.errors,...analysis.errors].join('\n')}`);
 if(song.mode!==0)throw Error(`${name}: mode famicom を使ってください`);
 const seconds=analysis.total*240/song.tempo,period=Math.round(seconds*RATE);
 if(period<1||seconds>60)throw Error(`${name}: 長さは0〜60秒にしてください`);
 const engine=await Engine.load(wasm);
 // All envelopes are authored in the song or its instruments, never inherited.
 engine.setSong(engineSong(song,buildTracks(song,composed,analysis,-Infinity,Infinity,!!def.loop)));
 engine.play();
 const limit=def.loop?period*2+2400:period+RATE*2,chunks=[];let n=0;
 while(n<limit&&(def.loop||engine.playing())){const size=Math.min(800,limit-n);chunks.push(Int16Array.from(engine.render(size)));n+=size;}
 let samples=new Int16Array(n),offset=0;for(const c of chunks){samples.set(c,offset);offset+=c.length;}
 if(def.loop)samples=samples.slice(period,period*2);
 else{let end=samples.length;while(end>0&&Math.abs(samples[end-1])<40)end--;samples=samples.slice(0,Math.min(samples.length,end+480));}
 let peak=0;for(const s of samples)peak=Math.max(peak,Math.abs(s));
 if(!peak)throw Error(`${name}: 音が出ていません`);
 const pcm=Buffer.alloc(samples.length*2);for(let i=0;i<samples.length;i++)pcm.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(samples[i]*def.peak*32767/peak))),i*2);
 const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(RATE,24);h.writeUInt32LE(RATE*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
 out[name]={loop:!!def.loop,seconds:samples.length/RATE,data:Buffer.concat([h,pcm]).toString('base64')};
 console.log(`Music: ${name} ${(samples.length/RATE).toFixed(3)}秒${def.loop?' loop':''}`);
}
writeChanged(join(ROOT,'dist/audio-data.js'),`// Generated from music/*.song by PX-13h Music engine.wasm.\nwindow.MOONBLADE_AUDIO=${JSON.stringify(out)};\n`);
