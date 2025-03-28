const { DataTypes } = require('sequelize');
const sequelize = require('./config');
const { GuildConfig, Streak } = require('./models');

async function initializeDatabase() {
    try {
        // Test the connection first
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Sync all models
        await sequelize.sync();
        console.log('Database models synchronized successfully.');

        return true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        return false;
    }
}

// Only run if this file is called directly
if (require.main === module) {
    initializeDatabase()
        .then(success => {
            if (!success) {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Unhandled error during database initialization:', error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase }; 