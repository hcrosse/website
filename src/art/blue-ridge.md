# Blue Ridge elevation data

`blue-ridge.bin.gz` holds elevation for part of the Blue Ridge near Shenandoah, Virginia, from the [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) dataset on AWS (Terrarium encoding). It covers zoom 12, tiles x 1155–1157 and y 1570–1572, at about 29.9 m per pixel. Every one of these tiles comes from a single source, USGS 3DEP (formerly NED) at 1/3 arc-second (`USGS_NED_13_n39w079`).

3DEP data is in the public domain. The USGS asks for this credit when the data is redistributed or published, and the [Terrain Tiles attribution guide](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) repeats the request:

> 3DEP data courtesy of the U.S. Geological Survey

The file is a crop of the 768 × 768 pixel mosaic of those tiles. Heights are quantised to 16 bits between 166.6 m and 1229.8 m. Only the pixels that the résumé's "back and forth" ranges in `src/resume/mountains.ts` sample, plus a one-pixel margin, hold data; every other pixel is 0, meaning no data. A crop that samples outside that area throws an error, so a new composition needs this file regenerated from the tiles. `terrain.ts` documents the binary layout.
