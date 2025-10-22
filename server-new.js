// server-new.js
// Новый простой сервер для FF Dashboard

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

// CORS настройки
app.use(cors({
    origin: [
        "https://fulfilment-one.ru",
        "https://www.fulfilment-one.ru",
        "http://fulfilment-one.ru",
        "http://www.fulfilment-one.ru",
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    credentials: true
}));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ff_dashboard',
    password: process.env.DB_PASSWORD || 'postgres123',
    port: process.env.DB_PORT || 5432,
});

// API эндпоинты

// Получение пользователей
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Аутентификация
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );
        
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ error: 'Неверные учетные данные' });
        }
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение лидов
app.get('/api/leads', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM leads ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения лидов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание лида
app.post('/api/leads', async (req, res) => {
    try {
        const { name, phone, email, status, source, notes, user_id, inn, kpp, contact_person } = req.body;
        
        const result = await pool.query(
            `INSERT INTO leads (client_name, phone, email, status, source, comments, user_id, inn, kpp, contact_person)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [name, phone, email, status, source, notes, user_id, inn, kpp, contact_person]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка создания лида:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление лида
app.put('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, status, source, notes, inn, kpp, contact_person } = req.body;
        
        const result = await pool.query(
            `UPDATE leads SET client_name = $1, phone = $2, email = $3, status = $4, source = $5, comments = $6, inn = $7, kpp = $8, contact_person = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *`,
            [name, phone, email, status, source, notes, inn, kpp, contact_person, id]
        );
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Лид не найден' });
        }
    } catch (error) {
        console.error('Ошибка обновления лида:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение расчетов
app.get('/api/calculations', async (req, res) => {
    try {
        const { lead_id } = req.query;
        let query = `
            SELECT c.*,
                   l.client_name as lead_name,
                   l.phone as lead_phone
            FROM calculations c
            LEFT JOIN leads l ON c.lead_id = l.id
        `;
        let params = [];

        if (lead_id) {
            query += ' WHERE c.lead_id = $1';
            params.push(lead_id);
        }

        query += ' ORDER BY c.created_at DESC';

        const result = await pool.query(query, params);

        const calculations = await Promise.all(result.rows.map(async (calc) => {
            const itemsResult = await pool.query(
                'SELECT * FROM calculation_items WHERE calculation_id = $1 ORDER BY id',
                [calc.id]
            );
            return { ...calc, items: itemsResult.rows };
        }));
        
        res.json(calculations);
    } catch (error) {
        console.error('Ошибка получения расчетов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание расчета
app.post('/api/calculations', async (req, res) => {
    try {
        const { lead_id, calculation_number, calculation_date, manager, comments, total_services_cost, total_amount, items } = req.body;
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const calcResult = await client.query(
                `INSERT INTO calculations (lead_id, calculation_number, calculation_date, manager, comments, total_services_cost, vat_amount, total_amount, status, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [lead_id, calculation_number, calculation_date, manager, comments, total_services_cost, 0, total_amount, 'draft', 'system']
            );
            
            const calculation = calcResult.rows[0];
            
            if (items && items.length > 0) {
                for (const item of items) {
                    await client.query(
                        `INSERT INTO calculation_items (calculation_id, service_name, quantity, unit_price, total_price)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [calculation.id, item.service_name, item.quantity, item.unit_price, item.total_price]
                    );
                }
            }
            
            await client.query('COMMIT');
            
            const itemsResult = await pool.query(
                'SELECT * FROM calculation_items WHERE calculation_id = $1 ORDER BY id',
                [calculation.id]
            );
            
            res.status(201).json({ ...calculation, items: itemsResult.rows });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка создания расчета:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Обновление расчета
app.put('/api/calculations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lead_id, calculation_number, calculation_date, manager, comments, total_services_cost, total_amount, items } = req.body;
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const calcResult = await client.query(
                `UPDATE calculations
                 SET lead_id = $1, calculation_number = $2, calculation_date = $3, manager = $4, comments = $5,
                     total_services_cost = $6, vat_amount = $7, total_amount = $8, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $9 RETURNING *`,
                [lead_id, calculation_number, calculation_date, manager, comments, total_services_cost, 0, total_amount, id]
            );
            
            if (calcResult.rows.length === 0) {
                return res.status(404).json({ error: 'Расчет не найден' });
            }
            
            await client.query('DELETE FROM calculation_items WHERE calculation_id = $1', [id]);
            
            if (items && items.length > 0) {
                for (const item of items) {
                    await client.query(
                        `INSERT INTO calculation_items (calculation_id, service_name, quantity, unit_price, total_price)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [id, item.service_name, item.quantity, item.unit_price, item.total_price]
                    );
                }
            }
            
            await client.query('COMMIT');
            
            const itemsResult = await pool.query(
                'SELECT * FROM calculation_items WHERE calculation_id = $1 ORDER BY id',
                [id]
            );
            
            res.json({ ...calcResult.rows[0], items: itemsResult.rows });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Ошибка обновления расчета:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Получение настроек
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения настроек:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение напоминаний
app.get('/api/reminders', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reminders ORDER BY date_time DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения напоминаний:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение клиентов
app.get('/api/clients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения клиентов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение цен
app.get('/api/prices', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prices ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения цен:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`🚀 FF Dashboard API запущен на порту ${port}`);
    console.log(`📅 Логирование запросов включено`);
    console.log(`🗄️ Подключение к БД: ${process.env.DB_NAME || 'ff_dashboard'}`);
});
