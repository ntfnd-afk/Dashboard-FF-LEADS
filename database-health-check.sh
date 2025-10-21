#!/bin/bash
# database-health-check.sh
# Скрипт проверки состояния базы данных

# Настройки
DB_NAME="ff_dashboard"
DB_USER="postgres"

echo "🔍 Проверка состояния базы данных..."
echo "=================================="

# Проверка подключения
echo "1. Проверка подключения к БД..."
if sudo -u postgres psql -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Подключение к БД успешно"
else
    echo "❌ Ошибка подключения к БД"
    exit 1
fi

# Проверка размера БД
echo "2. Размер базы данных..."
DB_SIZE=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
echo "📊 Размер БД: $DB_SIZE"

# Проверка таблиц
echo "3. Проверка таблиц..."
TABLES=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "📋 Количество таблиц: $TABLES"

# Проверка основных таблиц
echo "4. Проверка основных таблиц..."

# Проверка таблицы leads
LEADS_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM leads;" 2>/dev/null | xargs)
if [ "$LEADS_COUNT" != "" ]; then
    echo "👥 Лиды: $LEADS_COUNT записей"
else
    echo "❌ Таблица leads недоступна"
fi

# Проверка таблицы reminders
REMINDERS_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM reminders;" 2>/dev/null | xargs)
if [ "$REMINDERS_COUNT" != "" ]; then
    echo "🔔 Напоминания: $REMINDERS_COUNT записей"
else
    echo "❌ Таблица reminders недоступна"
fi

# Проверка таблицы users
USERS_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
if [ "$USERS_COUNT" != "" ]; then
    echo "👤 Пользователи: $USERS_COUNT записей"
else
    echo "❌ Таблица users недоступна"
fi

# Проверка свободного места на диске
echo "5. Проверка свободного места..."
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
DISK_FREE=$(df -h / | tail -1 | awk '{print $4}')
echo "💾 Использовано диска: $DISK_USAGE"
echo "💾 Свободно места: $DISK_FREE"

# Проверка последних бэкапов
echo "6. Проверка резервных копий..."
BACKUP_DIR="/home/ubuntu/backups"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(ls -1 $BACKUP_DIR/ff_dashboard_backup_*.sql.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        echo "📦 Количество бэкапов: $BACKUP_COUNT"
        LATEST_BACKUP=$(ls -t $BACKUP_DIR/ff_dashboard_backup_*.sql.gz 2>/dev/null | head -1)
        if [ "$LATEST_BACKUP" != "" ]; then
            BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1)
            echo "📅 Последний бэкап: $BACKUP_DATE"
        fi
    else
        echo "⚠️ Резервные копии не найдены"
    fi
else
    echo "❌ Директория бэкапов не существует"
fi

# Проверка статуса PostgreSQL
echo "7. Статус PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL работает"
else
    echo "❌ PostgreSQL не работает"
fi

echo "=================================="
echo "🎉 Проверка завершена!"
