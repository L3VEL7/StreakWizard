const { DataTypes } = require('sequelize');
const sequelize = require('./config');

// Guild configuration model
const GuildConfig = sequelize.define('GuildConfig', {
    guildId: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    triggerWords: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
        get() {
            const words = this.getDataValue('triggerWords');
            return Array.isArray(words) ? words.filter(word => word && typeof word === 'string') : [];
        },
        set(value) {
            const words = Array.isArray(value) 
                ? value
                    .filter(word => word && typeof word === 'string')
                    .map(word => word.toLowerCase().trim())
                    .filter(word => word.length > 0)
                : [];
            this.setDataValue('triggerWords', words);
        }
    },
    streakLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    streakStreakEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    }
});

// Streak model
const Streak = sequelize.define('Streak', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    guildId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    triggerWord: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
            if (!value || typeof value !== 'string') {
                throw new Error('Trigger word must be a non-empty string');
            }
            this.setDataValue('triggerWord', value.toLowerCase().trim());
        }
    },
    count: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
    bestStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
    streakStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    lastStreakDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    lastUpdated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    }
});

// Add hook to update best streak
Streak.addHook('beforeSave', async (streak) => {
    if (streak.changed('count') && streak.count > streak.bestStreak) {
        streak.bestStreak = streak.count;
    }
});

async function backupTable(tableName) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupTableName = `${tableName}_backup_${timestamp}`;
        
        await sequelize.query(`CREATE TABLE "${backupTableName}" AS SELECT * FROM "${tableName}"`);
        console.log(`Created backup table: ${backupTableName}`);
        return backupTableName;
    } catch (error) {
        console.error(`Error creating backup for ${tableName}:`, error);
        throw error;
    }
}

async function checkTableExists(tableName) {
    try {
        const result = await sequelize.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
            {
                bind: [tableName],
                type: sequelize.QueryTypes.SELECT
            }
        );
        return result[0].exists;
    } catch (error) {
        console.error(`Error checking if table ${tableName} exists:`, error);
        throw error;
    }
}

async function checkColumnExists(tableName, columnName) {
    try {
        const result = await sequelize.query(
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = $1 AND column_name = $2)",
            {
                bind: [tableName, columnName],
                type: sequelize.QueryTypes.SELECT
            }
        );
        return result[0].exists;
    } catch (error) {
        console.error(`Error checking if column ${columnName} exists in ${tableName}:`, error);
        throw error;
    }
}

async function migrateDatabase() {
    try {
        console.log('Starting database migration...');

        // Check if tables exist
        const guildConfigExists = await checkTableExists('GuildConfigs');
        const streaksExists = await checkTableExists('Streaks');

        if (!guildConfigExists || !streaksExists) {
            console.log('Tables do not exist, skipping migration');
            return;
        }

        // Create backups
        console.log('Creating backups...');
        const guildConfigBackup = await backupTable('GuildConfigs');
        const streaksBackup = await backupTable('Streaks');

        try {
            // Migrate GuildConfigs
            console.log('Migrating GuildConfigs table...');
            
            // Check and add streakStreakEnabled
            const hasStreakStreakEnabled = await checkColumnExists('GuildConfigs', 'streakStreakEnabled');
            if (!hasStreakStreakEnabled) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"streakStreakEnabled\" BOOLEAN NOT NULL DEFAULT true"
                );
                console.log('Added streakStreakEnabled column to GuildConfigs');
            }

            // Migrate Streaks
            console.log('Migrating Streaks table...');
            
            // Check and add new columns
            const columnsToAdd = [
                { name: 'streakStreak', type: 'INTEGER NOT NULL DEFAULT 0' },
                { name: 'lastStreakDate', type: 'DATE' },
                { name: 'bestStreak', type: 'INTEGER NOT NULL DEFAULT 1' }
            ];

            for (const column of columnsToAdd) {
                const exists = await checkColumnExists('Streaks', column.name);
                if (!exists) {
                    await sequelize.query(
                        `ALTER TABLE "Streaks" ADD COLUMN "${column.name}" ${column.type}`
                    );
                    console.log(`Added ${column.name} column to Streaks`);
                }
            }

            // Update existing streaks
            console.log('Updating existing streaks...');
            
            // Update bestStreak for existing records
            await sequelize.query(
                "UPDATE \"Streaks\" SET \"bestStreak\" = count WHERE \"bestStreak\" = 1"
            );
            
            // Initialize streakStreak for existing records
            await sequelize.query(
                "UPDATE \"Streaks\" SET \"streakStreak\" = 1 WHERE \"streakStreak\" = 0"
            );
            
            // Set lastStreakDate for existing records based on lastUpdated
            await sequelize.query(
                "UPDATE \"Streaks\" SET \"lastStreakDate\" = DATE(\"lastUpdated\") WHERE \"lastStreakDate\" IS NULL"
            );

            console.log('Database migration completed successfully');
        } catch (error) {
            console.error('Error during migration, attempting to restore from backup...');
            
            // Restore from backups
            await sequelize.query(`DROP TABLE IF EXISTS "GuildConfigs" CASCADE`);
            await sequelize.query(`DROP TABLE IF EXISTS "Streaks" CASCADE`);
            await sequelize.query(`ALTER TABLE "${guildConfigBackup}" RENAME TO "GuildConfigs"`);
            await sequelize.query(`ALTER TABLE "${streaksBackup}" RENAME TO "Streaks"`);
            
            console.log('Restored from backup successfully');
            throw error;
        }

        // Clean up backup tables after successful migration
        console.log('Cleaning up backup tables...');
        await sequelize.query(`DROP TABLE IF EXISTS "${guildConfigBackup}"`);
        await sequelize.query(`DROP TABLE IF EXISTS "${streaksBackup}"`);
        console.log('Backup cleanup completed');

    } catch (error) {
        console.error('Error during database migration:', error);
        throw error;
    }
}

async function initializeDatabase() {
    try {
        console.log('Starting database initialization...');
        
        // Run migration first
        await migrateDatabase();
        
        // Then sync the models
        await sequelize.sync({ alter: true });
        console.log('Database synchronized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = {
    GuildConfig,
    Streak,
    initializeDatabase
};