import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Category } from './category.entity.js';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('int')
  price: number;

  @Column('int')
  stock: number;

  @ManyToOne(() => Category, (category) => category.id, { onDelete: 'CASCADE' })
  category: Category;
}