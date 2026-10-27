// Play the WAVs rendered by PX-13h Music. Embedded data also works with file://.
(() => {
'use strict';
const songs=window.MOONBLADE_AUDIO;
let ctx=null,master=null,wanted=null,paused=false,enabled=true,music=null,offset=0,startedAt=0,starting=false,generation=0,effectGeneration=0;
const buffers=new Map(),voices=new Set();
function ensure(){if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;ctx=new AC({sampleRate:48000});master=ctx.createGain();master.gain.value=enabled?1:0;master.connect(ctx.destination);return ctx;}
function load(name){if(buffers.has(name))return buffers.get(name);const task=(async()=>{if(!songs[name])throw Error(`Unknown sound: ${name}`);const str=atob(songs[name].data),data=Uint8Array.from(str,c=>c.charCodeAt(0));return ensure().decodeAudioData(data.buffer);})();buffers.set(name,task);return task;}
function stopMusic(remember){if(!music)return;if(remember)offset=(offset+ctx.currentTime-startedAt)%music.buffer.duration;try{music.stop();}catch{}music.disconnect();music=null;}
function stopEffects(){for(const s of voices){try{s.stop();}catch{}s.disconnect();}voices.clear();}
async function startMusic(){if(!ctx||!wanted||paused||!enabled||music||starting)return;starting=true;const name=wanted,gen=generation;try{const buffer=await load(name);if(gen!==generation||wanted!==name||paused||!enabled)return;const source=ctx.createBufferSource();source.buffer=buffer;source.loop=songs[name].loop;source.connect(master);source.start(0,offset%buffer.duration);startedAt=ctx.currentTime;music=source;}catch(e){console.error('Music:',e);}finally{starting=false;}}
window.MoonbladeAudio={
 unlock(){const c=ensure();if(!c)return;if(c.state==='suspended')c.resume().catch(()=>{});startMusic();},
 sync(name,isPaused,isMuted){
  const newEnabled=!isMuted;
  if(wanted!==name){generation++;stopMusic(false);offset=0;wanted=name;}
  if(paused!==isPaused||enabled!==newEnabled){generation++;effectGeneration++;if(isPaused||!newEnabled){stopMusic(true);stopEffects();}}
  paused=isPaused;enabled=newEnabled;if(master)master.gain.value=enabled&&!paused?1:0;
  startMusic();
 },
 async effect(name){if(!ctx||paused||!enabled||!songs[name])return;const gen=effectGeneration;try{const buffer=await load(name);if(gen!==effectGeneration||paused||!enabled||voices.size>=12)return;const s=ctx.createBufferSource();s.buffer=buffer;s.connect(master);voices.add(s);s.onended=()=>{voices.delete(s);s.disconnect();};s.start();}catch(e){console.error('Sound:',e);}},
 get status(){return{track:wanted,paused,muted:!enabled,playing:!!music,offset,contextState:ctx?.state||'locked',loaded:[...buffers.keys()],voices:voices.size};}
};
})();
