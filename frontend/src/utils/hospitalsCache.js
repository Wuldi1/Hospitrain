const HOSPITALS_MAP_STORAGE_KEY = 'hospitalsByIdMap';

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export const getHospitalsMap = () => {
  try {
    const raw = localStorage.getItem(HOSPITALS_MAP_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return isObject(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

export const saveHospitalsMap = (hospitals = []) => {
  if (!Array.isArray(hospitals) || hospitals.length === 0) {
    return getHospitalsMap();
  }

  const currentMap = getHospitalsMap();
  const nextMap = { ...currentMap };

  hospitals.forEach((hospital) => {
    const id = hospital?.id;
    const name = hospital?.name;
    if (id == null || !name) {
      return;
    }
    nextMap[String(id)] = name;
  });

  try {
    localStorage.setItem(HOSPITALS_MAP_STORAGE_KEY, JSON.stringify(nextMap));
  } catch (error) {
    // Ignore write failures and return in-memory map.
  }

  return nextMap;
};

export const resolveHospitalName = (hospitalIdOrName, hospitalsMap = getHospitalsMap()) => {
  if (!hospitalIdOrName) {
    return '';
  }
  const resolved = hospitalsMap[String(hospitalIdOrName)];
  return resolved || hospitalIdOrName;
};
