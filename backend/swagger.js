const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Map Friends API',
    version: '1.0.0',
    description: 'REST API для сервиса совместных карт с местами, отзывами и фото',
  },
  servers: [{ url: '/api', description: 'API base' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT-токен, полученный при входе. Передаётся в заголовке `Authorization: Bearer <token>`',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id:         { type: 'integer', example: 1 },
          username:   { type: 'string',  example: 'ivan' },
          email:      { type: 'string',  format: 'email', example: 'ivan@example.com' },
          avatar:     { type: 'string',  nullable: true, example: 'avatar-1-1710000000.jpg' },
          bio:        { type: 'string',  nullable: true, example: 'Люблю кофе' },
          created_at: { type: 'string',  format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user:  { $ref: '#/components/schemas/User' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      Place: {
        type: 'object',
        properties: {
          id:          { type: 'integer', example: 5 },
          user_id:     { type: 'integer', example: 1 },
          name:        { type: 'string',  example: 'Кофейня у реки' },
          description: { type: 'string',  nullable: true },
          category:    { type: 'string',  enum: ['cafe','coffee','fastfood','restaurant','bar','other'], example: 'cafe' },
          cuisine:     { type: 'string',  nullable: true, example: 'italian' },
          price_level: { type: 'integer', minimum: 0, maximum: 4, example: 2 },
          website:     { type: 'string',  nullable: true, example: 'https://example.com' },
          hashtags:    { type: 'string',  nullable: true, example: '#уютно #кофе' },
          address:     { type: 'string',  nullable: true, example: 'ул. Ленина, 5' },
          own_rating:  { type: 'integer', nullable: true, minimum: 1, maximum: 10, example: 8 },
          is_featured: { type: 'integer', enum: [0, 1], example: 0 },
          lat:         { type: 'number',  example: 55.7558 },
          lng:         { type: 'number',  example: 37.6173 },
          avg_rating:  { type: 'number',  example: 4.2 },
          review_count:{ type: 'integer', example: 3 },
          photo_count: { type: 'integer', example: 5 },
          likes_count: { type: 'integer', example: 12 },
          user_liked:  { type: 'integer', enum: [0, 1], example: 0 },
          username:    { type: 'string',  example: 'ivan' },
          created_at:  { type: 'string',  format: 'date-time' },
        },
      },
      PlaceDetail: {
        allOf: [
          { $ref: '#/components/schemas/Place' },
          {
            type: 'object',
            properties: {
              photos:  { type: 'array', items: { $ref: '#/components/schemas/Photo' } },
              reviews: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
            },
          },
        ],
      },
      Photo: {
        type: 'object',
        properties: {
          id:         { type: 'integer', example: 10 },
          place_id:   { type: 'integer', example: 5 },
          user_id:    { type: 'integer', example: 1 },
          filename:   { type: 'string',  example: 'place-1710000000-abc123.jpg' },
          username:   { type: 'string',  example: 'ivan' },
          created_at: { type: 'string',  format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id:          { type: 'integer', example: 3 },
          place_id:    { type: 'integer', example: 5 },
          user_id:     { type: 'integer', example: 1 },
          rating:      { type: 'integer', minimum: 1, maximum: 5, example: 4 },
          text:        { type: 'string',  nullable: true, example: 'Очень уютно!' },
          likes_count: { type: 'integer', example: 2 },
          user_liked:  { type: 'integer', enum: [0, 1], example: 0 },
          username:    { type: 'string',  example: 'ivan' },
          avatar:      { type: 'string',  nullable: true },
          created_at:  { type: 'string',  format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id:         { type: 'integer', example: 7 },
          review_id:  { type: 'integer', example: 3 },
          user_id:    { type: 'integer', example: 2 },
          text:       { type: 'string',  example: 'Согласен!' },
          username:   { type: 'string',  example: 'maria' },
          avatar:     { type: 'string',  nullable: true },
          created_at: { type: 'string',  format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Not found' },
        },
      },
    },
  },

  tags: [
    { name: 'Auth',    description: 'Регистрация, вход, OAuth' },
    { name: 'Users',   description: 'Профили пользователей' },
    { name: 'Places',  description: 'Места на карте' },
    { name: 'Photos',  description: 'Фотографии мест' },
    { name: 'Reviews', description: 'Отзывы на места' },
    { name: 'Comments',description: 'Комментарии к отзывам' },
  ],

  paths: {
    // ─── AUTH ────────────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Регистрация нового пользователя',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', example: 'ivan' },
                  email:    { type: 'string', format: 'email', example: 'ivan@example.com' },
                  password: { type: 'string', minLength: 6, example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Успех — возвращает пользователя и JWT-токен', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Ошибка валидации или имя/email уже заняты', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Вход по email и паролю',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'ivan@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Успех', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Неверные учётные данные', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Вход через Google OAuth',
        description: 'Принимает Google ID-токен из `@react-oauth/google`. Создаёт пользователя при первом входе.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['credential'],
                properties: {
                  credential: { type: 'string', description: 'Google ID token', example: 'eyJhbGci...' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Успех', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Неверный токен Google', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ─── USERS ───────────────────────────────────────────────────────────────
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Профиль пользователя со всеми его местами, отзывами и лайкнутыми местами',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 1 }],
        responses: {
          200: {
            description: 'Профиль пользователя',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user:         { $ref: '#/components/schemas/User' },
                    places:       { type: 'array', items: { $ref: '#/components/schemas/Place' } },
                    reviews:      { type: 'array', items: { $ref: '#/components/schemas/Review' } },
                    liked_places: { type: 'array', items: { $ref: '#/components/schemas/Place' } },
                  },
                },
              },
            },
          },
          404: { description: 'Пользователь не найден', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/users/me': {
      put: {
        tags: ['Users'],
        summary: 'Обновить свой профиль (имя, биография, аватар)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', minLength: 2, example: 'ivan_new' },
                  bio:      { type: 'string', example: 'Люблю путешествия' },
                  avatar:   { type: 'string', format: 'binary', description: 'Файл аватара (≤ 5 МБ, только изображение)' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Обновлённый профиль', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'Имя уже занято или слишком короткое', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Не авторизован' },
        },
      },
    },

    // ─── PLACES ──────────────────────────────────────────────────────────────
    '/places': {
      get: {
        tags: ['Places'],
        summary: 'Все места (маркеры на карте)',
        description: 'Возвращает список мест с агрегированной статистикой. Если передан токен, добавляет флаг `user_liked`.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Список мест', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Place' } } } } },
        },
      },
      post: {
        tags: ['Places'],
        summary: 'Создать новое место (с фото)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['name', 'lat', 'lng'],
                properties: {
                  name:        { type: 'string', example: 'Кофейня у реки' },
                  description: { type: 'string' },
                  category:    { type: 'string', enum: ['cafe','coffee','fastfood','restaurant','bar','other'], example: 'cafe' },
                  cuisine:     { type: 'string', example: 'italian' },
                  price_level: { type: 'integer', minimum: 0, maximum: 4, example: 2 },
                  website:     { type: 'string', example: 'https://example.com' },
                  hashtags:    { type: 'string', example: '#уютно' },
                  address:     { type: 'string', example: 'ул. Ленина, 5' },
                  own_rating:  { type: 'integer', minimum: 1, maximum: 10, example: 8 },
                  lat:         { type: 'number', example: 55.7558 },
                  lng:         { type: 'number', example: 37.6173 },
                  photos:      { type: 'array', items: { type: 'string', format: 'binary' }, description: 'До 10 фото, каждый ≤ 10 МБ' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Созданное место', content: { 'application/json': { schema: { $ref: '#/components/schemas/Place' } } } },
          400: { description: 'Отсутствуют обязательные поля', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Не авторизован' },
        },
      },
    },
    '/places/{id}': {
      get: {
        tags: ['Places'],
        summary: 'Детальная информация о месте (фото + отзывы)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 5 }],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Место с фото и отзывами', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlaceDetail' } } } },
          404: { description: 'Не найдено', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Places'],
        summary: 'Редактировать место (только владелец)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 5 }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name:        { type: 'string' },
                  description: { type: 'string' },
                  category:    { type: 'string', enum: ['cafe','coffee','fastfood','restaurant','bar','other'] },
                  cuisine:     { type: 'string' },
                  price_level: { type: 'integer', minimum: 0, maximum: 4 },
                  website:     { type: 'string' },
                  hashtags:    { type: 'string' },
                  address:     { type: 'string' },
                  own_rating:  { type: 'integer', minimum: 1, maximum: 10 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Обновлённое место', content: { 'application/json': { schema: { $ref: '#/components/schemas/Place' } } } },
          403: { description: 'Запрещено — не ваше место' },
          404: { description: 'Не найдено' },
        },
      },
      delete: {
        tags: ['Places'],
        summary: 'Удалить место со всеми фото и отзывами (только владелец)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 5 }],
        responses: {
          200: { description: 'Успех', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          403: { description: 'Запрещено' },
          404: { description: 'Не найдено' },
        },
      },
    },
    '/places/{id}/like': {
      post: {
        tags: ['Places'],
        summary: 'Поставить / убрать лайк на место',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 5 }],
        responses: {
          200: { description: 'Новый статус', content: { 'application/json': { schema: { type: 'object', properties: { liked: { type: 'boolean' } } } } } },
          401: { description: 'Не авторизован' },
        },
      },
    },
    '/places/{id}/feature': {
      post: {
        tags: ['Places'],
        summary: 'Переключить статус "Моё особое место" (только владелец)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 5 }],
        responses: {
          200: { description: 'Новый статус', content: { 'application/json': { schema: { type: 'object', properties: { is_featured: { type: 'integer', enum: [0, 1] } } } } } },
          403: { description: 'Запрещено' },
        },
      },
    },

    // ─── PHOTOS ──────────────────────────────────────────────────────────────
    '/places/{id}/photos': {
      post: {
        tags: ['Photos'],
        summary: 'Добавить фото к существующему месту',
        description: 'Любой авторизованный пользователь может добавить фото. Фото привязывается к загружавшему пользователю.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 5 }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['photos'],
                properties: {
                  photos: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'До 10 файлов, каждый ≤ 10 МБ' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Количество добавленных фото', content: { 'application/json': { schema: { type: 'object', properties: { added: { type: 'integer', example: 2 } } } } } },
          400: { description: 'Файлы не переданы' },
          401: { description: 'Не авторизован' },
        },
      },
    },
    '/places/{id}/photos/{photoId}': {
      delete: {
        tags: ['Photos'],
        summary: 'Удалить фото (только загружавший или владелец места)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id',      in: 'path', required: true, schema: { type: 'integer' }, example: 5 },
          { name: 'photoId', in: 'path', required: true, schema: { type: 'integer' }, example: 10 },
        ],
        responses: {
          200: { description: 'Успех', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'boolean' } } } } } },
          403: { description: 'Запрещено' },
          404: { description: 'Не найдено' },
        },
      },
    },

    // ─── REVIEWS ─────────────────────────────────────────────────────────────
    '/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Оставить отзыв на место',
        description: 'Один пользователь — один отзыв на место.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['place_id', 'rating'],
                properties: {
                  place_id: { type: 'integer', example: 5 },
                  rating:   { type: 'integer', minimum: 1, maximum: 5, example: 4 },
                  text:     { type: 'string',  example: 'Очень уютно!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Созданный отзыв', content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } } },
          400: { description: 'Уже есть отзыв или неверный рейтинг', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Не авторизован' },
        },
      },
    },
    '/reviews/{id}': {
      put: {
        tags: ['Reviews'],
        summary: 'Редактировать свой отзыв — текст, рейтинг и фото за один запрос',
        description: 'Единый PUT: обновляет текст/рейтинг, удаляет указанные фото и добавляет новые. Тело — `multipart/form-data`.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 3 }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  rating:           { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                  text:             { type: 'string', example: 'Всё понравилось!' },
                  delete_photo_ids: { type: 'string', description: 'JSON-массив id фото для удаления, например `[10, 12]`', example: '[10,12]' },
                  photos:           { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Новые фото (до 10, каждый ≤ 10 МБ)' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Обновлённый отзыв', content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } } },
          403: { description: 'Чужой отзыв' },
          404: { description: 'Не найдено' },
        },
      },
      delete: {
        tags: ['Reviews'],
        summary: 'Удалить свой отзыв',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 3 }],
        responses: {
          200: { description: 'Успех', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          403: { description: 'Чужой отзыв' },
          404: { description: 'Не найдено' },
        },
      },
    },
    '/reviews/{id}/like': {
      post: {
        tags: ['Reviews'],
        summary: 'Поставить / убрать лайк на отзыв',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 3 }],
        responses: {
          200: { description: 'Новый статус', content: { 'application/json': { schema: { type: 'object', properties: { liked: { type: 'boolean' } } } } } },
          401: { description: 'Не авторизован' },
        },
      },
    },

    // ─── COMMENTS ────────────────────────────────────────────────────────────
    '/reviews/{id}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'Список комментариев к отзыву',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 3 }],
        responses: {
          200: { description: 'Комментарии', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Comment' } } } } },
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Добавить комментарий к отзыву',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 3 }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: { text: { type: 'string', example: 'Согласен!' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Созданный комментарий', content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } } },
          401: { description: 'Не авторизован' },
        },
      },
    },
    '/reviews/{id}/comments/{commentId}': {
      delete: {
        tags: ['Comments'],
        summary: 'Удалить свой комментарий',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id',        in: 'path', required: true, schema: { type: 'integer' }, example: 3 },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'integer' }, example: 7 },
        ],
        responses: {
          200: { description: 'Успех', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          403: { description: 'Чужой комментарий' },
          404: { description: 'Не найдено' },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
