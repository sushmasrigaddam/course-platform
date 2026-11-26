import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

const isCompiled = path.basename(path.dirname(__dirname)) === 'dist';
const routeDocs = isCompiled
  ? [
      './dist/routes/auth.routes.js',
      './dist/routes/public.routes.js',
      './dist/routes/student.routes.js',
      './dist/routes/admin/**/*.js',
    ]
  : ['./src/routes/*.ts', './src/routes/admin/*.ts'];

export const swaggerSpec = swaggerJSDoc({

  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Course Platform API',
      version: '1.0.0',
      description: 'REST API used by the user site and the CMS',
    },
    servers: [{ url: 'http://localhost:4000/api/v1' }],
    tags: [
      { name: 'Auth' },
      { name: 'Public' },
      { name: 'Student' },
      { name: 'Admin - Overview' },
      { name: 'Admin - Courses' },
      { name: 'Admin - Categories' },
      { name: 'Admin - Modules' },
      { name: 'Admin - Lessons' },
      { name: 'Admin - Users' },
      { name: 'Admin - Roles' },
      { name: 'Admin - Permissions' },
    ],
    components: {
      // Adds the "Authorize" button where you paste your token
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
        AuthResponse: {
          type: 'object',
          required: ['message', 'token', 'user'],
          properties: {
            message: { type: 'string', example: 'Login successful' },
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/PublicUser' },
          },
        },
        UserResponse: {
          type: 'object',
          required: ['message', 'user'],
          properties: {
            message: { type: 'string', example: 'User information retrieved successfully' },
            user: { $ref: '#/components/schemas/PublicUser' },
          },
        },
        MessageResponse: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string' },
          },
        },
        PublicUser: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', example: 'STUDENT' },
          },
        },
        RoleSummary: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
        },
        PermissionSummary: {
          type: 'object',
          required: ['id', 'key', 'isSystem'],
          properties: {
            id: { type: 'integer' },
            key: { type: 'string', example: 'create:course' },
            description: { type: 'string', nullable: true },
            isSystem: { type: 'boolean' },
          },
        },
        PermissionRecord: {
          type: 'object',
          required: ['id', 'key', 'isSystem', 'roles'],
          properties: {
            id: { type: 'integer' },
            key: { type: 'string', example: 'create:course' },
            description: { type: 'string', nullable: true },
            isSystem: { type: 'boolean' },
            roles: {
              type: 'array',
              items: { $ref: '#/components/schemas/RoleSummary' },
            },
          },
        },
        RoleRecord: {
          type: 'object',
          required: ['id', 'name', 'isSystem', 'permissions'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'INSTRUCTOR' },
            description: { type: 'string', nullable: true },
            isSystem: { type: 'boolean' },
            permissions: {
              type: 'array',
              items: { $ref: '#/components/schemas/PermissionSummary' },
            },
          },
        },
        RoleMutationResponse: {
          type: 'object',
          required: ['message', 'role'],
          properties: {
            message: { type: 'string' },
            role: { $ref: '#/components/schemas/RoleRecord' },
          },
        },
        PermissionMutationResponse: {
          type: 'object',
          required: ['message', 'permission'],
          properties: {
            message: { type: 'string' },
            permission: { $ref: '#/components/schemas/PermissionRecord' },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            role: { type: 'string', enum: ['STUDENT', 'INSTRUCTOR'], default: 'STUDENT' },
          },
        },
        UpdateProfileInput: {
          type: 'object',
          description: 'Provide at least one field.',
          properties: {
            name: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
          },
        },
        ModuleInput: {
          type: 'object',
          required: ['title', 'position'],
          properties: {
            title: { type: 'string' },
            position: { type: 'integer', minimum: 1 },
          },
        },
        LessonInput: {
          type: 'object',
          required: ['title', 'content', 'durationMin', 'position'],
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            videoUrl: { type: 'string', format: 'uri', nullable: true },
            durationMin: { type: 'integer', minimum: 0 },
            position: { type: 'integer', minimum: 1 },
          },
        },
        CourseInput: {
          type: 'object',
          required: ['title', 'description', 'level', 'price'],
          properties: {
            title: { type: 'string', example: 'Node.js for Beginners' },
            description: { type: 'string', example: 'Build a REST API step by step.' },
            level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
            price: { type: 'number', example: 499 },
            thumbnailUrl: { type: 'string', nullable: true },
            categoryId: { type: 'integer', nullable: true, example: 1 },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        CourseRecord: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            level: { type: 'string' },
            price: { type: 'number' },
            thumbnailUrl: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
            categoryId: { type: 'integer', nullable: true },
            instructorId: { type: 'integer' },
            category: { $ref: '#/components/schemas/Category' },
            _count: {
              type: 'object',
              properties: { enrollments: { type: 'integer' } },
            },
          },
        },
        CoursePage: {
          type: 'object',
          required: ['items', 'total', 'page', 'totalPages'],
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/CourseRecord' },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Section: {
          type: 'object',
          required: ['id', 'title', 'position', 'courseId'],
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Introduction' },
            position: { type: 'integer', example: 1 },
            courseId: { type: 'integer', example: 1 },
          },
        },
        StudentCourseProgress: {
          type: 'object',
          required: ['id', 'title', 'slug', 'totalLessons', 'completedLessons', 'progress'],
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            slug: { type: 'string' },
            thumbnailUrl: { type: 'string', nullable: true },
            totalLessons: { type: 'integer' },
            completedLessons: { type: 'integer' },
            progress: { type: 'integer', minimum: 0, maximum: 100 },
          },
        },
      },
    },
  },
  // Where to look for the comments. The .js path is used after `npm run build`.
  apis: routeDocs,
});