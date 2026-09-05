import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectKind} from '../lib/project-kind.ts';
const details=JSON.parse(fs.readFileSync(new URL('../lib/project-details.json',import.meta.url)));
const projects=JSON.parse(fs.readFileSync(new URL('../public/projects.json',import.meta.url))).projects;
test('all reviewed records resolve to real records and meaningful summaries',()=>{assert.equal(Object.keys(details).length,21);for(const [id,d] of Object.entries(details)){assert.ok(projects.some(p=>p.id===id));assert.ok(d.summary.length>60);assert.ok(d.recordLabel);}});
test('former restaurants converted into offices cannot appear as restaurants',()=>{for(const id of ['pl-a1c2d643c337','pl-f55dfc9b4a97','pl-48599042fd4d']){assert.equal(projectKind({...projects.find(p=>p.id===id),...details[id]}),'office');}});
test('open venues and expansions never claim a new opening',()=>{assert.match(details['pl-dbf4e6268bef'].recordLabel,/Already open/);assert.match(details['pl-15601b2479de'].recordLabel,/expansion/);assert.equal(details['pl-8f07ec958c7c'].date,undefined);});
