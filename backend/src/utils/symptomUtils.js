const stripToCompactKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['\-\u2013\u2014_]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "");

const toSnakeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['\-\u2013\u2014_]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "_");

export const SYMPTOM_ALIAS_MAP = Object.freeze({
  abdominal_pain: "abdominalpain",
  abdominalpain: "abdominalpain",
  belly_pain: "abdominalpain",
  bellypain: "abdominalpain",
  blood_in_sputum: "bloodinsputum",
  bloodinsputum: "bloodinsputum",
  blurred_vision: "blurredanddistortedvision",
  blurredanddistortedvision: "blurredanddistortedvision",
  breathlessness: "breathlessness",
  burning_micturition: "burningmicturition",
  burningmicturition: "burningmicturition",
  chest_pain: "chestpain",
  chestpain: "chestpain",
  continuous_sneezing: "continuoussneezing",
  continuoussneezing: "continuoussneezing",
  continuous_feel_of_urine: "continuousfeelofurine",
  continuousfeelofurine: "continuousfeelofurine",
  diarrhea: "diarrhoea",
  diarrhoea: "diarrhoea",
  foul_smell_of_urine: "foulsmellofurine",
  foulsmellofurine: "foulsmellofurine",
  high_fever: "highfever",
  highfever: "highfever",
  joint_pain: "jointpain",
  jointpain: "jointpain",
  loss_of_appetite: "lossofappetite",
  lossofappetite: "lossofappetite",
  mild_fever: "mildfever",
  mildfever: "mildfever",
  mucoid_sputum: "mucoidsputum",
  mucoidsputum: "mucoidsputum",
  muscle_pain: "musclepain",
  musclepain: "musclepain",
  muscle_weakness: "muscleweakness",
  muscleweakness: "muscleweakness",
  runny_nose: "runnynose",
  runnynose: "runnynose",
  skin_rash: "skinrash",
  skinrash: "skinrash",
  sore_throat: "throatirritation",
  throat_irritation: "throatirritation",
  throatirritation: "throatirritation",
  weight_gain: "weightgain",
  weightgain: "weightgain",
  weight_loss: "weightloss",
  weightloss: "weightloss",
  yellow_urine: "yellowurine",
  yellowurine: "yellowurine",
  yellowing_of_eyes: "yellowingofeyes",
  yellowingofeyes: "yellowingofeyes",
  yellowish_skin: "yellowishskin",
  yellowishskin: "yellowishskin",
});

const MODEL_SYMPTOM_KEYS = new Set([
  ...Object.values(SYMPTOM_ALIAS_MAP),
  "acidity",
  "anxiety",
  "backpain",
  "blackheads",
  "bladderdiscomfort",
  "blister",
  "chills",
  "congestion",
  "constipation",
  "cough",
  "darkurine",
  "dehydration",
  "dizziness",
  "excessivehunger",
  "fatigue",
  "fever",
  "headache",
  "increasedappetite",
  "indigestion",
  "irritability",
  "itching",
  "lethargy",
  "malaise",
  "nausea",
  "obesity",
  "palpitations",
  "passageofgases",
  "phlegm",
  "polyuria",
  "sweating",
  "vomiting",
]);

export function normalizeSymptomKey(value) {
  const snakeKey = toSnakeKey(value);
  const compactKey = stripToCompactKey(value);
  return SYMPTOM_ALIAS_MAP[snakeKey] || SYMPTOM_ALIAS_MAP[compactKey] || compactKey;
}

export function parseSymptomText(extraText) {
  if (typeof extraText !== "string" || !extraText.trim()) return [];
  return extraText
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveSymptomInputs(symptoms = [], extraText = "") {
  const selectedInputs = Array.isArray(symptoms)
    ? symptoms.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];
  const extraInputs = parseSymptomText(extraText);
  const inputSymptoms = [...new Set([...selectedInputs, ...extraInputs])];
  const modelSymptoms = [];
  const matchedSymptoms = [];
  const approximatedSymptoms = {};
  const unmatchedInputs = [];

  inputSymptoms.forEach((input) => {
    const normalized = normalizeSymptomKey(input);
    if (MODEL_SYMPTOM_KEYS.has(normalized)) {
      modelSymptoms.push(normalized);
      matchedSymptoms.push(normalized);
      if (normalized !== input) {
        approximatedSymptoms[input] = normalized;
      }
    } else {
      unmatchedInputs.push(input);
    }
  });

  return {
    inputSymptoms,
    modelSymptoms: [...new Set(modelSymptoms)],
    matchedSymptoms: [...new Set(matchedSymptoms)],
    approximatedSymptoms,
    unmatchedInputs,
  };
}
