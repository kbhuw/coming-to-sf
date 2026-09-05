import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesWindow,windowFor} from '../lib/timing.ts';
const now=new Date('2026-09-05T12:00:00');
const range=(start,end)=>({date:null,arrival:{start,end}});
test('an October target is discoverable in the next three months without a fake day',()=>{assert.equal(matchesWindow(range('2026-10-01','2026-10-31'),'soon',now),true);assert.equal(windowFor(range('2026-10-01','2026-10-31'),now),'soon');});
test('a year-wide target overlaps both near and later windows',()=>{const p=range('2026-01-01','2026-12-31');assert.ok(matchesWindow(p,'soon',now));assert.ok(matchesWindow(p,'year',now));assert.equal(matchesWindow(p,'past',now),false);});
test('elapsed ranges are stale; missing and reversed ranges are unknown',()=>{assert.equal(windowFor(range('2025-09-01','2025-11-30'),now),'past');assert.equal(windowFor(range('2026-12-31','2026-01-01'),now),'unknown');assert.equal(windowFor({date:null},now),'unknown');});
