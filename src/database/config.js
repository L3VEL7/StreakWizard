const { Sequelize } = require('sequelize');
const { config } = require('dotenv');

// Load environment variables
config();

// Validate database URL
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}

// Parse database URL to get SSL settings
const dbUrl = new URL(process.env.DATABASE_URL);
const useSSL = dbUrl.searchParams.get('sslmode') === 'require';

// Create Sequelize instance with connection pooling
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    dialectOptions: {
        ssl: useSSL ? {
            require: true,
            rejectUnauthorized: false
        } : false
    },
    retry: {
        max: 3,
        match: [
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/
        ]
    }
});

module.exports = sequelize;
