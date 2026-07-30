import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      bundle: true,
      syntax: 'es2020',
      dts: true,
    },
    {
      format: 'cjs',
      bundle: true,
      syntax: 'es2020',
    },
    {
      format: 'umd',
      bundle: true,
      syntax: 'es2020',
      umdName: 'YCloudAdsPixel',
      output: {
        distPath: './dist/umd',
      },
    },
  ],
  output: {
    target: 'web',
  },
});
