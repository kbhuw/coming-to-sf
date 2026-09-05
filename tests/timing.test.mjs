import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowFor } from '../lib/timing.ts';
const now = new Date('2026-09-04T12:00:00');
test('missing, invalid and elapsed dates never imply imminent arrival', () => {
  assert.equal(windowFor({date:null},now),'unknown');
  assert.equal(windowFor({date:'invalid'},now),'unknown');
  assert.equal(windowFor({date:'2026-09-03'},now),'past');
  assert.equal(windowFor({date:'2026-09-04'},now),'soon');
});
test('three-month and one-year boundaries are inclusive calendar dates', () => {
  assert.equal(windowFor({date:'2026-12-04'},now),'soon');
  assert.equal(windowFor({date:'2026-12-05'},now),'year');
  assert.equal(windowFor({date:'2027-09-04'},now),'year');
  assert.equal(windowFor({date:'2027-09-05'},now),'later');
});
test('month-end and leap dates do not overflow into a later month', () => {
  const jan=new Date('2026-01-31T12:00:00');
  assert.equal(windowFor({date:'2026-04-30'},jan),'soon');
  assert.equal(windowFor({date:'2026-05-01'},jan),'year');
  assert.equal(windowFor({date:'2025-03-01'},new Date('2024-02-29T12:00:00')),'later');
});
