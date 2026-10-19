import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateOrder} from '../server.js';
import {renderOrderEmail} from '../order-email.js';
const customer=JSON.parse(await readFile(new URL('../data/handcraft.json',import.meta.url)));
test('formatted confirmation includes ordered products, selling units, packing, totals and delivery fields',()=>{
 const order=validateOrder({po:'FORMAT-TEST',contactId:'saul-aguilera',shipTo:'Richmond VA Bulk',deliveryDate:'2099-11-15',quantities:{'L8-68383':60,'L1216-170':30,'c1070-5481':36,'L8870_U':75}});
 const email=renderOrderEmail(customer,order,'reference-123');
 for(const value of ['George Courey','Handcraft Order Confirmation','L8-68383','L1216-170','c1070-5481','L8870_U','Quantity (Dozen)','Quantity (Pieces)','Total pallets','0.283','$544.20','FORMAT-TEST','November 15, 2099','Robert Horowitz','TEST ORDER'])assert.ok(email.html.includes(value),value);
 assert.match(email.html,/background-color:#f3f2ff/);
 assert.match(email.text,/Total pallets: 0.283/);
 assert.match(email.text,/Total: \$544.20/);
 assert.doesNotMatch(email.html,/<script|<form|<link/i);
});
test('email escapes user-supplied markup and excludes unordered products',()=>{
 const order=validateOrder({po:'<img src=x onerror="bad"> & PO',contactId:'saul-aguilera',shipTo:'Richmond VA Bulk',deliveryDate:'2099-11-15',quantities:{'L8-68383':1}});
 const email=renderOrderEmail(customer,order,'<reference>');
 assert.match(email.html,/&lt;img src=x onerror=&quot;bad&quot;&gt; &amp; PO/);
 assert.doesNotMatch(email.html,/<img|L1216-170|L8870_U/);
 assert.match(email.html,/&lt;reference&gt;/);
 assert.match(email.html,/>60<\/td>/);
});

test('large dollar amounts use commas in HTML and plain-text confirmations',()=>{
 const order=validateOrder({po:'LARGE-TOTAL',contactId:'saul-aguilera',deliveryDate:'2099-11-15',quantities:{'L8-68383':600}});
 const email=renderOrderEmail(customer,order,'large-total');
 assert.ok(email.html.includes('Line total: <strong>$2,496.00</strong>'));
 assert.ok(email.html.includes('$2,496.00'));
 assert.match(email.text,/Line total: \$2,496\.00/);
 assert.match(email.text,/Total: \$2,496\.00/);
});
