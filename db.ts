import mongoose from 'mongoose';
let cached = (globalThis as any).__mongoose ||= { conn: null, promise: null };
export async function connectDB() {
  if (cached.conn) return cached.conn;
  cached.promise ||= mongoose.connect(import.meta.env.MONGODB_URI, { bufferCommands: false });
  return (cached.conn = await cached.promise);
}
