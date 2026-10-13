// Career graph and proof of completion. No DOM, random draws, or rating changes.
const JourneyEngine = (() => {
  // opts.clubLimit: how many squads of one club a route may enter (0 = no limit).
  function create(squads, fits, opts = {}) {
    const clubLimit = opts.clubLimit || 0;
    const byId = new Map(squads.map(s => [s.id, s]));
    const careers = new Map();
    squads.forEach(s => s.players.forEach(p => {
      if (!careers.has(p.name)) careers.set(p.name, []);
      if (!careers.get(p.name).includes(s)) careers.get(p.name).push(s);
    }));
    const proofs = new Map();
    const career = name => careers.get(name) || [];
    const key = c => [c.currentId, c.remaining.join(','), [...c.usedNames].sort().join('|'),
      [...c.visited].sort().join('|'), c.breakLeft].join(';');
    function open(s, c) {
      if (s.id === c.currentId || c.visited.includes(s.id)) return false;
      return !clubLimit || c.visited.filter(id => byId.get(id) && byId.get(id).teamId === s.teamId).length < clubLimit;
    }
    function links(name, c) {
      return career(name).filter(s => open(s, c));
    }
    function candidates(c) {
      const squad = byId.get(c.currentId);
      if (!squad) return [];
      return squad.players.filter(p => !c.usedNames.includes(p.name))
        .map(p => ({ player: p, slots: c.remaining.map((pos, i) => fits(p, pos) ? i : -1).filter(i => i >= 0) }))
        .filter(p => p.slots.length)
        .sort((a, b) => career(b.player.name).length - career(a.player.name).length ||
          (a.player.name < b.player.name ? -1 : a.player.name > b.player.name ? 1 : 0));
    }
    function entered(c, squad, breaking) {
      return { ...c, currentId: squad.id, visited: [...c.visited, squad.id],
        breakLeft: breaking ? 0 : c.breakLeft };
    }
    function taken(c, name, i) {
      return { ...c, remaining: c.remaining.filter((_, j) => j !== i), usedNames: [...c.usedNames, name] };
    }
    function ranked(pool, c) {
      return pool.map(s => ({ s, count: s.players.filter(p => !c.usedNames.includes(p.name) &&
        c.remaining.some(pos => fits(p, pos))).length }))
        .filter(x => x.count).sort((a, b) => b.count - a.count || (a.s.id < b.s.id ? -1 : 1)).map(x => x.s);
    }
    function continuation(name, c, budget) {
      if (!c.remaining.length) return true;
      const natural = ranked(links(name, c), c);
      for (const s of natural) if (solve(entered(c, s, false), budget)) return true;
      if (c.breakLeft && budget.left > 0) {
        const rest = ranked(squads.filter(s => open(s, c)), c);
        for (const s of rest) if (solve(entered(c, s, true), budget)) return true;
      }
      return false;
    }
    function solve(c, budget = { left: 300 }) {
      if (!c.remaining.length) return true;
      const k = key(c);
      if (proofs.get(k) === true) return true;
      if (--budget.left < 0) return false; // Conservatively hide unproven routes.
      const options = candidates(c);
      for (const option of options) {
        for (const i of distinct(option.slots, c.remaining)) {
          if (continuation(option.player.name, taken(c, option.player.name, i), budget)) {
            if (proofs.size > 20000) proofs.clear();
            proofs.set(k, true);
            return true;
          }
        }
      }
      return false;
    }
    // Two slots of the same position lead to the same futures, so each is proved once.
    function distinct(slots, remaining) {
      const seen = new Set();
      return slots.filter(i => !seen.has(remaining[i]) && seen.add(remaining[i]));
    }
    function choices(c) {
      return candidates(c).map(({ player, slots }) => {
        const ok = new Set(distinct(slots, c.remaining).filter(i =>
          continuation(player.name, taken(c, player.name, i), { left: 300 })).map(i => c.remaining[i]));
        return { name: player.name, slots: slots.filter(i => ok.has(c.remaining[i])), links: links(player.name, c) };
      }).filter(p => p.slots.length);
    }
    // `order` (a shuffled copy of the pool) with `limit` stops at the first proven few,
    // which is all a draw of three needs; without them every squad is proved.
    function firstProven(pool, test, order, limit) {
      const list = order ? order(pool) : pool;
      const out = [];
      for (const s of list) {
        if (test(s)) out.push(s);
        if (limit && out.length >= limit) break;
      }
      return out;
    }
    function destinations(name, c, order, limit) {
      if (!c.remaining.length) return [];
      return firstProven(ranked(links(name, c), c), s => solve(entered(c, s, false)), order, limit);
    }
    function escapes(c, order, limit) {
      if (!c.breakLeft || !c.remaining.length) return [];
      return firstProven(ranked(squads.filter(s => open(s, c)), c),
        s => solve(entered(c, s, true)), order, limit);
    }
    function starts(remaining, order, limit) {
      return firstProven(squads, s => solve({ currentId: s.id, remaining, usedNames: [], visited: [s.id], breakLeft: 1 }),
        order, limit);
    }
    return { choices, destinations, escapes, starts, career, squad: id => byId.get(id) || null };
  }
  return { create };
})();
