import test from 'node:test';
import assert from 'node:assert/strict';
import {projectKind} from '../lib/project-kind.ts';
const kind=description=>projectKind({category:'Food & shops',name:'Test',description});
test('change of use classifies destination instead of previous business',()=>{
 assert.equal(kind('Convert from restaurant/bar to a childcare center.'),'childcare');
 assert.equal(kind('Change of use from office to cannabis retail.'),'cannabis');
 assert.equal(kind('Convert from retail to office use.'),'office');
});
test('coffee is only used for explicit cafe records',()=>{
 assert.equal(kind('Establishment of a retail cafe.'),'cafe');
 assert.equal(kind('A new restaurant.'),'restaurant');
 assert.equal(kind('A new convenience store.'),'retail');
 assert.equal(kind('Remove an unpermitted kitchen and add a wet bar.'),'shops');
 assert.equal(kind('Exterior improvements to a commercial building.'),'shops');
});
