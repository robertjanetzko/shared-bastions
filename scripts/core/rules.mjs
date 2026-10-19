import { BastionError } from "./errors.mjs";

const scopes = new Set(["level", "limit", "requirements"]);
const requirement = /^(?:spellcasting|(?:tool|weapon|item|approval):[a-zA-Z0-9][a-zA-Z0-9_-]{0,119})$/;

export function validateRequirements(values) {
  if (!Array.isArray(values) || values.length > 30 || new Set(values).size !== values.length
    || values.some(value => typeof value !== "string" || !requirement.test(value))) throw new BastionError("InvalidRules");
  return values;
}

export function validateExceptions(values) {
  if (!Array.isArray(values) || values.length > scopes.size || new Set(values.map(value => value?.scope)).size !== values.length
    || values.some(value => !value || Object.keys(value).sort().join() !== "reason,scope" || !scopes.has(value.scope)
      || typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 500)) throw new BastionError("InvalidRules");
  return values;
}

export function hasException(facility, scope) {
  return (facility.flags?.["shared-bastion"]?.exceptions ?? []).some(entry => entry.scope === scope && entry.reason?.trim());
}
