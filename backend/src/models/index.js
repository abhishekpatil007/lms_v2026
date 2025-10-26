import { fileURLToPath, pathToFileURL } from 'url';
import { readdirSync } from 'fs';
import path from 'path';
import { sequelize } from '../config/db.js';
import { Sequelize } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = {};
const files = readdirSync(__dirname).filter(f => f !== 'index.js' && f.endsWith('.js'));

for (const file of files) {
  const modelPath = pathToFileURL(path.join(__dirname, file)).href;
  const model = (await import(modelPath)).default;
  db[model.name] = model;
}

// Run associate after all models loaded
Object.keys(db).forEach(name => {
  if (db[name].associate) db[name].associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
