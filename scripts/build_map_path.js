// Turns real border geometry into the SVG path the gauntlet map draws.
// The two polygons are merged into ONE silhouette — a single outline with no
// internal lines — and projected to the map's viewBox.
//
//   node scripts/build_map_path.js > /tmp/path.txt
const SOURCES = [
  'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/ISR.geo.json',
  'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/PSE.geo.json',
];
const VIEW = { w: 300, h: 760, pad: 14 };

(async () => {
  const rings = [];
  for (const url of SOURCES) {
    const g = await (await fetch(url)).json();
    for (const f of g.features) {
      const geom = f.geometry;
      const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
      polys.forEach(p => rings.push(p[0]));            // outer ring only
    }
  }

  const pts = rings.flat();
  const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
  const [lon0, lon1] = [Math.min(...lons), Math.max(...lons)];
  const [lat0, lat1] = [Math.min(...lats), Math.max(...lats)];

  // Mercator-ish: at this latitude a degree of longitude is ~0.85 of a degree of
  // latitude, so scale x by cos(lat) or the country comes out too wide.
  const midLat = (lat0 + lat1) / 2 * Math.PI / 180;
  const kx = Math.cos(midLat);
  const spanX = (lon1 - lon0) * kx, spanY = lat1 - lat0;
  const scale = Math.min((VIEW.w - VIEW.pad * 2) / spanX, (VIEW.h - VIEW.pad * 2) / spanY);
  const offX = (VIEW.w - spanX * scale) / 2, offY = (VIEW.h - spanY * scale) / 2;
  const X = lon => +(offX + (lon - lon0) * kx * scale).toFixed(1);
  const Y = lat => +(offY + (lat1 - lat) * scale).toFixed(1);

  // The two polygons share a long border; drawing them as one path with a
  // nonzero fill renders as a single silhouette, no seam.
  const paths = rings.map(r => 'M ' + r.map(([lon, lat]) => `${X(lon)} ${Y(lat)}`).join(' L ') + ' Z');
  console.log(paths.join(' '));
  console.error(`rings: ${rings.length} · points: ${pts.length} · lon ${lon0.toFixed(2)}–${lon1.toFixed(2)} · lat ${lat0.toFixed(2)}–${lat1.toFixed(2)}`);
  console.error(`city projection: X = ${offX.toFixed(2)} + (lon - ${lon0}) * ${kx.toFixed(4)} * ${scale.toFixed(2)}`);
  console.error(`                 Y = ${offY.toFixed(2)} + (${lat1} - lat) * ${scale.toFixed(2)}`);
})();
