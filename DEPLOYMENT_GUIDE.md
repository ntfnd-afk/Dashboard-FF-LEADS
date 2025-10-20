# Деплой FF Dashboard на GitHub Pages

## Подготовка к деплою

### 1. ✅ Настройки продакшна
- API URL: `https://api.fulfilment-one.ru/api`
- Онлайн режим: `navigator.onLine`
- Убраны тестовые данные
- Убрана автоматическая авторизация

### 2. 📁 Структура проекта
```
Dashboard-FF-LEADS/
├── index.html          (основной файл)
├── js/                 (JavaScript модули)
│   ├── app.js
│   ├── auth.js
│   ├── leads.js
│   ├── dashboard.js
│   ├── kanban.js
│   ├── calculator.js
│   ├── services.js
│   ├── admin.js
│   └── reminders.js
├── css/                (стили)
├── components/         (компоненты)
├── manifest.json       (PWA манифест)
├── sw.js              (Service Worker)
├── favicon.ico        (иконка)
└── logo192.png        (логотип)
```

## Инструкции по деплою

### Вариант 1: GitHub Pages (рекомендуется)

1. **Создайте репозиторий на GitHub**:
   - Название: `Dashboard-FF-LEADS`
   - Публичный репозиторий

2. **Загрузите файлы**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/Dashboard-FF-LEADS.git
   git push -u origin main
   ```

3. **Настройте GitHub Pages**:
   - Перейдите в Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)

4. **URL приложения**: `https://YOUR_USERNAME.github.io/Dashboard-FF-LEADS/`

### Вариант 2: Netlify

1. **Загрузите на Netlify**:
   - Перетащите папку проекта на netlify.com
   - Или подключите GitHub репозиторий

2. **URL приложения**: `https://YOUR_PROJECT_NAME.netlify.app`

### Вариант 3: Vercel

1. **Установите Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Деплой**:
   ```bash
   vercel --prod
   ```

## Проверка после деплоя

### ✅ Что должно работать:
1. **Авторизация** - окно входа должно появляться
2. **API подключение** - к `https://api.fulfilment-one.ru/api`
3. **Все функции** - добавление лидов, калькулятор, канбан
4. **PWA** - можно установить как приложение
5. **Офлайн режим** - работает без интернета

### 🔧 Настройки для продакшна:

1. **API сервер** должен быть запущен на `api.fulfilment-one.ru`
2. **CORS** настроен для домена GitHub Pages
3. **SSL сертификат** для HTTPS

## Тестирование

После деплоя проверьте:
- [ ] Загрузка приложения
- [ ] Окно авторизации
- [ ] Подключение к API
- [ ] Добавление лидов
- [ ] Калькулятор
- [ ] Канбан доска
- [ ] Настройки администратора
- [ ] PWA установка

## Поддержка

Если что-то не работает:
1. Проверьте консоль браузера (F12)
2. Проверьте Network tab на ошибки API
3. Убедитесь, что API сервер запущен
4. Проверьте CORS настройки
