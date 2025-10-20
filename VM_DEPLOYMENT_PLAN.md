# 🚀 План развертывания FF Dashboard на Yandex Cloud VM

## 🎯 Архитектура решения

### **Текущая ситуация:**
- ✅ VM на Yandex Cloud уже настроена
- ✅ PostgreSQL уже установлен
- ✅ Есть другие проекты на этой VM

### **Предлагаемая архитектура:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│   API Server    │◄──►│   PostgreSQL   │
│ • HTML/CSS/JS   │    │ • Node.js       │    │ • ff_dashboard │
│ • PWA           │    │ • Express.js    │    │   database     │
│ • Nginx         │    │ • REST API     │    │ • Таблицы:     │
└─────────────────┘    └─────────────────┘    │   - leads      │
                                             │   - prices     │
                                             │   - reminders │
                                             │   - settings  │
                                             └─────────────────┘
```

## 📊 Структура базы данных PostgreSQL

### **Таблица `leads`**
```sql
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
```

### **Таблица `prices`**
```sql
CREATE TABLE prices (
    id SERIAL PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Таблица `reminders`**
```sql
CREATE TABLE reminders (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    date_time TIMESTAMP NOT NULL,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    telegram_bot_token VARCHAR(255),
    telegram_chat_id VARCHAR(100)
);
```

### **Таблица `settings`**
```sql
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Технический стек

### **Backend (API Server)**
- **Node.js** + **Express.js** - быстрая разработка
- **pg** - PostgreSQL клиент
- **cors** - для CORS запросов
- **helmet** - безопасность
- **express-rate-limit** - лимиты запросов

### **Frontend**
- **Существующий код** - минимальные изменения
- **Fetch API** - для запросов к API
- **PWA** - остается без изменений

### **Infrastructure**
- **Nginx** - reverse proxy + статика
- **PM2** - управление процессами Node.js
- **SSL** - Let's Encrypt для HTTPS
- **Backup** - pg_dump для PostgreSQL

## 📋 План миграции

### **Этап 1: Подготовка API сервера**
1. **Создать структуру проекта**:
   ```
   ff-dashboard-api/
   ├── src/
   │   ├── controllers/
   │   ├── models/
   │   ├── routes/
   │   └── middleware/
   ├── package.json
   └── server.js
   ```

2. **Настроить PostgreSQL**:
   - Создать базу данных `ff_dashboard`
   - Создать таблицы
   - Настроить пользователя и права

3. **Разработать API endpoints**:
   - `GET /api/leads` - список лидов
   - `POST /api/leads` - создание лида
   - `PUT /api/leads/:id` - обновление лида
   - `DELETE /api/leads/:id` - удаление лида
   - `GET /api/prices` - прайс-лист
   - `POST /api/prices` - добавление услуги
   - `GET /api/reminders` - напоминания
   - `POST /api/reminders` - создание напоминания

### **Этап 2: Адаптация Frontend**
1. **Заменить LocalStorage на API вызовы**:
   ```javascript
   // Было:
   localStorage.setItem('ff-leads', JSON.stringify(leads));
   
   // Стало:
   fetch('/api/leads', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(lead)
   });
   ```

2. **Добавить обработку ошибок**:
   ```javascript
   async function loadLeads() {
       try {
           const response = await fetch('/api/leads');
           const leads = await response.json();
           updateLeadsTable(leads);
       } catch (error) {
           console.error('Ошибка загрузки лидов:', error);
           showNotification('Ошибка загрузки данных', 'error');
       }
   }
   ```

### **Этап 3: Развертывание**
1. **Настроить Nginx**:
   ```nginx
   server {
       listen 80;
       server_name ff-dashboard.yourdomain.com;
       
       location /api {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location / {
           root /var/www/ff-dashboard;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

2. **Настроить SSL**:
   ```bash
   certbot --nginx -d ff-dashboard.yourdomain.com
   ```

3. **Настроить автозапуск**:
   ```bash
   pm2 startup
   pm2 save
   ```

## 💰 Сравнение затрат

### **GitHub Pages + Google Sheets**
- ✅ **Бесплатно** (до лимитов)
- ⚠️ **Ограничения** API (100 запросов/100 сек)
- ⚠️ **Зависимость** от внешних сервисов

### **VM + PostgreSQL**
- 💰 **VM**: ~2000₽/месяц (2 vCPU, 4GB RAM)
- 💰 **Диск**: ~500₽/месяц (50GB SSD)
- 💰 **Трафик**: ~100₽/месяц
- 💰 **Итого**: ~2600₽/месяц
- ✅ **Полный контроль** и производительность

## 🎯 Преимущества VM решения

### **Технические:**
- ✅ **Производительность** - нет лимитов API
- ✅ **Надежность** - ACID транзакции PostgreSQL
- ✅ **Масштабируемость** - легко увеличить ресурсы
- ✅ **Интеграции** - подключение других систем

### **Бизнес:**
- ✅ **Централизованные данные** - одна БД для всех проектов
- ✅ **Аналитика** - сложные SQL запросы
- ✅ **Резервное копирование** - полный контроль
- ✅ **Безопасность** - собственный сервер

## 🚀 Рекомендация

**Стоит развертываться на VM!** 

**Почему:**
1. **У вас уже есть инфраструктура** - экономия времени
2. **PostgreSQL** - профессиональная БД
3. **Полный контроль** - нет ограничений внешних API
4. **Масштабируемость** - легко развивать систему
5. **Интеграции** - можно подключить другие проекты

**Следующие шаги:**
1. **Создать API сервер** (Node.js + Express)
2. **Настроить PostgreSQL** схему
3. **Адаптировать Frontend** для работы с API
4. **Развернуть на VM** с Nginx

Хотите, чтобы я создал детальную инструкцию по реализации API сервера? 🚀
