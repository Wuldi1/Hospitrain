require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const templatesRouter = require('./routes/templates');
const drillsRouter = require('./routes/drills');

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Middleware to verify JWT
const authenticateJWT = (req, res, next) => {
    const publicPrefixes = ['/api/auth', '/api/templates', '/api/drills'];
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

app.use('/api/templates', templatesRouter);
app.use('/api/drills', drillsRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
