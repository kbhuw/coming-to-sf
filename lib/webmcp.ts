export type MapActions = {
  locate:(query:string)=>Promise<unknown>;
  filter:(category:string,timing:string,kind?:string,scope?:string)=>Promise<unknown>;
  read:()=>Promise<unknown>;
  search: (query: string) => Promise<unknown>;
  open: (id: string) => Promise<unknown>;
};
type Tool = {name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>Promise<unknown>};
export function registerMapTools(getActions:()=>MapActions){
  const actions=new Proxy({} as MapActions,{get:(_,key)=>getActions()[key as keyof MapActions]});
  const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
  if(!context?.registerTool)return()=>{};
  const lifecycle=new AbortController();
  const entries:Tool[]=[{
    name:'focus_location',title:'Zoom to an SF neighborhood or address',description:'Find an SF neighborhood or home address and zoom the visible map to it. Ambiguous matches are returned for selection by full label. Sends the query to Esri; it is not saved.',inputSchema:{type:'object',properties:{query:{type:'string',minLength:1,maxLength:200}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},
    execute:async(input)=>{const v=input as {query?:unknown};if(!v||typeof v.query!=='string'||!v.query.trim()||v.query.length>200)throw Error('A location query of 1–200 characters is required');return actions.locate(v.query);}
  },{
    name:'filter_projects',title:'Filter the map',description:'Set category, timing, business kind and evidence scope. Published date ranges can overlap multiple windows. Default scope excludes unverified leads and already-open records.',inputSchema:{type:'object',properties:{scope:{type:'string',enum:['projects','announced','leads','all']},category:{type:'string',enum:['All projects','Housing','Food & shops','Streets & transit','Parks & recreation','Other places']},timing:{type:'string',enum:['all','soon','year','later','unknown','past']},kind:{type:'string',enum:['all','cafe','restaurant','bar','retail','cannabis','health','childcare','fitness','hotel','office','storage','shops']}},required:['category','timing'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute:async(input)=>{const v=input as {category:string;timing:string;kind?:string;scope?:string};if(!v||!['All projects','Housing','Food & shops','Streets & transit','Parks & recreation','Other places'].includes(v.category)||!['all','soon','year','later','unknown','past'].includes(v.timing))throw Error('Invalid category or timing');if(v.kind!==undefined&&!['all','cafe','restaurant','bar','retail','cannabis','health','childcare','fitness','hotel','office','storage','shops'].includes(v.kind))throw Error('Invalid business kind');if(v.scope!==undefined&&!['projects','announced','leads','all'].includes(v.scope))throw Error('Invalid evidence scope');return actions.filter(v.category,v.timing,v.kind,v.scope);}
  },{
    name:'read_map',title:'Read current map results',description:'Read map location, zoom, current filters and the first 20 matching projects with evidence links.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},
    execute:async(input)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('Expected an empty object');return actions.read();}
  },{
    name:'search_projects',title:'Search SF projects',description:'Search the published SF project snapshot and update the visible project list. Returns at most 20 matching records plus the total.',inputSchema:{type:'object',properties:{query:{type:'string',maxLength:300}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},
    execute:async(input)=>{const v=input as {query?:unknown};if(!v||typeof v.query!=='string'||v.query.length>300)throw Error('query must be a string of at most 300 characters');return actions.search(v.query);}
  },{
    name:'open_project',title:'Open a project',description:'Open a known project ID in the details panel and center its location on the SF map.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},
    execute:async(input)=>{const v=input as {id?:unknown};if(!v||typeof v.id!=='string'||!v.id)throw Error('A project id is required');return actions.open(v.id);}
  }];
  for(const tool of entries){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  return()=>lifecycle.abort();
}
