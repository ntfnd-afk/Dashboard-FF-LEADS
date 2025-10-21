# 🖥️ Серверные уведомления для надежной доставки

## 🎯 **Решение проблемы выключенного компьютера**

Если компьютер выключен, браузерные уведомления не работают. **Серверные уведомления решают эту проблему!**

## 🏗️ **Архитектура решения:**

```
Компьютер выключен → Сервер работает → Cron проверяет → Telegram отправляет
```

### **Компоненты:**
- 🖥️ **Сервер на VM** - работает 24/7
- ⏰ **Cron задача** - проверяет каждую минуту
- 📱 **Telegram API** - отправляет уведомления
- 🗄️ **PostgreSQL** - хранит напоминания

## 🔧 **Развертывание на VM:**

### 1. **Подключитесь к VM:**
```bash
ssh ubuntu@51.250.97.39
cd ~/ff-dashboard
```

### 2. **Установите зависимости:**
```bash
npm install express pg node-cron dotenv
```

### 3. **Создайте таблицу в БД:**
```bash
sudo -u postgres psql ff_dashboard
```

```sql
-- Выполните SQL из database/server-reminders.sql
\i database/server-reminders.sql
\q
```

### 4. **Настройте переменные окружения:**
```bash
cat > .env << EOF
DB_USER=postgres
DB_HOST=localhost
DB_NAME=ff_dashboard
DB_PASSWORD=your_postgres_password
DB_PORT=5432
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_GROUP_ID=YOUR_GROUP_ID
PORT=3001
EOF
```

### 5. **Запустите сервер уведомлений:**
```bash
# Запуск в фоне
nohup node server-notifications.js > notifications.log 2>&1 &

# Проверить статус
ps aux | grep server-notifications
```

### 6. **Настройте автозапуск:**
```bash
# Создайте systemd сервис
sudo nano /etc/systemd/system/ff-notifications.service
```

```ini
[Unit]
Description=FF Dashboard Notifications Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ff-dashboard
ExecStart=/usr/bin/node server-notifications.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Активируйте сервис
sudo systemctl enable ff-notifications
sudo systemctl start ff-notifications
sudo systemctl status ff-notifications
```

## 🔄 **Как это работает:**

### **1. Создание напоминания:**
- Пользователь создает напоминание в UI
- Данные сохраняются в БД через API
- Сервер получает напоминание

### **2. Фоновая проверка:**
- Cron задача запускается каждую минуту
- Проверяет БД на наличие просроченных напоминаний
- Находит напоминания с `datetime <= NOW()` и `sent = false`

### **3. Отправка уведомления:**
- Отправляет Telegram сообщение
- Помечает напоминание как `sent = true`
- Логирует результат

## 📱 **Преимущества серверных уведомлений:**

### ✅ **Надежность:**
- Работает 24/7 независимо от компьютера
- Не зависит от браузера или Service Worker
- Автоматический перезапуск при сбоях

### ✅ **Масштабируемость:**
- Один сервер для всех пользователей
- Централизованное управление
- Легко добавлять новые функции

### ✅ **Интеграция:**
- Работает с существующим API
- Синхронизируется с фронтендом
- Поддерживает множественных пользователей

## 🧪 **Тестирование:**

### 1. **Создайте напоминание на 1-2 минуты вперед**

### 2. **Выключите компьютер полностью**

### 3. **Дождитесь Telegram уведомления:**
- Сервер продолжит работать на VM
- Cron проверит напоминание
- Telegram сообщение придет в группу

### 4. **Проверьте логи:**
```bash
tail -f notifications.log
```

## 🔧 **Мониторинг:**

### **Проверка статуса:**
```bash
# Статус сервиса
sudo systemctl status ff-notifications

# Логи
sudo journalctl -u ff-notifications -f

# Процессы
ps aux | grep server-notifications
```

### **Проверка БД:**
```sql
-- Посмотреть все напоминания
SELECT * FROM reminders ORDER BY datetime DESC LIMIT 10;

-- Посмотреть неотправленные
SELECT * FROM reminders WHERE sent = false AND datetime <= NOW();
```

## 🎯 **Результат:**

- ✅ **100% надежность** - работает при выключенном компьютере
- ✅ **24/7 доступность** - сервер работает постоянно
- ✅ **Автоматическая доставка** - без участия пользователя
- ✅ **Централизованное управление** - один сервер для всех
- ✅ **Масштабируемость** - легко добавлять функции

**Теперь ваши напоминания придут в любом случае!** 🚀
