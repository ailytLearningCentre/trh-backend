const profiles = require('./prakritiProfiles.json');
function report(record) {
  const type = record.resultType;
  // TODO: Add doctor-approved dual/Sama report content. Never infer guidance.
  const profile = profiles[type] || {
    prakritiType: type,
    displayName: type === 'sama' ? 'Balanced Vata-Pitta-Kapha' : `${type.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join('-')} Prakriti`,
    summary: 'Your result includes multiple doshas.', traits: [], about: '', reflections: [],
    guidanceText: 'Report content for this Prakriti is awaiting approved guidance.', themeKey: type,
  };
  return { id: String(record._id), familyMemberId: record.familyMemberId || 'self', ...profile, contentAvailable: Boolean(profiles[type]), completedAt: record.completedAt, questionnaireVersion: record.questionnaireVersion, reportVersion: record.reportVersion };
}
module.exports = { report };
