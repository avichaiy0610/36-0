// Badges for the European qualifying opponents → /crests/eu/<id>.png
//
// Same source as the Israeli crests (TheSportsDB), but these clubs are not in
// our data, so the mapping from our id to a searchable English name lives here.
// A club can be listed under more than one spelling; the first hit that returns
// a badge wins.
//
// Existing files are LEFT ALONE unless --force is passed. That is deliberate:
// Hapoel Be'er Sheva once came back as the basketball club, and a re-run that
// silently overwrites a hand-checked badge is how that survives unnoticed.
//
//   node scripts/fetch_eu_crests.js [--force]
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'crests', 'eu');
const FORCE = process.argv.includes('--force');

// [country, ...spellings]. The country is not decoration: searching "Flora"
// returns a club in SURINAME first, and "Maribor" returns the youth side. Both
// were caught only because the country came back in the response, so it is now
// a hard filter rather than something to read afterwards.
const QUERY = {
  'eu-kalju':      ['Estonia',     'Nomme Kalju'],
  'eu-flora':      ['Estonia',     'Flora Tallinn', 'FC Flora'],
  'eu-kairat':     ['Kazakhstan',  'Kairat', 'FC Kairat'],
  'eu-sheriff':    ['Moldova',     'Sheriff Tiraspol'],
  'eu-zilina':     ['Slovakia',    'MSK Zilina', 'Zilina'],
  'eu-copenhagen': ['Denmark',     'FC Copenhagen', 'Copenhagen'],
  'eu-zvezda':     ['Serbia',      'Crvena Zvezda', 'Red Star Belgrade'],
  'eu-maribor':    ['Slovenia',    'NK Maribor', 'Maribor'],
  'eu-basel':      ['Switzerland', 'FC Basel', 'Basel'],
  'eu-salzburg':   ['Austria',     'Red Bull Salzburg'],
  'eu-bate':       ['Belarus',     'BATE Borisov'],
  'eu-celtic':     ['Scotland',    'Celtic'],
  'eu-real':         ['Spain', 'Real Madrid'],
  'eu-barca':        ['Spain', 'Barcelona'],
  'eu-mancity':      ['England', 'Manchester City'],
  'eu-bayern':       ['Germany', 'Bayern Munich'],
  'eu-liverpool':    ['England', 'Liverpool'],
  'eu-psg':          ['France', 'Paris Saint Germain'],
  'eu-inter':        ['Italy', 'Inter Milan'],
  'eu-dortmund':     ['Germany', 'Borussia Dortmund'],
  'eu-leipzig':      ['Germany', 'RB Leipzig'],
  'eu-arsenal':      ['England', 'Arsenal'],
  'eu-atletico':     ['Spain', 'Atletico Madrid'],
  'eu-leverkusen':   ['Germany', 'Bayer Leverkusen'],
  'eu-juventus':     ['Italy', 'Juventus'],
  'eu-milan':        ['Italy', 'AC Milan'],
  'eu-atalanta':     ['Italy', 'Atalanta'],
  'eu-benfica':      ['Portugal', 'Benfica'],
  'eu-porto':        ['Portugal', 'FC Porto', 'Porto'],
  'eu-bilbao':       ['Spain', 'Athletic Bilbao'],
  'eu-sporting':     ['Portugal', 'Sporting CP'],
  'eu-feyenoord':    ['The Netherlands', 'Feyenoord'],
  'eu-psv':          ['The Netherlands', 'PSV Eindhoven'],
  'eu-lille':        ['France', 'Lille OSC', 'LOSC Lille', 'Losc Lille'],
  'eu-shakhtar':     ['Ukraine', 'Shakhtar Donetsk'],
  'eu-zagreb':       ['Croatia', 'Dinamo Zagreb'],
  'eu-youngboys':    ['Switzerland', 'Young Boys'],
  'eu-olympiacos':   ['Greece', 'Olympiacos'],
  'eu-villa':        ['England', 'Aston Villa'],
  'eu-monaco':       ['Monaco', 'Monaco', 'AS Monaco'],
  'eu-stuttgart':    ['Germany', 'VfB Stuttgart'],
  'eu-girona':       ['Spain', 'Girona'],
  'eu-sparta':       ['Czechia', 'Sparta Prague'],
  'eu-brest':        ['France', 'Brest'],
  'eu-sturm':        ['Austria', 'Sturm Graz'],
  'eu-slovan':       ['Slovakia', 'Slovan Bratislava'],
  'eu-chelsea':      ['England', 'Chelsea'],
  'eu-newcastle':    ['England', 'Newcastle United'],
  'eu-napoli':       ['Italy', 'Napoli'],
  'eu-marseille':    ['France', 'Marseille'],
  'eu-galatasaray':  ['Turkey', 'Galatasaray'],
  'eu-ajax':         ['The Netherlands', 'Ajax'],
  'eu-brugge':       ['Belgium', 'Club Brugge'],
  'eu-rangers':      ['Scotland', 'Rangers'],
  /* -- the Europa League and Conference League fields -------------------------
     Added with the three-competition rework. Same rule as above: the country is
     a hard filter, because "Riga" finds a basketball side and "Astana" finds a
     cycling team. A club that really plays in two competitions keeps ONE id and
     one badge - Besiktas, Sheriff and Astana all qualify twice over. */
  'eu-roma': ['Italy', 'AS Roma', 'Roma'],
  'eu-villarreal': ['Spain', 'Villarreal'],
  'eu-betis': ['Spain', 'Real Betis', 'Betis'],
  'eu-lyon': ['France', 'Olympique Lyonnais', 'Lyon'],
  'eu-fener': ['Turkey', 'Fenerbahce'],
  'eu-sociedad': ['Spain', 'Real Sociedad'],
  'eu-braga': ['Portugal', 'Sporting Braga', 'Braga'],
  'eu-nice': ['France', 'OGC Nice', 'Nice'],
  'eu-hoffenheim': ['Germany', 'Hoffenheim', '1899 Hoffenheim'],
  'eu-unionsg': ['Belgium', 'Union Saint-Gilloise', 'Royale Union SG'],
  'eu-slavia': ['Czechia', 'Slavia Prague', 'SK Slavia Praha'],
  'eu-ferencvaros': ['Hungary', 'Ferencvaros', 'Ferencvarosi TC'],
  'eu-paok': ['Greece', 'PAOK', 'PAOK Salonika'],
  'eu-az': ['The Netherlands', 'AZ Alkmaar', 'AZ'],
  'eu-anderlecht': ['Belgium', 'Anderlecht', 'RSC Anderlecht'],
  'eu-twente': ['The Netherlands', 'FC Twente', 'Twente'],
  'eu-midtjylland': ['Denmark', 'Midtjylland', 'FC Midtjylland'],
  'eu-plzen': ['Czechia', 'Viktoria Plzen'],
  'eu-bodo': ['Norway', 'Bodo/Glimt', 'FK Bodo Glimt'],
  'eu-malmo': ['Sweden', 'Malmo FF', 'Malmo'],
  'eu-lask': ['Austria', 'LASK', 'LASK Linz'],
  'eu-qarabag': ['Azerbaijan', 'Qarabag', 'Qarabag FK'],
  'eu-ludogorets': ['Bulgaria', 'Ludogorets', 'Ludogorets Razgrad'],
  'eu-besiktas': ['Turkey', 'Besiktas'],
  'eu-elfsborg': ['Sweden', 'Elfsborg', 'IF Elfsborg'],
  'eu-nicosia': ['Cyprus', 'Apollon Limassol'],
  'eu-rfs': ['Latvia', 'RFS', 'FK RFS'],
  'eu-backa': ['Serbia', 'TSC Backa Topola', 'FK TSC'],
  'eu-aek-larnaca': ['Cyprus', 'AEK Larnaca'],
  'eu-slovacko': ['Czechia', 'Slovacko', '1. FC Slovacko'],
  'eu-petrocub': ['Moldova', 'Petrocub', 'Petrocub Hincesti'],
  'eu-noah': ['Armenia', 'FC Noah', 'Noah'],
  'eu-fiorentina': ['Italy', 'Fiorentina', 'ACF Fiorentina'],
  'eu-rapid': ['Austria', 'Rapid Vienna', 'SK Rapid Wien'],
  'eu-legia': ['Poland', 'Legia Warsaw', 'Legia Warszawa'],
  'eu-gent': ['Belgium', 'KAA Gent', 'Gent'],
  'eu-djurgarden': ['Sweden', 'Djurgardens IF', 'Djurgarden'],
  'eu-heidenheim': ['Germany', 'Heidenheim', '1. FC Heidenheim'],
  'eu-jagiellonia': ['Poland', 'Jagiellonia Bialystok'],
  'eu-cercle': ['Belgium', 'Cercle Brugge'],
  'eu-vikingur': ['Iceland', 'Vikingur Reykjavik', 'Vikingur'],
  'eu-panathinaikos': ['Greece', 'Panathinaikos'],
  'eu-lugano': ['Switzerland', 'Lugano', 'FC Lugano'],
  'eu-hearts': ['Scotland', 'Heart of Midlothian', 'Hearts'],
  'eu-shamrock': ['Ireland', 'Shamrock Rovers'],
  'eu-mlada': ['Czechia', 'Mlada Boleslav'],
  'eu-astana': ['Kazakhstan', 'FC Astana', 'Astana'],
  'eu-borac': ['Bosnia and Herzegovina', 'Borac Banja Luka'],
  'eu-heerenveen': ['The Netherlands', 'Heerenveen', 'SC Heerenveen'],
  'eu-brondby': ['Denmark', 'Brondby', 'Brondby IF'],
  'eu-omonia': ['Cyprus', 'Omonia Nicosia', 'AC Omonia'],
  'eu-larne': ['Northern Ireland', 'Larne', 'Larne FC'],
  'eu-pafos': ['Cyprus', 'Pafos FC', 'Pafos'],
  'eu-celje': ['Slovenia', 'NK Celje', 'Celje'],
  'eu-tns': ['Wales', 'The New Saints FC', 'TNS', 'New Saints'],
  'eu-hjk': ['Finland', 'HJK Helsinki', 'HJK'],
  'eu-molde': ['Norway', 'Molde', 'Molde FK'],
  'eu-olimpija': ['Slovenia', 'Olimpija Ljubljana'],
  'eu-milsami': ['Moldova', 'Milsami Orhei', 'Milsami'],
  'eu-vitoria': ['Portugal', 'Vitoria Guimaraes'],
  'eu-panevezys': ['Lithuania', 'Panevezys', 'FK Panevezys'],
  'eu-backatopola': ['Serbia', 'Radnicki 1923', 'Radnicki Kragujevac'],
  'eu-dinamo-minsk': ['Belarus', 'Dinamo Minsk', 'FC Dinamo Minsk'],
  'eu-st-gallen': ['Switzerland', 'St. Gallen', 'FC St Gallen'],
  'eu-shelbourne': ['Ireland', 'Shelbourne', 'Shelbourne FC'],
  'eu-paksi': ['Hungary', 'Paksi FC', 'Paks'],
  'eu-paks': ['Hungary', 'Paksi FC', 'Paks'],
  'eu-differdange': ['Luxembourg', 'Differdange 03', 'FC Differdange'],
  'eu-hibernians': ['Malta', 'Hibernians', 'Hibernians FC'],
  'eu-vllaznia': ['Albania', 'KF Vllaznia', 'Vllaznia Shkoder', 'Vllaznia'],
  'eu-ordabasy': ['Kazakhstan', 'Ordabasy', 'FC Ordabasy'],
  'eu-sabah': ['Azerbaijan', 'Sabah FC', 'Sabah'],
  'eu-zrinjski': ['Bosnia and Herzegovina', 'Zrinjski Mostar'],
  'eu-levski': ['Bulgaria', 'Levski Sofia'],
  'eu-pyunik': ['Armenia', 'Pyunik Yerevan', 'FC Pyunik', 'Pyunik'],
  'eu-hajduk': ['Croatia', 'Hajduk Split'],
  'eu-rijeka': ['Croatia', 'HNK Rijeka', 'Rijeka'],
  'eu-hamrun': ['Malta', 'Hamrun Spartans'],
  'eu-sligo': ['Ireland', 'Sligo Rovers'],
  'eu-ararat': ['Armenia', 'Ararat-Armenia', 'Ararat Armenia'],
  'eu-vaduz': ['Liechtenstein', 'FC Vaduz', 'Vaduz'],
  'eu-zira': ['Azerbaijan', 'Zira', 'Zira FK'],
  'eu-neman': ['Belarus', 'Neman Grodno'],
  'eu-wisla': ['Poland', 'Wisla Krakow'],

};

const API = 'https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=';

// Anchored on word boundaries. An unanchored "B" alternative matched the b in
// "Maribor", threw away every real candidate, and left the youth side as the
// only thing the search could still return.
const RESERVE = /\b(youth|juniors?|u1[5-9]|u2[0-3]|women|ladies|reserves?|academy|amateur|b team)\b/i;

async function badgeFor(country, names) {
  for (const n of names) {
    const res = await fetch(API + encodeURIComponent(n));
    if (!res.ok) continue;
    const j = await res.json();
    const teams = j.teams || [];
    const hit = teams.find(t =>
      /soccer/i.test(t.strSport || '') &&          // "Celtic" and "Basel" return other sports first
      t.strBadge &&
      (t.strCountry || '') === country &&          // the Suriname trap
      !RESERVE.test(t.strTeam || ''));             // the youth-side trap
    if (hit) return { url: hit.strBadge, label: `${hit.strTeam} (${hit.strCountry})` };
  }
  return null;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, [country, ...names]] of Object.entries(QUERY)) {
    const file = path.join(OUT, id + '.png');
    if (fs.existsSync(file) && !FORCE) { console.log(`${id.padEnd(15)} כבר קיים, מדלג`); continue; }
    try {
      let found = null;
      for (let attempt = 0; attempt < 3 && !found; attempt++) {
        if (attempt) await new Promise(r => setTimeout(r, 20000));   // 1015/429 backoff
        found = await badgeFor(country, names);
      }
      if (!found) { console.log(`${id.padEnd(15)} ❌ לא נמצא`); continue; }
      const img = await fetch(found.url + '/preview');
      const buf = Buffer.from(await img.arrayBuffer());
      fs.writeFileSync(file, buf);
      console.log(`${id.padEnd(15)} ✓ ${found.label} — ${(buf.length / 1024).toFixed(0)}KB`);
    } catch (e) {
      console.log(`${id.padEnd(15)} ❌ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1200));  // the free tier throttles hard past ~30 calls
  }
})();
