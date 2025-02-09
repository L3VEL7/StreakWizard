
const { Sequelize } = require('sequelize');
require('dotenv').config();

let connectionUrl;

// Try using Railway's provided PostgreSQL URL format first
if (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGPORT) {
    connectionUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;
} else {
    connectionUrl = process.env.DATABASE_URL;
}

if (!connectionUrl) {
    throw new Error('Database connection URL not found in environment variables');
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
