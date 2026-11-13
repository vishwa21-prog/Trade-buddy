const socket=io();
const $=id=>document.getElementById(id);
let mySlot=null, roomCode='', latest=null;
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
$('joinForm').addEventListener('submit',e=>{
 e.preventDefault();
 socket.emit('join',{room:$('room').value,name:$('name').value},res=>{
  if(res.error)return alert(res.error);
  mySlot=res.slot;roomCode=res.room;
  $('join').hidden=true;$('game').hidden=false;$('roomTag').hidden=false;$('roomTag').textContent='Room '+roomCode;
 });
});
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);$('copy').textContent='Copied!';setTimeout(()=>$('copy').textContent='Copy room code',1500)}catch{prompt('Copy this code:',roomCode)}};
function action(a){if(mySlot!==null)socket.emit('action',a)}
['accept','more','reject'].forEach(a=>$(a).onclick=()=>action(a));
function offerHTML(item,slot){
 const mine=slot===mySlot;
 return `<div class="offer"><div><img src="${item.image}" alt="${escapeHTML(item.name)}"><div class="itemname">${escapeHTML(item.name)}</div>${mine?`<button class="remove" data-remove="${item.id}">Remove</button>`:''}</div><div class="vertical"><button class="accept" data-action="accept" title="Accept" ${!latest?.players[1]||!latest?.players[0]?'disabled':''}>✓</button><button class="more" data-action="more" title="Ask for one more" ${!latest?.players[1]||!latest?.players[0]?'disabled':''}>+</button><button class="reject" data-action="reject" title="Reject" ${!latest?.players[1]||!latest?.players[0]?'disabled':''}>×</button></div></div>`;
}
socket.on('state',state=>{
 latest=state;
 const both=state.players.every(Boolean), hasOffers=state.offers.every(a=>a.length>0);
 $('status').textContent=both?'Both players connected 🟢':'Waiting for your friend to join…';
 $('notice').textContent=state.notice||'Add an item to begin trading.';
 if(state.request===mySlot)$('notice').textContent='Your friend requests another item. Add one or reject the trade.';
 for(let i=0;i<2;i++){
  $('p'+i).textContent=(state.players[i]?.name||`Player ${i+1}`)+(i===mySlot?' (you)':'');
  $('ready'+i).textContent=state.accepted[i]?'✓ Accepted':state.players[i]?'Online':'Waiting';
  $('ready'+i).classList.toggle('yes',!!state.accepted[i]);
  $('drop'+i).classList.toggle('disabled',i!==mySlot);
  $('offer'+i).innerHTML=state.offers[i].map(item=>offerHTML(item,i)).join('')||'<div class="empty">No items offered yet</div>';
 }
 const cart=state.players[mySlot]?.cart||[];
 $('cartCount').textContent=cart.length;
 $('cartItems').innerHTML=cart.length?cart.map(item=>`<button class="cartitem" data-reuse="${item.id}" title="Add to your offer"><img src="${item.image}" alt=""><span>${escapeHTML(item.name)}<br><small>Tap to trade again ↗</small></span></button>`).join(''):'<div class="empty">No items yet</div>';
 $('accept').disabled=!both||!hasOffers;
 $('more').disabled=!both||!state.offers.some(a=>a.length);
 $('reject').disabled=!both||!state.offers.some(a=>a.length);
 $('hint').textContent=!both?'Share your room code with your friend.':!hasOffers?'Both players need to offer at least one item.':'Both players must accept the same offer to complete the trade.';
});
document.addEventListener('click',e=>{
 const a=e.target.closest('[data-action]');if(a){action(a.dataset.action);return;}
 const rem=e.target.closest('[data-remove]');if(rem){socket.emit('remove',rem.dataset.remove);return;}
 const reuse=e.target.closest('[data-reuse]');if(reuse)socket.emit('reuse',reuse.dataset.reuse);
});
async function upload(file){
 if(!file||!file.type.startsWith('image/'))return alert('Please choose an image.');
 try{
  const bitmap=await createImageBitmap(file);
  const max=850,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const image=canvas.toDataURL('image/jpeg',.75);
  if(image.length>3900000)return alert('Image is too large. Try a smaller picture.');
  socket.emit('add',{image,name:file.name.replace(/\.[^.]+$/,'').slice(0,48)});
 }catch(err){alert('Could not open this image. Try JPG or PNG.');}
}
for(let i=0;i<2;i++){
 const drop=$('drop'+i),input=$('file'+i);
 drop.onclick=()=>{if(mySlot===i)input.click()};
 input.onchange=()=>{upload(input.files[0]);input.value=''};
 drop.ondragover=e=>{if(mySlot!==i)return;e.preventDefault();drop.classList.add('drag')};
 drop.ondragleave=()=>drop.classList.remove('drag');
 drop.ondrop=e=>{if(mySlot!==i)return;e.preventDefault();drop.classList.remove('drag');upload(e.dataTransfer.files[0])};
}
socket.on('disconnect',()=>{if(mySlot!==null){$('status').textContent='Disconnected. Refresh to reconnect.';$('notice').textContent='Connection lost. Refresh the page to join again.'}});
