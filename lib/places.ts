export type Place={label:string;coordinates:[number,number];kind:string};
export async function findPlaces(query:string):Promise<Place[]>{
 if(!query.trim()||query.length>200)throw Error('Enter a neighborhood or street address in San Francisco.');
 const params=new URLSearchParams({SingleLine:query+', San Francisco, CA',f:'json',maxLocations:'5',outFields:'Addr_type',forStorage:'false',searchExtent:'-122.52,37.70,-122.35,37.84'});
 const r=await fetch('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?'+params,{signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Address search is unavailable. Please try again.');
 const d=await r.json() as {error?:unknown;candidates?:{score:number;address:string;location:{x:number;y:number};attributes:{Addr_type:string}}[]};
 if(d.error)throw Error('Address search is unavailable. Please try again.');
 const seen=new Set<string>();
 return (d.candidates||[]).filter((c)=>c.score>=80&&c.location.x>=-122.52&&c.location.x<=-122.35&&c.location.y>=37.70&&c.location.y<=37.84).flatMap((c)=>{
 if(seen.has(c.address))return [];seen.add(c.address);
 return [{label:c.address,coordinates:[c.location.x,c.location.y] as [number,number],kind:c.attributes.Addr_type}];
 });
}
