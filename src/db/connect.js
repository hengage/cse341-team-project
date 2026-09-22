import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

let database;
let client;

const connectToDb = async (options = {}) => {
  if (database) {
    return database;
  }

  const connectionString = options.connectionString || process.env.MONGODB_URI;
  const databaseName = options.databaseName || process.env.MONGODB_DB_NAME || 'practice';

  if (!connectionString) {
    throw new Error('MONGODB_URI is required.');
  }

  // Mongoose maintains its own connection alongside the native driver so both old and new data-access code keep working.
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(connectionString, { dbName: databaseName });
  }

  client = new MongoClient(connectionString);
  await client.connect();
  database = client.db(databaseName);

  return database;
};

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return database;
};

const closeDb = async () => {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export { closeDb, connectToDb, getDb };
