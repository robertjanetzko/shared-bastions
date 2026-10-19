/** Stable codes are localized at the UI boundary, never substituted for a failed check. */
export class BastionError extends Error {
  constructor(code) {
    super(code);
    this.name = "BastionError";
    this.code = code;
  }
}
