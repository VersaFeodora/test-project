import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { dirname, join } from 'path';
import { AppModule } from './app.module.js';
import session from 'express-session';
import { fileURLToPath } from 'url';
import hbs from 'hbs';

async function bootstrap() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  app.use(
    session({
      secret: 'secret-key', 
      resave: false,
      saveUninitialized: false,
      cookie: { 
        maxAge: 3600000,
        httpOnly: true 
      },
    }),
  );

  hbs.registerHelper('formatPrice', (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
});

  
  await app.listen(3000);
}

bootstrap();