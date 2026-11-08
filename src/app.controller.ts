import { Controller, Get, Post, Body, Query, Session, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, FindManyOptions } from 'typeorm';
import { Category } from './entities/category.entity.js';
import { Product } from './entities/product.entity.js';
import * as express from 'express';

type Result<T> = { error: string } | { data: T };

@Controller()
export class AppController {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,

    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  // ===== HELPERS =====

  private redirectWith(res: express.Response, type: 'error' | 'success', message: string) {
    return res.redirect(`/?${type}=${encodeURIComponent(message)}`);
  }

  private toInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
    return parseInt(value.trim(), 10);
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  private cleanSearch(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private ensureLoggedIn(session: Record<string, any>, res: express.Response): boolean {
    if (session?.isLoggedIn) return true;
    res.redirect('/');
    return false;
  }

  private validateCategory(name: unknown): Result<{ name: string }> {
    const clean = typeof name === 'string' ? name.trim() : '';
    if (!clean) return { error: 'Category name cannot be empty.' };
    if (clean.length < 2 || clean.length > 100) {
      return { error: 'Category name must be 2-100 characters.' };
    }
    return { data: { name: clean } };
  }

  private validateProduct(body: {
    name: unknown; price: unknown; stock: unknown; categoryId: unknown;
  }): Result<{ name: string; price: number; stock: number; categoryId: number }> {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = this.toInt(body.price);
    const stock = this.toInt(body.stock);
    const categoryId = this.toInt(body.categoryId);

    if (!name) return { error: 'Product name cannot be empty.' };
    if (name.length < 2 || name.length > 100) return { error: 'Product name must be 2-100 characters.' };
    if (price === null || price <= 0) return { error: 'Price must be a whole number greater than 0.' };
    if (price > 2_000_000_000) return { error: 'Price is too large.' };
    if (stock === null) return { error: 'Stock must be a whole number, 0 or more.' };
    if (stock > 1_000_000) return { error: 'Stock is too large.' };
    if (categoryId === null) return { error: 'Please choose a category.' };

    return { data: { name, price, stock, categoryId } };
  }

  // MySQL codes
  private dbErrorMessage(err: any, fallback: string): string {
    const code = err?.driverError?.code ?? err?.code;

    if (code === 'ER_DUP_ENTRY') return 'That name already exists.';
    if (code === 'ER_ROW_IS_REFERENCED_2') return 'Cannot delete: this item is still used by other data.';
    if (code === 'ER_NO_REFERENCED_ROW_2') return 'The selected category does not exist.';
    if (code === 'ER_DATA_TOO_LONG') return 'One of the values is too long.';
    if (code === 'ER_WARN_DATA_OUT_OF_RANGE' || code === 'ER_DATA_OUT_OF_RANGE') {
      return 'A number is outside the allowed range.';
    }

    console.error(err);
    return fallback;
  }

  // ===== INDEX =====

  @Get()
  async root(
    @Query('searchproduct') searchproduct: string,
    @Query('searchcategory') searchcategory: string,
    @Query('error') error: string,
    @Query('success') success: string,
    @Session() session: Record<string, any>,
    @Res() res: express.Response,
  ) {
    if (!session.isLoggedIn) {
      return res.render('login', { title: 'Login Admin', error: null });
    }

    try {
      const productKeyword = this.cleanSearch(searchproduct);
      const categoryKeyword = this.cleanSearch(searchcategory);

      const allCategories = await this.categoryRepo.find({ order: { id: 'ASC' } });

      const categories = await this.categoryRepo.find({
        where: categoryKeyword
          ? { name: Like(`%${this.escapeLike(categoryKeyword)}%`) }
          : {},
        order: { id: 'ASC' },
      });

      const queryOptions: FindManyOptions<Product> = {
        relations: { category: true },
        order: { id: 'ASC' },
      };

      if (productKeyword) {
        queryOptions.where = { name: Like(`%${this.escapeLike(productKeyword)}%`) };
      }

      const products = await this.productRepo.find(queryOptions);

      return res.render('index', {
        title: 'Admin Panel',
        categories,
        allCategories,
        products,
        searchproduct: productKeyword,
        searchcategory: categoryKeyword,
        error,
        success,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send('Failed to load data. Please try again later.');
    }
  }

  // ===== AUTH (LOGIN/LOGOUT) =====

  @Post('login')
  async handleLogin(
    @Body('password') password: string,
    @Session() session: Record<string, any>,
    @Res() res: express.Response,
  ) {
    if (typeof password !== 'string' || !password) {
      return res.render('login', { title: 'Login Admin', error: 'Password cannot be empty.' });
    }

    if (password === 'admin') {
      session.isLoggedIn = true;
      return res.redirect('/');
    }

    return res.render('login', {
      title: 'Login Admin',
      error: 'Wrong Password! Try Again',
    });
  }

  @Get('logout')
  logout(@Session() session: Record<string, any>, @Res() res: express.Response) {
    session.destroy((err: Error | null) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Failed to logout');
      }
      return res.redirect('/');
    });
  }

  // ===== CATEGORY =====

  @Post('add-category')
  async addCategory(
    @Body('name') name: string,
    @Session() session: Record<string, any>,
    @Res() res: express.Response,
  ) {
    if (!this.ensureLoggedIn(session, res)) return;

    const result = this.validateCategory(name);
    if ('error' in result) return this.redirectWith(res, 'error', result.error);

    try {
      // MySQL's default collation is case-insensitive, so plain equality catches "Food" vs "food"
      const exists = await this.categoryRepo.findOne({ where: { name: result.data.name } });
      if (exists) {
        return this.redirectWith(res, 'error', `Category "${result.data.name}" already exists.`);
      }

      await this.categoryRepo.save({ name: result.data.name });
      return this.redirectWith(res, 'success', 'Category added.');
    } catch (err) {
      return this.redirectWith(res, 'error', this.dbErrorMessage(err, 'Failed to add category.'));
    }
  }

  @Post('edit-category')
  async editCategory(
    @Body('id') id: string,
    @Body('name') name: string,
    @Session() session: Record<string, any>,
    @Res() res: express.Response,
  ) {
    if (!this.ensureLoggedIn(session, res)) return;

    const categoryId = this.toInt(id);
    if (categoryId === null) return this.redirectWith(res, 'error', 'Invalid category ID.');

    const result = this.validateCategory(name);
    if ('error' in result) return this.redirectWith(res, 'error', result.error);

    try {
      const duplicate = await this.categoryRepo.findOne({
        where: { name: result.data.name, id: Not(categoryId) },
      });
      if (duplicate) {
        return this.redirectWith(res, 'error', `Category "${result.data.name}" already exists.`);
      }

      const updated = await this.categoryRepo.update(categoryId, { name: result.data.name });
      if (!updated.affected) {
        return this.redirectWith(res, 'error', 'That category no longer exists.');
      }

      return this.redirectWith(res, 'success', 'Category updated.');
    } catch (err) {
      return this.redirectWith(res, 'error', this.dbErrorMessage(err, 'Failed to update category.'));
    }
  }

  @Post('delete-category')
  async deleteCategory(
    @Body('id') id: string,
    @Session() session: Record<string, any>,
    @Res() res: express.Response,
  ) {
    if (!this.ensureLoggedIn(session, res)) return;

    const categoryId = this.toInt(id);
    if (categoryId === null) return this.redirectWith(res, 'error', 'Invalid category ID.');

    try {
      const productCount = await this.productRepo.count({
        where: { category: { id: categoryId } },
      });
      if (productCount > 0) {
        return this.redirectWith(
          res, 'error',
          `Cannot delete: ${productCount} product(s) still use this category.`,
        );
      }

      const deleted = await this.categoryRepo.delete(categoryId);
      if (!deleted.affected) {
        return this.redirectWith(res, 'error', 'That category no longer exists.');
      }

      return this.redirectWith(res, 'success', 'Category deleted.');
    } catch (err) {
      return this.redirectWith(res, 'error', this.dbErrorMessage(err, 'Failed to delete category.'));
    }
  }

  // ===== PRODUCT =====

  @Post('add-product')
  async addProduct(
    @Body('name') name: string,
    @Body('price') price: string,
    @Body('stock') stock: string,
    @Body('categoryId') categoryId: string,
    @Session() session: Record<string, any>,
    @Res() res: express.Response,
  ) {
    if (!this.ensureLoggedIn(session, res)) return;

    const result = this.validateProduct({ name, price, stock, categoryId });
    if ('error' in result) return this.redirectWith(res, 'error', result.error);

    try {
      const category = await this.categoryRepo.findOne({ where: { id: result.data.categoryId } });
      if (!category) {
        return this.redirectWith(res, 'error', 'The selected category does not exist.');
      }

      await this.productRepo.save({
        name: result.data.name,
        price: result.data.price,
        stock: result.data.stock,
        category: { id: result.data.categoryId },
      });

      return this.redirectWith(res, 'success', 'Product added.');
    } catch (err) {
      return this.redirectWith(res, 'error', this.dbErrorMessage(err, 'Failed to add product.'));
    }
  }

  @Post('edit-product')
  async editProduct(
    @Body('id') id: string,
    @Body('name') name: string,
    @Body('price') price: string,
    @Body('stock') stock: string,
    @Body('categoryId') categoryId: string,
    @Session() session: Record<string, any>,
    @Res() res: express.Response,
  ) {
    if (!this.ensureLoggedIn(session, res)) return;

    const productId = this.toInt(id);
    if (productId === null) return this.redirectWith(res, 'error', 'Invalid product ID.');

    const result = this.validateProduct({ name, price, stock, categoryId });
    if ('error' in result) return this.redirectWith(res, 'error', result.error);

    try {
      const category = await this.categoryRepo.findOne({ where: { id: result.data.categoryId } });
      if (!category) {
        return this.redirectWith(res, 'error', 'The selected category does not exist.');
      }

      const updated = await this.productRepo.update(productId, {
        name: result.data.name,
        price: result.data.price,
        stock: result.data.stock,
        category: { id: result.data.categoryId },
      });
      if (!updated.affected) {
        return this.redirectWith(res, 'error', 'That product no longer exists.');
      }

      return this.redirectWith(res, 'success', 'Product updated.');
    } catch (err) {
      return this.redirectWith(res, 'error', this.dbErrorMessage(err, 'Failed to update product.'));
    }
  }

  @Post('delete-product')
  async deleteProduct(
    @Body('id') id: string,
    @Session() session: Record<string, any>,
    @Res() res: express.Response,
  ) {
    if (!this.ensureLoggedIn(session, res)) return;

    const productId = this.toInt(id);
    if (productId === null) return this.redirectWith(res, 'error', 'Invalid product ID.');

    try {
      const deleted = await this.productRepo.delete(productId);
      if (!deleted.affected) {
        return this.redirectWith(res, 'error', 'That product no longer exists.');
      }

      return this.redirectWith(res, 'success', 'Product deleted.');
    } catch (err) {
      return this.redirectWith(res, 'error', this.dbErrorMessage(err, 'Failed to delete product.'));
    }
  }
}