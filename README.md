# Family App

Семейное веб-приложение для ведения общей информации о членах семьи. Первый модуль приложения предназначен для хранения и обработки медицинских данных.

## Документация

- [Спецификация проекта](docs/PROJECT_SPECIFICATION.md)
- [Формат импорта медицинских данных](docs/JSON_IMPORT_FORMAT.md)
- [Правила проекта](docs/project-guidelines/README.md)
- [Agent skills](.agents/skills/)
- [Pi agent routing](docs/project-guidelines/AGENT-ROUTING.md)

## Технологический стек

- Nuxt 3
- Vue 3
- TypeScript
- Nuxt Server API (Nitro)
- PostgreSQL
- Supabase Auth
- Supabase Database
- Supabase Storage
- Zod
- Vitest
- Playwright

## Архитектура

```text
Пользовательский интерфейс
        ↓
API приложения /api/v1
        ↓
Сервисы предметной области
        ↓
Интерфейсы репозиториев
        ↓
Адаптеры Supabase
        ↓
PostgreSQL / Supabase Storage
```

Клиентская часть работает с данными через API приложения. Доступ к базе данных, авторизации, файловому хранилищу и поиску реализуется через отдельные интерфейсы и адаптеры.
