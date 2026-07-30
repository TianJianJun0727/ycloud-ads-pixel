import { expect, test } from '@rstest/core';
import { adsPixel, createAdsPixel, installAdsPixel } from '../src/index';

test('creates the default ads pixel sdk instance', () => {
  const sdk = createAdsPixel();

  expect(typeof sdk.init).toBe('function');
  expect(typeof sdk.identify).toBe('function');
  expect(typeof sdk.track).toBe('function');
});

test('installs an ads pixel sdk instance on window', () => {
  installAdsPixel(adsPixel);

  expect((window as Window & { adsPixel?: typeof adsPixel }).adsPixel).toBe(adsPixel);
});
