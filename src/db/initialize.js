import trips from './seeds/trips.json' with { type: 'json' };
import schedules from './seeds/schedules.json' with { type: 'json' };
import stations from './seeds/stations.json' with { type: 'json' };
import ticketClasses from './seeds/ticket-classes.json' with { type: 'json' };
import trains from './seeds/trains.json' with { type: 'json' };
import roles from './seeds/roles.json' with { type: 'json' };
import Role from '../models/schemas/roles.js';
import users from './seeds/users.json' with { type: 'json' };
import {createUser} from '../models/users.js';

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

  for (const user of users) {
    const role = await Role.findOne({ name: user.role });
    await createUser({
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash,
        role: role._id
    });
  }

  const confirmations = db.collection('confirmations');
  await confirmations.deleteMany({});
  await confirmations.createIndex({ id: 1 }, { unique: true });
};

export { initializeDatabase, starterCollections };
