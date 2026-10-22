import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOrderHandler} from '../netlify/functions/orders.mjs';

const body={po:'NETLIFY-TEST',contactId:'ringo-tetteh-quaye',deliveryDate:'2099-11-15',quantities:{'L8-68383':61},to:'customer@example.com',cc:'other@example.com',bcc:'hidden@example.com'};
const request=(data=body,key='netlify-test-000000000001',origin='https://orders.example.com')=>new Request('https://orders.example.com/api/orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key,Origin:origin},body:JSON.stringify(data)});

test('Netlify handler sends a formatted whole-case order only to Robert and deduplicates retries',async()=>{
 const sent=[];
 const handler=createOrderHandler({apiKey:'test',from:'onboarding@resend.dev',recipientSetting:'rhorowitz@georgecourey.com',fetchEmail:async(url,options)=>{sent.push({url,...options});return new Response('{}',{status:200});}});
 const response=await handler(request(),{ip:'test-ip'});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal((await handler(request(),{ip:'test-ip'})).status,200);
 assert.equal(sent.length,1);
 const message=JSON.parse(sent[0].body);
 assert.deepEqual(message.to,['rhorowitz@georgecourey.com']);
 assert.equal(message.subject,'Order request — Handcraft Linen Service');
 assert.doesNotMatch(message.html,/TEST ORDER|test recipient/);
 assert.equal(message.cc,undefined);assert.equal(message.bcc,undefined);
 assert.match(message.html,/Ringo Tetteh Quaye/);assert.match(message.html,/Martinsburg WV Bulk/);
 assert.match(message.html,/>120<\/td>/);assert.match(message.html,/\$499.20/);
 assert.ok(message.html.includes(result.id));
 assert.equal(sent[0].headers['Idempotency-Key'],'netlify-test-000000000001');
 assert.equal((await handler(request({...body,po:'CHANGED'}),{ip:'test-ip'})).status,409);
});

test('Netlify handler never sends with missing credentials, wrong recipient setting or invalid orders',async()=>{
 let sent=0;const fetchEmail=async()=>{sent++;return new Response('{}');};
 assert.equal((await createOrderHandler({apiKey:'',fetchEmail})(request())).status,503);
 assert.equal((await createOrderHandler({apiKey:'test',recipientSetting:'customer@example.com',fetchEmail})(request())).status,503);
 const handler=createOrderHandler({apiKey:'test',recipientSetting:'rhorowitz@georgecourey.com',fetchEmail});
 assert.equal((await handler(request({...body,contactId:'unknown'}))).status,400);
 assert.equal((await handler(request(body,undefined,'https://other.example.com'))).status,403);
 assert.equal((await handler(new Request('https://orders.example.com/api/orders'))).status,405);
 assert.equal((await handler(new Request('https://orders.example.com/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({padding:'x'.repeat(17000)})}))).status,413);
 assert.equal(sent,0);
});

test('configuration errors identify only the setting name and never expose secret values',async()=>{
 const response=await createOrderHandler({apiKey:' ',recipientSetting:'rhorowitz@georgecourey.com'})(request());
 assert.equal(response.status,503);
 assert.match((await response.json()).error,/RESEND_API_KEY has no value.*Production.*Functions scope/);
 const mismatch=await createOrderHandler({apiKey:'test-private-value',recipientSetting:'wrong@example.com'})(request());
 const message=(await mismatch.json()).error;
 assert.match(message,/TEST_ORDER_EMAIL must be/);
 assert.doesNotMatch(message,/test-private-value|wrong@example.com/);
});

test('accidental whitespace and recipient capitalization do not block approved test delivery',async()=>{
 const sent=[];
 const handler=createOrderHandler({apiKey:' test-private-value \n',from:' onboarding@resend.dev ',recipientSetting:' RHOROWITZ@GEORGECOUREY.COM \n',fetchEmail:async(url,options)=>{sent.push(options);return new Response('{}');}});
 assert.equal((await handler(request())).status,200);
 assert.equal(sent[0].headers.Authorization,'Bearer test-private-value');
 const message=JSON.parse(sent[0].body);
 assert.equal(message.from,'onboarding@resend.dev');
 assert.deepEqual(message.to,['rhorowitz@georgecourey.com']);
 assert.equal(message.subject,'Order request — Handcraft Linen Service');
 assert.doesNotMatch(message.html,/TEST ORDER|test recipient/);
});

test('Netlify handler reports provider failures and retries with stable idempotency payload',async()=>{
 const sent=[];
 const handler=createOrderHandler({apiKey:'test',recipientSetting:'rhorowitz@georgecourey.com',fetchEmail:async(url,options)=>{sent.push(options);return new Response('{}',{status:sent.length===1?503:200});}});
 assert.equal((await handler(request())).status,502);
 assert.equal((await handler(request())).status,200);
 assert.equal(sent[0].body,sent[1].body);
 assert.deepEqual(sent[0].headers,sent[1].headers);
});

test('Netlify handler limits repeated submissions per function instance',async()=>{
 const handler=createOrderHandler({apiKey:'',recipientSetting:'rhorowitz@georgecourey.com'});
 for(let i=0;i<10;i++)assert.equal((await handler(request(),{ip:'limited-ip'})).status,503);
 assert.equal((await handler(request(),{ip:'limited-ip'})).status,429);
});
