// 紹介動画を作る。実際のゲームを ?test で1コマずつ進め、フレームバッファと鳴った音をそのまま記録して、
// ffmpeg で 1920×1080・60fps の mp4 にする（320×240 を縦1080に合わせて最近傍で拡大し、左右は暗い紺で埋める）。
// 使い方: npm run promo  → promo/moonblade.mp4
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),outDir=path.join(root,'promo'),W=320,H=240,FPS=60,RATE=48000;
const load=(file,key)=>{const s={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist',file),'utf8'),s);return s.window[key];};
const ART=load('art-data.js','MOONBLADE_ART'),AUDIO=load('audio-data.js','MOONBLADE_AUDIO');
const rgb=ART.palette.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));

// Captions use the game's own bitmap font and palette.
function glyph(ch){return ART.pics['ui/font/g'+ch.charCodeAt(0)]||ART.pics['ui/font/g63'];}
function textWidth(s){return Math.max(0,[...s].reduce((n,c)=>n+glyph(c).w+1,0)-1);}
function caption(px,s,y0=212){
 const w=textWidth(s)+16,x0=Math.floor((W-w)/2);
 const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(i>=0&&i<W&&j>=0&&j<H)px[j*W+i]=c;};
 rect(x0+2,y0+2,w,19,0);rect(x0,y0,w,19,1);rect(x0,y0,w,1,5);rect(x0,y0+18,w,1,5);rect(x0,y0,1,19,5);rect(x0+w-1,y0,1,19,5);
 let x=x0+8;for(const ch of s){const g=glyph(ch);for(let j=0;j<g.h;j++)for(let i=0;i<g.w;i++)if(g.data[j*g.w+i]>=0)px[(y0+6+j)*W+x+i]=37;x+=g.w+1;}
}

// Runs in the page: the playtest's bot (ordinary keys only) and a frame grabber.
function pageSetup(){
 const a=window.MoonbladeAudio;window.__rec={frame:0,track:null,effects:[]};
 a.unlock=()=>{};a.effect=n=>{__rec.effects.push([__rec.frame,n]);};
 a.sync=(name,paused,muted)=>{__rec.track=paused||muted?null:name;};
 window.__bot=()=>{const g=__moonblade,s=g.state,p=s.player;
  const boss=s.enemies.find(e=>(e.type==='boss'||e.type==='king')&&e.alive);let direction='right';
  if(boss&&s.bossAwake)direction=p.x+8<boss.x+8?'right':'left';
  const wisp=!p.ground&&!s.map[13][Math.floor((p.x+8)/16)]&&s.enemies.filter(e=>e.alive&&e.type==='wisp'&&e.x>p.x-6&&e.y>p.y+4).sort((a,b)=>a.x-b.x)[0];
  if(wisp)direction=p.x<wisp.x-2?'right':p.x>wisp.x+2?'left':'none';
  g.key('left',direction==='left');g.key('right',direction==='right');
  const d=direction==='left'?-1:1,tx=Math.floor((p.x+8+d*22)/16);
  const pit=!s.map[13][tx],spike=s.map[12][tx]===3;
  const threat=s.enemies.some(e=>e.alive&&e.type!=='bat'&&e.type!=='beetle'&&e.type!=='wisp'&&Math.abs(e.x-p.x)<48&&Math.abs(e.y-p.y)<25);
  if(p.ground&&(pit||spike||threat)){g.key('jump',false);g.key('jump',true);}else if(p.ground)g.key('jump',false);
  const under=s.enemies.some(e=>e.alive&&Math.abs(e.x-p.x)<23&&e.y>p.y+8&&e.y<p.y+54);
  const overhead=s.enemies.some(e=>e.alive&&Math.abs(e.x-p.x)<19&&e.y<p.y-9);
  const overPit=(!s.map[13][Math.floor((p.x+8)/16)]||!s.map[13][Math.floor((p.x+8+d*40)/16)])&&s.enemies.some(e=>e.alive&&e.type==='wisp'&&Math.abs(e.x-p.x)<96);
  g.key('down',!p.ground&&(under||overPit));g.key('up',!under&&overhead);
  if(p.cooldown===0){g.key('attack',false);g.key('attack',true);}
 };
 // Advance up to `count` frames; stop early `after` frames past the moment `until` first holds.
 window.__shoot=(count,bot,until,after)=>{
  const g=__moonblade,frames=[],tracks=[],test=until&&new Function('s','return '+until);let done=false;
  for(let i=0;i<count;i++){
   if(bot)__bot();g.step(1);__rec.frame++;tracks.push(__rec.track);
   let s='';const px=g.state.pixels;for(let j=0;j<px.length;j+=8192)s+=String.fromCharCode.apply(null,px.subarray(j,j+8192));frames.push(btoa(s));
   if(test&&__rec.hit===undefined&&test(g.state))__rec.hit=0;
   if(__rec.hit!==undefined&&++__rec.hit>after){done=true;break;}
  }
  return{frames,tracks,done};
 };
 window.__skip=(n,bot)=>{for(let i=0;i<n;i++){if(bot)__bot();__moonblade.step(1);}__rec.effects=__rec.effects.filter(e=>e[0]<__rec.frame);};
}

(async()=>{
 fs.mkdirSync(outDir,{recursive:true});
 const browser=await chromium.launch();
 const page=await browser.newPage();
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.goto('file://'+path.join(root,'dist/index.html')+'?test');
 await page.evaluate(pageSetup);
 const video=path.join(outDir,'video.tmp.mp4'),audio=path.join(outDir,'audio.tmp.wav'),final=path.join(outDir,'moonblade.mp4');
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',`${W}x${H}`,'-r',String(FPS),'-i','-',
  '-vf','scale=1440:1080:flags=neighbor,pad=1920:1080:240:0:color=0x101421','-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p',video],{stdio:['pipe','inherit','inherit']});
 const ffDone=new Promise((ok,no)=>ff.on('exit',c=>c?no(Error('ffmpeg '+c)):ok()));
 const write=buf=>new Promise(ok=>ff.stdin.write(buf)?ok():ff.stdin.once('drain',ok));
 const tracks=[];
 async function shoot(n,{bot=false,text='',y=212,until=null,after=0}={}){
  await page.evaluate(()=>{delete __rec.hit;});
  for(let left=n;left>0;){
   const r=await page.evaluate(([c,b,u,a])=>__shoot(c,b,u,a),[Math.min(120,left),bot,until,after]);
   for(const f of r.frames){const px=Buffer.from(f,'base64');if(text)caption(px,text,y);const out=Buffer.alloc(W*H*3);for(let i=0;i<W*H;i++){const c=rgb[px[i]];out[i*3]=c[0];out[i*3+1]=c[1];out[i*3+2]=c[2];}await write(out);}
   tracks.push(...r.tracks);left-=r.frames.length;if(r.done)break;
  }
 }
 const ev=f=>page.evaluate(f);
 const key=async(k,on)=>ev(`__moonblade.key(${JSON.stringify(k)},${on})`);

 // 1. Dark screen with the prompt, then the title opens with its music.
 await shoot(100);
 await page.keyboard.press('Shift');
 await shoot(260);
 // 2. Area 1: slash, jump, thrust.
 await page.keyboard.press('Enter');
 await shoot(560,{bot:true,text:'SLASH. JUMP. THRUST UP AND DOWN.'});
 await ev('__moonblade.clear()');
 // 3. Area 4: a chain of wisps crossed by bouncing on them.
 await ev('__moonblade.level(3)');await ev('__skip(110,true)');
 await shoot(330,{bot:true,text:'DOWN THRUST TO BOUNCE ACROSS'});
 await ev('__moonblade.clear()');
 // 4. Area 5: shelled beetles yield only to an upward thrust.
 await ev('__moonblade.level(4)');await ev('__skip(20,true)');
 await shoot(300,{bot:true,text:'UP THRUST BREAKS THE SHELL'});
 await ev('__moonblade.clear()');
 // 5. Area 6: the Pale King, then the gate and the ending.
 await ev('__moonblade.level(5)');await ev('__moonblade.setPlayer({x:56*16+8,y:192})');await ev('__skip(150,false)');
 await shoot(2400,{bot:true,text:'',until:"s.bossDead",after:150});
 await shoot(600,{bot:true,until:"s.mode==='win'",after:200});
 await ev('__moonblade.clear()');
 // 6. Back to the title with the address.
 await page.keyboard.press('Enter');
 await shoot(300,{text:'NAGA3.GITHUB.IO/MOONBLADE',y:104});
 ff.stdin.end();await ffDone;

 // Mix the soundtrack: each music track restarts when it begins and loops; effects land on their frame.
 const effects=await ev('__rec.effects');await browser.close();
 const pcm=name=>{const b=Buffer.from(AUDIO[name].data,'base64'),n=(b.length-44)/2,a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=b.readInt16LE(44+i*2)/32768;return a;};
 const cache={},get=n=>cache[n]||(cache[n]=pcm(n));
 const total=Math.ceil(tracks.length/FPS*RATE),mix=new Float32Array(total+RATE);
 let cur=null,start=0;
 for(let f=0;f<=tracks.length;f++){const t=f<tracks.length?tracks[f]:'__end';
  if(t!==cur){if(cur){const a=get(cur),s0=Math.round(start/FPS*RATE),s1=Math.round(f/FPS*RATE);for(let i=s0;i<s1;i++)mix[i]+=a[(i-s0)%a.length];}cur=t;start=f;}}
 for(const[f,n]of effects){if(!AUDIO[n])continue;const a=get(n),s0=Math.round(f/FPS*RATE);for(let i=0;i<a.length&&s0+i<mix.length;i++)mix[s0+i]+=a[i];}
 // Fade the last second out.
 for(let i=0;i<RATE;i++)mix[total-RATE+i]*=1-i/RATE;
 const wav=Buffer.alloc(44+total*2);wav.write('RIFF');wav.writeUInt32LE(36+total*2,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(RATE,24);wav.writeUInt32LE(RATE*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(total*2,40);
 for(let i=0;i<total;i++)wav.writeInt16LE(Math.round(Math.tanh(mix[i]*1.4)*0.97*32767),44+i*2);
 fs.writeFileSync(audio,wav);
 await new Promise((ok,no)=>spawn('ffmpeg',['-y','-loglevel','error','-i',video,'-i',audio,'-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',final],{stdio:'inherit'}).on('exit',c=>c?no(Error('mux '+c)):ok()));
 fs.rmSync(video);fs.rmSync(audio);
 console.log(`紹介動画: ${path.relative(root,final)}（${(tracks.length/FPS).toFixed(1)}秒）`);
})().catch(e=>{console.error(e);process.exitCode=1;});
