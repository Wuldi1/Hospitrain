const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', 'files');
let cache;

function ensureTemplateDir() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  }
}

function normalizeTemplate(raw, filePath) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const type = raw.type === 'Schedule' ? 'Schedule' : 'Bakara';
  const templateId = raw.templateId || raw.scheduleId || path.basename(filePath, path.extname(filePath));
  const name = raw.templateName || raw.scheduleName || templateId;
  const base = {
    templateId,
    templateName: name,
    paths: {},
  };

  if (type === 'Bakara') {
    base.bakara = { ...raw, templateId };
    base.paths.bakaraPath = filePath;
    base.templateName = raw.templateName || base.templateName;
  } else {
    base.schedule = {
      ...raw,
      templateId,
      scheduleId: raw.scheduleId || templateId,
      scheduleName: raw.scheduleName || name,
    };
    base.paths.schedulePath = filePath;
    if (!base.templateName) {
      base.templateName = base.schedule.scheduleName;
    }
  }

  return base;
}

function loadTemplates() {
  if (cache) {
    return cache;
  }

  ensureTemplateDir();
  const files = fs.readdirSync(TEMPLATE_DIR).filter((file) => file.endsWith('.json'));
  const templatesMap = new Map();

  files.forEach((file) => {
    const fullPath = path.join(TEMPLATE_DIR, file);
    try {
      const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const normalized = normalizeTemplate(raw, fullPath);
      if (!normalized) {
        return;
      }

      const existing = templatesMap.get(normalized.templateId) || { templateId: normalized.templateId, templateName: normalized.templateName, paths: {} };
      if (normalized.bakara) {
        existing.bakara = normalized.bakara;
        existing.paths.bakaraPath = normalized.paths.bakaraPath;
        existing.templateName = normalized.templateName || existing.templateName;
      }
      if (normalized.schedule) {
        existing.schedule = normalized.schedule;
        existing.paths.schedulePath = normalized.paths.schedulePath;
        if (!existing.templateName) {
          existing.templateName = normalized.templateName;
        }
      }

      templatesMap.set(normalized.templateId, existing);
    } catch (err) {
      console.error(`Failed to load template ${file}`, err);
    }
  });

  cache = Array.from(templatesMap.values());
  return cache;
}

function getTemplateInternal(templateId) {
  return loadTemplates().find((item) => item.templateId === templateId) || null;
}

function listTemplates() {
  return loadTemplates().map(({ templateId, templateName }) => ({
    templateId,
    templateName: templateName || templateId,
  }));
}

function getTemplateBundle(templateId) {
  const template = getTemplateInternal(templateId);
  if (!template) {
    return null;
  }
  const clone = JSON.parse(JSON.stringify(template));
  delete clone.paths;
  return clone;
}

function getTemplateById(templateId) {
  const bundle = getTemplateBundle(templateId);
  return bundle?.bakara || null;
}

function getScheduleTemplateById(templateId) {
  const bundle = getTemplateBundle(templateId);
  return bundle?.schedule || null;
}

function saveTemplatePart(templateId, payload, type) {
  ensureTemplateDir();
  const partKey = type === 'Schedule' ? 'schedule' : 'bakara';
  const filenameSuffix = partKey === 'schedule' ? 'schedule' : 'bakara';
  const bundle = getTemplateInternal(templateId) || { templateId, templateName: payload.templateName || payload.scheduleName || templateId, paths: {} };

  const targetPath =
    (bundle.paths && bundle.paths[`${partKey}Path`]) ||
    path.join(TEMPLATE_DIR, `${templateId}_${filenameSuffix}.json`);

  const normalized = {
    ...payload,
    type,
    templateId,
  };

  if (type === 'Schedule') {
    normalized.scheduleId = payload.scheduleId || templateId;
    normalized.scheduleName = payload.scheduleName || payload.templateName || bundle.templateName || templateId;
  } else {
    normalized.scheduleId = payload.scheduleId || templateId;
    normalized.templateName = payload.templateName || bundle.templateName || templateId;
  }

  fs.writeFileSync(targetPath, JSON.stringify(normalized, null, 2), 'utf8');
  cache = null;
  const refreshed = getTemplateBundle(templateId);
  return refreshed ? refreshed[partKey] : null;
}

function saveBakaraTemplate(templateId, bakara = {}) {
  return saveTemplatePart(templateId, bakara, 'Bakara');
}

function saveScheduleTemplate(templateId, schedule = {}) {
  return saveTemplatePart(templateId, schedule, 'Schedule');
}

module.exports = {
  listTemplates,
  getTemplateBundle,
  getTemplateById,
  getScheduleTemplateById,
  saveBakaraTemplate,
  saveScheduleTemplate,
};
