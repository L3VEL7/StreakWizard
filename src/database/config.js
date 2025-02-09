
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database connection info from Railway's environment variables
const databaseUrl = process.env.DATABASE_URL;
const postgresqlUrl = process.env.POSTGRESQL_URL;

// Use the first available connection URL
const connectionUrl = databaseUrl || postgresqlUrl;

if (!connectionUrl) {
    throw new Error('Database URL not found in environment variables');
}

const sequelize = new Sequelize(connectionUrl, {
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
