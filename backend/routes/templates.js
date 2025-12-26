const express = require('express');
const {
  listTemplates,
  getTemplateBundle,
  saveBakaraTemplate,
  saveScheduleTemplate,
} = require('../data/templatesService');

const router = express.Router();

router.get('/', (req, res) => {
  const templates = listTemplates();
  res.json(templates);
});

router.get('/:templateId', (req, res) => {
  const template = getTemplateBundle(req.params.templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

router.put('/:templateId/bakara', (req, res) => {
  try {
    const saved = saveBakaraTemplate(req.params.templateId, req.body || {});
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save bakara template' });
  }
});

router.put('/:templateId/schedule', (req, res) => {
  try {
    const saved = saveScheduleTemplate(req.params.templateId, req.body || {});
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save schedule template' });
  }
});

module.exports = router;
