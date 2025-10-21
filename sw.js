const CACHE_NAME = 'ff-calculator-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://unpkg.com/papaparse@5.4.1/papaparse.min.js',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кэшированную версию или загружаем из сети
        return response || fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ========================================
// BACKGROUND NOTIFICATIONS
// ========================================

// Обработка фоновых уведомлений
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    scheduleBackgroundReminder(event.data.reminder);
    return true; // Указываем что обработка асинхронная
  }
});

// Планирование напоминания в фоне
function scheduleBackgroundReminder(reminder) {
  const now = Date.now();
  const reminderTime = reminder.localDateTime || new Date(reminder.datetime).getTime();
  const delay = reminderTime - now;

  if (delay > 0) {
    console.log(`Service Worker: Планируем напоминание через ${delay}ms`);
    
    setTimeout(() => {
      sendBackgroundNotification(reminder);
    }, delay);
  }
}

// Отправка уведомления в фоне
async function sendBackgroundNotification(reminder) {
  try {
    // Показываем браузерное уведомление
    const notificationOptions = {
      body: reminder.text,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `reminder-${reminder.id}`,
      requireInteraction: true,
      actions: [
        { action: 'complete', title: 'Выполнено' },
        { action: 'snooze', title: 'Отложить на 5 мин' }
      ]
    };

    await self.registration.showNotification('🔔 Напоминание', notificationOptions);

    // Отправляем Telegram уведомление
    await sendTelegramFromBackground(reminder);

  } catch (error) {
    console.error('Ошибка отправки фонового уведомления:', error);
  }
}

// Отправка Telegram уведомления из Service Worker
async function sendTelegramFromBackground(reminder) {
  try {
    // Получаем настройки из IndexedDB
    const settings = await getSettingsFromStorage();
    
    if (!settings.botToken || settings.botToken === 'YOUR_BOT_TOKEN_HERE') {
      console.log('Telegram токен не настроен');
      return;
    }

    let telegramMessage = `🔔 Напоминание: ${reminder.text}`;
    
    // Добавляем тег пользователя
    if (settings.userId && settings.tagForReminders) {
      telegramMessage += `\n\n👤 @${settings.userId}`;
    }

    const url = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.groupId,
        text: telegramMessage,
        disable_notification: false // Напоминания всегда с уведомлением
      })
    });

    if (response.ok) {
      console.log('Telegram уведомление отправлено из Service Worker');
    } else {
      console.error('Ошибка отправки Telegram из Service Worker');
    }

  } catch (error) {
    console.error('Ошибка отправки Telegram из Service Worker:', error);
  }
}

// Получение настроек из IndexedDB
async function getSettingsFromStorage() {
  return new Promise((resolve) => {
    const request = indexedDB.open('FFDashboard', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const getRequest = store.get('telegram_settings');
      
      getRequest.onsuccess = () => {
        const settings = getRequest.result || {};
        resolve(settings);
      };
      
      getRequest.onerror = () => {
        resolve({});
      };
    };
    
    request.onerror = () => {
      resolve({});
    };
  });
}

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'complete') {
    // Помечаем напоминание как выполненное
    event.waitUntil(
      completeReminderFromBackground(event.notification.tag.replace('reminder-', ''))
    );
  } else if (event.action === 'snooze') {
    // Откладываем на 5 минут
    event.waitUntil(
      snoozeReminderFromBackground(event.notification.tag.replace('reminder-', ''))
    );
  } else {
    // Обычный клик - открываем приложение
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Завершение напоминания из фона
async function completeReminderFromBackground(reminderId) {
  try {
    // Обновляем статус в IndexedDB
    const request = indexedDB.open('FFDashboard', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      
      store.get(parseInt(reminderId)).onsuccess = (e) => {
        const reminder = e.result;
        if (reminder) {
          reminder.completed = true;
          store.put(reminder);
        }
      };
    };
  } catch (error) {
    console.error('Ошибка завершения напоминания:', error);
  }
}

// Откладывание напоминания из фона
async function snoozeReminderFromBackground(reminderId) {
  try {
    const request = indexedDB.open('FFDashboard', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      
      store.get(parseInt(reminderId)).onsuccess = (e) => {
        const reminder = e.result;
        if (reminder) {
          // Откладываем на 5 минут
          reminder.localDateTime = Date.now() + 5 * 60 * 1000;
          reminder.datetime = new Date(reminder.localDateTime).toISOString();
          store.put(reminder);
          
          // Планируем новое уведомление
          scheduleBackgroundReminder(reminder);
        }
      };
    };
  } catch (error) {
    console.error('Ошибка откладывания напоминания:', error);
  }
}