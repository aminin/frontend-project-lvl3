import {
  describe, it, expect, beforeEach,
} from '@jest/globals';
import path from 'path';
import fs from 'fs';

import init from '../src/index';

const index = path.join(__dirname, '..', 'index.html');
const initHtml = fs.readFileSync(index, 'utf-8');

beforeEach(async () => {
  document.body.innerHTML = initHtml;
  await init();
});

describe('RSS aggregator', () => {
  it('loads initial page', () => {
    expect(true).toBeTruthy();
  });
});
