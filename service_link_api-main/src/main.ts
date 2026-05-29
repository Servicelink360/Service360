import './load-env';
import * as fs from 'fs';

// Global error logging for all uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  const logDir = 'C:/360/service_link_api-main/log/error';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.appendFileSync(
    logDir + '/error.log',
    `[uncaughtException] ${new Date().toISOString()}\n${err.stack || err}\n\n`
  );
  console.error('[uncaughtException]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  const logDir = 'C:/360/service_link_api-main/log/error';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.appendFileSync(
    logDir + '/error.log',
    `[unhandledRejection] ${new Date().toISOString()}\n${reason}\n\n`
  );
  console.error('[unhandledRejection]', reason);
});
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { LoggingInterceptor } from './base/logging.interceptor';
import * as morgan from 'morgan';
import { contentParser } from 'fastify-multer';
import { join } from 'path';
import { HttpExceptionFilter } from './http-exception.filter';
import { getPublicRoot } from './paths';
declare const module;
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 50 * 1024 * 1024 }),
    {
      logger: ['log', 'error', 'warn', 'debug'],
    }
  );
  // fastify-multer registers a parser for the string "multipart"; Fastify 5 only matches that when the
  // next character is `;`, space, tab, or EOS — so "multipart/form-data" does NOT match → 415.
  // Register the real media type so multipart uploads reach fastify-multer / busboy.
  await app.register(contentParser);
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addContentTypeParser(
    'multipart/form-data',
    { bodyLimit: 50 * 1024 * 1024 },
    (_req: any, _payload: any, done: (err: Error | null, body?: unknown) => void) => {
      done(null);
    },
  );
  const publicRoot = getPublicRoot();
  const uploadStaticRoot = join(publicRoot, 'upload');
  console.log('Serving static /public/upload/ from', uploadStaticRoot);
  app.useStaticAssets({
    root: uploadStaticRoot,
    prefix: '/public/upload/',
  });

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('ServicleLink API')
    .setDescription('ServicleLink service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(process.env.MODE == 'DEV' ? 'api' : "api-6cff369fd3fe9f132e986b2a3ea7d921", app, document, {
    customSiteTitle: 'News Service',
    swaggerOptions: {
      docExpansion: 'none',
    },
  });
  app.use(morgan('tiny'));
  // app.enableCors({
  //   allowedHeaders: "*",
  //   origin: "*"
  // });

  app.enableCors({
    allowedHeaders: "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization",
    origin: "*",
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.startAllMicroservices();
  //  app.register(fastifyCsrf);
  const port = Number(process.env.PORT) || 5301;
  await app.listen(port, '0.0.0.0');
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
  console.log(`Application is running on: ${await app.getUrl()}/${process.env.MODE === 'DEV' ? 'api' : "api-6cff369fd3fe9f132e986b2a3ea7d921"}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start Nest application:', err);
  process.exit(1);
});