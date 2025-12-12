const express = require('express');
const { listTemplates, getTemplateById } = require('../data/templatesService');

const router = express.Router();

router.get('/', (req, res) => {
  const templates = listTemplates();
  res.json(templates);
});

router.get('/:templateId', (req, res) => {
  const template = getTemplateById(req.params.templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

module.exports = router;
