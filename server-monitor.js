// server-monitor.js
// Система мониторинга сервера уведомлений

const https = require('https');
const fs = require('fs');

// Конфигурация
const CONFIG = {
    NOTIFICATION_SERVER_URL: 'http://51.250.97.39:3001/api/health',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN',
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_GROUP_ID || 'YOUR_GROUP_ID',
    NORMAL_INTERVAL: 600000, // 10 минут когда сервер работает
    DOWN_INTERVAL: 120000,   // 2 минуты когда сервер упал
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000
};

let isServerDown = false;
let retryCount = 0;
let monitoringInterval = null;

// Отправка уведомления в Telegram
async function sendTelegramAlert(message) {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const data = JSON.stringify({
        chat_id: CONFIG.TELEGRAM_CHAT_ID,
        text: `🚨 МОНИТОРИНГ СЕРВЕРА\n\n${message}`,
        parse_mode: 'HTML'
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Уведомление отправлено в Telegram');
                    resolve(responseData);
                } else {
                    console.error('❌ Ошибка отправки в Telegram:', res.statusCode);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Ошибка запроса к Telegram:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

// Проверка состояния сервера
async function checkServerHealth() {
    try {
        const response = await fetch(CONFIG.NOTIFICATION_SERVER_URL, {
            method: 'GET',
            timeout: 10000
        });

        if (response.ok) {
            if (isServerDown) {
                // Сервер восстановился
                await sendTelegramAlert(
                    `✅ Сервер уведомлений восстановлен!\n` +
                    `🕐 Время: ${new Date().toLocaleString('ru-RU')}\n` +
                    `🔗 URL: ${CONFIG.NOTIFICATION_SERVER_URL}\n` +
                    `⏰ Переход на режим: каждые 10 минут`
                );
                isServerDown = false;
                retryCount = 0;
                console.log('✅ Сервер работает нормально - переход на режим каждые 10 минут');
                updateMonitoringInterval();
            } else {
                console.log('✅ Сервер работает нормально (проверка каждые 10 минут)');
            }
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Сервер недоступен:', error.message);
        
        if (!isServerDown) {
            isServerDown = true;
            retryCount = 1;
            
            await sendTelegramAlert(
                `🚨 Сервер уведомлений недоступен!\n` +
                `🕐 Время: ${new Date().toLocaleString('ru-RU')}\n` +
                `❌ Ошибка: ${error.message}\n` +
                `🔗 URL: ${CONFIG.NOTIFICATION_SERVER_URL}\n` +
                `⏰ Переход на режим: каждые 2 минуты\n` +
                `🔄 Попытка перезапуска...`
            );
            console.log('❌ Сервер упал - переход на режим каждые 2 минуты');
            updateMonitoringInterval();
        } else {
            retryCount++;
            
            if (retryCount <= CONFIG.RETRY_ATTEMPTS) {
                await sendTelegramAlert(
                    `⚠️ Повторная проверка сервера\n` +
                    `🕐 Время: ${new Date().toLocaleString('ru-RU')}\n` +
                    `🔄 Попытка: ${retryCount}/${CONFIG.RETRY_ATTEMPTS}\n` +
                    `❌ Ошибка: ${error.message}\n` +
                    `⏰ Проверка каждые 2 минуты`
                );
            }
        }
    }
}

// Обновление интервала мониторинга
function updateMonitoringInterval() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    const interval = isServerDown ? CONFIG.DOWN_INTERVAL : CONFIG.NORMAL_INTERVAL;
    const intervalMinutes = interval / 60000;
    
    console.log(`⏰ Обновление интервала мониторинга: каждые ${intervalMinutes} минут`);
    
    monitoringInterval = setInterval(checkServerHealth, interval);
}

// Запуск мониторинга
function startMonitoring() {
    console.log('🔍 Запуск адаптивного мониторинга сервера уведомлений...');
    console.log(`📡 Нормальный режим: каждые ${CONFIG.NORMAL_INTERVAL / 60000} минут`);
    console.log(`🚨 Режим сбоя: каждые ${CONFIG.DOWN_INTERVAL / 60000} минут`);
    console.log(`🎯 URL: ${CONFIG.NOTIFICATION_SERVER_URL}`);
    
    // Первая проверка
    checkServerHealth();
    
    // Запуск адаптивного мониторинга
    updateMonitoringInterval();
}

// Обработка завершения процесса
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка мониторинга...');
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Остановка мониторинга...');
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    process.exit(0);
});

// Запуск
startMonitoring();
