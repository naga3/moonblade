const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const root=path.join(__dirname,'..');
const server=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:'4176'},stdio:'pipe'});
(async()=>{
 let browser;
 try{
  await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(new Error(`Server exit ${c}`)));});
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // The real browser handles drawing and keyboard events; simulation time is explicit.
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://localhost:4176/?test');
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.screenshot({path:path.join(root,'test-results/title.png')});
  // The first key on the title only wakes the sound; the title music starts and the game does not.
  await page.keyboard.press('Shift');await page.evaluate(()=>__moonblade.render());assert.equal(await page.evaluate(()=>__moonblade.state.mode),'title');
  await page.waitForFunction(()=>__moonblade.state.audio.playing&&__moonblade.state.audio.track==='title',null,{polling:50});
  await page.keyboard.press('Enter');
  await page.evaluate(()=>__moonblade.step(1));
  assert.equal(await page.evaluate(()=>__moonblade.state.mode),'play');
  await page.waitForFunction(()=>__moonblade.state.audio.playing,null,{polling:50});
  assert.equal(await page.evaluate(()=>__moonblade.state.audio.track),'field','PX-13h WAV background music');
  await page.keyboard.press('KeyM');await page.evaluate(()=>__moonblade.step(1));
  assert.ok(await page.evaluate(()=>__moonblade.state.audio.muted&&!__moonblade.state.audio.playing),'mute stops the music');
  await page.keyboard.press('KeyM');await page.evaluate(()=>__moonblade.step(1));
  await page.waitForFunction(()=>__moonblade.state.audio.playing,null,{polling:50});
  await page.evaluate(()=>__moonblade.step(30));
  assert.equal(await page.evaluate(()=>__moonblade.state.player.y),192,'lands on 16px map');
  await page.keyboard.down('ArrowRight');await page.evaluate(()=>__moonblade.step(30));await page.keyboard.up('ArrowRight');
  assert.ok(await page.evaluate(()=>__moonblade.state.player.x>75),'actual keyboard movement');
  const heights=await page.evaluate(()=>{
   const g=__moonblade;const heights=[];
   for(const hold of [1,35]){g.clear();g.start();g.step(30);g.key('jump',true);let peak=192;for(let i=0;i<60;i++){if(i===hold)g.key('jump',false);g.step(1);peak=Math.min(peak,g.state.player.y);}heights.push(192-peak);}g.clear();return heights;
  });
  assert.ok(heights[1]>heights[0]+15,`variable jump height: ${heights}`);
  const attacks=await page.evaluate(()=>{
   const g=__moonblade,results=[];
   for(const dir of ['side','up','down']){
    g.clear();g.start();g.step(30);for(const e of g.state.enemies)e.alive=false;
    g.setPlayer({x:80,y:dir==='down'?150:192,ground:dir!=='down',vx:0,vy:dir==='down'?2:0,cooldown:0,inv:0});
    g.setEnemy(0,{alive:true,type:dir==='up'?'bat':'slime',x:dir==='side'?100:80,y:dir==='up'?164:dir==='down'?180:192,baseY:164,origin:80,vx:0,vy:0,hp:1,inv:0,timer:0});
    if(dir!=='side')g.key(dir,true);g.key('attack',true);g.step(1);
    results.push({dir,dead:!g.state.enemies[0].alive,bounce:g.state.player.vy});
   }g.clear();return results;
  });
  for(const a of attacks)assert.ok(a.dead,`${a.dir} thrust kills`);
  assert.ok(attacks[2].bounce< -5,'down thrust bounces');
  const switched=await page.evaluate(()=>{
   const g=__moonblade,out={};
   g.clear();g.start();g.step(30);for(const e of g.state.enemies)e.alive=false;
   g.setPlayer({x:80,y:192,ground:true,vx:0,vy:0,cooldown:0,inv:0});g.key('attack',true);g.step(4);g.key('up',true);g.step(1);out.up=g.state.player.attackDir;
   g.clear();g.step(30);g.setPlayer({x:80,y:120,ground:false,vx:0,vy:0,attack:0,cooldown:0,inv:0});g.key('attack',true);g.step(4);g.key('down',true);g.step(1);out.down=g.state.player.attackDir;
   g.clear();g.step(30);g.setPlayer({x:80,y:192,ground:true,vx:0,vy:0,attack:0,cooldown:0,inv:0});g.key('attack',true);g.step(1);g.key('attack',false);g.step(14);g.key('attack',true);g.step(1);g.key('attack',false);g.step(8);out.buffered=g.state.player.attack>0;
   g.clear();return out;
  });
  // Wisps yield only to a downward thrust (and re-form); beetles only to an upward one;
  // the king by stance: floating -> up, shield -> down, after his charge -> any.
  const rules=await page.evaluate(()=>{
   const g=__moonblade,out={};
   const strike=(lv,type,dir,set={},pl={})=>{g.clear();g.level(lv);g.step(1);for(const e of g.state.enemies)if(e.type!==type)e.alive=false;
    const e=g.state.enemies.find(e=>e.type===type);const ground=dir!=='down';
    g.setPlayer({x:e.x+(dir==='side'?-14:0),y:dir==='down'?e.y-24:dir==='up'?e.y+28:e.y,vx:0,vy:dir==='down'?1:0,ground,cooldown:0,attack:0,inv:200,...pl});Object.assign(e,{inv:0,...set});
    g.key(dir==='side'?'right':dir,dir!=='side');g.key('attack',true);g.step(1);const r={hp:e.hp,alive:e.alive,vy:g.state.player.vy};g.clear();return r;};
   out.wispSide=strike(3,'wisp','side').alive;out.wispDown=strike(3,'wisp','down');
   g.step(160);out.wispBack=g.state.enemies.find(e=>e.type==='wisp').alive;
   out.beetleSide=strike(4,'beetle','side',{timer:0}).alive;out.beetleDown=strike(4,'beetle','down',{timer:0});out.beetleUp=strike(4,'beetle','up',{timer:0}).alive;
   const king=(dir,phase)=>strike(5,'king',dir,{timer:phase*200+100,phase,y:phase===0?166:192,dash:1},{x:1100}).hp;
   g.clear();g.level(5);g.setPlayer({x:66*16});g.step(1);const awake=g.state.bossAwake;
   out.king=[[0,'side'],[0,'up'],[1,'side'],[1,'up'],[1,'down'],[2,'side']].map(([ph,d])=>{g.clear();g.level(5);const e=g.state.enemies.find(e=>e.type==='king');g.setPlayer({x:66*16});g.step(1);
    e.timer=ph*200+100;e.phase=ph;e.y=ph===0?166:192;e.x=67*16;e.inv=0;e.vy=0;
    g.setPlayer({x:e.x+(d==='side'?-14:0),y:d==='down'?e.y-24:d==='up'?e.y+28:e.y,vx:0,vy:d==='down'?1:0,ground:d!=='down',cooldown:0,attack:0,inv:200,facing:1});
    if(d!=='side')g.key(d,true);g.key('attack',true);g.step(1);const hp=e.hp;g.clear();return hp;});
   out.awake=awake;return out;
  });
  assert.equal(rules.wispSide,true,'side slash passes through a wisp');assert.equal(rules.wispDown.alive,false,'down thrust pops a wisp');assert.ok(rules.wispDown.vy< -5,'and bounces');assert.ok(rules.wispBack,'wisp re-forms');
  assert.equal(rules.beetleSide,true,'shell blocks a slash');assert.equal(rules.beetleDown.alive,true,'shell blocks a down thrust');assert.ok(rules.beetleDown.vy< -5,'but still bounces');assert.equal(rules.beetleUp,false,'one up thrust to the belly is enough');
  assert.ok(rules.awake);assert.deepEqual(rules.king,[12,11,12,12,11,11],'king yields to up (floating), down (shield), anything (after charge)');
  console.log('PASS: wisps only to down thrust, beetles only to up thrust, king by stance.');
  assert.deepEqual(switched,{up:'up',down:'down',buffered:true},'up/down switch a slash mid-swing and early presses are buffered');
  console.log('PASS: keyboard movement, variable jump, slash, up thrust, down thrust and bounce.');
  const checkpoint=await page.evaluate(()=>{
   const g=__moonblade;g.start();for(const e of g.state.enemies)e.alive=false;g.setPlayer({x:650,y:192,hp:2});g.step(1);const healed=g.state.player.hp;
   g.setPlayer({x:300,y:260,inv:0});g.step(1);return{healed,x:g.state.player.x,hp:g.state.player.hp,checkpoint:g.state.checkpoint};
  });
  assert.equal(checkpoint.healed,4);assert.equal(checkpoint.x,640);assert.equal(checkpoint.hp,3);
  await page.keyboard.press('KeyP');await page.evaluate(()=>__moonblade.step(1));
  const paused=await page.evaluate(()=>{const g=__moonblade,before=g.state.player.x;g.key('right',true);g.step(60);g.clear();return{mode:g.state.mode,before,after:g.state.player.x};});
  assert.equal(paused.mode,'pause');assert.equal(paused.before,paused.after);
  assert.ok(await page.evaluate(()=>__moonblade.state.audio.paused&&!__moonblade.state.audio.playing),'pause stops the music');
  await page.keyboard.press('KeyP');await page.evaluate(()=>__moonblade.step(1));
  // Traverse all six authored maps with only controls. The bot uses the same
  // collision map to time jumps and attacks; no teleporting or invulnerability.
  const runs=await page.evaluate(()=>{
   const g=__moonblade,results=[];
   for(let stage=0;stage<6;stage++){
    g.clear();g.level(stage);let frames=0,jumps=0,swings=0,peakBossHP=99;
    for(;frames<9000;frames++){
     const s=g.state,p=s.player;if(s.mode!=='play'||s.level!==stage)break;
     const boss=s.enemies.find(e=>(e.type==='boss'||e.type==='king')&&e.alive);
     let direction='right';
     if(boss&&s.bossAwake){direction=p.x+8<boss.x+8?'right':'left';peakBossHP=Math.min(peakBossHP,boss.hp);}
     // Over a wisp chain, steer like a player: hover above the next wisp ahead.
     const wisp=!p.ground&&!s.map[13][Math.floor((p.x+8)/16)]&&s.enemies.filter(e=>e.alive&&e.type==='wisp'&&e.x>p.x-6&&e.y>p.y+4).sort((a,b)=>a.x-b.x)[0];
     if(wisp)direction=p.x<wisp.x-2?'right':p.x>wisp.x+2?'left':'none';
     g.key('left',direction==='left');g.key('right',direction==='right');
     const d=direction==='left'?-1:1,tx=Math.floor((p.x+8+d*22)/16);
     const pit=!s.map[13][tx],spike=s.map[12][tx]===3;
     const threat=s.enemies.some(e=>e.alive&&e.type!=='bat'&&e.type!=='beetle'&&e.type!=='wisp'&&Math.abs(e.x-p.x)<48&&Math.abs(e.y-p.y)<25);
     if(p.ground&&(pit||spike||threat)){g.key('jump',false);g.key('jump',true);jumps++;}
     else if(p.ground)g.key('jump',false);
     const under=s.enemies.some(e=>e.alive&&Math.abs(e.x-p.x)<23&&e.y>p.y+8&&e.y<p.y+54);
     const overhead=s.enemies.some(e=>e.alive&&Math.abs(e.x-p.x)<19&&e.y<p.y-9);
     const overPit=(!s.map[13][Math.floor((p.x+8)/16)]||!s.map[13][Math.floor((p.x+8+d*40)/16)])&&s.enemies.some(e=>e.alive&&e.type==='wisp'&&Math.abs(e.x-p.x)<96);
     g.key('down',!p.ground&&(under||overPit));g.key('up',!under&&overhead);
     if(p.cooldown===0){g.key('attack',false);g.key('attack',true);swings++;}
     g.step(1);
    }
    results.push({stage,mode:g.state.mode,level:g.state.level,x:Math.round(g.state.player.x),hp:g.state.player.hp,frames,jumps,swings,bossHP:peakBossHP,bossDead:g.state.bossDead});
   }g.clear();return results;
  });
  console.log('Traversal:',JSON.stringify(runs));
  for(const r of runs){assert.ok(r.stage<5?r.level===r.stage+1:r.mode==='win',`stage ${r.stage+1} traversable: ${JSON.stringify(r)}`);}
  // Inspect the actual browser framebuffer rather than only source palette values.
  for(let stage=0;stage<6;stage++){
   await page.evaluate(i=>{__moonblade.level(i);__moonblade.step(160);},stage);
   const colors=await page.evaluate(()=>{
    const s=__moonblade.state,c=document.querySelector('#game'),data=c.getContext('2d').getImageData(0,0,320,240).data,set=new Set();
    for(let i=0;i<data.length;i+=4){if(data[i+3]!==255)throw Error('Non-opaque pixel');set.add('#'+[data[i],data[i+1],data[i+2]].map(n=>n.toString(16).padStart(2,'0')).join(''));}
    return{w:c.width,h:c.height,count:set.size,valid:[...set].every(c=>s.palette.includes(c)),paletteSize:s.palette.length};
   });
   assert.equal(colors.w,320);assert.equal(colors.h,240);assert.equal(colors.paletteSize,64);assert.ok(colors.count<=64&&colors.valid);
   console.log(`PASS: area ${stage+1}, ${colors.count}/64 palette colors, 320x240 opaque framebuffer.`);
   await page.screenshot({path:path.join(root,`test-results/area-${stage+1}.png`)});
  }
  await page.evaluate(()=>{__moonblade.start();__moonblade.setPlayer({x:170,y:150,ground:false,vy:1});__moonblade.key('down',true);__moonblade.key('attack',true);__moonblade.step(1);});
  await page.screenshot({path:path.join(root,'test-results/down-thrust.png')});
  const reloaded=page.waitForEvent('domcontentloaded');
  const now=new Date();fs.utimesSync(path.join(root,'dist/art-data.js'),now,now);
  await reloaded;await page.waitForFunction(()=>window.__moonblade?.state.mode==='title',null,{polling:50});
  console.log('PASS: local preview reloads after Pixel-generated data changes.');
  // Phones: the picture sits at the top (upright) or in the middle (sideways) and the stick and
  // buttons live outside it. Drive them with real multi-touch events.
  for(const [name,vp] of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]]){
   const mobile=await browser.newContext({viewport:vp,hasTouch:true,isMobile:true});
   const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));await m.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await m.goto('http://localhost:4176/?test');
   const pad=await m.evaluate(()=>{const p=__moonblade.state.pad;return p&&{mode:p.mode,scale:p.scale,ox:p.ox,oy:p.oy,stick:p.stick,buttons:p.buttons.map(b=>({key:b.key,x:b.x,y:b.y,r:b.r}))};});
   assert.equal(pad?.mode,name==='portrait'?'bottom':'side',`${name} pad layout`);
   const at=(x,y)=>({x:x*pad.scale,y:y*pad.scale}),btn=k=>{const b=pad.buttons.find(b=>b.key===k);return at(b.x,b.y);},home=at(pad.stick.x,pad.stick.y);
   const game=await m.locator('#game').boundingBox();
   if(name==='portrait'){assert.ok(game.y<1&&game.width>=380,'picture fills the width at the top');assert.ok(btn('jump').y>game.y+game.height,'buttons below the picture');}
   else{assert.ok(btn('attack').x>game.x+game.width&&home.x<game.x,'stick left, buttons right');}
   for(const b of pad.buttons)assert.ok(b.r*pad.scale>=26,`${b.key} button is big (${Math.round(b.r*pad.scale*2)}px across)`);
   const cdp=await mobile.newCDPSession(m);
   const touch=async(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([p,id])=>({x:p.x,y:p.y,id}))});
   await touch('touchStart',[[home,0]]);await touch('touchEnd',[]);await m.evaluate(()=>__moonblade.step(1));
   assert.equal(await m.evaluate(()=>__moonblade.state.mode),'title','first tap wakes sound');
   await touch('touchStart',[[home,0]]);await touch('touchEnd',[]);await m.evaluate(()=>__moonblade.step(31));
   assert.equal(await m.evaluate(()=>__moonblade.state.mode),'play');
   await m.evaluate(()=>{for(const e of __moonblade.state.enemies)e.alive=false;});
   // Floating stick: press anywhere in its area and drag right.
   const s0={x:home.x+10,y:home.y+6};
   await touch('touchStart',[[s0,0]]);await touch('touchMove',[[{x:s0.x+60,y:s0.y},0]]);await m.evaluate(()=>__moonblade.step(15));await touch('touchEnd',[]);
   assert.ok(await m.evaluate(()=>__moonblade.state.player.x>50),`${name}: stick moves right`);
   await touch('touchStart',[[btn('jump'),1]]);await m.evaluate(()=>__moonblade.step(10));await touch('touchEnd',[]);
   assert.ok(await m.evaluate(()=>__moonblade.state.player.y<170),`${name}: jump button`);
   await m.evaluate(()=>__moonblade.step(60));
   await touch('touchStart',[[s0,0]]);await touch('touchMove',[[{x:s0.x,y:s0.y-60},0]]);await touch('touchMove',[[{x:s0.x,y:s0.y-60},0],[btn('attack'),1]]);await m.evaluate(()=>__moonblade.step(1));
   assert.equal(await m.evaluate(()=>__moonblade.state.player.attackDir),'up',`${name}: stick up + sword = up thrust`);await touch('touchEnd',[]);
   assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),'no mobile overflow');
   await m.evaluate(()=>__moonblade.render());await m.screenshot({path:path.join(root,`test-results/mobile-${name}.png`)});
   await mobile.close();
  }
  const filePage=await browser.newPage();filePage.on('pageerror',e=>errors.push(e.message));await filePage.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await filePage.goto(require('node:url').pathToFileURL(path.join(root,'dist/index.html')).href+'?test');
  await filePage.keyboard.press('Enter');await filePage.keyboard.press('Enter');await filePage.evaluate(()=>__moonblade.step(1));await filePage.waitForFunction(()=>__moonblade.state.audio.playing,null,{polling:50});
  assert.equal(await filePage.evaluate(()=>__moonblade.state.palette.length),64,'standalone file includes Pixel palette');
  console.log('PASS: PX-13h WAV playback, mute, pause and standalone file:// art/audio.');
  assert.deepEqual(errors,[],'no browser errors');
  console.log('PASS: checkpoints, damage, pause, six complete areas, both bosses, palette and mobile.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
