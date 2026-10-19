import {calculatePackaging, formatPackCount, roundToWholeCases} from './packing.js';
const $=id=>document.getElementById(id);
function submissionKey(){
 const bytes=new Uint8Array(16);
 crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
let key=submissionKey();
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',useGrouping:true}).format(value);
const rows=[...document.querySelectorAll('.product')];
const inputs=new Map(rows.map(row=>[row.dataset.id,row.querySelector('.quantity')]));
function packConfig(row){return {piecesPerUnit:Number(row.dataset.piecesPerUnit),piecesPerCase:Number(row.dataset.piecesPerCase),casesPerPallet:Number(row.dataset.casesPerPallet)};}
function quantities(){return Object.fromEntries(rows.map(row=>[row.dataset.id,row.querySelector('.product-select').checked?roundToWholeCases(Number(inputs.get(row.dataset.id).value || 0),packConfig(row)):0]));}
function update(){
 const q=quantities();
 $('totalPallets').textContent=formatPackCount(rows.reduce((sum,row)=>sum+calculatePackaging(q[row.dataset.id],packConfig(row)).pallets,0));
 $('total').textContent=money(rows.reduce((sum,row)=>sum+Math.round(Number(row.dataset.price)*100)*q[row.dataset.id],0)/100);
 for(const row of rows){
  const quantity=q[row.dataset.id];
  const output=row.querySelector('.packing-totals');
  const input=inputs.get(row.dataset.id);
  const unit=Number(row.dataset.piecesPerUnit)===12?'dozen':'pieces';
  const raw=Number(input.value || 0);
  const error=!Number.isSafeInteger(raw) || raw<0 || quantity>Number(input.max || 999999) ? 'Enter a whole-number quantity within the allowed range.' : '';
  input.setCustomValidity(error);
  if(error){output.textContent=error;continue;}
  const packing=calculatePackaging(quantity,{
   piecesPerUnit:Number(row.dataset.piecesPerUnit),
   piecesPerCase:Number(row.dataset.piecesPerCase),
   casesPerPallet:Number(row.dataset.casesPerPallet)
  });
  output.textContent=`Cases: ${formatPackCount(packing.cases)} · Pallets: ${formatPackCount(packing.pallets)}`;
  const requested=Number(row.dataset.requestedQuantity ?? raw);
  const notice=row.querySelector('.rounding-note');
  notice.textContent=quantity>requested && row.querySelector('.product-select').checked ? `Rounded up from ${requested.toLocaleString('en-US')} to ${quantity.toLocaleString('en-US')} ${unit} for full cases.` : '';
 }
}
$('deliveryDate').min=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
function updateLocation(){
 $('shipTo').value=$('contact').selectedOptions[0]?.dataset.location || '';
}
$('contact').addEventListener('change',updateLocation);
updateLocation();
for(const row of rows){
 const quantity=row.querySelector('.quantity');
 const checkbox=row.querySelector('.product-select');
 quantity.addEventListener('input',()=>{row.dataset.requestedQuantity=quantity.value;checkbox.checked=Number(quantity.value)>0;update();});
 quantity.addEventListener('change',()=>{
  const raw=Number(quantity.value || 0);
  if(Number.isSafeInteger(raw) && raw>=0 && raw<=Number(quantity.max || 999999))quantity.value=String(roundToWholeCases(raw,packConfig(row)));
  update();
 });
 checkbox.addEventListener('change',()=>{
  delete row.dataset.requestedQuantity;
  if(checkbox.checked && Number(quantity.value || 0)===0)quantity.value=String(Number(row.dataset.piecesPerCase)/Number(row.dataset.piecesPerUnit));
  update();
 });
}
$('submit').disabled=false;
$('order').addEventListener('input',()=>{key=submissionKey();});
$('order').addEventListener('submit',async event=>{
 event.preventDefault();
 const rounded=quantities();
 for(const row of rows)if(row.querySelector('.product-select').checked)inputs.get(row.dataset.id).value=String(rounded[row.dataset.id]);
 update();
 if(!Object.values(rounded).some(quantity=>quantity>0)){
  $('status').textContent='Enter a quantity for at least one product.';$('status').className='error';$('status').focus();return;
 }
 if($('order').dataset.preview==='true'){
  $('status').textContent='Order checked. This is a preview, so no order or email was sent. Email delivery must be configured before sending test orders to Robert Horowitz.';
  $('status').className='preview-message';$('status').focus();return;
 }
 $('submit').disabled=true;$('status').textContent='Sending your order…';
 try {
  const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({po:$('po').value,contactId:$('contact').value,shipTo:$('shipTo').value,deliveryDate:$('deliveryDate').value,quantities:quantities()})});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Order sending is unavailable from this page. No order confirmation was received. Please contact Robert Horowitz.');
  const result=await response.json();if(!response.ok)throw Error(result.error || 'We could not send your order. Please try again later.');
  $('status').textContent=`Thank you! ${result.message} Reference: ${result.id}`;
  $('status').className='success';$('submit').textContent='Order sent ✓';
  for(const input of $('order').querySelectorAll('input,select'))input.disabled=true;
 }catch(error){$('status').textContent=error instanceof TypeError ? 'Unable to connect to the order service. No order confirmation was received. Please try again later.' : error.message || 'Connection interrupted. Please try again.';$('status').className='error';$('submit').disabled=false;}
 $('status').focus();
});
