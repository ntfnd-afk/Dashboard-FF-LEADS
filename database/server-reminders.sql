-- Создание таблицы для серверных напоминаний
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    datetime TIMESTAMP NOT NULL,
    user_id INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индекса для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_reminders_datetime ON reminders(datetime);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(completed);
CREATE INDEX IF NOT EXISTS idx_reminders_sent ON reminders(sent);

-- Добавление поля telegram_username в таблицу users (если есть)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(50);
