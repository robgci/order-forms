// Pack sizes are supplied in pieces; quantity is entered in the product's selling unit.
export function roundToWholeCases(quantity, {piecesPerUnit, piecesPerCase}) {
  const unitsPerCase = piecesPerCase / piecesPerUnit;
  return Math.ceil(quantity / unitsPerCase) * unitsPerCase;
}

export function calculatePackaging(quantity, {piecesPerUnit, piecesPerCase, casesPerPallet}) {
  const pieces = quantity * piecesPerUnit;
  const cases = pieces / piecesPerCase;
  return {pieces, cases, pallets: cases / casesPerPallet};
}

export function formatPackCount(value) {
  if (value > 0 && value < 0.001) return '<0.001';
  return new Intl.NumberFormat('en-US', {maximumFractionDigits: 3}).format(value);
}
