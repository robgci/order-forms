import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {customer,validateOrder} from './order.js';
export {validateOrder} from './order.js';

import {renderOrderEmail} from './order-email.js';

const root = new URL('./', import.meta.url);

export function createServer({sendEmail, apiKey=process.env.RESEND_API_KEY, from=process.env.ORDER_FROM_EMAIL, testRecipient=process.env.TEST_ORDER_EMAIL} = {}) {
  const attempts = new Map();
  const submissions = new Map();
  const deliver = sendEmail ?? (async (message, key) => {
    const response = await fetch('https://api.resend.com/emails', {method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(message),signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw Error('Email provider rejected the request.');
  });
  return http.createServer(async (req,res) => {
    const reply = (status, data) => {res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const path = new URL(req.url,'http://localhost').pathname;
    if (req.method === 'GET' && path === '/api/customer') {
      const {email,salesEmail,contacts,...publicCustomer}=customer;
      return reply(200,{...publicCustomer,contacts:contacts.map(({email,...contact})=>contact)});
    }
    if (req.method === 'POST' && path === '/api/orders') {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return reply(403,{error:'Invalid request origin.'});
      if (!req.headers['content-type']?.startsWith('application/json')) return reply(415,{error:'JSON required.'});
      const now=Date.now();
      for (const [k,v] of attempts) if (v.until < now) attempts.delete(k);
      for (const [k,v] of submissions) if (v.until < now) submissions.delete(k);
      const ip=req.socket.remoteAddress;
      const rate=attempts.get(ip) ?? {count:0,until:now+60000};
      attempts.set(ip,rate);
      if (++rate.count > 10) return reply(429,{error:'Please wait a minute before trying again.'});
      let raw='';
      try {
        for await (const chunk of req) {raw+=chunk; if(Buffer.byteLength(raw)>16000) return reply(413,{error:'Order too large.'});}
        let body;
        try {body=JSON.parse(raw);} catch {return reply(400,{error:'Invalid JSON.'});}
        let order;
        try {order=validateOrder(body);} catch(e) {return reply(400,{error:e.message});}
        if (!apiKey || !from || !testRecipient) return reply(503,{error:'Test email delivery is not configured yet. Your order has not been sent. No email will go to the customer.'});
        const key=req.headers['idempotency-key'];
        if (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) return reply(400,{error:'Invalid submission identifier. Please reload the page.'});
        const fingerprint=JSON.stringify(order);
        const existing=submissions.get(key);
        if(existing) {
          if(existing.fingerprint !== fingerprint) return reply(409,{error:'Order changed. Please reload before submitting.'});
          if(existing.result) return reply(200,existing.result);
          return reply(409,{error:'This order is still being processed. Please wait before retrying.'});
        }
        const entry={fingerprint,until:now+86400000};
        submissions.set(key,entry);
        const id=createHash('sha256').update(key).digest('hex').slice(0,16);
        const {html,text}=renderOrderEmail(customer,order,id);
        try {
          await deliver({from,to:[testRecipient],subject:`Order request — ${customer.name}`,html,text}, key);
          entry.result={id,message:'Order sent to Robert Horowitz.'};
          return reply(200,entry.result);
        } catch {
          submissions.delete(key);
          return reply(502,{error:'We could not confirm email delivery. Retry this same order; duplicate email requests are protected for 24 hours.'});
        }
      } catch {return reply(500,{error:'Unable to process this order. Please try again.'});}
    }
    const files={'/':'index.html','/handcraft':'index.html','/app.js':'app.js','/packing.js':'packing.js','/style.css':'style.css','/assets/handcraft-logo.svg':'assets/handcraft-logo.svg'};
    if(req.method==='GET' && files[path]) {
      res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':'text/html','Cache-Control':'no-store'});
      return res.end(await readFile(new URL(`public/${files[path]}`,root)));
    }
    reply(404,{error:'Not found'});
  });
}
if(process.argv[1] === fileURLToPath(import.meta.url)) createServer().listen(Number(process.env.PORT ?? 3000),'0.0.0.0',()=>console.log('Order form listening on port',process.env.PORT ?? 3000));
