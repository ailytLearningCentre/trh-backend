const catalog = require('../config/wellnessCatalog.json');
function selection(body) {
  const program = catalog.programs.find(p => p.id === body?.programId && p.active);
  const duration = catalog.durations.find(d => d.months === body?.months);
  const currency = body?.currency;
  if (!program || !duration || !catalog.currencies.includes(currency)) {
    throw Object.assign(new Error('Select a valid program, duration and currency.'), { status: 400 });
  }
  return { programId: program.id, programName: program.displayName, months: duration.months, durationLabel: duration.label, inrAmount: duration.inrAmount, usdAmount: duration.usdAmount, currency, amountMinor: (currency === 'INR' ? duration.inrAmount : duration.usdAmount) * 100, catalogVersion: catalog.version };
}
module.exports = { catalog, selection };
