export async function GET(_request:Request,{params}:{params:Promise<{z:string;x:string;y:string}>}){
 const p=await params;
 if(![p.z,p.x,p.y].every(v=>/^\d+$/.test(v)))return new Response('Invalid tile',{status:400});
 const z=Number(p.z),x=Number(p.x),y=Number(p.y);
 if(z<10||z>16||x<0||y<0||x>=2**z||y>=2**z)return new Response('Invalid tile',{status:400});
 const response=await fetch(`https://watercolormaps.collection.cooperhewitt.org/tile/watercolor/${z}/${x}/${y}.jpg`);
 if(!response.ok)return new Response('Tile unavailable',{status:response.status});
 return new Response(response.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
}
