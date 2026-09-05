import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const p=load('public/projects.json').projects,l=load('public/business-leads.json').projects;
test('announcements have evidence-backed ranges and preserve the original Dante ID',()=>{const a=p.filter(x=>x.lifecycle==='announced');assert.ok(a.length>=16);for(const x of a){assert.ok(x.evidence.length);assert.ok(x.arrival.sourceUrl);assert.ok(x.arrival.start<=x.arrival.end);assert.equal(x.date,null);}assert.equal(a.filter(x=>x.name.includes('Dante’s Inferno')).length,1);assert.ok(a.some(x=>x.id==='pl-8f07ec958c7c'));});
test('lead imports never turn registration or permit timestamps into arrival dates',()=>{assert.ok(l.length>10000);for(const x of l){assert.equal(x.lifecycle,'lead');assert.equal(x.date,null);assert.equal(x.arrival,undefined);assert.ok(x.sources.length);}});
test('stable IDs are unique and mapped positions stay inside SF bounds',()=>{const all=[...p,...l];assert.equal(new Set(all.map(x=>x.id)).size,all.length);for(const x of all)for(const [lon,lat] of x.locations){assert.ok(lon>=-122.53&&lon<=-122.34&&lat>=37.70&&lat<=37.84);}});
test('published leads omit ownership and mailing fields',()=>{for(const x of l)for(const k of ['ownership_name','mailing_address_1','mail_city','certificate_number'])assert.equal(k in x,false);});

test('every collected SFMTA URL remains linked and completed projects are excluded from upcoming', () => {
  const agency = load('public/sfmta-directory.json');
  const published = p;
  for (const row of agency.records) {
    const matches = published.filter(p => p.sources.some(s => s.source === 'sfmta' && s.url === row.url));
    assert.equal(matches.length, 1, row.url);
    if (row.lifecycle === 'opened') assert.equal(matches[0].lifecycle, 'opened');
  }
});

test('park directory entries survive assembly and explicit completions remain excluded',()=>{
 const directory=load('public/parks-directory.json');
 for(const row of directory.records){
  const project=p.find(x=>x.sources.some(s=>s.source==='parks'&&s.url===row.url));
  assert.ok(project,row.url);
  assert.equal(project.category,'Parks & recreation');
  if(row.completed)assert.equal(project.lifecycle,'opened');
 }
});
test('reviewed transit identity merge preserves old ID and both source links',()=>{
 const target=p.find(x=>x.id==='tr-SFMTA-110');
 assert.ok(target.aliases.includes('sfmta-cd29b1e4d2b01c43'));
 assert.ok(target.sources.some(s=>s.source==='sfmta'));
 assert.ok(target.sources.some(s=>s.source==='transport'));
 assert.equal(p.some(x=>x.id==='sfmta-cd29b1e4d2b01c43'),false);
 assert.ok(p.some(x=>x.id==='pl-2120fe31b63d'));
});

test('infrastructure sources survive assembly and completion status overrides future targets',()=>{
 const d=load('public/infrastructure-directory.json');
 for(const source of d.sources)for(const row of source.records){
  const project=p.find(x=>x.sources.some(s=>s.source===source.id&&s.url===row.url));
  assert.ok(project,row.url);
  assert.equal(project.category,'Utilities & public works');
  if(row.completed)assert.equal(project.lifecycle,'opened');
  assert.equal(project.date,null);
 }
});

test('reviewed report additions retain their explicit soft-opening and gallery dates',()=>{
 assert.equal(p.find(x=>x.id==='ann-brunos').arrival.start,'2026-09-12');
 assert.match(p.find(x=>x.id==='ann-brunos').arrivalLabel,/soft opening/);
 assert.equal(p.find(x=>x.id==='ann-sin-miedo').arrival.start,'2026-09-19');
 assert.equal(p.find(x=>x.id==='ann-portal-cinema').arrival.end,'2026-10-31');
 const queue=load('public/news-review.json');
 for(const item of queue.items)for(const id of item.review.projectIds||[])assert.ok(p.some(x=>x.id===id));
});
