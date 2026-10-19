import {readFile,writeFile} from 'node:fs/promises';
import './build-review.js';
const root=new URL('../',import.meta.url);
const review=await readFile(new URL('review/Handcraft-Order-Form-Review.html',root),'utf8');
const site=review.replace(' data-preview="true"','').replace('Preview only — submitting checks the form without sending an order or email.','Testing only — emails go to Robert Horowitz.<br>No email is sent to the customer.');
await writeFile(new URL('dist/index.html',root),site);
console.log('Built live test-submission site. Deploy netlify/functions with it; customer emails remain disabled.');
