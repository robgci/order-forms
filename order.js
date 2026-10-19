import customer from './data/handcraft.json' with {type:'json'};
import {calculatePackaging,roundToWholeCases} from './public/packing.js';

export {customer};
export function validateOrder(body, today = new Date().toLocaleDateString('en-CA', {timeZone:'America/New_York'})) {
  if (!body || typeof body !== 'object') throw Error('Invalid order.');
  if (typeof body.po !== 'string' || !body.po.trim() || body.po.length > 100) throw Error('Enter a PO number (up to 100 characters).');
  const contact=customer.contacts.find(contact=>contact.id===body.contactId);
  if(!contact)throw Error('Select a contact person.');
  if(body.shipTo!==undefined && body.shipTo!==contact.location)throw Error('The ship-to location must match the selected contact.');
  if (typeof body.deliveryDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.deliveryDate) || !Number.isFinite(Date.parse(body.deliveryDate)) || new Date(body.deliveryDate).toISOString().slice(0,10) !== body.deliveryDate || body.deliveryDate < today) throw Error('Choose a valid delivery date today or later.');
  if (!body.quantities || typeof body.quantities !== 'object' || Array.isArray(body.quantities)) throw Error('Enter product quantities.');
  if (Object.keys(body.quantities).some(id => !customer.products.some(p => p.id === id))) throw Error('Unknown product.');
  const lines = customer.products.map(p => {
    const requestedQuantity = body.quantities[p.id] ?? 0;
    if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 0 || requestedQuantity > 999999) throw Error('Quantities must be whole numbers from 0 to 999,999.');
    const quantity=roundToWholeCases(requestedQuantity,p);
    if(quantity>999999)throw Error(`${p.id}: rounded quantity exceeds the maximum order quantity.`);
    return {...p, quantity, ...calculatePackaging(quantity,p), totalCents:Math.round(p.price * 100) * quantity};
  }).filter(p => p.quantity > 0);
  if (!lines.length) throw Error('Enter a quantity for at least one product.');
  return {po:body.po.trim(),contact:{...contact},shipTo:contact.location,deliveryDate:body.deliveryDate,lines};
}
