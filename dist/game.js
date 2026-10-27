(() => {
'use strict';
const W=320,H=240,TILE=16,STEP=1000/60;
// One immutable, shared 64-color palette. Every visible pixel is an index into it.
const PALETTE=Object.freeze([
 '#101421','#151d2b','#1d283b','#26364a','#34465b','#455c70','#607c8a','#89a4a5',
 '#102c36','#16424b','#205b60','#2c7775','#38958c','#56b3a1','#83c8ae','#b3dfbd',
 '#183c34','#24513a','#34694a','#4a8055','#679866','#8ab477','#b0cd8b','#d2e4a3',
 '#352c32','#4d3838','#68453c','#855440','#a46845','#c4824e','#df9d62','#efb879',
 '#74523b','#977343','#b9934e','#d6ad58','#edc76b','#f6db8b','#fae6b2','#fff1ce',
 '#c6d2cc','#e4e8d7','#faf5e4','#ffffff','#aec0cf','#8099b4','#5c7699','#405878',
 '#28253e','#3c3154','#55406d','#725489','#956d9b','#ba8faa','#dbb4bf','#f0d6d4',
 '#582f44','#7d3a4c','#a54b54','#cc5e5d','#e77c68','#f5a17f','#f7c3a0','#ffdfba'
]);
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
const pixels=new Uint8Array(W*H),image=ctx.createImageData(W,H);
const rgb=PALETTE.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);
function rect(x,y,w,h,c){x=Math.floor(x);y=Math.floor(y);w=Math.floor(w);h=Math.floor(h);const x0=Math.max(0,x),x1=Math.min(W,x+w);if(x1<=x0)return;for(let j=Math.max(0,y),j1=Math.min(H,y+h);j<j1;j++)pixels.fill(c,j*W+x0,j*W+x1);}
function dot(x,y,c){x=Math.floor(x);y=Math.floor(y);if(x>=0&&x<W&&y>=0&&y<H)pixels[y*W+x]=c;}
function line(x0,y0,x1,y1,c){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let e=dx+dy;for(;;){dot(x0,y0,c);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}}
function disk(cx,cy,r,c){for(let y=-r;y<=r;y++){const dx=Math.floor(Math.sqrt(r*r-y*y));rect(cx-dx,cy+y,dx*2+1,1,c);}}
function frame(x,y,w,h,c){rect(x,y,w,1,c);rect(x,y+h-1,w,1,c);rect(x,y,1,h,c);rect(x+w-1,y,1,h,c);}
function panel(x,y,w,h){rect(x+2,y+2,w,h,0);rect(x,y,w,h,1);frame(x,y,w,h,5);dot(x,y,35);dot(x+w-1,y,35);dot(x,y+h-1,35);dot(x+w-1,y+h-1,35);}
const FONT={
 A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','10001'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
 '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['010','110','010','010','010','010','111'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['10010','10010','10010','11111','00010','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
 ' ':['000','000','000','000','000','000','000'],':':['0','1','0','0','1','0','0'],'.':['0','0','0','0','0','1','1'],'-':['000','000','000','111','000','000','000'],'/':['00001','00010','00010','00100','01000','01000','10000'],'+':['000','010','010','111','010','010','000'],'!':['1','1','1','1','1','0','1'],'?':['1110','0001','0001','0010','0100','0000','0100'],'<':['001','010','100','010','001','000','000'],'>':['100','010','001','010','100','000','000'],'=':['000','111','000','111','000','000','000'],'(':['01','10','10','10','10','10','01'],')':['10','01','01','01','01','01','10'],"'":['1','1','0','0','0','0','0']
};
function textWidth(s,scale=1){return Math.max(0,[...s].reduce((n,c)=>n+(FONT[c]?.[0].length??5)+1,0)-1)*scale;}
function text(s,x,y,c=41,scale=1){for(const ch of s.toUpperCase()){const g=FONT[ch]||FONT['?'];for(let j=0;j<7;j++)for(let i=0;i<g[j].length;i++)if(g[j][i]==='1')rect(x+i*scale,y+j*scale,scale,scale,c);x+=(g[0].length+1)*scale;}}
function center(s,y,c=41,scale=1){text(s,Math.floor((W-textWidth(s,scale))/2),y,c,scale);}
function sprite(rows,x,y,colors,flip=false){x=Math.round(x);y=Math.round(y);for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const p=rows[j][i];if(p!=='.')dot(x+(flip?15-i:i),y+j,colors[p]);}}
const HERO=[
 '......hhhh......','.....hHHHHh.....','....hHHHHHHh....','....hHHHLLLh....','....hLLLEELh....','.....hLLLh......','...ssrrrrrrr....','..ss..rRr.......','.....aCCCa......','....aACCCAL.....','....LACCCAL.....','.....aCCCa......','.....bbbbb......','.....bb.bb......','....bBB.BBb.....','....bbb.bbb.....'
];
const HERO_COLORS={h:3,H:44,L:38,E:0,s:59,r:60,R:31,a:9,A:11,C:13,b:2,B:5};
const SLIME=[
 '................','................','................','................','................','......gggg......','....ggGGGGgg....','...gGGGGGGGGg...','..gGGGGGGGGGGg..','..gGWeGGWeGGGg..','..gGWeGGWeGGGg..','.gGGGGGGGGGGGGg.','.gGGGgGGgGGGGGg.','.gGGGGggGGGGGGg.','..gggggggggggg..','...dddddddddd...'
];
const BAT=[
 '................','................','.p............p.','.pp..........pp.','.pPp...pp...pPp.','.pPPp.pPPp.pPPp.','..pPPpPPPPpPPp..','..pPPPPPPEPPPp..','...pPPWeWePPp...','....ppPPPPpp....','......pPPp......','.......pp.......','................','................','................','................'
];
const KNIGHT=[
 '......rrrr......','.....rRRRRr.....','....rRRRRRRr....','....rRddddRr....','....rdEddEdr....','.....rdddr......','....ppRRppp.....','...pPPRRPPPp....','..pPPPPPPPPPp...','..dPpPPPPpPd....','..dPpPPPPpPd....','....pPPPPp......','.....rrrrr......','.....rr.rr......','....rRR.RRr.....','....rrr.rrr.....'
];
const HEART=['.rr.rr.','rrrrrrr','rrrrrrr','.rrrrr.','..rrr..','...r...'];
const STAGES=[{name:'MOONLIT GROVE',short:'GROVE',sky:1,stone:9,top:12,accent:14},{name:'SILENT AQUEDUCT',short:'RUINS',sky:2,stone:3,top:6,accent:13},{name:'THE LAST SENTINEL',short:'KEEP',sky:48,stone:49,top:51,accent:35}];
const keys=new Set(),pressed=new Set(),touchKeys=new Set(),touches=new Map();
const KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyZ:'attack',KeyJ:'attack',KeyX:'jump',KeyK:'jump',Space:'jump',Enter:'start',KeyP:'pause',Escape:'pause',KeyM:'mute',KeyH:'help'};
let mode='title',returnMode='title',level=0,tick=0,worldTick=0,camera=0,shake=0,freeze=0,transition=0,stageIntro=0,checkpoint=0,checkpointLit=false,score=0,kills=0,deaths=0,runFrames=0,muted=false,touchMode=false,notice='',noticeTime=0,bossAwake=false,bossDead=false;
let map=[],enemies=[],gems=[],effects=[],player,gateX=0,best=0;
try{best=Number(localStorage.getItem('moonblade-best')||0);}catch{}
const down=k=>keys.has(k)||touchKeys.has(k),tap=k=>pressed.has(k);
function press(k){if(!keys.has(k)&&!touchKeys.has(k))pressed.add(k);}
addEventListener('keydown',e=>{const k=KEYMAP[e.code];if(!k)return;e.preventDefault();if(!e.repeat){press(k);keys.add(k);unlockAudio();}});
addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k){e.preventDefault();keys.delete(k);}});
function clearInput(){keys.clear();pressed.clear();touchKeys.clear();touches.clear();}
addEventListener('blur',()=>{clearInput();if(mode==='play')mode='pause';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(mode==='play')mode='pause';}});
function resize(){const fit=Math.min(innerWidth/W,innerHeight/H);const scale=fit>=1?Math.max(1,Math.floor(fit)):fit;canvas.style.width=`${W*scale}px`;canvas.style.height=`${H*scale}px`;}
addEventListener('resize',resize);resize();
function pointerXY(e){const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height};}
function touchAction(p){if(p.y<22)return null;if(p.x<88&&p.y>163){if(p.y<192&&p.x>22&&p.x<60)return'up';if(p.y>219&&p.x>22&&p.x<60)return'down';if(p.x<37)return'left';return'right';}if(p.x>265&&p.y>174)return'jump';if(p.x>218&&p.y>192)return'attack';return null;}
function updateTouches(){const next=new Set([...touches.values()].map(touchAction).filter(Boolean));for(const k of next)if(!touchKeys.has(k))pressed.add(k);touchKeys.clear();for(const k of next)touchKeys.add(k);}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus();unlockAudio();const p=pointerXY(e);if(e.pointerType==='touch')touchMode=true;if(mode==='title'){if(p.y>214&&p.x<100){muted=!muted;return;}if(p.y>142&&p.y<209){returnMode='title';mode='help';return;}pressed.add('start');return;}if(mode==='help'||mode==='pause'||mode==='dead'||mode==='win'){pressed.add('start');return;}if(p.y<22){if(p.x>295)pressed.add('pause');else if(p.x>278)pressed.add('mute');else if(p.x>259)pressed.add('help');return;}canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,p);updateTouches();});
canvas.addEventListener('pointermove',e=>{if(touches.has(e.pointerId)){touches.set(e.pointerId,pointerXY(e));updateTouches();}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{touches.delete(e.pointerId);updateTouches();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
let audioContext=null,musicStep=0;
function unlockAudio(){if(!audioContext)try{audioContext=new(window.AudioContext||window.webkitAudioContext)();}catch{}if(audioContext?.state==='suspended')audioContext.resume();}
function tone(freq,duration=0.08,type='square',volume=0.025,slide=0){if(muted||!audioContext)return;const t=audioContext.currentTime,o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(25,freq+slide),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(0.0001,t+duration);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+duration);}
function sfx(kind){if(kind==='jump')tone(170,.13,'square',.025,290);if(kind==='sword'){tone(400,.07,'sawtooth',.018,-320);tone(90,.07,'triangle',.06);}if(kind==='hit'){tone(110,.12,'sawtooth',.035,-75);tone(700,.06,'square',.02,-450);}if(kind==='hurt')tone(230,.22,'sawtooth',.025,-170);if(kind==='gem')tone(880,.12,'sine',.05,440);if(kind==='bounce'){tone(210,.13,'square',.025,590);}if(kind==='check'){tone(440,.3,'triangle',.06);setTimeout(()=>tone(660,.3,'triangle',.05),100);setTimeout(()=>tone(880,.4,'triangle',.04),200);}if(kind==='win'){[440,554,659,880].forEach((f,i)=>setTimeout(()=>tone(f,.35,'triangle',.05),i*120));}}
const melody=[69,0,76,0,72,0,71,0,69,0,64,0,67,0,64,0,65,0,72,0,69,0,67,0,64,0,62,0,64,0,67,0];
function music(){if(worldTick%15!==0)return;const i=musicStep++%32,n=melody[i];if(n)tone(440*2**((n-69)/12),.18,'triangle',.016);if(i%4===0)tone([110,110,87.31,98][Math.floor(i/8)],.22,'triangle',.025);}
function solid(tx,ty){if(tx<0||tx>=map[0].length)return true;if(ty<0||ty>=15)return false;return map[ty][tx]===1||map[ty][tx]===2;}
function tileAt(tx,ty){return map[ty]?.[tx]||0;}
function setTile(x,y,id=1){if(map[y]&&x>=0&&x<map[0].length)map[y][x]=id;}
function newPlayer(x=32,y=176,hp=5){return{x,y,vx:0,vy:0,w:16,h:16,facing:1,ground:false,coyote:0,jumpBuffer:0,attack:0,cooldown:0,attackDir:'side',inv:0,hp,hitIds:new Set(),respawn:0};}
function makeLevel(index,preserveHp=false){
 level=index;const hp=preserveHp?Math.min(5,player.hp+1):5;
 map=Array.from({length:15},()=>Array(80).fill(0));enemies=[];gems=[];effects=[];checkpoint=0;checkpointLit=false;bossAwake=false;bossDead=false;camera=0;worldTick=0;gateX=76*16;transition=0;freeze=0;shake=0;
 for(let x=0;x<80;x++)for(let y=13;y<15;y++)setTile(x,y);
 const pits=index===0?[[18,2],[37,3],[57,2]]:index===1?[[15,3],[34,3],[52,3]]:[[17,2],[35,3],[50,2]];
 for(const [x,w]of pits)for(let i=x;i<x+w;i++)for(let y=13;y<15;y++)setTile(i,y,0);
 const platforms=index===0?[[8,10,4],[24,10,4],[31,8,3],[43,10,4],[51,9,3],[62,10,4]]:index===1?[[7,10,4],[19,10,4],[27,8,4],[39,10,4],[46,8,3],[57,10,4],[63,8,3]]:[[8,10,4],[23,10,4],[29,8,3],[40,10,4],[54,10,3]];
 for(const[x,y,w]of platforms){for(let i=0;i<w;i++)setTile(x+i,y,2);gems.push({x:(x+1)*16+4,y:y*16-18,alive:true});}
 for(const[x,y]of(index===0?[[28,12],[48,12]]:index===1?[[24,12],[43,12],[60,12]]:[[26,12],[44,12]]))setTile(x,y,3);
 const locations=index===0?[[12,'slime'],[26,'slime'],[32,'bat'],[45,'slime'],[54,'bat'],[64,'knight'],[70,'slime']]:index===1?[[11,'knight'],[22,'bat'],[29,'slime'],[41,'knight'],[48,'bat'],[59,'knight'],[68,'bat']]:[[12,'knight'],[25,'bat'],[30,'knight'],[42,'bat'],[46,'knight'],[58,'slime'],[70,'boss']];
 let id=0;for(const[col,type]of locations){let y=type==='bat'?144:192;if(type==='slime'&&solid(col,10))y=144;const hp=type==='boss'?8:type==='knight'?2:1;enemies.push({id:id++,type,x:col*16,y,baseY:y,vx:type==='bat'?-.65:-.45,vy:0,w:16,h:16,hp,maxHp:hp,alive:true,inv:0,phase:0,timer:0,facing:-1,origin:col*16});}
 // A raised route offers gems, while the main route stays traversable without them.
 for(const [x,w]of pits)for(let i=0;i<w+2;i++)gems.push({x:(x-1+i)*16+4,y:155-Math.sin(i/(w+1)*Math.PI)*13,alive:true});
 player=newPlayer(32,176,hp);stageIntro=150;notice='';noticeTime=0;
}
function startRun(){score=0;kills=0;deaths=0;runFrames=0;musicStep=0;makeLevel(0);mode='play';sfx('check');}
function particles(x,y,color,count=10){for(let i=0;i<count;i++)effects.push({x,y,vx:(rand()-.5)*3,vy:-rand()*2.5-.3,t:20+Math.floor(rand()*12),c:color});}
let seed=1963;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function moveBody(b){
 b.x+=b.vx;
 if(b.vx>0){const tx=Math.floor((b.x+13)/16);for(let ty=Math.floor((b.y+2)/16);ty<=Math.floor((b.y+15)/16);ty++)if(solid(tx,ty)){b.x=tx*16-14;b.vx=0;break;}}
 else if(b.vx<0){const tx=Math.floor((b.x+2)/16);for(let ty=Math.floor((b.y+2)/16);ty<=Math.floor((b.y+15)/16);ty++)if(solid(tx,ty)){b.x=(tx+1)*16-2;b.vx=0;break;}}
 b.y+=b.vy;b.ground=false;
 if(b.vy>=0){const ty=Math.floor((b.y+16)/16);for(let tx=Math.floor((b.x+3)/16);tx<=Math.floor((b.x+12)/16);tx++)if(solid(tx,ty)){b.y=ty*16-16;b.vy=0;b.ground=true;break;}}
 else{const ty=Math.floor((b.y+1)/16);for(let tx=Math.floor((b.x+3)/16);tx<=Math.floor((b.x+12)/16);tx++)if(solid(tx,ty)){b.y=(ty+1)*16;b.vy=0;break;}}
}
function swordBox(){const p=player;if(p.attackDir==='up')return{x:p.x+2,y:p.y-17,w:12,h:21};if(p.attackDir==='down')return{x:p.x+2,y:p.y+12,w:12,h:23};return{x:p.x+(p.facing>0?11:-17),y:p.y,w:22,h:17};}
function attack(){const p=player;if(p.cooldown>0)return;p.attackDir=down('up')?'up':down('down')&&!p.ground?'down':'side';p.attack=14;p.cooldown=20;p.hitIds.clear();sfx('sword');}
function hurt(source,fall=false){const p=player;if(p.inv>0&&!fall)return;p.hp--;deaths+=fall?1:0;shake=8;sfx('hurt');particles(p.x+8,p.y+8,60,16);if(p.hp<=0){mode='dead';p.attack=0;return;}p.inv=95;p.attack=0;if(fall){p.x=checkpoint||32;p.y=176;p.vx=0;p.vy=0;camera=Math.max(0,p.x-100);p.respawn=15;notice='TRY AGAIN. KEEP YOUR BLADE UP.';noticeTime=130;}else{p.vx=(p.x+8<(source?.x??p.x)?-1:1)*3;p.vy=-3.4;}}
function killEnemy(e){e.alive=false;score+=e.type==='boss'?1500:e.type==='knight'?150:100;kills++;particles(e.x+8,e.y+8,e.type==='slime'?14:35,18);if(e.type==='boss'){bossDead=true;shake=16;freeze=12;sfx('win');notice='THE MOON IS FREE.';noticeTime=220;}else if(kills%5===0){gems.push({x:e.x+4,y:e.y,alive:true,heart:true});}}
function updateEnemy(e){if(!e.alive)return;e.timer++;if(e.inv>0)e.inv--;if(Math.abs(e.x-player.x)>430&&e.type!=='boss')return;
 if(e.type==='bat'){e.x+=e.vx;e.y=e.baseY+Math.sin(e.timer*.055)*16;if(e.x<e.origin-38||e.x>e.origin+38)e.vx*=-1;e.facing=e.vx>0?1:-1;}
 else if(e.type==='boss'){
  if(player.x>64*16&&!bossAwake){bossAwake=true;notice='THE LAST SENTINEL';noticeTime=100;sfx('hurt');}
  if(!bossAwake)return;
  e.facing=player.x>e.x?1:-1;e.phase=Math.floor(e.timer/150)%3;
  if(e.phase===0){e.vx=e.facing*.55;if(e.timer%150===1&&e.ground)e.vy=-4.8;}
  else if(e.phase===1){e.vx=0;if(e.timer%150===76)sfx('sword');}
  else{e.vx=e.facing*(e.timer%150<42?2.1:.4);}
  e.vy=Math.min(e.vy+.26,5);moveBody(e);e.x=Math.max(64*16,Math.min(74*16,e.x));
 }else{const dir=e.vx>=0?1:-1;if(e.ground&&(!solid(Math.floor((e.x+8+dir*11)/16),Math.floor((e.y+19)/16))||solid(Math.floor((e.x+8+dir*11)/16),Math.floor((e.y+6)/16))))e.vx*=-1;e.facing=e.vx>0?1:-1;const speed=e.type==='knight'?.55:.4;e.vx=(e.vx>=0?1:-1)*speed;e.vy=Math.min(e.vy+.26,5);moveBody(e);if(e.vx===0)e.vx=-dir*speed;}
 if(e.y>250){e.alive=false;return;}
 const hitbox={x:e.x+2,y:e.y+3,w:12,h:13};
 if(player.attack>0&&e.inv===0&&!player.hitIds.has(e.id)&&overlap(swordBox(),hitbox)){
  player.hitIds.add(e.id);e.hp--;e.inv=20;freeze=4;shake=3;particles(e.x+8,e.y+8,37,12);sfx('hit');
  if(player.attackDir==='down'){player.vy=-5.7;player.attack=0;player.cooldown=5;sfx('bounce');}
  else if(e.type!=='boss')e.x+=player.facing*5;
  if(e.hp<=0)killEnemy(e);
 }
 if(e.alive&&e.inv===0&&overlap({x:player.x+3,y:player.y+2,w:10,h:14},hitbox))hurt(e);
 if(e.type==='boss'&&e.alive&&e.phase===1&&e.timer%150>95&&e.timer%150<122){const b={x:e.x+(e.facing>0?13:-18),y:e.y+3,w:21,h:12};if(player.attack>0&&overlap(swordBox(),b)){particles(e.x+8,e.y,37,3);}else if(overlap({x:player.x+3,y:player.y+2,w:10,h:14},b))hurt(e);}
}
function update(){
 tick++;
 if(tap('mute'))muted=!muted;
 if(tap('help')&&mode!=='help'){returnMode=mode;mode='help';pressed.clear();return;}
 if(mode==='title'){if(tap('start')||tap('jump')||tap('attack'))startRun();pressed.clear();return;}
 if(mode==='help'){if(tap('start')||tap('pause')||tap('help')||tap('attack'))mode=returnMode;pressed.clear();return;}
 if(mode==='pause'){if(tap('pause')||tap('start'))mode='play';pressed.clear();return;}
 if(mode==='dead'){if(tap('start')||tap('jump')){deaths++;makeLevel(level);mode='play';}pressed.clear();return;}
 if(mode==='win'){if(tap('start')||tap('jump')){mode='title';}pressed.clear();return;}
 if(tap('pause')||tap('start')){mode='pause';pressed.clear();return;}
 if(freeze>0){freeze--;pressed.clear();return;}
 if(transition>0){transition--;if(transition===0){if(level<2){makeLevel(level+1,true);}else{mode='win';if(score>best){best=score;try{localStorage.setItem('moonblade-best',String(best));}catch{}}sfx('win');}}pressed.clear();return;}
 worldTick++;runFrames++;music();if(stageIntro>0)stageIntro--;if(noticeTime>0)noticeTime--;if(shake>0)shake--;
 const p=player;if(p.inv>0)p.inv--;if(p.cooldown>0)p.cooldown--;if(p.attack>0)p.attack--;if(p.respawn>0)p.respawn--;
 if(p.ground)p.coyote=6;else p.coyote=Math.max(0,p.coyote-1);
 if(tap('jump'))p.jumpBuffer=7;else p.jumpBuffer=Math.max(0,p.jumpBuffer-1);
 const movement=Number(down('right'))-Number(down('left'));
 if(p.inv<80){const target=movement*1.75;p.vx+=Math.max(-.4,Math.min(.4,target-p.vx));if(movement)p.facing=movement;}
 if(p.jumpBuffer>0&&p.coyote>0){p.vy=-5.7;p.ground=false;p.coyote=0;p.jumpBuffer=0;sfx('jump');particles(p.x+8,p.y+16,6,5);}
 if(!down('jump')&&p.vy< -2.5)p.vy+=.24;
 if(tap('attack'))attack();
 // A held downward thrust stays out until landing or bouncing off an enemy.
 if(p.attackDir==='down'&&p.attack>0&&!p.ground&&down('down'))p.attack=Math.max(p.attack,3);
 p.vy=Math.min(p.vy+.26,p.attackDir==='down'&&p.attack>0?6.2:5.6);moveBody(p);
 if(p.ground&&p.attackDir==='down')p.attack=0;
 p.x=Math.max(0,Math.min(80*16-16,p.x));
 if(p.y>H+12){hurt(null,true);pressed.clear();return;}
 for(let ty=Math.floor((p.y+3)/16);ty<=Math.floor((p.y+15)/16);ty++)for(let tx=Math.floor((p.x+4)/16);tx<=Math.floor((p.x+11)/16);tx++)if(tileAt(tx,ty)===3)hurt({x:tx*16});
 for(const e of enemies){updateEnemy(e);if(mode!=='play')break;}
 for(const g of gems)if(g.alive&&overlap({x:p.x,y:p.y,w:16,h:16},{x:g.x,y:g.y,w:8,h:8})){g.alive=false;if(g.heart)p.hp=Math.min(5,p.hp+1);else score+=25;sfx('gem');particles(g.x+4,g.y+4,g.heart?60:35,7);}
 if(!checkpointLit&&p.x>40*16){checkpointLit=true;checkpoint=40*16;p.hp=Math.min(5,p.hp+2);score+=100;notice='CHECKPOINT / +2 HEARTS';noticeTime=135;particles(40*16+8,176,14,20);sfx('check');}
 if(level===2&&bossAwake&&!bossDead)p.x=Math.max(63*16,p.x);
 if(p.x>gateX&&((level<2)||bossDead)){transition=45;score+=300+p.hp*50;sfx('check');}
 for(const e of effects){e.x+=e.vx;e.y+=e.vy;e.vy+=.09;e.t--;}
 effects=effects.filter(e=>e.t>0);
 const target=Math.max(0,Math.min(80*16-W,p.x-125));camera+=(target-camera)*.13;
 pressed.clear();
}
function mountain(x,y,w,h,color){for(let i=0;i<w;i++){const f=1-Math.abs(i-w/2)/(w/2);rect(x+i,y-Math.floor(f*h),1,H-y+Math.floor(f*h),color);}}
function tree(x,y,h,near=false){const c=near?8:2;rect(x,y-h,4,h,c);line(x+2,y-h+20,x-14,y-h+3,c);line(x+2,y-h+34,x+19,y-h+9,c);for(let i=0;i<4;i++){const yy=y-h+i*15;rect(x-16-i*4,yy,35+i*8,4,c);rect(x-12-i*5,yy+4,28+i*10,6,c);}if(near)rect(x+1,y-h+32,1,h-32,9);}
function background(cam,stage=level){
 const s=STAGES[stage];pixels.fill(s.sky);
 rect(0,70,W,70,stage===2?49:2);rect(0,140,W,100,stage===2?48:8);
 for(let i=0;i<68;i++){const x=((i*73+31-Math.floor(cam*.08))%350+350)%350-15,y=10+(i*31)%112;dot(x,y,i%9===0?38:i%3===0?6:4);if(i%17===0){dot(x-1,y,5);dot(x+1,y,5);dot(x,y-1,5);dot(x,y+1,5);}}
 const mx=238-Math.floor(cam*.035)%20;disk(mx,56,23,35);disk(mx,55,21,37);disk(mx-5,49,3,36);disk(mx+8,61,5,36);disk(mx-9,64,2,36);rect(mx-30,74,65,1,3);
 for(let i=-1;i<7;i++){const x=i*111-(cam*.14)%111;mountain(x,159,166,52+(i%3)*13,stage===2?49:3);}
 for(let i=-1;i<8;i++){const x=i*79-(cam*.28)%79;mountain(x,187,115,55+(i%3)*9,stage===2?48:8);}
 if(stage===0){for(let i=-1;i<7;i++)tree(i*83-Math.floor(cam*.4)%83,210,93+(i%3)*18);}
 else{for(let i=-1;i<6;i++){const x=i*105-Math.floor(cam*.35)%105;rect(x,105,15,104,stage===2?24:3);rect(x-3,102,21,6,stage===2?49:4);rect(x+2,112,2,88,stage===2?49:4);rect(x+15,116,62,8,stage===2?24:3);rect(x+69,108,12,101,stage===2?24:3);if(stage===2){rect(x+19,80,40,61,48);rect(x+15,80,9,9,48);rect(x+54,80,9,9,48);rect(x+32,103,9,17,56);}}}
 // Thin river glints and drifting motes are also palette pixels, never alpha blends.
 for(let i=0;i<12;i++){const x=((i*37-Math.floor(cam*.55))%340+340)%340;rect(x,217+(i*7)%23,8+i%4*3,1,stage===2?50:10);}
 for(let i=0;i<11;i++){const x=((i*41+tick*.12-Math.floor(cam*.65))%340+340)%340-10,y=126+(i*23)%76+Math.round(Math.sin(tick*.025+i)*4);dot(x,y,Math.sin(tick*.04+i)>0?14:11);}
}
function drawTile(tx,ty,id,cam){const x=tx*16-cam,y=ty*16,s=STAGES[level];
 if(id===3){for(let i=0;i<4;i++){line(x+i*4,y+15,x+i*4+2,y+7,6);line(x+i*4+2,y+7,x+i*4+4,y+15,4);dot(x+i*4+2,y+8,41);}return;}
 const top=!solid(tx,ty-1);rect(x,y,16,16,s.stone);rect(x,y,1,16,0);rect(x,y+15,16,1,0);
 if(id===2){rect(x,y,16,2,s.top);rect(x+1,y+3,14,2,stageColor(1));rect(x+2,y+7,12,1,0);rect(x+7,y+8,1,6,0);rect(x+2,y+12,3,1,s.top);if(level===0){rect(x+2,y+1,4,2,14);rect(x+10,y+2,3,2,11);}}
 else{rect(x+1,y+1,14,1,stageColor(1));rect(x+(ty%2?5:10),y+2,1,6,0);rect(x+1,y+8,15,1,0);rect(x+(ty%2?11:6),y+9,1,6,0);dot(x+3+(tx*3)%9,y+11,s.top);dot(x+10,y+4,stageColor(1));if(top){rect(x,y,16,2,s.top);rect(x+2,y+2,5,2,s.top);rect(x+10,y+2,3,1,s.top);if(level===0){rect(x+2,y,3,1,14);rect(x+9,y-2,1,3,12);rect(x+12,y-1,1,2,13);}else if(level===2){rect(x+2,y+1,5,1,52);}}}
}
function stageColor(n){return level===0?10:level===1?4:50;}
function blade(x,y,dir,facing=1,enemy=false){const c=enemy?60:42,b=enemy?58:44;if(dir==='up'){rect(x+7,y-15,2,15,c);rect(x+6,y-11,1,11,b);dot(x+7,y-17,c);rect(x+4,y-1,8,2,35);rect(x+7,y+1,2,4,28);}else if(dir==='down'){rect(x+7,y+15,2,16,c);rect(x+6,y+16,1,12,b);dot(x+7,y+32,c);rect(x+4,y+14,8,2,35);}else if(facing>0){rect(x+13,y+8,17,2,c);rect(x+15,y+10,13,1,b);dot(x+31,y+8,c);rect(x+14,y+5,2,8,35);rect(x+10,y+8,4,2,28);}else{rect(x-15,y+8,17,2,c);rect(x-12,y+10,13,1,b);dot(x-17,y+8,c);rect(x,y+5,2,8,35);rect(x+2,y+8,4,2,28);}}
function drawPlayer(p,cam,title=false){if(p.inv>0&&Math.floor(tick/4)%2===0&&!title)return;let x=Math.round(p.x-cam),y=Math.round(p.y);const walking=Math.abs(p.vx)>.2&&p.ground;const step=walking?Math.floor(worldTick/7)%2:0;
 if(p.attack>0&&p.attackDir==='side'){const f=p.facing,age=14-p.attack;const radius=22;for(let a=-1.2+age*.12;a<.9+age*.1;a+=.08){const xx=x+8+Math.cos(a)*radius*f,yy=y+8+Math.sin(a)*15;dot(xx,yy,age<7?37:35);if(age<7)dot(xx+f,yy,42);}}
 sprite(HERO,x,y,HERO_COLORS,p.facing<0);
 if(step){rect(x+4,y+13,8,3,0);rect(x+3,y+13,4,2,5);rect(x+10,y+14,4,2,5);}
 if(!p.ground&&!title){rect(x+4,y+13,8,3,0);rect(x+4,y+12,3,3,5);rect(x+10,y+13,3,2,5);}
 // Animated scarf, kept within the 16x16 character cell.
 if(Math.floor(tick/12)%2)dot(x+(p.facing>0?2:13),y+8,60);
 if(p.attack>0)blade(x,y,p.attackDir,p.facing);else{line(x+(p.facing>0?13:2),y+9,x+(p.facing>0?15:0),y+15,44);dot(x+(p.facing>0?13:2),y+10,35);}
}
function drawEnemy(e,cam){if(!e.alive||e.inv>0&&Math.floor(tick/3)%2===0)return;const x=Math.round(e.x-cam),y=Math.round(e.y);
 if(e.type==='slime'){sprite(SLIME,x,y+(Math.floor(tick/18)%2),{g:9,G:12,W:41,e:0,d:8},e.facing>0);}
 else if(e.type==='bat'){const flap=Math.floor(tick/9)%2;sprite(BAT,x,y,{p:48,P:flap?52:51,W:38,e:58,E:53},e.facing>0);if(flap){line(x+1,y+4,x+4,y+10,52);line(x+14,y+4,x+11,y+10,52);}}
 else{if(e.type==='boss'&&bossAwake){disk(x+8,y+8,13,48);if(e.phase===1){const t=e.timer%150;if(t>75&&t<95){text('!',x+6,y-12,60);frame(x-2,y-2,20,20,58);}if(t>95&&t<122)blade(x,y,'side',e.facing,true);}}
  sprite(KNIGHT,x,y,{r:e.type==='boss'?56:24,R:e.type==='boss'?60:29,d:2,E:37,p:48,P:e.type==='boss'?52:50},e.facing>0);
  if(e.type==='knight'&&e.hp===1){rect(x+3,y-4,10,2,24);rect(x+3,y-4,5,2,60);}
 }
}
function checkpointArt(cam){const x=40*16-cam;rect(x+7,176,2,32,4);rect(x+5,205,6,3,5);rect(x+9,178,12,9,checkpointLit?12:4);rect(x+9,178,12,1,checkpointLit?14:6);if(checkpointLit){line(x+12,182,x+14,184,38);line(x+14,184,x+18,180,38);if(tick%50<25)dot(x+23,175,14);}}
function gateArt(cam){const x=gateX-cam;const open=level<2||bossDead;rect(x-3,163,5,45,stageColor(1));rect(x+19,163,5,45,stageColor(1));rect(x-5,159,31,5,STAGES[level].top);rect(x+2,168,17,40,open?8:48);for(let y=171;y<205;y+=7){rect(x+5,y,11,1,open?11:50);dot(x+10,y,open?14:51);}if(open){line(x+7,181,x+12,186,37);line(x+12,186,x+7,191,37);dot(x+9,185,42);}else text('X',x+8,183,58);}
function sign(x,y,a,b,cam){x-=cam;rect(x+2,y+15,2,14,26);rect(x,y,40,16,24);frame(x,y,40,16,28);text(a,x+3,y+2,37);if(b)text(b,x+3,y+9,31);}
function hud(){rect(0,0,320,22,0);rect(0,21,320,1,4);for(let i=0;i<5;i++)sprite(HEART,8+i*10,7,{r:i<player.hp?60:3});text(String(score).padStart(5,'0'),68,7,37);rect(111,6,1,9,4);text(`${level+1}/3 ${STAGES[level].short}`,119,7,14);text('?',265,7,6);text(muted?'X':'M',282,7,muted?58:6);rect(301,7,2,7,6);rect(305,7,2,7,6);
 if(bossAwake&&!bossDead){const b=enemies.find(e=>e.type==='boss');panel(89,27,142,15);text('SENTINEL',95,31,60);rect(148,32,76,4,24);rect(148,32,Math.ceil(76*b.hp/b.maxHp),4,59);}
 else if(stageIntro>0){panel(56,29,208,23);center(`0${level+1} / ${STAGES[level].name}`,37,37);}
 else if(noticeTime>0){const w=textWidth(notice)+16;panel(Math.floor((W-w)/2),29,w,19);center(notice,35,38);}
 if(level===0&&worldTick<390&&!touchMode&&stageIntro===0){panel(60,221,200,15);center('Z SWORD  X JUMP  H HOW TO PLAY',225,7);}
}
function touchButton(x,y,w,h,label,c=6){rect(x,y,w,h,1);frame(x,y,w,h,c);text(label,x+Math.floor((w-textWidth(label))/2),y+Math.floor((h-7)/2),c);}
function touchHud(){touchButton(25,171,25,23,'UP',down('up')?37:7);touchButton(1,197,31,23,'<',down('left')?37:7);touchButton(40,197,31,23,'>',down('right')?37:7);touchButton(25,222,25,17,'DN',down('down')?37:7);touchButton(229,209,34,29,'Z',down('attack')?37:14);touchButton(276,185,38,34,'X',down('jump')?37:35);}
function drawWorld(){const jitter=shake>0?Math.round(Math.sin(tick*8)*Math.min(3,shake/2)):0,cam=Math.round(camera)+jitter;background(cam);
 if(level===0){for(let i=0;i<7;i++){const x=i*192+64-cam;rect(x,192,5,16,9);rect(x-7,189,19,5,10);rect(x-5,187,15,3,11);dot(x+2,185,14);}}
 if(level===1)for(let i=0;i<9;i++){const x=i*144+96-cam;rect(x,144,6,64,3);rect(x-3,141,12,5,5);rect(x+1,148,1,56,4);}
 for(let ty=0;ty<15;ty++)for(let tx=Math.max(0,Math.floor(cam/16));tx<Math.min(80,Math.ceil((cam+W)/16));tx++){const id=map[ty][tx];if(id)drawTile(tx,ty,id,cam);}
 checkpointArt(cam);gateArt(cam);
 if(level===0){sign(5*16,176,'Z:','SLASH',cam);sign(15*16,176,'X:','JUMP',cam);}
 for(const g of gems)if(g.alive){const x=Math.round(g.x-cam),y=Math.round(g.y+Math.sin(tick*.06+g.x)*2);if(g.heart)sprite(HEART,x,y,{r:60});else{line(x+3,y,x+6,y+4,35);line(x+6,y+4,x+3,y+8,35);line(x+3,y+8,x,y+4,35);line(x,y+4,x+3,y,35);line(x+3,y+2,x+3,y+6,38);dot(x+2,y+3,42);}}
 for(const e of enemies)drawEnemy(e,cam);drawPlayer(player,cam);
 for(const e of effects)rect(e.x-cam,e.y,e.t>12?2:1,e.t>12?2:1,e.c);
 if(level===2&&bossAwake&&!bossDead){const x=63*16-cam;for(let i=0;i<5;i++){rect(x,129+i*16,2,10,58);dot(x+1,127+i*16,60);}}
 hud();if(touchMode)touchHud();
 if(transition>0){const w=Math.floor((45-transition)/45*160);rect(0,0,w,240,0);rect(W-w,0,w,240,0);}
}
function title(){background((tick*.2)%850,0);
 // The title is a complete 320x240 scene, including every control hint.
 for(let x=0;x<20;x++){rect(x*16,211,16,29,8);rect(x*16,211,16,2,12);rect(x*16+1,225,15,1,0);rect(x*16+8,227,1,13,0);if(x%3===0)rect(x*16+3,210,3,3,14);}
 tree(20,211,100,true);tree(296,211,89,true);
 rect(265,162,8,49,9);rect(260,158,18,5,11);rect(65,177,6,34,9);rect(62,173,12,5,11);
 center('A LITTLE PIXEL ADVENTURE',26,7);
 const label='MOONBLADE',lx=Math.floor((W-textWidth(label,3))/2);text(label,lx+2,57,0,3);text(label,lx,54,37,3);text(label,lx,53,42,3);
 center('- THE MOON REMEMBERS -',84,14);
 rect(67,100,186,1,4);dot(160,100,35);dot(157,100,35);dot(163,100,35);
 if(Math.floor(tick/35)%2===0)center('PRESS ENTER / TAP TO START',112,38);
 panel(48,139,224,64);text('MOVE',60,149,7);text('ARROWS / WASD',128,149,41);text('SWORD',60,162,14);text('Z / J',128,162,41);text('JUMP',60,175,35);text('X / K / SPACE',128,175,41);center('H : UP THRUST / DOWN THRUST',190,6);
 drawPlayer({...newPlayer(151,195),ground:true,facing:1},0,true);
 text(muted?'M:SOUND OFF':'M:SOUND ON',8,226,6);text('320X240 / 64 COLORS',202,226,6);
}
function helpScreen(){panel(22,29,276,185);center('THE WAY OF THE BLADE',41,37);rect(37,55,246,1,4);
 const rows=[['ARROWS / WASD','MOVE / AIM'],['X / K / SPACE','JUMP (HOLD: HIGHER)'],['Z / J','SWING YOUR SWORD'],['UP + Z','THRUST UPWARD'],['DOWN + Z IN AIR','THRUST DOWNWARD']];
 for(let i=0;i<rows.length;i++){text(rows[i][0],37,66+i*18,14);text(rows[i][1],139,66+i*18,41);}
 text('DOWN THRUST AN ENEMY TO BOUNCE!',37,161,35);text('FLAGS HEAL + SAVE YOUR POSITION.',37,174,7);text('P: PAUSE  M: SOUND  H: THIS GUIDE',37,187,7);center('ENTER / TAP TO RETURN',225,38);
}
function pauseScreen(){panel(64,76,192,89);center('TAKE A BREATH',89,37);center('THE MOON CAN WAIT.',111,7);center('P / ENTER / TAP',143,14);}
function deadScreen(){panel(47,68,226,104);center('A FALLEN BLADE',82,60);center('EVEN THE MOON RISES AGAIN.',107,7);center(`SCORE ${String(score).padStart(5,'0')}`,126,37);center('ENTER / TAP : RETRY AREA',150,14);}
function winScreen(){background(tick*.1,2);panel(31,31,258,176);center('DAWN WILL COME',47,38,2);center('THE SENTINEL RESTS.',74,14);center('YOUR BLADE HAS BROUGHT THE LIGHT.',89,7);rect(48,105,224,1,4);text('SCORE',55,119,7);text(String(score).padStart(5,'0'),214,119,37);text('ENEMIES DEFEATED',55,137,7);text(String(kills),238,137,38);text('TIME',55,155,7);text(`${Math.floor(runFrames/3600)}:${String(Math.floor(runFrames/60)%60).padStart(2,'0')}`,220,155,38);center(`BEST ${String(best).padStart(5,'0')}`,180,35);center('ENTER / TAP : TITLE',223,14);}
function render(){
 if(mode==='title'||mode==='help'&&returnMode==='title')title();else if(mode==='win')winScreen();else drawWorld();
 if(mode==='help')helpScreen();if(mode==='pause')pauseScreen();if(mode==='dead')deadScreen();
 const out=image.data;for(let i=0,j=0;i<pixels.length;i++,j+=4){const c=rgb[pixels[i]];out[j]=c[0];out[j+1]=c[1];out[j+2]=c[2];out[j+3]=255;}ctx.putImageData(image,0,0);
}
let last=0,accumulator=0;
function loop(now){if(!last)last=now;accumulator+=Math.min(100,now-last);last=now;while(accumulator>=STEP){update();accumulator-=STEP;}render();requestAnimationFrame(loop);}
makeLevel(0);render();requestAnimationFrame(loop);
// Development-only hooks for deterministic physics and framebuffer verification.
if(new URLSearchParams(location.search).has('test'))window.__moonblade={get state(){return{mode,level,player,enemies,gems,map,score,kills,checkpoint,camera,bossAwake,bossDead,transition,palette:PALETTE,pixels};},start:startRun,level:i=>{makeLevel(i);mode='play';},step:n=>{for(let i=0;i<n;i++)update();render();},setPlayer:v=>Object.assign(player,v),setEnemy:(id,v)=>Object.assign(enemies.find(e=>e.id===id),v),key:(k,on)=>{if(on){press(k);keys.add(k);}else keys.delete(k);},clear:clearInput,render};
})();
