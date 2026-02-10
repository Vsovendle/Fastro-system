require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'fastro-investor-secret-2026';

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

console.log("--- SPEND WISE SECURE ENGINE (v6.0) ---");

// Init AI Clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Database Initialization
const DB_FILE = 'db.json';
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ transactions: [], users: [] }));
}

function getDB() {
    try {
        let data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        // Migration: If the old DB was an array, convert it to the new object format
        if (Array.isArray(data)) {
            console.log("[DB] Migrating old array-based database to object-based...");
            return { transactions: data, users: [] };
        }
        if (!data.transactions) data.transactions = [];
        if (!data.users) data.users = [];
        return data;
    } catch (e) {
        console.warn("[DB] Empty or corrupt DB, creating new structure.");
        return { transactions: [], users: [] };
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Default Admin Creation
const db = getDB();
if (db.users.length === 0) {
    console.log("[AUTH] Initializing default admin...");
    const hashedBtn = bcrypt.hashSync('admin123', 10);
    db.users.push({ id: Date.now(), username: 'admin', password: hashedBtn, role: 'admin' });
    saveDB(db);
}

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Session" });
        req.user = user;
        next();
    });
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin rights required" });
    next();
};

// --- AUTH API ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const db = getDB();
    const user = db.users.find(u => u.username === username);

    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ success: true, token, user: { username: user.username, role: user.role } });
    } else {
        res.status(401).json({ success: false, error: "Invalid credentials" });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

// --- USER MANAGEMENT (ADMIN ONLY) ---
app.get('/api/admin/users', authenticateToken, adminOnly, (req, res) => {
    const db = getDB();
    const safeUsers = db.users.map(({ password, ...u }) => u);
    res.json(safeUsers);
});

app.post('/api/admin/users', authenticateToken, adminOnly, async (req, res) => {
    const { username, password, role } = req.body;
    const db = getDB();
    if (db.users.find(u => u.username === username)) return res.status(400).json({ error: "User exists" });

    const newUser = {
        id: Date.now(),
        username,
        password: await bcrypt.hash(password, 10),
        role: role || 'viewer'
    };
    db.users.push(newUser);
    saveDB(db);
    res.json({ success: true });
});

app.delete('/api/admin/users/:id', authenticateToken, adminOnly, (req, res) => {
    const db = getDB();
    db.users = db.users.filter(u => u.id !== parseInt(req.params.id));
    saveDB(db);
    res.json({ success: true });
});

// --- AI CORE (PROTECTED) ---
async function processInvoiceAI(base64Data, mimeType) {
    let rawResult = null;

    // OpenAI Primary
    if (openai) {
        try {
            console.log("[AI] Priority 1: OpenAI...");
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                    role: "user", content: [
                        { type: "text", text: "Return JSON: {\"item\": \"Store\", \"amount\": 0.0, \"category\": \"Type\"}" },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                    ]
                }],
                response_format: { type: "json_object" }
            });
            rawResult = JSON.parse(response.choices[0].message.content);
        } catch (e) { console.warn("[AI] OpenAI Failed"); }
    }

    // Gemini Backup
    if (!rawResult && genAI) {
        try {
            console.log("[AI] Priority 2: Gemini...");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
            const result = await model.generateContent([{ text: "Extract JSON: {\"item\": \"Name\", \"amount\": 0.0, \"category\": \"Type\"}" }, { inlineData: { data: base64Data, mimeType } }]);
            const text = result.response.text();
            rawResult = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
        } catch (e) { console.warn("[AI] Gemini Failed"); }
    }

    const tx = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        item: rawResult?.item || 'Unrecognized Receipt',
        amount: parseFloat(rawResult?.amount || 0.0),
        category: rawResult?.category || 'Other'
    };

    const db = getDB();
    db.transactions.unshift(tx);
    saveDB(db);
    return tx;
}

// --- TRANSACTION API (PROTECTED) ---
// --- PHASE 2: INTELLIGENCE ENGINE ---

// 1. AI Assistant Chat
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
        const { query } = req.body;
        const db = getDB();
        const context = `
            User Question: ${query}
            Transactions: ${JSON.stringify(db.transactions.slice(-20))}
            Total Spend: ${db.transactions.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0)}
            Answer concisely as the Spend Wise AI Assistant.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: "You are the Spend Wise AI Assistant. Help users analyze their spending patterns using the provided context." }, { role: "user", content: context }]
        });

        res.json({ success: true, answer: response.choices[0].message.content });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// 2. Subscription Detection
app.get('/api/intel/subscriptions', authenticateToken, (req, res) => {
    const db = getDB();
    const counts = {};
    db.transactions.forEach(t => {
        counts[t.item] = (counts[t.item] || 0) + 1;
    });
    // Flag anything appearing more than twice as a potential subscription
    const subs = db.transactions.filter(t => counts[t.item] > 1 && (t.amount > 0));
    const uniqueSubs = [...new Map(subs.map(item => [item.item, item])).values()];
    res.json(uniqueSubs);
});

// 3. System Health Monitoring
app.get('/api/intel/health', authenticateToken, (req, res) => {
    res.json({
        engine: "Spend Wise Secure v6.0",
        uptime: process.uptime(),
        ai_nodes: {
            openai: openai ? "ONLINE" : "OFFLINE",
            gemini: genAI ? "ONLINE" : "OFFLINE"
        },
        database: {
            size: JSON.stringify(getDB()).length,
            records: getDB().transactions.length
        }
    });
});

app.get('/api/transactions', authenticateToken, (req, res) => {
    res.json(getDB().transactions);
});

app.post('/api/upload', authenticateToken, upload.array('invoices'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) throw new Error("No files uploaded");

        console.log(`[UPLOAD] Processing batch of ${req.files.length} receipts...`);
        const results = [];

        for (const file of req.files) {
            try {
                const tx = await processInvoiceAI(file.buffer.toString('base64'), file.mimetype);
                results.push({ success: true, transaction: tx });
            } catch (err) {
                console.error(`[UPLOAD] Error processing file: ${err.message}`);
                results.push({ success: false, error: err.message });
            }
        }

        res.json({ success: true, results });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/transactions/manual', authenticateToken, (req, res) => {
    const db = getDB();
    const tx = { id: Date.now(), date: new Date().toISOString().split('T')[0], ...req.body };
    db.transactions.unshift(tx);
    saveDB(db);
    res.json({ success: true });
});

app.delete('/api/transactions', authenticateToken, adminOnly, (req, res) => {
    const db = getDB();
    db.transactions = [];
    saveDB(db);
    res.json({ success: true });
});

app.listen(port, () => console.log(`[SERVER] Secure Fastro running on :${port}`));
