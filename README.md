# Family App

Семейное веб-приложение для ведения общей информации о членах семьи. Первый модуль приложения предназначен для хранения и обработки медицинских данных.

## Быстрый старт

Требуется актуальная LTS-версия Node.js и npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Приложение запускается на `http://localhost:3000`. Шаблон `.env.example` содержит только пустые имена конфигурации; не добавляйте секреты в репозиторий.

## Команды

| Команда                | Назначение                                  |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Запустить сервер разработки Nuxt            |
| `npm run build`        | Собрать production-версию                   |
| `npm run preview`      | Открыть production-сборку                   |
| `npm run typecheck`    | Проверить TypeScript и Vue-типы             |
| `npm run lint`         | Проверить ESLint                            |
| `npm run format`       | Отформатировать исходные файлы Prettier     |
| `npm run format:check` | Проверить форматирование                    |
| `npm run test`         | Запустить модульные тесты Vitest            |
| `npm run test:e2e`     | Запустить браузерные smoke-тесты Playwright |

Для браузерных тестов один раз установите разрешённые Playwright-браузеры:

```bash
npx playwright install chromium
```

## Текущий bootstrap

В проекте настроены Nuxt 3, Vue 3, TypeScript, ESLint, Prettier, Vitest и Playwright. Базовая русскоязычная навигация содержит страницы-заглушки: главная, члены семьи, поиск, импорт JSON и настройки.

Единственный публичный маршрут bootstrap — `GET /api/v1/health`. Он не использует сессию или внешние сервисы и возвращает ровно:

```json
{ "data": { "status": "ok" } }
```

Ошибки API используют безопасный стабильный конверт `{ "error": { "code", "message", "requestId", "fields?" } }`; внутренние сведения в него не включаются.

## Границы кода

```text
pages/, components/, layouts/    Vue-представление
server/api/v1/                  HTTP-обработчики Nitro
application/                    DTO и прикладные сервисы
domain/                         Независимые предметные типы
ports/                          Интерфейсы репозиториев и хранилищ
infrastructure/                 Будущие адаптеры провайдеров
```

Клиент обращается к семейным и медицинским данным только через `/api/v1`. Провайдеры, Supabase, база данных и хранилище пока не подключены.

## Отложенный объём

Этот bootstrap не реализует авторизацию, семейные или медицинские операции, миграции, Supabase, импорт, файловое хранилище, CI/CD или развёртывание. Они будут реализованы отдельными изменениями в соответствии с документацией ниже.

## Документация

- [Спецификация проекта](docs/PROJECT_SPECIFICATION.md)
- [Формат импорта медицинских данных](docs/JSON_IMPORT_FORMAT.md)
- [Правила проекта](docs/project-guidelines/README.md)
- [Agent skills](.agents/skills/)
- [Pi agent routing](docs/project-guidelines/AGENT-ROUTING.md)
