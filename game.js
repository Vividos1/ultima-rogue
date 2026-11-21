/* Ultima Rogue - offline seed-driven exploration prototype v0.1 */
(()=>{'use strict';
const VERSION='0.2', N=47, TILE=22, canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
const ids=['floor_stone1','floor_stone2','floor_stone3','floor_earth','floor_sand','floor_wood','wall','wall_dark','wall_side','wood_wall','door','wood_door','bones','skeleton_remains','rat','avatar','chest','crate','torch','gold','sword','axe','dagger','mace','spear','bow','armor','food','backpack','stairs','corpse','anvil','potion','shield','helmet','candles','web','statue'];
const sprites={};let loaded=0;for(const id of ids){let i=new Image();sprites[id]=i;i.onload=()=>loaded++;i.src='assets/'+id+'.png'}
const el=id=>document.getElementById(id),eLog=el('log'),seedInput=el('seed');
const qs=new URLSearchParams(location.search);seedInput.value=qs.get('seed')||'AVATAR-1980';
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619)}return h>>>0}
function seeded(s){let a=hashString(s);return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const choose=(r,arr)=>arr[Math.floor(r()*arr.length)],key=(x,y)=>x+','+y,dirs=[[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
let seed,depth=1,grid,rooms,objects=[],doorObj,stairsObj,player={x:6,y:6,hp:100,maxhp:100,gold:0,bag:[],equip:{}},visited=new Set(),path=[],pending=null,openContainer=null,worldRng,cam={x:0,y:0},zoom=1.2,size={w:0,h:0},lastMove=0,focus={x:6,y:6},mouse={x:0,y:0,down:false},dragSteer=false,opened=false,history=[];
function tile(x,y){return x>=0&&y>=0&&x<N&&y<N?grid[y][x]:null}
function carve(x,y,type='floor'){let t=tile(x,y);if(t){t.solid=false;t.type=type}}
function roomCarve(r,type='floor'){for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)carve(x,y,type)}
function center(r){return{x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2)}}
function hall(a,b,r){let x=a.x,y=a.y;while(x!==b.x||y!==b.y){carve(x,y);if((r()<.5&&x!==b.x)||y===b.y)x+=Math.sign(b.x-x);else y+=Math.sign(b.y-y)}carve(x,y)}
function item(kind,r,label){const base={sword:['Rusty Shortsword','sword','Swordsmanship'],axe:['Worn Hatchet','axe','Lumberjacking'],dagger:['Dull Dagger','dagger','Fencing'],mace:['Cracked Mace','mace','Mace Fighting'],spear:['Bent Spear','spear','Fencing'],bow:['Frayed Bow','bow','Archery'],armor:['Worn Leather Armor','armor','armor'],shield:['Buckler','shield','armor'],helmet:['Leather Cap','helmet','armor'],food:['Loaf of Bread','food','food'],potion:['Lesser Healing Potion','potion','potion'],gold:['Gold Coins','gold','gold']}[kind];return {kind,name:label||base[0],sprite:base[1],skill:base[2],amount:kind==='gold'?Math.floor(r()*26+7):kind==='food'?1+Math.floor(r()*3):1,id:Math.floor(r()*1e9)}}
function makeDungeon(d){depth=d;worldRng=seeded(seed+'|floor|'+d+'|'+VERSION);let r=worldRng;grid=Array.from({length:N},(_,y)=>Array.from({length:N},(_,x)=>({x,y,solid:true,type:'rock',variant:Math.floor(r()*4)})));rooms=[];objects=[];visited=new Set();path=[];pending=null;
 // The cell and its exit are intentionally invariant across all seeds.
 let cell={x:4,y:4,w:5,h:5};roomCarve(cell,'cell');rooms.push(cell);
 for(let k=0;k<180&&rooms.length<17;k++){
  let w=5+Math.floor(r()*7),h=5+Math.floor(r()*7),x=11+Math.floor(r()*(N-14-w)),y=3+Math.floor(r()*(N-6-h));
  let q={x,y,w,h};if(rooms.some(a=>x<a.x+a.w+2&&x+w+2>a.x&&y<a.y+a.h+2&&y+h+2>a.y))continue;
  rooms.push(q);roomCarve(q,r()<.15?'earth':'floor');
 }
 if(rooms.length<5){for(let i=0;i<8;i++){let rr={x:12+i%3*11,y:4+Math.floor(i/3)*13,w:7,h:7};rooms.push(rr);roomCarve(rr)}}
 let nodes=rooms.slice(1);nodes.sort((a,b)=>{let aa=center(a),bb=center(b);return (aa.x+aa.y)-(bb.x+bb.y)});
 let first=nodes.reduce((best,a)=>{let c=center(a);let dist=Math.abs(c.x-10)+Math.abs(c.y-6);return dist<best.dist?{c,dist}:best},{dist:999}).c;
 // keep west cell perimeter closed except at the single intended door
 hall({x:10,y:6},first,r);
 for(let i=1;i<nodes.length;i++){let target=center(nodes[i]),prev=center(nodes[i-1]);hall(prev,target,r)}
 for(let i=1;i<nodes.length-2;i++)if(r()<.3)hall(center(nodes[i]),center(nodes[i+2]),r);
 for(let y=3;y<=9;y++)for(let x=3;x<=9;x++)if(x===9&&y===6)carve(x,y,'door');else if(x===9||x===3||y===3||y===9){let t=tile(x,y);t.solid=true;t.type='rock'}
 // ensure a clear spine from cell door into the wider dungeon
 carve(10,6);hall({x:10,y:6},first,r);
 doorObj={x:9,y:6,type:'door',open:false,name:'Cell Door',sprite:'door'};objects.push(doorObj);
 const lootRng=seeded(seed+'|starting-gear|'+VERSION);
 if(d===1){objects.push({x:7,y:7,type:'corpse',name:'Skeletal Remains',sprite:'skeleton_remains',opened:false,contents:[item(choose(lootRng,['sword','axe','dagger','mace','spear','bow']),lootRng),item(choose(lootRng,['armor','helmet','shield']),lootRng),item(choose(lootRng,['armor','helmet','shield']),lootRng),item('food',lootRng),item('gold',lootRng)]})}
 for(let i=1;i<rooms.length;i++){
  let room=rooms[i];let c=center(room);
  if(r()<.65){let p={x:c.x,y:c.y,type:'chest',sprite:r()<.7?'chest':'crate',name:r()<.5?'Abandoned Chest':'Dusty Supply Crate',opened:false,contents:[]};p.contents=[item(choose(r,['gold','food','potion','armor','sword','axe','shield']),r),...(r()<.6?[item(choose(r,['gold','food','potion','helmet']),r)]:[])];objects.push(p)}
  if(r()<.5){let x=room.x+1+Math.floor(r()*(room.w-2)),y=room.y+1+Math.floor(r()*(room.h-2));objects.push({x,y,type:'scenery',sprite:choose(r,['torch','candles','anvil','statue']),name:'Dungeon Decoration'})}
  if(r()<.55){let x=room.x+Math.floor(r()*room.w),y=room.y+Math.floor(r()*room.h);objects.push({x,y,type:'scenery',sprite:choose(r,['rat','web','corpse']),name:'Something in the Darkness'})}
 }
 let last=rooms[rooms.length-1],sc=center(last);stairsObj={x:sc.x+1,y:sc.y,type:'stairs',name:'Stairs Down',sprite:'stairs'};objects.push(stairsObj);carve(stairsObj.x,stairsObj.y);
 player.x=d===1?6:6;player.y=d===1?6:6;
 if(d>1){player.x=center(rooms[1]).x;player.y=center(rooms[1]).y;log('You descend deeper into the forgotten dungeon.')}
 explore();focus={x:player.x,y:player.y};updatePanels();log('Level '+d+' generated from seed '+seed+'.');updateURL();
}
function updateURL(){try{window.history.replaceState(null,'','?seed='+encodeURIComponent(seed))}catch{}}
function reset(){seed=(seedInput.value||'AVATAR-1980').trim();seedInput.value=seed;player={x:6,y:6,hp:100,maxhp:100,gold:0,bag:[],equip:{}};history=[];eLog.innerHTML='';makeDungeon(1);el('opening').classList.remove('hidden');opened=false}
function log(msg){history.push(msg);if(history.length>100)history.shift();let row=document.createElement('div');let timestamp=document.createElement('time');timestamp.textContent=('0'+new Date().getHours()).slice(-2)+':'+('0'+new Date().getMinutes()).slice(-2);row.append(timestamp,document.createTextNode(msg));eLog.prepend(row);el('status').textContent=msg}
function explore(){for(let y=player.y-9;y<=player.y+9;y++)for(let x=player.x-9;x<=player.x+9;x++){if(tile(x,y)&&Math.hypot(x-player.x,y-player.y)<9.7)visited.add(key(x,y))}}
function at(x,y){return objects.filter(o=>o.x===x&&o.y===y)}
function passable(x,y){let t=tile(x,y);if(!t||t.solid)return false;return !at(x,y).some(o=>o.type==='door'&&!o.open)}
function neighbors(x,y){return dirs.filter(([dx,dy])=>passable(x+dx,y+dy)&&(!dx||!dy||(passable(x+dx,y)&&passable(x,y+dy)))).map(([dx,dy])=>[x+dx,y+dy])}
function route(sx,sy,tx,ty){let q=[[sx,sy]],prev=new Map([[key(sx,sy),null]]),end=key(tx,ty);for(let i=0;i<q.length&&i<3500;i++){let [x,y]=q[i],id=key(x,y);if(id===end)break;for(let [nx,ny] of neighbors(x,y)){let k=key(nx,ny);if(!prev.has(k)){prev.set(k,id);q.push([nx,ny])}}}if(!prev.has(end))return[];let out=[],cur=end;while(cur!==key(sx,sy)){let [x,y]=cur.split(',').map(Number);out.unshift({x,y});cur=prev.get(cur)}return out}
function followTo(x,y,action){if(!tile(x,y))return;let dst=passable(x,y)?{x,y}:null;if(!dst){let targets=dirs.map(([dx,dy])=>({x:x+dx,y:y+dy})).filter(p=>passable(p.x,p.y)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));dst=targets[0]}if(!dst)return;path=route(player.x,player.y,dst.x,dst.y);pending=action||null;if(!path.length&&action)action()}
function step(dx,dy){if(passable(player.x+dx,player.y+dy)&&(!dx||!dy||(passable(player.x+dx,player.y)&&passable(player.x,player.y+dy)))){player.x+=dx;player.y+=dy;path=[];explore();updateHud();return true}let blocker=at(player.x+dx,player.y+dy).find(o=>o.type==='door'&&!o.open);if(blocker){blocker.open=true;log('You push open the unlocked door.')}return false}
function updateHud(){el('pos').textContent='FLOOR '+depth+' · '+player.x+','+player.y;el('location').textContent=player.x<=9&&player.y<=9?'THE PRISON CELL':depth>1?'THE LOWER DEPTHS':'THE FORGOTTEN PRISON'}
function nearestAction(){let opts=objects.filter(o=>o.type!=='scenery'&&Math.max(Math.abs(player.x-o.x),Math.abs(player.y-o.y))<=2).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));if(opts.length)interact(opts[0]);else log('Nothing nearby to interact with.')}
function interact(o){if(!o)return;if(Math.max(Math.abs(player.x-o.x),Math.abs(player.y-o.y))>2){followTo(o.x,o.y,()=>interact(o));return}if(o.type==='door'){o.open=!o.open;log(o.open?'The cell door swings open. It was unlocked.':'You close the cell door.');return}if(o.type==='stairs'){if(depth>=5){log('The lower halls have not yet been built beyond the fifth floor.');return}makeDungeon(depth+1);return}if(o.type==='corpse'||o.type==='chest'){o.opened=true;openLoot(o)}}
function openLoot(o){openContainer=o;el('modalTitle').textContent=o.name;el('modalSub').textContent=o.type==='corpse'?'The remains of an unlucky prisoner. You search for anything useful.':'Dust settles as you inspect the container.';renderLoot();el('modal').classList.remove('hidden')}
function renderLoot(){let box=el('modalItems');box.replaceChildren();if(!openContainer.contents.length){box.textContent='This container is empty.';el('takeAll').disabled=true;return}el('takeAll').disabled=false;openContainer.contents.forEach((it,n)=>{let div=document.createElement('div');div.className='loot-row';let im=document.createElement('img');im.src='assets/'+it.sprite+'.png';let sp=document.createElement('span');sp.textContent=it.name+(it.amount>1?' ×'+it.amount:'');let b=document.createElement('button');b.textContent='TAKE';b.addEventListener('click',()=>{take(openContainer,n);renderLoot()});div.append(im,sp,b);box.append(div)})}
function take(c,n){let it=c.contents.splice(n,1)[0];if(!it)return;if(it.kind==='gold'){player.gold+=it.amount;log('You collect '+it.amount+' gold coins.')}else{player.bag.push(it);log('You take '+it.name+'.')}updatePanels()}
function equip(it){if(it.kind==='food'){player.hp=Math.min(player.maxhp,player.hp+8);player.bag.splice(player.bag.indexOf(it),1);log('You eat '+it.name+'.');updatePanels();return}if(it.kind==='potion'){player.hp=Math.min(player.maxhp,player.hp+30);player.bag.splice(player.bag.indexOf(it),1);log('You drink '+it.name+'.');updatePanels();return}let slot=['armor','helmet','shield'].includes(it.kind)?it.kind:'weapon',old=player.equip[slot];if(old)player.bag.push(old);player.equip[slot]=it;player.bag.splice(player.bag.indexOf(it),1);log('You equip '+it.name+'.');updatePanels()}
function updatePanels(){el('gold').textContent=player.gold+' GOLD';el('health').textContent=player.hp+' / '+player.maxhp;el('healthBar').style.width=(player.hp/player.maxhp*100)+'%';const eq=el('equipment');eq.replaceChildren();for(let slot of ['weapon','armor','helmet','shield']){let box=document.createElement('div');box.className='slot';let it=player.equip[slot];box.title=it?it.name+' (click to unequip)':slot;if(it){let im=document.createElement('img');im.src='assets/'+it.sprite+'.png';box.append(im);box.style.cursor='pointer';box.addEventListener('click',()=>{player.bag.push(it);delete player.equip[slot];updatePanels();log('You remove '+it.name+'.')})}let small=document.createElement('small');small.textContent=slot.toUpperCase();box.append(small);eq.append(box)}let inv=el('inventory');inv.replaceChildren();if(player.bag.length===0){let span=document.createElement('span');span.className='empty-inv';span.textContent='Your backpack is empty.';inv.append(span)}else player.bag.forEach(it=>{let b=document.createElement('button');b.className='inv-item';b.title=it.name+' — click to use/equip';let im=document.createElement('img');im.src='assets/'+it.sprite+'.png';b.append(im);if(it.amount>1){let n=document.createElement('em');n.textContent='×'+it.amount;b.append(n)}b.addEventListener('click',()=>equip(it));inv.append(b)});updateHud()}
let sk=[['Swordsmanship',0],['Fencing',0],['Mace Fighting',0],['Archery',0],['Tactics',0],['Anatomy',0],['Healing',0],['Magery',0],['Parrying',0],['Resisting Spells',0]];el('skilllist').innerHTML=sk.map(([name,n])=>'<div class="skill-row"><span>'+name+'</span><b>'+n+' / 100</b></div>').join('');
function resize(){let r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);size.w=r.width;size.h=r.height;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false}window.addEventListener('resize',resize);
function groundXY(x,y){return{x:(x-y)*TILE,y:(x+y)*TILE}}
function screenXY(x,y){let p=groundXY(x,y);return{x:(p.x-cam.x)*zoom+size.w*.5,y:(p.y-cam.y)*zoom+size.h*.51}}
function worldXY(px,py){let wx=(px-size.w*.5)/zoom+cam.x,wy=(py-size.h*.51)/zoom+cam.y;return{x:Math.floor((wx+wy)/(TILE*2)+.5),y:Math.floor((wy-wx)/(TILE*2)+.5)}}
function drawSprite(name,x,y,scale=1,offset=0,alpha=1){let im=sprites[name];if(!im||!im.complete||!im.naturalWidth)return;let p=screenXY(x,y),w=im.width*zoom*scale,h=im.height*zoom*scale;ctx.globalAlpha=alpha;ctx.drawImage(im,Math.round(p.x-w/2),Math.round(p.y-h/2-offset*zoom),w,h);ctx.globalAlpha=1}
function render(){let target=groundXY(player.x,player.y);cam.x+=(target.x-cam.x)*.12;cam.y+=(target.y-cam.y)*.12;ctx.clearRect(0,0,size.w,size.h);ctx.save();ctx.beginPath();ctx.rect(0,0,size.w,size.h);ctx.clip();
 let scene=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){if(!visited.has(key(x,y)))continue;let p=screenXY(x,y);if(p.x<-130||p.x>size.w+130||p.y<-165||p.y>size.h+140)continue;let t=tile(x,y);scene.push({x,y,t,p})}
 scene.sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.x-b.x);
 for(let z of scene){let {x,y,t,p}=z;let dist=Math.hypot(player.x-x,player.y-y);let alpha=dist>9?.12:dist>7?.45:1;if(t.solid){drawSprite('floor_stone3',x,y,1,0,.35*alpha)}else{let spr=t.type==='cell'?'floor_stone2':t.type==='earth'?'floor_earth':(['floor_stone2','floor_stone3','floor_stone2','floor_stone3'][t.variant]);drawSprite(spr,x,y,1,0,alpha)}}
 for(let z of scene){let {x,y,t}=z,dist=Math.hypot(player.x-x,player.y-y),alpha=dist>9?.08:dist>7?.45:1;
 if(t.solid){let exposed=dirs.slice(0,4).some(([dx,dy])=>tile(x+dx,y+dy)&&!tile(x+dx,y+dy).solid);if(exposed)drawSprite(t.variant===0?'wall_dark':'wall',x,y,1,10,alpha);}
 for(let o of at(x,y)){if(o.type==='door'){drawSprite(o.open?'wall_side':'door',x,y,1,25,alpha)}else if(o.type==='scenery'){drawSprite(o.sprite,x,y,1,o.sprite==='torch'?18:8,alpha)}else if(o.type==='stairs'){drawSprite('stairs',x,y,1,12,alpha)}else{drawSprite(o.sprite,x,y,o.type==='corpse'?1.0:.86,o.type==='corpse'?5:14,alpha);if(!o.opened||o.contents.length){let p=screenXY(x,y);ctx.fillStyle='#e1c07c';ctx.fillRect(p.x-2,p.y-43*zoom,4,4)}}}
 if(x===player.x&&y===player.y){let pp=screenXY(x,y);ctx.fillStyle='rgba(238,203,116,0.32)';ctx.beginPath();ctx.ellipse(pp.x,pp.y+8*zoom,15*zoom,7*zoom,0,0,Math.PI*2);ctx.fill();drawSprite('avatar',x,y,1,24,1)}
 }
 if(path.length){let p=screenXY(path[path.length-1].x,path[path.length-1].y);ctx.strokeStyle='rgba(211,172,97,0.75)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,7,0,7);ctx.stroke()}
 ctx.restore();requestAnimationFrame(render)}
function advance(){let now=performance.now();if(now-lastMove<145)return;if(dragSteer){let c={x:size.w*.5,y:size.h*.51},dx=(mouse.x-c.x),dy=(mouse.y-c.y);if(Math.hypot(dx,dy)>30){let xx=(dx+dy)/2,yy=(dy-dx)/2,m=Math.max(Math.abs(xx),Math.abs(yy));step(Math.round(xx/m),Math.round(yy/m));lastMove=now;return}}
 if(path.length){let p=path.shift();if(passable(p.x,p.y)){player.x=p.x;player.y=p.y;explore();updateHud()}else{path=[];pending=null}lastMove=now;if(!path.length&&pending){let a=pending;pending=null;a()}}
}setInterval(advance,25);
function coords(e){let r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
// Hit-test visible object sprites, not just their ground tiles. Tall UO artwork
// extends far beyond its floor anchor, particularly doors and containers.
function objectAtScreen(mx,my){
 let candidates=[];
 for(const o of objects){
  if(!visited.has(key(o.x,o.y)))continue;
  const im=sprites[o.sprite];if(!im||!im.naturalWidth)continue;
  const p=screenXY(o.x,o.y);
  const scale=(o.type==='corpse'?1:o.type==='chest'?.86:1);
  const off=(o.type==='door'?25:o.type==='stairs'?12:o.type==='corpse'?5:14);
  const w=im.width*zoom*scale,h=im.height*zoom*scale;
  // Same origin and anchor as drawSprite(). Give small artwork a generous target.
  const bx=p.x-w/2,by=p.y-h/2-off*zoom;
  const pad=o.type==='corpse'?13:Math.min(8,Math.max(3,8*zoom));
  if(mx>=bx-pad&&mx<=bx+w+pad&&my>=by-pad&&my<=by+h+pad){
    // Prefer the closest drawn feature when objects visually overlap.
    let nx=Math.max(bx,Math.min(mx,bx+w)),ny=Math.max(by,Math.min(my,by+h));
    const distance=Math.hypot(mx-nx,my-ny);
    candidates.push({o,score:distance*100+Math.hypot(mx-(bx+w/2),my-(by+h/2))});
  }
 }
 candidates.sort((a,b)=>a.score-b.score);
 return candidates[0]?.o||null;
}
let lastSelected=null;
canvas.addEventListener('pointerdown',e=>{
 if(!opened)return;mouse=coords(e);
 if(e.button===2){dragSteer=true;canvas.setPointerCapture(e.pointerId);path=[];pending=null;return}
 if(e.button!==0)return;
 let ob=objectAtScreen(mouse.x,mouse.y);
 if(ob){
  // Classic UO: single-click identifies; double-click uses/opens.
  if(e.detail>=2){path=[];pending=null;interact(ob)}
  else{lastSelected=ob;log('You see '+ob.name+'. Double-click to interact.')}
  return;
 }
 let p=worldXY(mouse.x,mouse.y);
 if(e.detail>=2){const groundObject=at(p.x,p.y).find(o=>o.type!=='scenery');if(groundObject){interact(groundObject);return}}
 followTo(p.x,p.y);
});
canvas.addEventListener('pointermove',e=>{mouse=coords(e)});canvas.addEventListener('pointerup',e=>{if(e.button===2)dragSteer=false});canvas.addEventListener('pointercancel',()=>dragSteer=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.6,Math.min(2.6,zoom+(e.deltaY<0?.1:-.1)));el('zoomLabel').textContent=Math.round(zoom*100)+'%'},{passive:false});

window.addEventListener('keydown',e=>{if(document.activeElement===seedInput)return;if(e.key==='Escape'){el('modal').classList.add('hidden');el('help').classList.add('hidden');return}if(!opened)return;if(e.key==='e'||e.key==='E'){nearestAction();return}if(e.key==='Tab'){e.preventDefault();let tabs=[...document.querySelectorAll('.tab')];let ix=tabs.findIndex(t=>t.classList.contains('selected'));tabs[(ix+1)%tabs.length].click();return}});
for(let b of document.querySelectorAll('.tab'))b.addEventListener('click',()=>{for(let x of document.querySelectorAll('.tab'))x.classList.toggle('selected',x===b);for(let x of document.querySelectorAll('.tab-pane'))x.classList.toggle('hidden',x.id!==b.dataset.tab)});
el('newButton').addEventListener('click',reset);el('randomSeed').addEventListener('click',()=>{seedInput.value='AVATAR-'+Math.floor(Math.random()*1e9).toString().padStart(9,'0')});el('copySeed').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(seedInput.value);log('Seed copied to clipboard.')}catch{seedInput.select();log('Select and copy the seed shown in the box.')}});
el('beginButton').addEventListener('click',()=>{el('opening').classList.add('hidden');opened=true;log('You awaken in an unlocked cell. A skeleton lies nearby. Double-click it to search.')});
el('closeModal').addEventListener('click',()=>el('modal').classList.add('hidden'));el('takeAll').addEventListener('click',()=>{if(!openContainer)return;while(openContainer.contents.length)take(openContainer,0);renderLoot()});el('modal').addEventListener('click',e=>{if(e.target===el('modal'))el('modal').classList.add('hidden')});
el('helpButton').addEventListener('click',()=>el('help').classList.remove('hidden'));el('closeHelp').addEventListener('click',()=>el('help').classList.add('hidden'));el('helpDone').addEventListener('click',()=>el('help').classList.add('hidden'));
resize();reset();requestAnimationFrame(render);
})();
