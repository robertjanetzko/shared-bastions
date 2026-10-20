/** Public identities only. Never resolve another player's character to sort the sheet. */
export function sortOwnerSections(roster, users, { isGM, owned, language = "en" }) {
  const compare = (a, b) => a.localeCompare(b, language);
  const sections = roster.map(entry => {
    const players = (entry.users ?? []).map(id => users.get(id)).filter(user => user && !user.isGM)
      .sort((a, b) => compare(a.name, b.name) || compare(a.id, b.id));
    return { ...entry, playerName: players[0]?.name ?? "", own: owned.has(entry.uuid) };
  });
  return sections.sort((a, b) =>
    Number(!isGM && b.own) - Number(!isGM && a.own)
    || Number(!a.available) - Number(!b.available)
    || Number(!a.playerName) - Number(!b.playerName)
    || compare(a.playerName, b.playerName) || compare(a.name, b.name) || compare(a.uuid, b.uuid));
}

/** Include facilities still on the private owner, as reported by the authorized summary. */
export function facilitySlots(summary, type) {
  if (!summary) return [];
  const { count } = summary[type];
  const allowance = type === "basic" ? summary.basic.free : summary.special.limit;
  const free = Math.max(0, allowance - count);
  return Array.from({ length: type === "basic" ? Math.max(1, free) : free }, () => ({
    label: type === "special" ? "SHARED_BASTION.AddFacility"
      : !free ? "SHARED_BASTION.BuildFacility" : "SHARED_BASTION.FreeFacility"
  }));
}
