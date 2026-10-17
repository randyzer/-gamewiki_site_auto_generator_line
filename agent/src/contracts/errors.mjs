export class ContractError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ContractError';
    this.code = code;
    for (const [key, value] of Object.entries(details)) {
      if (value !== undefined) this[key] = value;
    }
  }
}

export function contractError(code, message, details) {
  return new ContractError(code, message, details);
}
