import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSymptomKey,
  resolveSymptomInputs,
} from "../utils/symptomUtils.js";

test("normalizes frontend compact symptom ids to model symptom tokens", () => {
  assert.equal(normalizeSymptomKey("highfever"), "highfever");
  assert.equal(normalizeSymptomKey("jointpain"), "jointpain");
  assert.equal(normalizeSymptomKey("throatirritation"), "throatirritation");
  assert.equal(normalizeSymptomKey("muscleweakness"), "muscleweakness");
});

test("normalizes canonical and free-text aliases to model symptom tokens", () => {
  assert.equal(normalizeSymptomKey("high_fever"), "highfever");
  assert.equal(normalizeSymptomKey("joint pain"), "jointpain");
  assert.equal(normalizeSymptomKey("bellypain"), "abdominalpain");
  assert.equal(normalizeSymptomKey("abdominal_pain"), "abdominalpain");
  assert.equal(normalizeSymptomKey("throat irritation"), "throatirritation");
  assert.equal(normalizeSymptomKey("muscle_weakness"), "muscleweakness");
});

test("resolves matched and unmatched symptoms before prediction scoring", () => {
  const resolution = resolveSymptomInputs(
    ["highfever", "vomiting", "jointpain", "headache", "notarealsymptom"],
    "belly pain; throat_irritation"
  );

  assert.deepEqual(resolution.modelSymptoms, [
    "highfever",
    "vomiting",
    "jointpain",
    "headache",
    "abdominalpain",
    "throatirritation",
  ]);
  assert.deepEqual(resolution.matchedSymptoms, resolution.modelSymptoms);
  assert.deepEqual(resolution.unmatchedInputs, ["notarealsymptom"]);
  assert.equal(resolution.approximatedSymptoms["belly pain"], "abdominalpain");
  assert.equal(resolution.approximatedSymptoms.throat_irritation, "throatirritation");
});
