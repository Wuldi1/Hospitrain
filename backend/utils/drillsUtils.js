const { v4: uuidv4 } = require('uuid');

const emptyEvaluation = () => ({
  yes: false,
  no: false,
  partial: false,
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

const duplicateSheet = (sheet, nameOverride) => ({
  sheetId: uuidv4(),
  sheetName: nameOverride || `${sheet.sheetName} (העתק)`,
  rows: (sheet.rows || []).map((row) => createRow(row, { dropComment: true })),
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
    columns.push({ key, label: key, type: key === 'time' ? 'time' : 'text' });
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
      type: col.type || (col.key === 'time' ? 'time' : 'text'),
    }))
    : createColumnsFromEvents(schedule.events || []);

  return {
    templateId: schedule.templateId || schedule.scheduleId || schedule.template || schedule.templateName,
    columns,
    events: (schedule.events || []).map(copyScheduleEvent),
  };
};

module.exports = {
  emptyEvaluation,
  normalizeEvaluation,
  createRow,
  copySheet,
  duplicateSheet,
  normalizeSchedule,
};
