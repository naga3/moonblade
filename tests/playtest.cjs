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
  await page.keyboard.press('Enter');
  await page.evaluate(()=>__moonblade.step(1));
  assert.equal(await page.evaluate(()=>__moonblade.state.mode),'play');
  await page.waitForFunction(()=>__moonblade.state.audio.playing);
  assert.equal(await page.evaluate(()=>__moonblade.state.audio.track),'field','PX-13h WAV background music');
  await page.keyboard.press('KeyM');await page.evaluate(()=>__moonblade.step(1));
  assert.ok(await page.evaluate(()=>__moonblade.state.audio.muted&&!__moonblade.state.audio.playing),'mute stops the music');
  await page.keyboard.press('KeyM');await page.evaluate(()=>__moonblade.step(1));
  await page.waitForFunction(()=>__moonblade.state.audio.playing);
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
  // Traverse all three authored maps with only controls. The bot uses the same
  // collision map to time jumps and attacks; no teleporting or invulnerability.
  const runs=await page.evaluate(()=>{
   const g=__moonblade,results=[];
   for(let stage=0;stage<3;stage++){
    g.clear();g.level(stage);let frames=0,jumps=0,swings=0,peakBossHP=8;
    for(;frames<9000;frames++){
     const s=g.state,p=s.player;if(s.mode!=='play'||s.level!==stage)break;
     const boss=s.enemies.find(e=>e.type==='boss'&&e.alive);
     let direction='right';
     if(boss&&s.bossAwake){direction=p.x+8<boss.x+8?'right':'left';peakBossHP=Math.min(peakBossHP,boss.hp);}
     g.key('left',direction==='left');g.key('right',direction==='right');
     const d=direction==='right'?1:-1,tx=Math.floor((p.x+8+d*22)/16);
     const pit=!s.map[13][tx],spike=s.map[12][tx]===3;
     const threat=s.enemies.some(e=>e.alive&&e.type!=='bat'&&Math.abs(e.x-p.x)<48&&Math.abs(e.y-p.y)<25);
     if(p.ground&&(pit||spike||threat)){g.key('jump',false);g.key('jump',true);jumps++;}
     else if(p.ground)g.key('jump',false);
     const under=s.enemies.some(e=>e.alive&&Math.abs(e.x-p.x)<23&&e.y>p.y+8&&e.y<p.y+54);
     const overhead=s.enemies.some(e=>e.alive&&Math.abs(e.x-p.x)<19&&e.y<p.y-9);
     g.key('down',!p.ground&&under);g.key('up',!under&&overhead);
     if(p.cooldown===0){g.key('attack',false);g.key('attack',true);swings++;}
     g.step(1);
    }
    results.push({stage,mode:g.state.mode,level:g.state.level,x:Math.round(g.state.player.x),hp:g.state.player.hp,frames,jumps,swings,bossHP:peakBossHP,bossDead:g.state.bossDead});
   }g.clear();return results;
  });
  console.log('Traversal:',JSON.stringify(runs));
  for(const r of runs){assert.ok(r.stage<2?r.level===r.stage+1:r.mode==='win',`stage ${r.stage+1} traversable: ${JSON.stringify(r)}`);}
  // Inspect the actual browser framebuffer rather than only source palette values.
  for(let stage=0;stage<3;stage++){
   await page.evaluate(i=>{__moonblade.level(i);__moonblade.step(160);},stage);
   const colors=await page.evaluate(()=>{
    const s=__moonblade.state,c=document.querySelector('canvas'),data=c.getContext('2d').getImageData(0,0,320,240).data,set=new Set();
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
  await reloaded;await page.waitForFunction(()=>window.__moonblade?.state.mode==='title');
  console.log('PASS: local preview reloads after Pixel-generated data changes.');
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));await m.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await m.goto('http://localhost:4176/?test');
  await m.locator('canvas').tap({position:{x:160,y:112}});await m.evaluate(()=>__moonblade.step(31));
  assert.equal(await m.evaluate(()=>__moonblade.state.mode),'play');
  const box=await m.locator('canvas').boundingBox(),cdp=await mobile.newCDPSession(m);
  const touch=async(points)=>cdp.send('Input.dispatchTouchEvent',{type:points.length?'touchStart':'touchEnd',touchPoints:points.map(([x,y],id)=>({x:box.x+x,y:box.y+y,id}))});
  await touch([[55,205]]);await m.evaluate(()=>__moonblade.step(15));await touch([]);
  assert.ok(await m.evaluate(()=>__moonblade.state.player.x>50),'real touch moves right');
  await touch([[290,200]]);await m.evaluate(()=>__moonblade.step(10));await touch([]);
  assert.ok(await m.evaluate(()=>__moonblade.state.player.y<170),'real touch jumps');
  await touch([[37,183],[245,220]]);await m.evaluate(()=>__moonblade.step(1));
  assert.equal(await m.evaluate(()=>__moonblade.state.player.attackDir),'up','multitouch upward thrust');await touch([]);
  assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile overflow');
  await m.screenshot({path:path.join(root,'test-results/mobile.png')});
  const filePage=await browser.newPage();filePage.on('pageerror',e=>errors.push(e.message));await filePage.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await filePage.goto(require('node:url').pathToFileURL(path.join(root,'dist/index.html')).href+'?test');
  await filePage.keyboard.press('Enter');await filePage.evaluate(()=>__moonblade.step(1));await filePage.waitForFunction(()=>__moonblade.state.audio.playing);
  assert.equal(await filePage.evaluate(()=>__moonblade.state.palette.length),64,'standalone file includes Pixel palette');
  console.log('PASS: PX-13h WAV playback, mute, pause and standalone file:// art/audio.');
  assert.deepEqual(errors,[],'no browser errors');
  console.log('PASS: checkpoints, damage, pause, three complete areas, final boss, palette and mobile.');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
