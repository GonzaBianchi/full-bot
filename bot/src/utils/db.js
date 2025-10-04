import mongoose from 'mongoose';

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definido en el .env');
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ Conectado a MongoDB desde el bot');
}
