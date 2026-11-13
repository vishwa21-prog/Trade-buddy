const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 5e6 });
app.use(express.static('public'));
app.get('/health', (_, res) => res.json({ ok: true }));
const rooms = new Map();
const safe = x => String(x || '').trim().slice(0, 48);
function snapshot(r) { return { players: r.players.map(p => p && ({name:p.name, online:!!p.sid, cart:p.cart})), offers:r.offers, accepted:r.accepted, request:r.request, notice:r.notice }; }
function emit(r) { io.to(r.code).emit('state', snapshot(r)); }
function reset(r) { r.accepted=[false,false]; r.request=null; }
function returnOffers(r) { r.offers.forEach((items,i) => items.forEach(item => { if(item.fromCart && r.players[i]) r.players[i].cart.push(item); })); r.offers=[[],[]]; reset(r); }
function getRoom(s) { const r=rooms.get(s.data.room), i=s.data.slot; return r && r.players[i]?.sid===s.id ? [r,i] : []; }
io.on('connection', s => {
 s.on('join', (data={}, reply=()=>{}) => {
  if(s.data.room) return reply({error:'Already joined a room'});
  const code=safe(data.room).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
  const name=safe(data.name) || 'Player';
  if(code.length<3) return reply({error:'Use a room code with at least 3 letters or numbers'});
  let r=rooms.get(code);
  if(!r) {r={code,players:[null,null],offers:[[],[]],accepted:[false,false],request:null,notice:'Waiting for your friend…'};rooms.set(code,r);}
  const slot=r.players.findIndex(p=>!p);
  if(slot===-1) return reply({error:'Room is full. Use another code.'});
  r.players[slot]={sid:s.id,name,cart:[]}; s.data.room=code; s.data.slot=slot; s.join(code);
  r.notice=`${name} joined the room`; reply({room:code,slot}); emit(r);
 });
 s.on('add', data => {
  const [r,i]=getRoom(s); if(!r) return;
  const image=data?.image;
  if(typeof image!=='string'||image.length>4000000||!/^data:image\/(png|jpeg|webp|gif);base64,/.test(image)) return;
  r.offers[i].push({id:crypto.randomUUID(),image,name:safe(data.name)||'Item',fromCart:false});
  reset(r);r.notice=`${r.players[i].name} added an item`;emit(r);
 });
 s.on('reuse', id => {
  const [r,i]=getRoom(s);if(!r)return;
  const k=r.players[i].cart.findIndex(x=>x.id===id);if(k<0)return;
  const [item]=r.players[i].cart.splice(k,1);r.offers[i].push({...item,fromCart:true});
  reset(r);r.notice=`${r.players[i].name} added an item from cart`;emit(r);
 });
 s.on('remove', id => {
  const [r,i]=getRoom(s);if(!r)return;
  const k=r.offers[i].findIndex(x=>x.id===id);if(k<0)return;
  const [item]=r.offers[i].splice(k,1);if(item.fromCart)r.players[i].cart.push(item);
  reset(r);r.notice=`${r.players[i].name} removed an item`;emit(r);
 });
 s.on('action', a => {
  const [r,i]=getRoom(s);if(!r||!r.players[0]||!r.players[1])return;
  if(a==='reject'){returnOffers(r);r.notice=`${r.players[i].name} cancelled the trade`;}
  else if(a==='more') {reset(r);r.request=1-i;r.notice=`${r.players[i].name} requests another item`;}
  else if(a==='accept') {
   if(!r.offers[0].length||!r.offers[1].length)return;
   r.accepted[i]=true;r.request=null;r.notice=`${r.players[i].name} accepted the offer`;
   if(r.accepted.every(Boolean)){
    const left=r.offers[0],right=r.offers[1];
    r.players[0].cart.push(...right.map(x=>({...x,fromCart:true})));
    r.players[1].cart.push(...left.map(x=>({...x,fromCart:true})));
    r.offers=[[],[]];reset(r);r.notice='Trade complete! Items moved to your carts 🎉';
   }
  } else return;
  emit(r);
 });
 s.on('disconnect', () => {
  const [r,i]=getRoom(s);if(!r)return;
  returnOffers(r);r.players[i]=null;r.notice='A player disconnected. The current trade was cancelled.';
  emit(r);
  if(!r.players.some(Boolean)) rooms.delete(r.code);
 });
});
const PORT=Number(process.env.PORT)||3001;
server.listen(PORT,'0.0.0.0',()=>console.log(`TradeBuddy running at http://localhost:${PORT}`));
server.on('error',err=>{console.error('Could not start server:',err.message);process.exitCode=1;});
