import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,validateOrder} from '../server.js';
const order={po:'PO-1042',contactId:'saul-aguilera',shipTo:'Richmond VA Bulk',deliveryDate:'2099-11-15',quantities:{'L8-68383':60,'L8870_U':75}};
test('validates quantities, dates, locations and authoritative product prices',()=>{
 const result=validateOrder(order);
 assert.equal(result.lines.length,2);
 assert.equal(result.lines.reduce((sum,p)=>sum+p.totalCents,0),38010);
 for(const change of [{po:''},{shipTo:'Unknown'},{deliveryDate:'2026-02-30'},{deliveryDate:'2000-01-01'},{quantities:{}},{quantities:{'L8-68383':1.5}},{quantities:{'L8-68383':-1}},{quantities:{'unknown':1}}])assert.throws(()=>validateOrder({...order,...change}));
});
async function run(options,fn){const server=createServer(options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{await fn(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(resolve=>server.close(resolve));}}
const post=(url,body=order,key='12345678-1234-1234-1234-123456789abc')=>fetch(`${url}/api/orders`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
test('serves form and submits only to test recipient; repeated submit is deduplicated',async()=>{
 const sent=[];
 await run({apiKey:'test-only',from:'orders@example.com',testRecipient:'tester@example.com',sendEmail:async m=>sent.push(m)},async url=>{
  const page=await(await fetch(`${url}/handcraft`)).text();
  assert.match(page,/Submit order/);
  for(const sku of ['L8-68383','L1216-170','c1070-5481','L8870_U'])assert.ok(page.includes(sku));
  assert.match(page,/Universal Gown/);
  assert.match(page,/Flannel Blanket/);
  assert.match(page,/Drawsheet/);
  assert.match(page,/Wash Cloth/);
  assert.equal((page.match(/aria-label="Quantity for /g)||[]).length,4);
  const catalog=await(await fetch(`${url}/api/customer`)).json();
  assert.equal(catalog.products.length,4);assert.equal(catalog.email,undefined);
  const response=await post(url);assert.equal(response.status,200);
  const result=await response.json();assert.ok(result.id);
  assert.deepEqual((await(await post(url)).json()),result);assert.equal(sent.length,1);
  assert.deepEqual(sent[0].to,['tester@example.com']);
  assert.match(sent[0].subject,/^\[TEST\]/);
  assert.match(sent[0].html,/Handcraft Order Confirmation/);
  assert.match(sent[0].html,/Total pallets/);
  assert.match(sent[0].html,/\$380.10/);
  assert.match(sent[0].text,/Total: \$380.10/);
  assert.match(sent[0].text,/Total pallets: 0.188/);
  assert.equal((await post(url,{...order,po:'changed'})).status,409);
 });
});
test('missing email setup never reports a successful order',async()=>{
 await run({apiKey:'',from:''},async url=>{const response=await post(url);assert.equal(response.status,503);assert.match((await response.json()).error,/has not been sent/);});
});
test('provider failure is reported and the same order can be retried',async()=>{
 let count=0;
 await run({apiKey:'test',from:'orders@example.com',testRecipient:'tester@example.com',sendEmail:async()=>{if(++count===1)throw Error('provider unavailable');}},async url=>{
  assert.equal((await post(url)).status,502);
  assert.equal((await post(url)).status,200);
 });
});
test('missing test recipient blocks sending even when email credentials exist',async()=>{
 let sent=false;
 await run({apiKey:'test',from:'orders@example.com',testRecipient:'',sendEmail:async()=>{sent=true;}},async url=>{
  assert.equal((await post(url)).status,503);assert.equal(sent,false);
 });
});

test('each contact resolves trusted location/email and test notifications remain restricted',async()=>{
 const contacts=[
  ['saul-aguilera','Saul Aguilera','saulaguilera@handcraftservices.com','Richmond VA Bulk'],
  ['ringo-tetteh-quaye','Ringo Tetteh Quaye','RingoTettehQuaye@handcraftservices.com','Martinsburg WV Bulk'],
  ['clinton-wright','Clinton Wright','clintonwright@handcraftservices.com','High Point NC Bulk']
 ];
 const sent=[];
 await run({apiKey:'test',from:'orders@example.com',testRecipient:'tester@example.com',sendEmail:async message=>sent.push(message)},async url=>{
  for(const [i,[contactId,name,email,location]] of contacts.entries()){
   const body={...order,contactId,customerEmail:'untrusted@example.com'};
   delete body.shipTo;
   const validated=validateOrder(body);
   assert.equal(validated.contact.email,email);
   assert.equal(validated.shipTo,location);
   const response=await post(url,body,`contact-test-000000000000-${i}`);
   assert.equal(response.status,200);
   assert.deepEqual(sent[i].to,['tester@example.com']);
   assert.equal(sent[i].cc,undefined);assert.equal(sent[i].bcc,undefined);
   assert.ok(sent[i].html.includes(name));assert.ok(sent[i].html.includes(location));
   assert.ok(sent[i].text.includes(`Contact: ${name}`));
  }
  const catalog=await(await fetch(`${url}/api/customer`)).json();
  assert.equal(catalog.contacts.length,3);
  for(const contact of catalog.contacts)assert.equal(contact.email,undefined);
 });
 assert.throws(()=>validateOrder({...order,contactId:'unknown'}),/contact person/);
 assert.throws(()=>validateOrder({...order,contactId:'ringo-tetteh-quaye'}),/must match/);
});
