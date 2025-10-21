// server-notifications.js
// Серверная система уведомлений для надежной доставки (адаптировано под существующую таблицу)

const express = require('express');
const { Pool } = require('pg');
const cron = require('node-cron');
const app = express();

// Настройки подключения к БД
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ff_dashboard',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
});

// Telegram настройки
const TELEGRAM_CONFIG = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
    groupId: process.env.TELEGRAM_GROUP_ID || 'YOUR_GROUP_ID'
};

// Проверка напоминаний каждую минуту
cron.schedule('* * * * *', async () => {
    try {
        console.log('🔍 Проверяем напоминания...');
        
        // Используем существующие колонки: date_time вместо datetime
        const query = `
            SELECT * FROM reminders 
            WHERE date_time <= NOW() 
            AND completed = false 
            AND sent = false
        `;
        
        const result = await pool.query(query);
        
        for (const reminder of result.rows) {
            await sendReminderNotification(reminder);
        }
        
    } catch (error) {
        console.error('Ошибка проверки напоминаний:', error);
    }
});

// Отправка напоминания
async function sendReminderNotification(reminder) {
    try {
        // Отправляем Telegram уведомление
        await sendTelegramNotification(reminder);
        
        // Помечаем как отправленное
        await pool.query(
            'UPDATE reminders SET sent = true WHERE id = $1',
            [reminder.id]
        );
        
        console.log(`✅ Напоминание отправлено: ${reminder.text}`);
        
    } catch (error) {
        console.error('Ошибка отправки напоминания:', error);
    }
}

// Отправка Telegram уведомления
async function sendTelegramNotification(reminder) {
    try {
        // Используем токен из таблицы или из конфига
        const botToken = reminder.telegram_bot_token || TELEGRAM_CONFIG.botToken;
        const chatId = reminder.telegram_chat_id || TELEGRAM_CONFIG.groupId;
        
        if (!botToken || botToken === 'YOUR_BOT_TOKEN') {
            console.log('Telegram токен не настроен');
            return;
        }
        
        let message = `🔔 Напоминание: ${reminder.text}`;
        
        // Добавляем информацию о лиде если есть
        if (reminder.lead_id) {
            try {
                const leadQuery = 'SELECT client_name FROM leads WHERE id = $1';
                const leadResult = await pool.query(leadQuery, [reminder.lead_id]);
                
                if (leadResult.rows.length > 0 && leadResult.rows[0].client_name) {
                    message += `\n\n👤 Клиент: ${leadResult.rows[0].client_name}`;
                }
            } catch (error) {
                console.log('Не удалось получить информацию о лиде:', error);
            }
        }
        
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                disable_notification: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Ошибка отправки Telegram:', error);
        throw error;
    }
}

// API эндпоинты
app.use(express.json());

// Создание напоминания (адаптировано под существующую структуру)
app.post('/api/reminders', async (req, res) => {
    try {
        const { text, datetime, lead_id, telegram_bot_token, telegram_chat_id } = req.body;
        
        const query = `
            INSERT INTO reminders (text, date_time, lead_id, telegram_bot_token, telegram_chat_id, completed, sent)
            VALUES ($1, $2, $3, $4, $5, false, false)
            RETURNING *
        `;
        
        const result = await pool.query(query, [text, datetime, lead_id, telegram_bot_token, telegram_chat_id]);
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Ошибка создания напоминания:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение напоминаний
app.get('/api/reminders', async (req, res) => {
    try {
        const query = 'SELECT * FROM reminders ORDER BY date_time DESC';
        const result = await pool.query(query);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Ошибка получения напоминаний:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Завершение напоминания
app.put('/api/reminders/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = 'UPDATE reminders SET completed = true WHERE id = $1';
        await pool.query(query, [id]);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Ошибка завершения напоминания:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Сервер уведомлений запущен на порту ${PORT}`);
    console.log(`📅 Cron задача: проверка каждую минуту`);
    console.log(`🗄️ Используется существующая таблица reminders`);
});
