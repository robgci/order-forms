import {createHash} from 'node:crypto';
import {customer,validateOrder} from '../../order.js';
import {renderOrderEmail} from '../../order-email.js';

const TEST_RECIPIENT='rhorowitz@georgecourey.com';

export function createOrderHandler({apiKey=process.env.RESEND_API_KEY,from=process.env.ORDER_FROM_EMAIL || 'onboarding@resend.dev',recipientSetting=process.env.TEST_ORDER_EMAIL,fetchEmail=fetch}={}) {
  // Best-effort per-instance throttling. Resend idempotency also protects retries
  // that reach another function instance. No email recipients come from inputs.
  const attempts=new Map();
  const submissions=new Map();
  const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  return async (request,context={})=>{
    if(request.method!=='POST')return reply(405,{error:'Use Submit order to send an order.'});
    const origin=request.headers.get('origin');
    if(origin && origin!==new URL(request.url).origin)return reply(403,{error:'Submit from this order-form website.'});
    if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(415,{error:'JSON required.'});
    const now=Date.now();
    for(const [key,entry] of attempts)if(entry.until<now)attempts.delete(key);
    for(const [key,entry] of submissions)if(entry.until<now)submissions.delete(key);
    const ip=context.ip || 'unknown';
    const rate=attempts.get(ip) || {count:0,until:now+60000};attempts.set(ip,rate);
    if(++rate.count>10)return reply(429,{error:'Please wait one minute before submitting again.'});
    if(Number(request.headers.get('content-length') || 0)>16000)return reply(413,{error:'Order too large.'});
    let body;
    try {
      const reader=request.body?.getReader();let size=0;const chunks=[];
      if(reader){while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();return reply(413,{error:'Order too large.'});}chunks.push(value);}}
      body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }catch{return reply(400,{error:'Unable to read this order. Please reload and try again.'});}
    let order;
    try{order=validateOrder(body);}catch(error){return reply(400,{error:error.message});}
    if(!apiKey || !from || (recipientSetting && recipientSetting!==TEST_RECIPIENT))return reply(503,{error:'Test email settings are incomplete. Your order has not been sent. Please contact Robert Horowitz.'});
    const key=request.headers.get('idempotency-key');
    if(!key || !/^[a-zA-Z0-9-]{16,80}$/.test(key))return reply(400,{error:'Please reload the form before submitting.'});
    const fingerprint=JSON.stringify(order);
    const previous=submissions.get(key);
    if(previous){
      if(previous.fingerprint!==fingerprint)return reply(409,{error:'Order changed. Reload before submitting.'});
      if(previous.result)return reply(200,previous.result);
      return reply(409,{error:'This order is being processed. Please wait before trying again.'});
    }
    const entry={fingerprint,until:now+86400000};submissions.set(key,entry);
    const id=createHash('sha256').update(key).digest('hex').slice(0,16);
    const {html,text}=renderOrderEmail(customer,order,id);
    try{
      const response=await fetchEmail('https://api.resend.com/emails',{
        method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':key},
        body:JSON.stringify({from,to:[TEST_RECIPIENT],subject:`[TEST] Order request — ${customer.name}`,html,text}),
        signal:AbortSignal.timeout(15000)
      });
      if(!response.ok)throw Error('Provider failure');
      entry.result={id,message:'Test order sent to Robert Horowitz only. No email was sent to the customer.'};
      return reply(200,entry.result);
    }catch{
      submissions.delete(key);
      return reply(502,{error:'Email delivery could not be confirmed. Retry this same order; duplicate email requests are protected for 24 hours.'});
    }
  };
}

export default createOrderHandler();
