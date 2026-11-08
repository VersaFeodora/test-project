import { Controller, Get, Post, Body, Redirect, Query, Session, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindManyOptions } from 'typeorm';
import { Category } from './entities/category.entity.js';
import { Product } from './entities/product.entity.js';
import * as express from 'express';

@Controller()
export class AppController {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  @Get()
  async root(
    @Query('search') search: string, 
    @Session() session: Record<string, any>,
    @Res() res: express.Response 
  ) {
    if (!session.isLoggedIn) {
      return res.render('login', { title: 'Login Admin', error: null });
    }

    const categories = await this.categoryRepo.find({ order: { id: 'ASC' } });
    
    const queryOptions: FindManyOptions<Product> = {
      relations: {
        category: true,
      },
      order: {
        id: 'ASC',
      },
    };

    if (search) {
      queryOptions.where = {
        name: ILike(`%${search}%`),
      };
    }

    if (search) {
      queryOptions.where = { name: ILike(`%${search}%`) };
    }

    const products = await this.productRepo.find(queryOptions);
    
    return res.render('index', { 
      title: 'Admin Panel',
      categories: categories,
      products: products,
      search: search 
    });
  }

  // --- LOGIKA AUTH (LOGIN/LOGOUT) ---

  @Post('login')
  async handleLogin(
    @Body('password') password: string, 
    @Session() session: Record<string, any>,
    @Res() res: express.Response
  ) {
    if (password === 'admin') {
      session.isLoggedIn = true;
      console.log('Login berhasil!');
      return res.redirect('/');
    } else {
      console.log('Password salah!');
      return res.render('login', { 
        title: 'Login Admin', 
        error: 'Wrong Password! Try Again' 
      });
    }
  }

  @Get('logout')
  logout(
      @Session() session: Record<string, any>,
      @Res() res: express.Response
  ) {
      session.destroy((err: Error | null) => {
          if (err) {
              console.error(err);
              return res.status(500).send('Failed to logout');
          }

          return res.redirect('/');
      });
  }

  // --- LOGIKA KATEGORI ---

  @Post('add-category')
  @Redirect('/')
  async addCategory(@Body('name') name: string) {
    await this.categoryRepo.save({ name });
  }

  @Post('delete-category')
  @Redirect('/') 
  async deleteCategory(@Body('id') id: number) {
    await this.categoryRepo.delete(id);
  }

  @Post('edit-category')
  @Redirect('/') 
  async editCategory(@Body('id') id: number, @Body('name') name: string) {
    await this.categoryRepo.update(id, { name });
  }

  // --- LOGIKA PRODUK ---

  @Post('add-product')
  @Redirect('/')
  async addProduct(
    @Body('name') name: string,
    @Body('price') price: number,
    @Body('stock') stock: number,
    @Body('categoryId') categoryId: number,
  ) {
    await this.productRepo.save({
      name,
      price,
      stock,
      category: { id: categoryId } 
    });
  }

  @Post('edit-product')
@Redirect('/')
async editProduct(
  @Body('id') id: number,
  @Body('name') name: string,
  @Body('price') price: number,
  @Body('stock') stock: number,
  @Body('categoryId') categoryId: number,
) {
  await this.productRepo.update(id, {
    name,
    price,
    stock,
    category: { id: categoryId },
  });
}

  @Post('delete-product')
  @Redirect('/')
  async deleteProduct(@Body('id') id: number) {
    await this.productRepo.delete(id);
  }
}