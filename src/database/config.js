
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Parse Railway's database URL or use direct environment variable
const databaseUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

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
