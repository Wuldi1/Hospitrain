const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getTemplateById, getScheduleTemplateById } = require('../data/templatesService');
const { listDrills, getDrillById, saveDrill } = require('../data/drillsStore');

const router = express.Router();

const emptyEvaluation = () => ({
  yes: false,
  no: false,
  notRelevant: false,
  redFlag: false,
});

const normalizeEvaluation = (evaluation = {}) => {
  const base = emptyEvaluation();
  const validKeys = Object.keys(base);
  const selectedKey = validKeys.find((key) => evaluation[key]);
  if (selectedKey) {
    base[selectedKey] = true;
  }
  return base;
};

const createRow = (payload = {}, { preserveId = false, dropComment = false, keepEvaluation = false } = {}) => ({
  id: preserveId && payload.id ? payload.id : uuidv4(),
  component: payload.component || '',
  category: payload.category || '',
  metric: payload.metric || '',
  evaluation: keepEvaluation && payload.evaluation ? normalizeEvaluation(payload.evaluation) : emptyEvaluation(),
  comment: dropComment ? '' : (payload.comment || ''),
});

const copySheet = (sheet) => ({
  sheetId: sheet.sheetId || uuidv4(),
  sheetName: sheet.sheetName || '',
  rows: (sheet.rows || []).map((row) => createRow(row, { preserveId: true, dropComment: true })),
});

const defaultScheduleOrder = ['serial', 'time', 'from', 'to', 'message', 'notes'];

const createColumnsFromEvents = (events = []) => {
  const seen = new Set();
  const columns = [];

  const addKey = (key) => {
    if (!key || key === 'id' || seen.has(key)) {
      return;
    }
    seen.add(key);
    columns.push({ key, label: key, type: 'text' });
  };

  defaultScheduleOrder.forEach(addKey);
  events.forEach((event) => {
    Object.keys(event || {}).forEach(addKey);
  });

  if (!columns.length) {
    columns.push({ key: 'message', label: 'הודעה', type: 'text' });
  }

  return columns;
};

const copyScheduleEvent = (event = {}) => {
  const base = { id: event.id || uuidv4() };
  Object.keys(event || {}).forEach((key) => {
    if (key === 'id') {
      return;
    }
    base[key] = event[key] || '';
  });
  return base;
};

const normalizeSchedule = (schedule) => {
  if (!schedule) {
    return null;
  }

  const columns = (schedule.columns && schedule.columns.length)
    ? schedule.columns.map((col) => ({
      key: col.key,
      label: col.label || col.key,
      type: col.type || 'text',
    }))
    : createColumnsFromEvents(schedule.events || []);

  return {
    templateId: schedule.templateId || schedule.scheduleId || schedule.template || schedule.templateName,
    columns,
    events: (schedule.events || []).map(copyScheduleEvent),
  };
};

const duplicateSheet = (sheet, nameOverride) => ({
  sheetId: uuidv4(),
  sheetName: nameOverride || `${sheet.sheetName} (העתק)`,
  rows: (sheet.rows || []).map((row) => createRow(row, { dropComment: true })),
});

const updateTimestamp = (drill) => {
  drill.updatedAt = new Date().toISOString();
};

router.get('/', (req, res) => {
  const drills = listDrills();
  res.json(drills);
});

router.get('/public/:drillId', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }
  res.json({
    drillId: drill.drillId,
    name: drill.name,
    hospital: drill.hospitalId || drill.hospital,
    date: drill.date,
    sheets: drill.sheets || [],
    schedule: drill.schedule || null,
  });
});

router.put('/public/:drillId/sheets/:sheetId/rows/:rowId', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }
  const sheet = (drill.sheets || []).find((s) => s.sheetId === req.params.sheetId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }
  const row = sheet.rows.find((r) => r.id === req.params.rowId);
  if (!row) {
    return res.status(404).json({ error: 'Row not found' });
  }

  if (req.body && req.body.evaluation) {
    row.evaluation = normalizeEvaluation(req.body.evaluation);
  }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'comment')) {
    row.comment = req.body.comment || '';
  }

  updateTimestamp(drill);
  saveDrill(drill);
  res.json(row);
});

router.post('/', (req, res) => {
  const { name, hospitalId, date, templateId } = req.body || {};

  if (!name || !hospitalId || !date || !templateId) {
    return res.status(400).json({ error: 'name, hospitalId, date, and templateId are required' });
  }

  const template = getTemplateById(templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  const scheduleTemplate = getScheduleTemplateById(templateId);

  const now = new Date().toISOString();
  const drillId = uuidv4();
  const sheets = (template.sheets || []).map((sheet) => copySheet(sheet));
  const schedule = normalizeSchedule(scheduleTemplate);

  const drill = {
    drillId,
    id: drillId,
    name,
    hospitalId,
    hospital: hospitalId,
    date,
    templateId,
    sheets,
    schedule,
    createdAt: now,
    updatedAt: now,
  };

  saveDrill(drill);
  res.status(201).json(drill);
});

router.put('/:drillId', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }

  const { name, hospitalId, date } = req.body || {};
  if (typeof name === 'string') {
    drill.name = name;
  }
  if (typeof hospitalId === 'string') {
    drill.hospitalId = hospitalId;
    drill.hospital = hospitalId;
  }
  if (typeof date === 'string') {
    drill.date = date;
  }

  updateTimestamp(drill);
  saveDrill(drill);
  res.json(drill);
});

router.get('/:drillId', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }
  res.json(drill);
});

router.put('/:drillId/sheets/:sheetId', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }

  const sheet = drill.sheets.find((s) => s.sheetId === req.params.sheetId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const { sheetName } = req.body || {};
  if (typeof sheetName === 'string') {
    sheet.sheetName = sheetName;
  }

  updateTimestamp(drill);
  saveDrill(drill);
  res.json(sheet);
});

router.post('/:drillId/sheets', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }

  const { sheetName, sheetIdToDuplicate } = req.body || {};
  let newSheet;

  if (sheetIdToDuplicate) {
    const sheetToCopy = drill.sheets.find((s) => s.sheetId === sheetIdToDuplicate);
    if (!sheetToCopy) {
      return res.status(404).json({ error: 'Source sheet not found' });
    }
    newSheet = duplicateSheet(sheetToCopy, sheetName);
  } else {
    newSheet = {
      sheetId: uuidv4(),
      sheetName: sheetName || 'גיליון חדש',
      rows: [],
    };
  }

  drill.sheets.push(newSheet);
  updateTimestamp(drill);
  saveDrill(drill);
  res.status(201).json(newSheet);
});

router.delete('/:drillId/sheets/:sheetId', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }

  const sheetIndex = drill.sheets.findIndex((s) => s.sheetId === req.params.sheetId);
  if (sheetIndex === -1) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  drill.sheets.splice(sheetIndex, 1);
  updateTimestamp(drill);
  saveDrill(drill);
  res.status(204).send();
});

router.post('/:drillId/sheets/:sheetId/rows', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }

  const sheet = drill.sheets.find((s) => s.sheetId === req.params.sheetId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const row = createRow(req.body || {}, { dropComment: false });
  sheet.rows.push(row);

  updateTimestamp(drill);
  saveDrill(drill);
  res.status(201).json(row);
});

router.put('/:drillId/sheets/:sheetId/rows/:rowId', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }

  const sheet = drill.sheets.find((s) => s.sheetId === req.params.sheetId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const row = sheet.rows.find((r) => r.id === req.params.rowId);
  if (!row) {
    return res.status(404).json({ error: 'Row not found' });
  }

  const editableFields = ['component', 'category', 'metric', 'comment'];
  editableFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      row[field] = req.body[field];
    }
  });

  if (req.body && req.body.evaluation) {
    row.evaluation = normalizeEvaluation(req.body.evaluation);
  }

  updateTimestamp(drill);
  saveDrill(drill);
  res.json(row);
});

router.delete('/:drillId/sheets/:sheetId/rows/:rowId', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }

  const sheet = drill.sheets.find((s) => s.sheetId === req.params.sheetId);
  if (!sheet) {
    return res.status(404).json({ error: 'Sheet not found' });
  }

  const rowIndex = sheet.rows.findIndex((r) => r.id === req.params.rowId);
  if (rowIndex === -1) {
    return res.status(404).json({ error: 'Row not found' });
  }

  sheet.rows.splice(rowIndex, 1);
  updateTimestamp(drill);
  saveDrill(drill);
  res.status(204).send();
});

router.put('/:drillId/schedule', (req, res) => {
  const drill = getDrillById(req.params.drillId);
  if (!drill) {
    return res.status(404).json({ error: 'Drill not found' });
  }

  const schedule = normalizeSchedule(req.body || {});
  if (!schedule) {
    return res.status(400).json({ error: 'Schedule payload is invalid' });
  }

  drill.schedule = schedule;
  updateTimestamp(drill);
  saveDrill(drill);
  res.json(drill.schedule);
});

module.exports = router;
