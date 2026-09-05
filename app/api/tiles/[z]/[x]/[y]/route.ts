export async function GET(_request:Request,{params}:{params:Promise<{z:string;x:string;y:string}>}){
 const p=await params;
 if(![p.z,p.x,p.y].every(v=>/^\d+$/.test(v)))return new Response('Invalid tile',{status:400});
 const z=Number(p.z),x=Number(p.x),y=Number(p.y);
 if(z<10||z>16||x<0||y<0||x>=2**z||y>=2**z)return new Response('Invalid tile',{status:400});
 // The public archive occasionally resets a connection. Retry once, bounded
 // by timeouts; never cache an error or leave a request hanging indefinitely.
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch(`https://watercolormaps.collection.cooperhewitt.org/tile/watercolor/${z}/${x}/${y}.jpg`,{signal:AbortSignal.timeout(12000)});
   if(response.ok)return new Response(response.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
   if(response.status<500)return new Response('Tile unavailable',{status:response.status,headers:{'Cache-Control':'no-store'}});
   await response.body?.cancel();
  }catch{/* transient upstream connection failure; one retry */}
 }
 return new Response('Tile temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
}
