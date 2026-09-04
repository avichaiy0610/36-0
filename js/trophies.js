// The silverware, drawn rather than emoji'd.
//
// Five competitions hand out something now, and 🏆 for all of them made a
// dynasty's honours read as one repeated icon. Each of these is a drawing of the
// real object, from its own photograph:
//
//   league  צלחת האליפות     a FLAT plate seen face-on — concentric rings, an
//                            engraved rim carrying footballs at the quarters,
//                            and a mirror disc in the middle. Not a cup at all.
//   cup     גביע המדינה      a lidded urn with a finial, big scrolled handles,
//                            a scalloped collar and a fluted lower bowl, all
//                            standing on a wide drum.
//   ucl     ליגת האלופות     "big ears": thin tubes that leave the shoulders,
//                            rise ABOVE the rim and hook back down.
//   uel     הליגה האירופית   a fluted bowl that flares open at the top, on a
//                            knot of intertwined figures, on a round plinth.
//   uecl    קונפרנס ליג      an hourglass woven from vertical strands, open
//                            enough at the waist to see through.
//
// ── WHY THEY LOOK LIKE METAL ────────────────────────────────────────────────
// The first two attempts drew correct shapes that still read as plastic, and the
// reason was the LIGHTING, not the geometry. A single top-to-bottom gradient is
// how you shade a matte object. Polished silver does the opposite: it mirrors
// the room, so its shading runs ACROSS the form in hard vertical bands — dark
// edge, blown highlight, mid tone, core shadow, second highlight, dark edge.
// That banding is the whole tell, and it is what CHROME below encodes. Flutes
// get the same treatment one rib at a time, which is why the fluted pieces are
// drawn as alternating light and dark strips rather than as outlines.
//
// Deliberately drawings and never replicas, in the site's own hand — the same
// spirit as the crest usage the about page describes. Inline SVG rather than
// image files: five more network requests is five more than this needs, and the
// edge-request budget is real (see docs/CACHING.md).

(function (global) {
  'use strict';

  let _uid = 0;

  const KINDS = {
    league: { he: 'אליפות הליגה',   short: 'אליפות' },
    cup:    { he: 'גביע המדינה',    short: 'גביע' },
    ucl:    { he: 'ליגת האלופות',   short: 'אלופות' },
    uel:    { he: 'הליגה האירופית', short: 'אירופית' },
    uecl:   { he: 'קונפרנס ליג',    short: 'קונפרנס' },
  };

  // The chrome band. Stops are deliberately uneven and hard — a smooth ramp
  // looks like grey plastic, and it is the abrupt light/dark steps that read as
  // a mirror. `d` swaps in the muted palette for a shelf you have not filled.
  function chrome(id, d, vertical) {
    const c = d
      ? ['#3f4653', '#525a68', '#5e6675', '#474e5b', '#383e49', '#4d5462', '#414854', '#333944']
      : ['#7d8899', '#d8e0ea', '#ffffff', '#aeb9c8', '#7b8698', '#eef3f9', '#b9c3d1', '#69747f'];
    return `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">
      <stop offset="0"    stop-color="${c[0]}"/><stop offset=".10" stop-color="${c[1]}"/>
      <stop offset=".22"  stop-color="${c[2]}"/><stop offset=".38" stop-color="${c[3]}"/>
      <stop offset=".54"  stop-color="${c[4]}"/><stop offset=".70" stop-color="${c[5]}"/>
      <stop offset=".86"  stop-color="${c[6]}"/><stop offset="1"   stop-color="${c[7]}"/>
    </linearGradient>`;
  }

  // A ring/disc reads as turned metal when its light runs the other way, so the
  // plate and every collar use a radial pass instead of the band.
  function turned(id, d) {
    return `<radialGradient id="${id}" cx=".35" cy=".3" r=".85">
      <stop offset="0"   stop-color="${d ? '#5b6472' : '#ffffff'}"/>
      <stop offset=".45" stop-color="${d ? '#454c58' : '#c9d2de'}"/>
      <stop offset=".75" stop-color="${d ? '#373d47' : '#8e99a9'}"/>
      <stop offset="1"   stop-color="${d ? '#2c313a' : '#606b7a'}"/>
    </radialGradient>`;
  }

  const BODY = {
    /* ── צלחת האליפות ──────────────────────────────────────────────────────
       Face-on, so it is built as rings rather than a silhouette. The footballs
       at the quarters are what makes it unmistakable at any size. */
    league: (G, T, s, d) => {
      const balls = [[24, 9.6], [45.4, 31], [24, 52.4], [2.6, 31]].map(([x, y]) => `
        <circle cx="${x}" cy="${y}" r="4" fill="url(#${T})" stroke="${s}" stroke-width=".7"/>
        <path d="M${x} ${y - 2.1}l2 1.45-.76 2.35h-2.48l-.76-2.35z" fill="${s}" opacity=".9"/>
        <path d="M${x} ${y - 2.1}v-1.9M${x + 1.98} ${y - .68}l1.8-.6M${x + 1.24} ${y + 1.72}l1.1 1.55
                 M${x - 1.24} ${y + 1.72}l-1.1 1.55M${x - 1.98} ${y - .68}l-1.8-.6"
              stroke="${s}" stroke-width=".55" opacity=".75"/>`).join('');
      // engraved foliage between the footballs: paired leaves on a stem
      const sprig = (cx, cy, rot) => `
        <g transform="translate(${cx} ${cy}) rotate(${rot})" opacity=".65" fill="${s}">
          <path d="M0 0q3.4-1.2 6.6-.4Q3.6 1.6 0 0z"/><path d="M0 0q3.4 1.2 6.6.4Q3.6-1.6 0 0z"/>
          <path d="M-6.6-.4Q-3.4-1.2 0 0q-3.6 1.6-6.6.4z"/><path d="M-6.6.4Q-3.4 1.2 0 0q-3.6-1.6-6.6-.4z"/>
          <circle cx="0" cy="0" r=".85"/>
        </g>`;
      return `
      <circle cx="24" cy="31" r="23" fill="url(#${T})" stroke="${s}" stroke-width=".8"/>
      <circle cx="24" cy="31" r="20.6" fill="none" stroke="${s}" stroke-width=".7" opacity=".8"/>
      ${sprig(24, 14.2, 0)}${sprig(24, 47.8, 0)}${sprig(38.2, 31, 90)}${sprig(9.8, 31, 90)}
      ${sprig(35.6, 19.4, -45)}${sprig(12.4, 42.6, -45)}${sprig(35.6, 42.6, 45)}${sprig(12.4, 19.4, 45)}
      ${balls}
      <circle cx="24" cy="31" r="16.4" fill="url(#${G})" stroke="${s}" stroke-width=".8"/>
      <circle cx="24" cy="31" r="14.6" fill="url(#${T})" stroke="${s}" stroke-width=".6" opacity=".9"/>
      <!-- the matte band that carries אלופת המדינה בכדורגל -->
      <circle cx="24" cy="31" r="12.6" fill="none" stroke="${d ? '#2f353f' : '#9aa5b4'}" stroke-width="3.6"/>
      <circle cx="24" cy="31" r="12.6" fill="none" stroke="${s}" stroke-width="3.6"
              opacity=".5" stroke-dasharray="1.5 1.35"/>
      <circle cx="24" cy="31" r="9.4" fill="url(#${G})" stroke="${s}" stroke-width=".8"/>
      <circle cx="24" cy="31" r="8" fill="none" stroke="${s}" stroke-width=".85"
              opacity=".9" stroke-dasharray=".5 .78"/>
      <circle cx="24" cy="31" r="6.6" fill="url(#${T})" opacity=".85"/>
      <!-- the state emblem at twelve, two sponsor discs at the foot of the band -->
      <circle cx="24" cy="20.2" r="2.4" fill="url(#${T})" stroke="${s}" stroke-width=".7"/>
      <path d="M24 18.9v2.6M22.9 19.4v1.8M25.1 19.4v1.8" stroke="${s}" stroke-width=".45" opacity=".9"/>
      <circle cx="16.1" cy="39.7" r="2" fill="url(#${T})" stroke="${s}" stroke-width=".6"/>
      <circle cx="31.9" cy="39.7" r="2" fill="url(#${T})" stroke="${s}" stroke-width=".6"/>`;
    },

    /* ── גביע המדינה ───────────────────────────────────────────────────────── */
    cup: (G, T, s, d) => {
      const dk = d ? '#333944' : '#7b8698';
      // the fluted lower bowl, one rib at a time
      const flutes = [];
      for (let i = 0; i < 7; i++) {
        const x = 17.4 + i * 2.1;
        flutes.push(`<path d="M${x} 35.2q.55 4.6 2.1 8.4h-2.1q-1.5-3.8-2.05-8.4z"
          fill="${i % 2 ? dk : (d ? '#565e6c' : '#e9eff6')}" opacity=".92"/>`);
      }
      return `
      <!-- finial -->
      <path d="M23.2 2.6q.8-1.5 1.6 0 .3 1-.35 1.5v1.1h-.9V4.1q-.65-.5-.35-1.5z" fill="url(#${T})" stroke="${s}" stroke-width=".55"/>
      <ellipse cx="24" cy="6" rx="2.6" ry="1.35" fill="url(#${G})" stroke="${s}" stroke-width=".6"/>
      <!-- domed lid with its flange -->
      <path d="M13.4 14.3q0-5.6 10.6-5.6t10.6 5.6z" fill="url(#${G})" stroke="${s}" stroke-width=".8"/>
      <path d="M16 11.1q8-2.3 16 0" fill="none" stroke="${s}" stroke-width=".6" opacity=".55"/>
      <path d="M12.2 14.1h23.6v3H12.2z" fill="url(#${G})" stroke="${s}" stroke-width=".8"/>
      <path d="M12.6 15.6h22.8" stroke="${s}" stroke-width=".5" opacity=".5"/>
      <!-- the urn -->
      <path d="M13.9 17.1h20.2q-.7 9.2-2.5 15.2H16.4q-1.8-6-2.5-15.2z" fill="url(#${G})" stroke="${s}" stroke-width=".85"/>
      <ellipse cx="24" cy="24" rx="4.4" ry="3.4" fill="none" stroke="${s}" stroke-width=".6" opacity=".5"/>
      <!-- scalloped collar -->
      <path d="M16.1 32.3h15.8l-.5 2.5H16.6z" fill="url(#${T})" stroke="${s}" stroke-width=".7"/>
      <path d="M16.9 34.8q1.2 1.7 2.4 0 1.2 1.7 2.4 0 1.2 1.7 2.4 0 1.2 1.7 2.4 0 1.2 1.7 2.4 0"
            fill="none" stroke="${s}" stroke-width=".6" opacity=".8"/>
      <!-- fluted lower bowl -->
      <path d="M16.9 34.8h14.2q0 6.8-3.1 9.6h-8q-3.1-2.8-3.1-9.6z" fill="url(#${G})" stroke="${s}" stroke-width=".85"/>
      ${flutes.join('')}
      <!-- the handles: scrolled, from under the flange out and back to the waist -->
      <path d="M13.9 18q-6.6-1.4-8.9 2.7-2.2 4 .5 7.6 2 2.6 5.4 2.9" fill="none" stroke="${s}"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M13.9 18q-5.6-1-7.6 2.4-1.9 3.3.3 6.4 1.7 2.3 4.7 2.6" fill="none"
            stroke="${d ? '#5c6472' : '#dfe6ef'}" stroke-width="1" stroke-linecap="round" opacity=".8"/>
      <path d="M34.1 18q6.6-1.4 8.9 2.7 2.2 4-.5 7.6-2 2.6-5.4 2.9" fill="none" stroke="${s}"
            stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M34.1 18q5.6-1 7.6 2.4 1.9 3.3-.3 6.4-1.7 2.3-4.7 2.6" fill="none"
            stroke="${d ? '#5c6472' : '#dfe6ef'}" stroke-width="1" stroke-linecap="round" opacity=".8"/>
      <!-- stem and the drum it stands on -->
      <path d="M22.4 44.4h3.2v3.3h-3.2z" fill="url(#${G})" stroke="${s}" stroke-width=".7"/>
      <path d="M13.6 47.5h20.8v1.9H13.6z" fill="url(#${T})" stroke="${s}" stroke-width=".7"/>
      <path d="M14.3 49.4h19.4v6.4H14.3z" fill="url(#${G})" stroke="${s}" stroke-width=".85"/>
      <path d="M13.6 55.6h20.8v1.6H13.6z" fill="url(#${T})" stroke="${s}" stroke-width=".7"/>`;
    },

    /* ── ליגת האלופות ──────────────────────────────────────────────────────── */
    ucl: (G, T, s, d) => `
      <!-- the ears, drawn under the body so they tuck behind the shoulders -->
      <path d="M15.4 21.5Q6.4 19.6 4.2 12 2.6 6.2 6.6 3.9q4-2.2 6 1.5 1.6 3-1.6 4.8" fill="none"
            stroke="${s}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15.4 21.5Q6.4 19.6 4.2 12 2.6 6.2 6.6 3.9q4-2.2 6 1.5 1.6 3-1.6 4.8" fill="none"
            stroke="${d ? '#5f6774' : '#eff4fa'}" stroke-width=".95" stroke-linecap="round"/>
      <path d="M32.6 21.5Q41.6 19.6 43.8 12q1.6-5.8-2.4-8.1-4-2.2-6 1.5-1.6 3 1.6 4.8" fill="none"
            stroke="${s}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M32.6 21.5Q41.6 19.6 43.8 12q1.6-5.8-2.4-8.1-4-2.2-6 1.5-1.6 3 1.6 4.8" fill="none"
            stroke="${d ? '#5f6774' : '#eff4fa'}" stroke-width=".95" stroke-linecap="round"/>
      <!-- a slim amphora: shoulders high, drawn well in above the foot -->
      <path d="M15.2 17.6h17.6q0 10.4-2.2 17.6-1.4 4.6-1 8.6H19.4q.4-4-1-8.6-2.2-7.2-2.2-17.6z"
            fill="url(#${G})" stroke="${s}" stroke-width=".85"/>
      <path d="M14.8 14.6q0-2.4 9.2-2.4t9.2 2.4v3H14.8z" fill="url(#${G})" stroke="${s}" stroke-width=".85"/>
      <ellipse cx="24" cy="14.4" rx="9.2" ry="2.5" fill="url(#${T})" stroke="${s}" stroke-width=".7"/>
      <ellipse cx="24" cy="14.4" rx="7" ry="1.6" fill="${d ? '#2c313a' : '#8b97a7'}" opacity=".7"/>
      <!-- the engraved band and the UEFA roundel -->
      <path d="M16.6 22.4q7.4-1.5 14.8 0" fill="none" stroke="${s}" stroke-width=".55" opacity=".55"/>
      <circle cx="24" cy="26.4" r="3.1" fill="url(#${T})" stroke="${s}" stroke-width=".7"/>
      <circle cx="24" cy="26.4" r="1.5" fill="none" stroke="${s}" stroke-width=".6" opacity=".9"/>
      <!-- stepped pedestal -->
      <path d="M18.4 43.8h11.2l1 2.6H17.4z" fill="url(#${G})" stroke="${s}" stroke-width=".8"/>
      <path d="M21.9 46.4h4.2v3.8h-4.2z" fill="url(#${G})" stroke="${s}" stroke-width=".7"/>
      <path d="M16.6 50.2h14.8l1.4 2.8H15.2z" fill="url(#${G})" stroke="${s}" stroke-width=".8"/>
      <path d="M12.8 52.8h22.4v3.9H12.8z" fill="url(#${T})" stroke="${s}" stroke-width=".8"/>`,

    /* ── הליגה האירופית ────────────────────────────────────────────────────── */
    uel: (G, T, s, d) => {
      // the flare, rib by rib — alternating light and dark IS the fluting
      const dk = d ? '#333944' : '#7a8697', lt = d ? '#5a626f' : '#f2f6fb';
      const ribs = [];
      const N = 11;
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N;
        const xt0 = 8.6 + t0 * 30.8, xt1 = 8.6 + t1 * 30.8;
        const xb0 = 18.6 + t0 * 10.8, xb1 = 18.6 + t1 * 10.8;
        ribs.push(`<path d="M${xt0.toFixed(2)} 8.4C${xt0.toFixed(2)} 22 ${xb0.toFixed(2)} 26 ${xb0.toFixed(2)} 36
          h${(xb1 - xb0).toFixed(2)}C${xb1.toFixed(2)} 26 ${xt1.toFixed(2)} 22 ${xt1.toFixed(2)} 8.4z"
          fill="${i % 2 ? dk : lt}" opacity="${i % 2 ? '.9' : '.95'}"/>`);
      }
      return `
      <path d="M8.6 8.4C8.6 22 18.6 26 18.6 36h10.8C29.4 26 39.4 22 39.4 8.4z"
            fill="url(#${G})" stroke="${s}" stroke-width=".85"/>
      <g>${ribs.join('')}</g>
      <path d="M8.6 8.4C8.6 22 18.6 26 18.6 36h10.8C29.4 26 39.4 22 39.4 8.4z"
            fill="none" stroke="${s}" stroke-width=".85"/>
      <ellipse cx="24" cy="8.4" rx="15.4" ry="2.7" fill="url(#${T})" stroke="${s}" stroke-width=".8"/>
      <ellipse cx="24" cy="8.6" rx="12.8" ry="1.8" fill="${d ? '#2b303a' : '#8794a5'}" opacity=".75"/>
      <circle cx="24" cy="15.2" r="2.5" fill="url(#${T})" stroke="${s}" stroke-width=".6"/>
      <!-- the knot of figures: the signature, and not a stem -->
      <path d="M18.4 36h11.2v2.2H18.4z" fill="url(#${T})" stroke="${s}" stroke-width=".7"/>
      <g fill="none" stroke="${s}" stroke-width="1.55" stroke-linecap="round">
        <path d="M19.6 38.6q-2.2 2.6-1.2 5.6.7 2.2 2.6 3"/>
        <path d="M28.4 38.6q2.2 2.6 1.2 5.6-.7 2.2-2.6 3"/>
        <path d="M24 38.4q-3 3-2.4 6.8.35 2.2 1.6 3.2"/>
        <path d="M24 38.4q3 3 2.4 6.8-.35 2.2-1.6 3.2"/>
      </g>
      <g fill="none" stroke="${d ? '#5c646f' : '#e7edf5'}" stroke-width=".6" stroke-linecap="round" opacity=".85">
        <path d="M19.6 38.6q-2.2 2.6-1.2 5.6"/><path d="M28.4 38.6q2.2 2.6 1.2 5.6"/>
      </g>
      <path d="M20.4 43q3.6 2 7.2 0" fill="none" stroke="${s}" stroke-width="1.3" stroke-linecap="round"/>
      <!-- the plinth -->
      <path d="M18.8 48.2h10.4v1.6H18.8z" fill="url(#${T})" stroke="${s}" stroke-width=".6"/>
      <path d="M11.6 49.6h24.8v6.6H11.6z" fill="url(#${G})" stroke="${s}" stroke-width=".85"/>
      <path d="M11.9 51.4h24.2M11.9 54.4h24.2" stroke="${s}" stroke-width=".55" opacity=".5"/>`;
    },

    /* ── קונפרנס ליג ───────────────────────────────────────────────────────── */
    uecl: (G, T, s, d) => {
      const N = 13, strands = [], solid = [];
      for (let i = 0; i < N; i++) {
        const t  = i / (N - 1);
        const xt = 9 + t * 30;
        const xw = 19.4 + t * 9.2;
        const xb = 10.2 + t * 27.6;
        // the whole strand, top to foot
        strands.push(`M${xt.toFixed(2)} 8C${xt.toFixed(2)} 20 ${xw.toFixed(2)} 24 ${xw.toFixed(2)} 33` +
                     `C${xw.toFixed(2)} 43 ${xb.toFixed(2)} 47 ${xb.toFixed(2)} 55`);
        // the closed upper half, where the strands sit tight against each other
        if (i < N - 1) {
          const t2 = (i + 1) / (N - 1);
          const xt2 = 9 + t2 * 30, xw2 = 19.4 + t2 * 9.2;
          solid.push(`<path d="M${xt.toFixed(2)} 8C${xt.toFixed(2)} 20 ${xw.toFixed(2)} 24 ${xw.toFixed(2)} 33
            h${(xw2 - xw).toFixed(2)}C${xw2.toFixed(2)} 24 ${xt2.toFixed(2)} 20 ${xt2.toFixed(2)} 8z"
            fill="${i % 2 ? (d ? '#333944' : '#7c8899') : (d ? '#5a626f' : '#f1f5fa')}"/>`);
        }
      }
      return `
      <g>${solid.join('')}</g>
      <g fill="none" stroke="${s}" stroke-width=".95" stroke-linecap="round">
        ${strands.map(dd => `<path d="${dd}"/>`).join('')}
      </g>
      <g fill="none" stroke="${d ? '#5f6774' : '#ffffff'}" stroke-width=".38" stroke-linecap="round" opacity=".8">
        ${strands.filter((_, i) => i % 2 === 0).map(dd => `<path d="${dd}"/>`).join('')}
      </g>
      <path d="M9 8C9 20 19.4 24 19.4 33s-9.2 13-9.2 22M39 8c0 12-10.4 16-10.4 25s9.2 13 9.2 22"
            fill="none" stroke="${s}" stroke-width="1.15" stroke-linecap="round"/>
      <ellipse cx="24" cy="7.8" rx="15" ry="2.5" fill="url(#${T})" stroke="${s}" stroke-width=".8"/>
      <ellipse cx="24" cy="8" rx="12.4" ry="1.6" fill="${d ? '#2b303a' : '#8794a5'}" opacity=".7"/>
      <circle cx="24" cy="17.6" r="3.5" fill="url(#${T})" stroke="${s}" stroke-width=".8"/>
      <circle cx="24" cy="17.6" r="1.7" fill="none" stroke="${s}" stroke-width=".65"/>
      <path d="M10.2 50.6h27.6" stroke="${s}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M10.2 50.6h27.6" stroke="${d ? '#5a626f' : '#e9eff6'}" stroke-width=".8" stroke-linecap="round"/>
      <path d="M10.2 55.2h27.6" stroke="${s}" stroke-width="1.9" stroke-linecap="round"/>`;
    },
  };

  // `muted` draws the same object in cold grey — an honour you have NOT won, so
  // a cabinet can show its empty shelves without a second set of drawings.
  //
  // The drawings below are the FALLBACK. Where js/trophy-art.js supplies a
  // photograph of the real trophy (built by scripts/build_trophies.py, inlined
  // as a data URI so it costs no request), that is used instead — a photo is a
  // likeness in a way a hand-written path never quite manages. A shelf you have
  // not filled greys the photo out with a filter, which is the same promise the
  // muted palette makes for the drawings.
  function trophySVG(kind, opts) {
    const o = opts || {};
    const size = o.size || 34;
    const art = (typeof TROPHY_ART !== 'undefined') && TROPHY_ART[kind];
    if (art) {
      const title = (KINDS[kind] || {}).he || kind;
      return `<img class="trophy trophy-${kind}${o.muted ? ' trophy-muted' : ''}"
        src="${art}" alt="${title}" title="${title}" loading="lazy"
        width="${Math.round(size * 0.8)}" height="${Math.round(size * 60 / 48)}"
        style="object-fit:contain">`;
    }
    const body = BODY[kind];
    if (!body) return '';
    const n = ++_uid;
    const G = 'tg' + n, T = 'tt' + n;
    const d = !!o.muted;
    const stroke = d ? '#20252d' : '#55606f';
    const title = (KINDS[kind] || {}).he || kind;
    return `<svg class="trophy trophy-${kind}${d ? ' trophy-muted' : ''}" viewBox="0 0 48 60"
      width="${size}" height="${Math.round(size * 60 / 48)}" role="img" aria-label="${title}">
      <title>${title}</title>
      <defs>${chrome(G, d)}${turned(T, d)}</defs>
      ${body(G, T, stroke, d)}
    </svg>`;
  }

  function trophyName(kind, short) {
    const k = KINDS[kind];
    return k ? (short ? k.short : k.he) : kind;
  }

  global.trophySVG  = trophySVG;
  global.trophyName = trophyName;
  global.TROPHY_KINDS = Object.keys(KINDS);
})(window);
