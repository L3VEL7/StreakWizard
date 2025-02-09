
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Handle Railway's private network format
let databaseUrl = process.env.DATABASE_URL;

// Try to parse Railway's format if it matches the template syntax
if (databaseUrl && databaseUrl.includes('{{') && databaseUrl.includes('}}')) {
    console.log('Detected Railway template syntax, using PostgreSQL default URL');
    const PGUSER = process.env.PGUSER || 'postgres';
    const PGPASSWORD = process.env.PGPASSWORD || '';
    const PGHOST = process.env.PGHOST || 'localhost';
    const PGPORT = process.env.PGPORT || 5432;
    const PGDATABASE = process.env.PGDATABASE || 'railway';
    
    databaseUrl = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
}

if (!databaseUrl) {
    throw new Error('Database URL not found in environment variables');
}

const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

module.exports = sequelize;
