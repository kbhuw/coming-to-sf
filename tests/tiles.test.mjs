import test from 'node:test';import assert from 'node:assert/strict';
import {GET} from '../app/api/tiles/[z]/[x]/[y]/route.ts';
const context={params:Promise.resolve({z:'12',x:'655',y:'1583'})};
test('tile connection failures retry once; permanent missing tiles do not',async()=>{
 const original=globalThis.fetch;
 try{
  let calls=0;globalThis.fetch=async()=>{calls++;if(calls===1)throw Error('connection reset');return new Response('tile');};
  assert.equal((await GET(new Request('https://example.test'),context)).status,200);assert.equal(calls,2);
  calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:404});};
  assert.equal((await GET(new Request('https://example.test'),context)).status,404);assert.equal(calls,1);
  calls=0;globalThis.fetch=async()=>{calls++;throw Error('offline');};
  const r=await GET(new Request('https://example.test'),context);assert.equal(r.status,503);assert.equal(calls,2);assert.equal(r.headers.get('cache-control'),'no-store');
 }finally{globalThis.fetch=original;}
});
