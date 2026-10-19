import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
let html=await read('public/index.html');
html=html.replace('<form id="order">','<form id="order" data-preview="true">');
html=html.replace('Testing only — emails go to Robert Horowitz.<br>No email is sent to the customer.','Preview only — submitting checks the form without sending an order or email.');
html=html.replace('<link rel="stylesheet" href="style.css">',`<style>${await read('public/style.css')}</style>`);
html=html.replace('<script type="module" src="app.js"></script>','');
const packing=(await read('public/packing.js')).replaceAll('export function','function');
let app=(await read('public/app.js')).replace(/^import .*;\n/,'');
html=html.replace('</body>',`<script>${packing}\n${app}</script></body>`);
await mkdir(new URL('review/',root),{recursive:true});
await writeFile(new URL('review/Handcraft-Order-Form-Review.html',root),html);
// Publish only this review page. Backend files, customer email mappings and
// environment values must never be copied into the static site's output.
await rm(new URL('dist/',root),{recursive:true,force:true});
await mkdir(new URL('dist/',root),{recursive:true});
await writeFile(new URL('dist/index.html',root),html);
console.log('Built preview-only site in dist/ and updated standalone review. No emails are sent.');
