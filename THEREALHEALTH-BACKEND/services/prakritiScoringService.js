const questionIds = Object.freeze(['build', 'skin', 'appetite', 'digestion', 'energy', 'sleep', 'temperature', 'stress', 'activity', 'temperament']);
const doshas = Object.freeze(['vata', 'pitta', 'kapha']);
const resultTypes = [...doshas, 'vata_pitta', 'vata_kapha', 'pitta_kapha', 'sama'];
function calculate(answers) {
  const invalid = () => { const error = new Error('Supply each of the ten questionnaire questions once with a valid selectedDosha.'); error.status = 400; throw error; };
  if (!Array.isArray(answers) || answers.length !== questionIds.length) invalid();
  const seen = new Set();
  const internalScores = { vata: 0, pitta: 0, kapha: 0 };
  for (const answer of answers) {
    if (!answer || !questionIds.includes(answer.questionId) || !doshas.includes(answer.selectedDosha) || seen.has(answer.questionId)) invalid();
    seen.add(answer.questionId);
    internalScores[answer.selectedDosha]++;
  }
  // Exact Flutter rule: one point per answer; all equal maxima are dominant.
  const maximum = Math.max(...Object.values(internalScores));
  const dominant = doshas.filter(dosha => internalScores[dosha] === maximum);
  return { answers: questionIds.map(questionId => ({ questionId, selectedDosha: answers.find(a => a.questionId === questionId).selectedDosha })), internalScores, resultType: dominant.length === 3 ? 'sama' : dominant.join('_') };
}
module.exports = { calculate, questionIds, doshas, resultTypes };
