# Формат импорта медицинских данных

Версия формата: 1

## 1. Общий контейнер

Каждый импортируемый JSON-документ должен содержать корневой объект:

```json
{
  "schemaVersion": 1,
  "recordType": "labReport",
  "personId": "0f47781b-93f8-4be3-baf6-89d117c828c4",
  "externalId": "local-ai-2026-03-15-001",
  "data": {}
}
```

Поля контейнера:

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `schemaVersion` | integer | да | Версия формата импорта |
| `recordType` | string | да | Тип импортируемой записи |
| `personId` | UUID | нет | Идентификатор члена семьи |
| `externalId` | string | нет | Идентификатор записи во внешней системе |
| `data` | object | да | Данные медицинской записи |

Поддерживаемые значения `recordType`:

- `labReport`;
- `measurement`;
- `episode`;
- `visit`;
- `note`.

При отсутствии `personId` пользователь выбирает человека на экране предварительного просмотра.

`externalId` используется вместе с источником и версией схемы для обнаружения повторного импорта.

## 2. Общие правила

- Кодировка файла: UTF-8.
- Формат даты: `YYYY-MM-DD`.
- Формат даты и времени: ISO 8601.
- Десятичные значения передаются JSON-числом с точкой.
- Исходное написание названий показателей сохраняется.
- Неизвестное значение передаётся как `null` или исключается из объекта.
- Единица измерения передаётся отдельной строкой.
- Пустые строки нормализуются в `null`.
- Лишние неизвестные поля отклоняются валидатором соответствующей версии схемы.
- Сохранение выполняется только после успешной проверки и подтверждения пользователя.

## 3. Лабораторное исследование

### 3.1. Структура

```json
{
  "schemaVersion": 1,
  "recordType": "labReport",
  "personId": "0f47781b-93f8-4be3-baf6-89d117c828c4",
  "externalId": "local-ai-2026-03-15-001",
  "data": {
    "title": "Общий анализ крови",
    "sampledAt": "2026-03-15T08:30:00+03:00",
    "reportedAt": "2026-03-15T16:00:00+03:00",
    "laboratory": "Название лаборатории",
    "comment": "Исследование натощак",
    "episodeId": null,
    "results": [
      {
        "name": "Гемоглобин",
        "valueType": "number",
        "numericValue": 125,
        "textValue": null,
        "booleanValue": null,
        "unit": "г/л",
        "reference": {
          "min": 110,
          "max": 145,
          "text": null
        },
        "flag": "normal",
        "comment": null
      }
    ]
  }
}
```

### 3.2. Поля исследования

| Поле | Тип | Обязательное |
|---|---|---:|
| `title` | string | да |
| `sampledAt` | datetime/null | нет |
| `reportedAt` | datetime/null | нет |
| `laboratory` | string/null | нет |
| `comment` | string/null | нет |
| `episodeId` | UUID/null | нет |
| `results` | array | да |

Массив `results` должен содержать не менее одного элемента.

### 3.3. Поля результата

| Поле | Тип | Обязательное |
|---|---|---:|
| `name` | string | да |
| `valueType` | string | да |
| `numericValue` | number/null | по типу |
| `textValue` | string/null | по типу |
| `booleanValue` | boolean/null | по типу |
| `unit` | string/null | нет |
| `reference` | object/null | нет |
| `flag` | string | нет |
| `comment` | string/null | нет |

Поддерживаемые значения `valueType`:

- `number`;
- `text`;
- `boolean`.

Поддерживаемые значения `flag`:

- `low`;
- `normal`;
- `high`;
- `critical`;
- `unknown`.

Для `valueType: "number"` поле `numericValue` содержит число.

Для `valueType: "text"` поле `textValue` содержит строку.

Для `valueType: "boolean"` поле `booleanValue` содержит логическое значение.

### 3.4. Референсное значение

```json
{
  "min": 110,
  "max": 145,
  "text": null
}
```

Числовой диапазон задаётся `min` и `max`. Односторонний диапазон может содержать только одну числовую границу. Текстовый референс передаётся в `text`.

Пример текстового референса:

```json
{
  "min": null,
  "max": null,
  "text": "не обнаружено"
}
```

## 4. Измерение

### 4.1. Числовое измерение

```json
{
  "schemaVersion": 1,
  "recordType": "measurement",
  "personId": "0f47781b-93f8-4be3-baf6-89d117c828c4",
  "data": {
    "measurementType": {
      "id": null,
      "name": "Температура"
    },
    "measuredAt": "2026-03-15T08:10:00+03:00",
    "valueType": "number",
    "numericValue": 38.2,
    "textValue": null,
    "booleanValue": null,
    "compoundValue": null,
    "unit": "°C",
    "comment": "Измерено электронным термометром",
    "episodeId": null
  }
}
```

### 4.2. Составное измерение

```json
{
  "schemaVersion": 1,
  "recordType": "measurement",
  "personId": "0f47781b-93f8-4be3-baf6-89d117c828c4",
  "data": {
    "measurementType": {
      "id": null,
      "name": "Артериальное давление"
    },
    "measuredAt": "2026-03-15T09:00:00+03:00",
    "valueType": "compound",
    "numericValue": null,
    "textValue": null,
    "booleanValue": null,
    "compoundValue": {
      "systolic": 120,
      "diastolic": 80
    },
    "unit": "мм рт. ст.",
    "comment": null,
    "episodeId": null
  }
}
```

### 4.3. Поля измерения

| Поле | Тип | Обязательное |
|---|---|---:|
| `measurementType` | object | да |
| `measuredAt` | datetime | да |
| `valueType` | string | да |
| `numericValue` | number/null | по типу |
| `textValue` | string/null | по типу |
| `booleanValue` | boolean/null | по типу |
| `compoundValue` | object/null | по типу |
| `unit` | string/null | нет |
| `comment` | string/null | нет |
| `episodeId` | UUID/null | нет |

`measurementType` содержит существующий `id` или название `name`. На экране проверки пользователь связывает неизвестное название с существующим типом либо создаёт новый тип показателя.

## 5. Эпизод

```json
{
  "schemaVersion": 1,
  "recordType": "episode",
  "personId": "0f47781b-93f8-4be3-baf6-89d117c828c4",
  "data": {
    "title": "ОРВИ, март 2026",
    "description": "Повышенная температура и кашель",
    "startedAt": "2026-03-12T07:30:00+03:00",
    "endedAt": "2026-03-16T18:00:00+03:00",
    "status": "completed",
    "symptoms": ["температура", "кашель"],
    "tags": ["ОРВИ", "педиатр"],
    "outcome": "Выздоровление"
  }
}
```

Поля эпизода:

| Поле | Тип | Обязательное |
|---|---|---:|
| `title` | string | да |
| `description` | string/null | нет |
| `startedAt` | datetime | да |
| `endedAt` | datetime/null | по статусу |
| `status` | string | да |
| `symptoms` | string[] | нет |
| `tags` | string[] | нет |
| `outcome` | string/null | нет |

Поддерживаемые статусы:

- `active`;
- `completed`.

## 6. Посещение врача

```json
{
  "schemaVersion": 1,
  "recordType": "visit",
  "personId": "0f47781b-93f8-4be3-baf6-89d117c828c4",
  "data": {
    "visitedAt": "2026-03-13T14:00:00+03:00",
    "doctorName": "Иванов Иван Иванович",
    "specialty": "Педиатр",
    "organization": "Название клиники",
    "reason": "Повышенная температура",
    "conclusion": "Признаки ОРВИ",
    "comment": null,
    "episodeId": null,
    "diagnoses": [
      {
        "name": "Острая респираторная вирусная инфекция",
        "code": null,
        "description": null,
        "isPrimary": true
      }
    ],
    "prescriptions": [
      {
        "name": "Название лекарства",
        "instructions": "По 5 мл три раза в день в течение пяти дней",
        "comment": null
      }
    ]
  }
}
```

Поля посещения:

| Поле | Тип | Обязательное |
|---|---|---:|
| `visitedAt` | datetime | да |
| `doctorName` | string/null | нет |
| `specialty` | string/null | нет |
| `organization` | string/null | нет |
| `reason` | string/null | нет |
| `conclusion` | string/null | нет |
| `comment` | string/null | нет |
| `episodeId` | UUID/null | нет |
| `diagnoses` | array | нет |
| `prescriptions` | array | нет |

## 7. Заметка

```json
{
  "schemaVersion": 1,
  "recordType": "note",
  "personId": "0f47781b-93f8-4be3-baf6-89d117c828c4",
  "data": {
    "occurredAt": "2026-03-15T10:15:00+03:00",
    "title": "Самочувствие улучшилось",
    "text": "Температура снизилась, появился аппетит",
    "tags": ["самочувствие"],
    "episodeId": null
  }
}
```

Поля заметки:

| Поле | Тип | Обязательное |
|---|---|---:|
| `occurredAt` | datetime | да |
| `title` | string | да |
| `text` | string | да |
| `tags` | string[] | нет |
| `episodeId` | UUID/null | нет |

## 8. Вложения при импорте

Файлы загружаются на экране предварительного просмотра импорта. JSON может содержать локальные ссылки для сопоставления:

```json
{
  "attachments": [
    {
      "localReference": "source-document",
      "fileName": "analysis-2026-03-15.pdf",
      "caption": "Исходный бланк анализа"
    }
  ]
}
```

`localReference` является идентификатором сопоставления. Пользователь выбирает соответствующий файл перед подтверждением импорта.

Внутри результата лабораторного исследования допускаются ссылки на элементы массива вложений:

```json
{
  "name": "ЭКГ",
  "valueType": "text",
  "textValue": "Синусовый ритм",
  "attachmentReferences": ["ecg-image"]
}
```

Физический путь локального файла в JSON не сохраняется и не используется сервером.

## 9. Статусы импорта

Импорт проходит состояния:

- `draft` — данные загружены и проходят проверку;
- `invalid` — обнаружены ошибки структуры или значений;
- `ready` — данные прошли проверку;
- `confirmed` — пользователь подтвердил сохранение;
- `completed` — записи сохранены;
- `failed` — сохранение завершилось ошибкой.

Переход в `completed` выполняется один раз. Все связанные предметные записи сохраняются в одной транзакции.

## 10. Формат ошибок проверки

```json
{
  "valid": false,
  "errors": [
    {
      "path": "data.results[0].numericValue",
      "code": "invalid_type",
      "message": "Ожидалось числовое значение"
    }
  ]
}
```

Экран проверки должен отображать путь, сообщение и поле редактирования для каждой исправимой ошибки.

## 11. Версионирование

- `schemaVersion` является обязательным целым числом.
- Каждая версия имеет отдельную схему проверки.
- Сервер выбирает обработчик по `schemaVersion` и `recordType`.
- Внутренняя модель приложения формируется через преобразователь версии импорта.
- Исходный JSON и его версия сохраняются в записи импорта.
