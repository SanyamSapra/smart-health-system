export const calculateAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  if (birth > today) return null; // guard against future dates
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};