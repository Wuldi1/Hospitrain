const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..');
let cache;

function loadTemplates() {
  if (cache) {
    return cache;
  }

  const files = fs.readdirSync(TEMPLATE_DIR);
  const templates = [];

  files.forEach((file) => {
    if (!file.endsWith('_template.json')) {
      return;
    }
    const fullPath = path.join(TEMPLATE_DIR, file);
    try {
      const template = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (template && template.templateId) {
        templates.push(template);
      }
    } catch (err) {
      console.error(`Failed to load template ${file}`, err);
    }
  });

  cache = templates;
  return cache;
}

function listTemplates() {
  return loadTemplates().map(({ templateId, templateName }) => ({
    templateId,
    templateName,
  }));
}

function getTemplateById(templateId) {
  const template = loadTemplates().find((item) => item.templateId === templateId);
  return template ? JSON.parse(JSON.stringify(template)) : null;
}

module.exports = {
  listTemplates,
  getTemplateById,
};
