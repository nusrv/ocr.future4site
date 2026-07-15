import mysql, { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { config } from './config';

export const db = mysql.createPool({
  uri: config.DATABASE_URL,
  connectionLimit: 10,
  enableKeepAlive: true,
  charset: 'utf8mb4'
});

export async function rows<T extends RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T> {
  const [result] = await db.query<T>(sql, params);
  return result;
}

export async function transaction<T>(fn: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const value = await fn(connection);
    await connection.commit();
    return value;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
