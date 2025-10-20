# 🚀 Инструкция по развертыванию FF Dashboard на VM

## 📋 Подключение к серверу

```bash
ssh ubuntu@51.250.97.39
```

## 🏗️ Создание структуры проекта

### Шаг 1: Создание папки проекта
```bash
# Переходим в домашнюю директорию
cd ~

# Создаем папку для FF Dashboard
mkdir ff-dashboard
cd ff-dashboard

# Создаем структуру проекта
mkdir -p {api,frontend,database}
```

### Шаг 2: Структура проекта
```
ff-dashboard/
├── api/                 # API сервер
│   ├── package.json
│   ├── server.js
│   └── routes/
├── frontend/            # Фронтенд файлы
│   ├── index.html
│   ├── manifest.json
│   └── sw.js
├── database/            # SQL скрипты
│   ├── init.sql
│   └── schema.sql
└── README.md
```

## 🗄️ Настройка PostgreSQL

### Шаг 1: Создание базы данных
```bash
# Подключаемся к PostgreSQL
sudo -u postgres psql

# Создаем базу данных
CREATE DATABASE ff_dashboard;

# Создаем пользователя
CREATE USER ff_user WITH PASSWORD 'ff_secure_password_2024';

# Даем права
GRANT ALL PRIVILEGES ON DATABASE ff_dashboard TO ff_user;

# Выходим
\q
```

### Шаг 2: Создание таблиц
```bash
# Создаем файл схемы
nano database/schema.sql
```

**Содержимое `database/schema.sql`:**
```sql
-- Подключение к базе данных
\c ff_dashboard;

-- Таблица лидов
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new',
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT
);

-- Таблица прайса
CREATE TABLE prices (
    id SERIAL PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица напоминаний
CREATE TABLE reminders (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    date_time TIMESTAMP NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    telegram_bot_token VARCHAR(255),
    telegram_chat_id VARCHAR(100)
);

-- Таблица настроек
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_reminders_date_time ON reminders(date_time);
CREATE INDEX idx_reminders_completed ON reminders(completed);

-- Вставляем начальные данные
INSERT INTO settings (key, value, description) VALUES 
('app_name', 'FF Dashboard', 'Название приложения'),
('version', '1.0.0', 'Версия приложения'),
('telegram_enabled', 'false', 'Включены ли Telegram уведомления');

-- Вставляем пример прайса
INSERT INTO prices (service, unit, cost, description) VALUES 
('Приемка товара', 'шт', 15.00, 'Приемка и проверка товара'),
('Хранение', 'место/месяц', 50.00, 'Хранение товара на складе'),
('Упаковка', 'заказ', 25.00, 'Упаковка товара для отправки'),
('Отправка', 'заказ', 30.00, 'Отправка товара клиенту');
```

### Шаг 3: Применение схемы
```bash
# Применяем схему
psql -U ff_user -d ff_dashboard -f database/schema.sql
```

## 🔧 Создание API сервера

### Шаг 1: Инициализация Node.js проекта
```bash
cd api

# Инициализируем npm проект
npm init -y

# Устанавливаем зависимости
npm install express pg cors helmet express-rate-limit dotenv
```

### Шаг 2: Создание сервера
```bash
# Создаем основной файл сервера
nano server.js
```

**Содержимое `server.js`:**
```javascript
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: ['https://your-username.github.io', 'http://localhost:8000'],
    credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // максимум 100 запросов с IP
});
app.use(limiter);

// PostgreSQL подключение
const pool = new Pool({
    user: process.env.DB_USER || 'ff_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ff_dashboard',
    password: process.env.DB_PASSWORD || 'ff_secure_password_2024',
    port: process.env.DB_PORT || 5432,
});

// Проверка подключения к БД
pool.on('connect', () => {
    console.log('✅ Подключение к PostgreSQL установлено');
});

pool.on('error', (err) => {
    console.error('❌ Ошибка подключения к PostgreSQL:', err);
});

// API Routes

// Лиды
app.get('/api/leads', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения лидов:', err);
        res.status(500).json({ error: 'Ошибка получения лидов' });
    }
});

app.post('/api/leads', async (req, res) => {
    try {
        const { client_name, phone, email, status, source, comments } = req.body;
        const result = await pool.query(
            'INSERT INTO leads (client_name, phone, email, status, source, comments) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [client_name, phone, email, status, source, comments]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка создания лида:', err);
        res.status(500).json({ error: 'Ошибка создания лида' });
    }
});

app.put('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { client_name, phone, email, status, source, comments } = req.body;
        const result = await pool.query(
            'UPDATE leads SET client_name = $1, phone = $2, email = $3, status = $4, source = $5, comments = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
            [client_name, phone, email, status, source, comments, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Лид не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка обновления лида:', err);
        res.status(500).json({ error: 'Ошибка обновления лида' });
    }
});

app.delete('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Лид не найден' });
        }
        res.json({ message: 'Лид удален', lead: result.rows[0] });
    } catch (err) {
        console.error('Ошибка удаления лида:', err);
        res.status(500).json({ error: 'Ошибка удаления лида' });
    }
});

// Прайс
app.get('/api/prices', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prices ORDER BY service');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения прайса:', err);
        res.status(500).json({ error: 'Ошибка получения прайса' });
    }
});

app.post('/api/prices', async (req, res) => {
    try {
        const { service, unit, cost, description } = req.body;
        const result = await pool.query(
            'INSERT INTO prices (service, unit, cost, description) VALUES ($1, $2, $3, $4) RETURNING *',
            [service, unit, cost, description]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка создания услуги:', err);
        res.status(500).json({ error: 'Ошибка создания услуги' });
    }
});

// Напоминания
app.get('/api/reminders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, l.client_name 
            FROM reminders r 
            LEFT JOIN leads l ON r.lead_id = l.id 
            ORDER BY r.date_time ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения напоминаний:', err);
        res.status(500).json({ error: 'Ошибка получения напоминаний' });
    }
});

app.post('/api/reminders', async (req, res) => {
    try {
        const { lead_id, date_time, text, telegram_bot_token, telegram_chat_id } = req.body;
        const result = await pool.query(
            'INSERT INTO reminders (lead_id, date_time, text, telegram_bot_token, telegram_chat_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [lead_id, date_time, text, telegram_bot_token, telegram_chat_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка создания напоминания:', err);
        res.status(500).json({ error: 'Ошибка создания напоминания' });
    }
});

// Настройки
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        console.error('Ошибка получения настроек:', err);
        res.status(500).json({ error: 'Ошибка получения настроек' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'Connected'
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FF Dashboard API запущен на порту ${PORT}`);
    console.log(`📊 База данных: ff_dashboard`);
    console.log(`🌐 Доступен по адресу: http://51.250.97.39:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Получен сигнал SIGTERM, закрываем сервер...');
    pool.end(() => {
        console.log('✅ Подключение к БД закрыто');
        process.exit(0);
    });
});
```

### Шаг 3: Создание .env файла
```bash
# Создаем файл переменных окружения
nano .env
```

**Содержимое `.env`:**
```env
# Database
DB_USER=ff_user
DB_HOST=localhost
DB_NAME=ff_dashboard
DB_PASSWORD=ff_secure_password_2024
DB_PORT=5432

# Server
PORT=3001
NODE_ENV=production
```

### Шаг 4: Создание package.json скриптов
```bash
# Редактируем package.json
nano package.json
```

**Обновите секцию scripts:**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

## 🚀 Запуск API сервера

### Шаг 1: Установка PM2
```bash
# Устанавливаем PM2 глобально
sudo npm install -g pm2

# Запускаем сервер через PM2
pm2 start server.js --name "ff-dashboard-api"

# Сохраняем конфигурацию PM2
pm2 save
pm2 startup
```

### Шаг 2: Проверка работы
```bash
# Проверяем статус
pm2 status

# Проверяем логи
pm2 logs ff-dashboard-api

# Тестируем API
curl http://localhost:3001/api/health
```

## 🌐 Настройка Nginx (опционально)

### Создание конфигурации Nginx
```bash
# Создаем конфигурацию для FF Dashboard
sudo nano /etc/nginx/sites-available/ff-dashboard
```

**Содержимое конфигурации:**
```nginx
server {
    listen 80;
    server_name 51.250.97.39;

    # API прокси
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Статические файлы (если нужно)
    location / {
        root /home/ubuntu/ff-dashboard/frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

### Активация конфигурации
```bash
# Создаем символическую ссылку
sudo ln -s /etc/nginx/sites-available/ff-dashboard /etc/nginx/sites-enabled/

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl reload nginx
```

## 📱 Подготовка фронтенда для GitHub Pages

### Шаг 1: Копирование файлов
```bash
# Копируем файлы фронтенда
cp ~/ff-dashboard/frontend/* ~/ff-dashboard/frontend/
```

### Шаг 2: Обновление API URL в фронтенде
Нужно будет обновить все API вызовы в `index.html`:

**Заменить:**
```javascript
// Старые вызовы LocalStorage
localStorage.setItem('ff-leads', JSON.stringify(leads));
```

**На:**
```javascript
// Новые API вызовы
const API_BASE_URL = 'http://51.250.97.39:3001/api';

async function loadLeads() {
    try {
        const response = await fetch(`${API_BASE_URL}/leads`);
        leads = await response.json();
        updateLeadsTable();
    } catch (error) {
        console.error('Ошибка загрузки лидов:', error);
    }
}
```

## ✅ Проверка развертывания

### Тестирование API
```bash
# Проверяем health endpoint
curl http://51.250.97.39:3001/api/health

# Проверяем получение лидов
curl http://51.250.97.39:3001/api/leads

# Проверяем получение прайса
curl http://51.250.97.39:3001/api/prices
```

### Проверка логов
```bash
# Логи PM2
pm2 logs ff-dashboard-api

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
```

## 🎯 Следующие шаги

1. **Обновить фронтенд** для работы с API
2. **Загрузить на GitHub Pages**
3. **Настроить домен** (опционально)
4. **Протестировать все функции**

## 📋 Полезные команды

```bash
# Управление PM2
pm2 restart ff-dashboard-api
pm2 stop ff-dashboard-api
pm2 delete ff-dashboard-api

# Управление PostgreSQL
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Управление Nginx
sudo systemctl status nginx
sudo systemctl reload nginx

# Мониторинг
htop
df -h
free -h
```

---

**API сервер готов!** 🚀

**Доступен по адресу:** `http://51.250.97.39:3001/api`

**Следующий шаг:** Обновить фронтенд для работы с API и загрузить на GitHub Pages!
