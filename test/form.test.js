import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {calculatePackaging,formatPackCount,roundToWholeCases} from '../public/packing.js';

test('product selection and quantities calculate totals together',async()=>{
  const element=(value='')=>({value,checked:false,dataset:{},handlers:{},focus(){},setCustomValidity(message){this.validationMessage=message;},addEventListener(name,fn){this.handlers[name]=fn;}});
  const quantity=element('0'),checkbox=element();
  const packing={},notice={};
  const row={dataset:{id:'L8-68383',price:'4.16',piecesPerCase:'60',piecesPerUnit:'1',casesPerPallet:'16'},querySelector(selector){return selector==='.quantity'?quantity:selector==='.packing-totals'?packing:selector==='.rounding-note'?notice:checkbox;}};
  const elements=Object.fromEntries(['contact','shipTo','total','totalPallets','deliveryDate','submit','order','status'].map(id=>[id,element()]));
  elements.contact.selectedOptions=[{dataset:{location:'Richmond VA Bulk'}}];
  const context=vm.createContext({calculatePackaging,formatPackCount,roundToWholeCases,crypto:webcrypto,Intl,Date,Uint8Array,document:{getElementById:id=>elements[id],querySelectorAll:()=>[row]}});
  vm.runInContext((await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/,''),context);
  assert.equal(elements.shipTo.value,'Richmond VA Bulk');
  for(const location of ['Martinsburg WV Bulk','High Point NC Bulk','Richmond VA Bulk']){
    elements.contact.selectedOptions=[{dataset:{location}}];elements.contact.handlers.change();
    assert.equal(elements.shipTo.value,location);
  }
  checkbox.checked=true;checkbox.handlers.change();
  assert.equal(quantity.value,'60');assert.equal(elements.total.textContent,'$249.60');
  quantity.value='3';quantity.handlers.input();
  assert.equal(checkbox.checked,true);assert.equal(elements.total.textContent,'$249.60');assert.equal(packing.textContent,'Cases: 1 · Pallets: 0.063');assert.match(notice.textContent,/Rounded up from 3 to 60 pieces/);quantity.handlers.change();assert.equal(quantity.value,'60');
  checkbox.checked=false;checkbox.handlers.change();
  assert.equal(elements.total.textContent,'$0.00');
  quantity.value='0';quantity.handlers.input();
  assert.equal(checkbox.checked,false);
  quantity.value='960';quantity.handlers.input();
  assert.equal(packing.textContent,'Cases: 16 · Pallets: 1');assert.equal(quantity.validationMessage,'');
  quantity.value='123456';quantity.handlers.input();quantity.handlers.change();
  assert.equal(quantity.value,'123480');assert.equal(quantity.validationMessage,'');
  checkbox.checked=false;checkbox.handlers.change();
  assert.equal(packing.textContent,'Cases: 0 · Pallets: 0');
  elements.order.dataset.preview='true';
  quantity.value='1';quantity.handlers.input();
  await elements.order.handlers.submit({preventDefault(){}});
  assert.equal(quantity.value,'60');
  assert.match(elements.status.textContent,/no order or email was sent/);
  assert.equal(elements.submit.disabled,false);
});

test('total pallets sums all products before formatting and excludes unchecked products',async()=>{
  const element=(value='')=>({value,checked:false,dataset:{},handlers:{},setCustomValidity(){},addEventListener(name,fn){this.handlers[name]=fn;}});
  const specs=[['gown',60,16,1],['blanket',30,16,1],['drawsheet',36,30,1],['washcloth',900,8,12]];
  const rows=specs.map(([id,piecesPerCase,casesPerPallet,piecesPerUnit])=>{
    const quantity=element('0'),checkbox=element(),output={},notice={};
    return {dataset:{id,price:'1',piecesPerCase,piecesPerUnit,casesPerPallet},querySelector:s=>({'.quantity':quantity,'.product-select':checkbox,'.packing-totals':output,'.rounding-note':notice})[s]};
  });
  const elements=Object.fromEntries(['contact','shipTo','total','totalPallets','deliveryDate','submit','order','status'].map(id=>[id,element()]));
  elements.contact.selectedOptions=[{dataset:{location:'Richmond VA Bulk'}}];
  const context=vm.createContext({calculatePackaging,formatPackCount,roundToWholeCases,crypto:webcrypto,Intl,Date,Uint8Array,document:{getElementById:id=>elements[id],querySelectorAll:()=>rows}});
  vm.runInContext((await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/,''),context);
  for(const row of rows){row.querySelector('.quantity').value='1';row.querySelector('.quantity').handlers.input();}
  // Each rounds to one case. Sum exact fractions: 1/16 + 1/16 + 1/30 + 1/8.
  assert.equal(elements.totalPallets.textContent,'0.283');
  const washcloth=rows[3].querySelector('.product-select');washcloth.checked=false;washcloth.handlers.change();
  assert.equal(elements.totalPallets.textContent,'0.158');
  for(const row of rows){const box=row.querySelector('.product-select');box.checked=false;box.handlers.change();}
  assert.equal(elements.totalPallets.textContent,'0');
});
