// Career graph and proof of completion. No DOM, random draws, or rating changes.
const JourneyEngine = (() => {
  function create(squads, fits) {
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
    function links(name, c) {
      return career(name).filter(s => s.id !== c.currentId && !c.visited.includes(s.id));
    }
    function candidates(c) {
      const squad = byId.get(c.currentId);
      if (!squad) return [];
      return squad.players.filter(p => !c.usedNames.includes(p.name))
        .map(p => ({ player: p, slots: c.remaining.map((pos, i) => fits(p, pos) ? i : -1).filter(i => i >= 0) }))
        .filter(p => p.slots.length)
        .sort((a, b) => career(b.player.name).length - career(a.player.name).length ||
          a.player.name.localeCompare(b.player.name));
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
        .filter(x => x.count).sort((a, b) => b.count - a.count || a.s.id.localeCompare(b.s.id)).map(x => x.s);
    }
    function continuation(name, c, budget) {
      if (!c.remaining.length) return true;
      const natural = ranked(links(name, c), c);
      for (const s of natural) if (solve(entered(c, s, false), budget)) return true;
      if (c.breakLeft && budget.left > 0) {
        const rest = ranked(squads.filter(s => s.id !== c.currentId && !c.visited.includes(s.id)), c);
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
        for (const i of option.slots) {
          if (continuation(option.player.name, taken(c, option.player.name, i), budget)) {
            if (proofs.size > 20000) proofs.clear();
            proofs.set(k, true);
            return true;
          }
        }
      }
      return false;
    }
    function choices(c) {
      return candidates(c).map(({ player, slots }) => ({ name: player.name,
        slots: slots.filter(i => continuation(player.name, taken(c, player.name, i), { left: 300 })),
        links: links(player.name, c) })).filter(p => p.slots.length);
    }
    function destinations(name, c) {
      if (!c.remaining.length) return [];
      return ranked(links(name, c), c).filter(s => solve(entered(c, s, false)));
    }
    function escapes(c) {
      if (!c.breakLeft || !c.remaining.length) return [];
      return ranked(squads.filter(s => s.id !== c.currentId && !c.visited.includes(s.id)), c)
        .filter(s => solve(entered(c, s, true)));
    }
    function starts(remaining) {
      return squads.filter(s => solve({ currentId: s.id, remaining, usedNames: [], visited: [s.id], breakLeft: 1 }));
    }
    return { choices, destinations, escapes, starts, career, squad: id => byId.get(id) || null };
  }
  return { create };
})();
