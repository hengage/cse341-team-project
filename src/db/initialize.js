import trips from './seeds/trips.json' with { type: 'json' };
import schedules from './seeds/schedules.json' with { type: 'json' };
import stations from './seeds/stations.json' with { type: 'json' };
import ticketClasses from './seeds/ticket-classes.json' with { type: 'json' };
import trains from './seeds/trains.json' with { type: 'json' };
import roles from './seeds/roles.json' with { type: 'json' };
import Role from '../models/schemas/roles.js';

const starterCollections = [
  ['trips', trips],
  ['schedules', schedules],
  ['stations', stations],
  ['ticketClasses', ticketClasses],
  ['trains', trains]
];

const initializeDatabase = async (db) => {
  if (!db) {
    throw new Error('A database connection is required to initialize data.');
  }

  for (const [collectionName, documents] of starterCollections) {
    const collection = db.collection(collectionName);
    await collection.deleteMany({});
    await collection.insertMany(documents);
  }

  for (const role of roles) {
    await Role.updateOne(
      { name: role.name },
      { $set: role },
      { upsert: true, runValidators: true }
    );
  }

  const confirmations = db.collection('confirmations');
  await confirmations.deleteMany({});
  await confirmations.createIndex({ id: 1 }, { unique: true });
};

export { initializeDatabase, starterCollections };
