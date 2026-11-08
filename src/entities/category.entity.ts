import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('categories') // Nama tabel di database nanti adalah 'categories'
export class Category {
  @PrimaryGeneratedColumn()
  id: number; // Ini untuk ID otomatis (1, 2, 3...)

  @Column()
  name: string; // Ini untuk nama kategori (misal: Elektronik, Pakaian)

  @Column({ default: true })
  isActive: boolean;
}