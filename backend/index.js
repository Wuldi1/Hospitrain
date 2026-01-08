require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const {
    listTemplates,
    getTemplateBundle,
    saveBakaraTemplate,
    saveScheduleTemplate,
    getTemplateById,
    getScheduleTemplateById,
} = require('./data/templatesService');
const { listDrills, getDrillById, saveDrill } = require('./data/drillsStore');
const {
    emptyEvaluation,
    normalizeEvaluation,
    createRow,
    copySheet,
    duplicateSheet,
    normalizeSchedule,
} = require('./utils/drillsUtils');

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.json());

// Middleware to verify JWT
const authenticateJWT = (req, res, next) => {
    const publicPrefixes = ['/api/auth', '/api/drills/public'];
    if (publicPrefixes.some((prefix) => req.path.startsWith(prefix))) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

app.use(authenticateJWT);

app.get('/', (req, res) => {
    res.send('Backend is running');
});

app.post('/api/auth/request-code', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    // Simulate sending a code
    console.log(`Sending code to ${email}`);
    res.status(200).json({ message: 'Code sent successfully' });
});

app.post('/api/auth/verify-code', (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }
    // Simulate code verification
    if (code === '000000') {
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ token });
    } else {
        return res.status(401).json({ error: 'Invalid code' });
    }
});

const hospitals =
    [
        { id: "nahariya", name: "נהריה", region: "צפון" },
        { id: "ziv", name: "זיו (צפת)", region: "צפון" },
        { id: "poriya", name: "פוריה (טבריה)", region: "צפון" },
        { id: "rambam", name: "רמב\"ם (חיפה)", region: "חיפה" },
        { id: "carmel", name: "כרמל (חיפה)", region: "חיפה" },
        { id: "bnai_zion", name: "בני ציון (חיפה)", region: "חיפה" },
        { id: "italy_hospital", name: "האיטלקי (חיפה)", region: "חיפה" },
        { id: "meir", name: "מאיר (כפר סבא)", region: "מרכז" },
        { id: "laniado", name: "לניאדו (נתניה)", region: "מרכז" },
        { id: "ichilov", name: "איכילוב (ת\"א)", region: "תל־אביב" },
        { id: "sheba", name: "שיבא - תל השומר", region: "תל־אביב" },
        { id: "shiba_bilinson", name: "בילינסון (פתח-תקווה)", region: "מרכז" },
        { id: "schneider", name: "שניידר (פתח-תקווה)", region: "מרכז" },
        { id: "wolfson", name: "וולפסון (חולון)", region: "תל־אביב" },
        { id: "haemek", name: "העמק (עפולה)", region: "צפון" },
        { id: "hadassah_ein_kerem", name: "הדסה - עין כרם (ירושלים)", region: "ירושלים" },
        { id: "hadassah_mount", name: "הדסה - הר הצופים (ירושלים)", region: "ירושלים" },
        { id: "shaare_zedek", name: "שערי צדק (ירושלים)", region: "ירושלים" },
        { id: "assuta_ashdod", name: "אסותא אשדוד", region: "דרום" },
        { id: "barzilai", name: "ברזילי (אשקלון)", region: "דרום" },
        { id: "soroka", name: "סורוקה (ב״ש)", region: "דרום" },
        { id: "yoseftal", name: "יוספטל (אילת)", region: "דרום" }
    ];

app.get('/api/hospitals', (req, res) => {
    res.status(200).json(hospitals);
});

app.post('/api/hospitals', (req, res) => {
    const { id, name, region } = req.body;
    if (!id || !name || !region) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const newHospital = { id, name, region };
    hospitals.push(newHospital);
    res.status(201).json(newHospital);
});

// Templates
app.get('/api/templates', (req, res) => {
    res.json(listTemplates());
});

app.get('/api/templates/:templateId', (req, res) => {
    const bundle = getTemplateBundle(req.params.templateId);
    if (!bundle) {
        return res.status(404).json({ error: 'Template not found' });
    }
    res.json(bundle);
});

app.put('/api/templates/:templateId/bakara', (req, res) => {
    try {
        const saved = saveBakaraTemplate(req.params.templateId, req.body || {});
        res.json(saved);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save bakara template' });
    }
});

app.put('/api/templates/:templateId/schedule', (req, res) => {
    try {
        const saved = saveScheduleTemplate(req.params.templateId, req.body || {});
        res.json(saved);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save schedule template' });
    }
});

// Drills public (tester) endpoints
app.get('/api/drills/public/:drillId', (req, res) => {
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

app.put('/api/drills/public/:drillId/sheets/:sheetId/rows/:rowId', (req, res) => {
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

    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.json(row);
});

// Drills
app.get('/api/drills', (req, res) => {
    const drills = listDrills();
    res.json(drills);
});

app.post('/api/drills', (req, res) => {
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

app.put('/api/drills/:drillId', (req, res) => {
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

    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.json(drill);
});

app.get('/api/drills/:drillId', (req, res) => {
    const drill = getDrillById(req.params.drillId);
    if (!drill) {
        return res.status(404).json({ error: 'Drill not found' });
    }
    res.json(drill);
});

app.put('/api/drills/:drillId/sheets/:sheetId', (req, res) => {
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

    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.json(sheet);
});

app.post('/api/drills/:drillId/sheets', (req, res) => {
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
    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.status(201).json(newSheet);
});

app.delete('/api/drills/:drillId/sheets/:sheetId', (req, res) => {
    const drill = getDrillById(req.params.drillId);
    if (!drill) {
        return res.status(404).json({ error: 'Drill not found' });
    }

    const sheetIndex = drill.sheets.findIndex((s) => s.sheetId === req.params.sheetId);
    if (sheetIndex === -1) {
        return res.status(404).json({ error: 'Sheet not found' });
    }

    drill.sheets.splice(sheetIndex, 1);
    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.status(204).send();
});

app.post('/api/drills/:drillId/sheets/:sheetId/rows', (req, res) => {
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

    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.status(201).json(row);
});

app.put('/api/drills/:drillId/sheets/:sheetId/rows/:rowId', (req, res) => {
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

    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.json(row);
});

app.delete('/api/drills/:drillId/sheets/:sheetId/rows/:rowId', (req, res) => {
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
    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.status(204).send();
});

app.put('/api/drills/:drillId/schedule', (req, res) => {
    const drill = getDrillById(req.params.drillId);
    if (!drill) {
        return res.status(404).json({ error: 'Drill not found' });
    }

    const schedule = normalizeSchedule(req.body || {});
    if (!schedule) {
        return res.status(400).json({ error: 'Schedule payload is invalid' });
    }

    drill.schedule = schedule;
    drill.updatedAt = new Date().toISOString();
    saveDrill(drill);
    res.json(drill.schedule);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
