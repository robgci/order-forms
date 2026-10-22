import {formatPackCount} from './public/packing.js';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',useGrouping:true}).format(cents/100);
const count=value=>Number(value).toLocaleString('en-US');
const productTitle=p=>p.name.split(' - ')[0].replace(/^1 lb wash Cloth$/,'Wash Cloth');

export function renderOrderEmail(customer,order,id) {
  const totalCents=order.lines.reduce((sum,p)=>sum+p.totalCents,0);
  const totalPallets=order.lines.reduce((sum,p)=>sum+p.pallets,0);
  const date=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${order.deliveryDate}T12:00:00Z`));
  const detail=(label,value)=>`<tr><td width="34%" valign="top" style="padding:13px 0;font-size:14px;color:#596273;">${escape(label)}</td><td style="padding:13px 0;font-size:15px;color:#303747;font-weight:600;overflow-wrap:anywhere;">${escape(value)}</td></tr>`;
  const products=order.lines.map(p=>{
    const unit=p.piecesPerUnit===12?'dozen':'pieces';
    const perCase=p.piecesPerCase/p.piecesPerUnit;
    return `<tr><td style="padding:24px 0;border-bottom:1px dashed #e1e4ee;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;"><tr>
      <td valign="top" style="font-size:16px;line-height:1.5;font-weight:600;color:#303747;">${escape(productTitle(p))} (${escape(p.id)})</td>
      <td width="100" valign="top" align="right" style="font-size:15px;font-weight:600;color:#303747;">${money(Math.round(p.price*100))}<br><span style="font-size:11px;font-weight:400;color:#707787;">per ${unit==='dozen'?'dozen':'piece'}</span></td></tr></table>
      <p style="margin:6px 0;font-size:13px;line-height:1.6;color:#707787;">${escape(p.name)}</p>
      <p style="margin:6px 0 12px;font-size:12px;line-height:1.6;color:#63718b;">Case: ${count(perCase)} ${unit} &middot; Pallet: ${count(perCase*p.casesPerPallet)} ${unit} (${p.casesPerPallet} cases)</p>
      <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="font-size:13px;color:#63718b;padding-right:12px;">Quantity (${unit==='dozen'?'Dozen':'Pieces'})</td><td style="padding:7px 14px;border:1px solid #b7bece;border-radius:4px;font-size:15px;color:#303747;">${count(p.quantity)}</td></tr></table>
      <p style="margin:9px 0 0;font-size:12px;line-height:1.6;color:#4f5e78;">Cases: ${escape(formatPackCount(p.cases))} &middot; Pallets: ${escape(formatPackCount(p.pallets))}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#303747;">Line total: <strong>${money(p.totalCents)}</strong></p>
    </td></tr>`;
  }).join('');
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Handcraft Order Confirmation</title></head>
  <body style="margin:0;padding:0;background-color:#f3f2ff;font-family:Arial,Helvetica,sans-serif;color:#303747;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f3f2ff"><tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;">
  <tr><td align="center" style="padding:0 12px 28px;"><div style="font-size:38px;line-height:1.2;font-weight:900;font-style:normal;letter-spacing:-1px;color:#d71c35;">George Courey<span style="font-size:10px;font-style:normal;letter-spacing:0;"> Inc.</span></div><p style="font-size:15px;line-height:1.5;color:#8b8b90;margin:10px 0 0;">Hospitality and Healthcare Linen Specialist</p></td></tr>
  <tr><td bgcolor="#ffffff" style="background-color:#fff;border-radius:4px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:30px 28px;border-bottom:1px solid #dce0e8;">
  <h1 style="margin:0;font-size:26px;line-height:1.4;font-weight:600;color:#303747;">${escape(customer.name.replace(/ Linen Service$/,''))} Order Confirmation</h1>
  <p style="margin:10px 0 0;font-size:13px;color:#707787;">PO: <strong>${escape(order.po)}</strong></p>
  </td></tr><tr><td style="padding:8px 28px 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${products}</table>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">
  <tr><td align="right" style="padding:7px 16px 7px 0;font-size:16px;font-weight:600;">Total pallets</td><td width="110" align="right" style="font-size:18px;font-weight:600;">${escape(formatPackCount(totalPallets))}</td></tr>
  <tr><td align="right" style="padding:7px 16px 7px 0;font-size:18px;font-weight:600;">Total</td><td align="right" style="font-size:21px;font-weight:600;">${money(totalCents)}</td></tr></table>
  <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#707787;">Shipping and tax are not included. Requested delivery dates are subject to confirmation.</p>
  </td></tr><tr><td style="padding:24px 28px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${detail('Customer name',customer.name)}${detail('Contact',order.contact.name)}${detail('Ship to',order.shipTo)}${detail('PO number',order.po)}${detail('Delivery date',date)}${detail('Salesperson',customer.salesRep)}</table>
  </td></tr><tr><td style="padding:20px 28px;border-top:1px solid #dce0e8;font-size:11px;line-height:1.6;color:#737b8b;">Order reference: ${escape(id)}</td></tr></table>
  </td></tr></table></td></tr></table></body></html>`;
  const text=['Order confirmation',customer.name,`PO: ${order.po}`,'',...order.lines.map(p=>`${p.id} — ${p.name}\nQuantity: ${p.quantity} ${p.piecesPerUnit===12?'dozen':'pieces'} | Cases: ${formatPackCount(p.cases)} | Pallets: ${formatPackCount(p.pallets)}\nLine total: ${money(p.totalCents)}`),'',`Total pallets: ${formatPackCount(totalPallets)}`,`Total: ${money(totalCents)}`,'',`Contact: ${order.contact.name}`,`Ship to: ${order.shipTo}`,`Requested delivery: ${date}`,`Salesperson: ${customer.salesRep}`,`Order reference: ${id}`,'Shipping and tax are not included. Requested delivery dates are subject to confirmation.'].join('\n');
  return {html,text};
}
