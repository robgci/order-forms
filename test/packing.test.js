import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculatePackaging,formatPackCount,roundToWholeCases} from '../public/packing.js';
import {validateOrder} from '../server.js';
const {products}=JSON.parse(await readFile(new URL('../data/handcraft.json',import.meta.url)));
test('every product calculates exact cases and pallets from its selling unit',()=>{
 for(const p of products){
  const perCase=p.piecesPerCase/p.piecesPerUnit;
  assert.equal(calculatePackaging(perCase,p).cases,1,p.id);
  assert.equal(calculatePackaging(perCase*p.casesPerPallet,p).pallets,1,p.id);
  assert.equal(calculatePackaging(perCase/2,p).cases,0.5,p.id);
  assert.equal(calculatePackaging(0,p).pallets,0,p.id);
 }
});
test('washcloths use 75 dozen per case and 600 dozen per pallet without changing price',()=>{
 const p=products.find(p=>p.id==='L8870_U');
 assert.equal(calculatePackaging(75,p).pieces,900);
 assert.deepEqual(calculatePackaging(600,p),{pieces:7200,cases:8,pallets:1});
 const order=validateOrder({po:'TEST',contactId:'saul-aguilera',shipTo:'Richmond VA Bulk',deliveryDate:'2099-11-15',quantities:{L8870_U:600}});
 assert.equal(order.lines[0].totalCents,104400);
 assert.equal(order.lines[0].cases,8);
 assert.equal(order.lines[0].pallets,1);
});
test('partial pallets display decimals instead of rounding up or hiding small quantities',()=>{
 assert.equal(formatPackCount(0.5),'0.5');
 assert.equal(formatPackCount(1/16),'0.063');
 assert.equal(formatPackCount(1/1080),'<0.001');
});
test('server rounds quantities up to full cases for every product and accepts partial pallets',()=>{
 const base={po:'TEST',contactId:'saul-aguilera',shipTo:'Richmond VA Bulk',deliveryDate:'2099-11-15'};
 for(const p of products){
  const perCase=p.piecesPerCase/p.piecesPerUnit;
  for(const requested of [1,perCase-1,perCase,perCase+1]){
   const result=validateOrder({...base,quantities:{[p.id]:requested}}).lines[0];
   const expected=requested>perCase?perCase*2:perCase;
   assert.equal(result.quantity,expected,p.id);
   assert.equal(result.totalCents,Math.round(p.price*100)*expected,p.id);
   assert.equal(result.cases,expected/perCase,p.id);
  }
  assert.equal(roundToWholeCases(0,p),0);
  const order=validateOrder({...base,quantities:{[p.id]:perCase}});
  assert.equal(order.lines[0].cases,1);
  assert.equal(order.lines[0].pallets,1/p.casesPerPallet);
 }
});
