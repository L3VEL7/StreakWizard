const { DataTypes } = require('sequelize');
const sequelize = require('./config');
const { GuildConfig, Streak, migrateDatabase } = require('./models');

async function initializeDatabase() {
    try {
        // Test the connection first
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Run migrations first to preserve existing data
        console.log('Running database migrations...');
        await migrateDatabase();
        console.log('Database migrations completed successfully.');

        // Sync all models (this will create any missing tables without modifying existing ones)
        await sequelize.sync({ alter: false });
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