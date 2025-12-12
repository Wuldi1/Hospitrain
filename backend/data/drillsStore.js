const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DRILLS_FILE = path.join(DATA_DIR, 'drills.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DRILLS_FILE)) {
    fs.writeFileSync(DRILLS_FILE, JSON.stringify([], null, 2));
  }
}

function readDrills() {
  ensureStore();
  const raw = fs.readFileSync(DRILLS_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse drills file, resetting store.', err);
    fs.writeFileSync(DRILLS_FILE, JSON.stringify([], null, 2));
    return [];
  }
}

function writeDrills(drills) {
  ensureStore();
  fs.writeFileSync(DRILLS_FILE, JSON.stringify(drills, null, 2));
}

function listDrills() {
  return readDrills();
}

function getDrillById(drillId) {
  const drills = readDrills();
  return drills.find((drill) => drill.drillId === drillId);
}

function saveDrill(drill) {
  const drills = readDrills();
  const index = drills.findIndex((item) => item.drillId === drill.drillId);
  if (index === -1) {
    drills.push(drill);
  } else {
    drills[index] = drill;
  }
  writeDrills(drills);
  return drill;
}

module.exports = {
  listDrills,
  getDrillById,
  saveDrill,
};
