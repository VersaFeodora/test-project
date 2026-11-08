import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity.js';
import { Product } from './entities/product.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3307,
      username: 'root',
      password: '',
      database: 'test',
      entities: [Category, Product], 
      autoLoadEntities: true,
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Category, Product]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

