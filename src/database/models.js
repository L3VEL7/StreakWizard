const { DataTypes } = require('sequelize');
const sequelize = require('./config');

// Add connection pooling configuration
const poolConfig = {
    max: 5, // Maximum number of connection in pool
    min: 0, // Minimum number of connection in pool
    acquire: 30000, // The maximum time, in milliseconds, that pool will try to get connection before throwing error
    idle: 10000 // The maximum time, in milliseconds, that a connection can be idle before being released
};

// Add retry configuration
const retryConfig = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    retryOnError: (error) => {
        return error.name === 'SequelizeConnectionError' || 
               error.name === 'SequelizeConnectionRefusedError' ||
               error.name === 'SequelizeHostNotFoundError' ||
               error.name === 'SequelizeHostNotReachableError';
    }
};

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

// Add transaction support to migration function
async function migrateDatabase() {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('Starting database migration...');

        // Check if tables exist
        const guildConfigExists = await checkTableExists('GuildConfigs');
        const streaksExists = await checkTableExists('Streaks');

        if (!guildConfigExists || !streaksExists) {
            console.log('Tables do not exist, skipping migration');
            await transaction.commit();
            return;
        }

        // Create backups
        console.log('Creating backups...');
        const guildConfigBackup = await backupTable('GuildConfigs', transaction);
        const streaksBackup = await backupTable('Streaks', transaction);

        try {
            // Migrate GuildConfigs
            console.log('Migrating GuildConfigs table...');
            
            // Check and add streakStreakEnabled
            const hasStreakStreakEnabled = await checkColumnExists('GuildConfigs', 'streakStreakEnabled');
            if (!hasStreakStreakEnabled) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"streakStreakEnabled\" BOOLEAN NOT NULL DEFAULT true",
                    { transaction }
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
                        `ALTER TABLE "Streaks" ADD COLUMN "${column.name}" ${column.type}`,
                        { transaction }
                    );
                    console.log(`Added ${column.name} column to Streaks`);
                }
            }

            // Update existing streaks
            console.log('Updating existing streaks...');
            
            // Update bestStreak for existing records
            await sequelize.query(
                `UPDATE "Streaks" SET "bestStreak" = "count" WHERE "bestStreak" < "count"`,
                { transaction }
            );

            // Commit the transaction
            await transaction.commit();
            console.log('Migration completed successfully');
        } catch (error) {
            // Rollback the transaction on error
            await transaction.rollback();
            console.error('Migration failed, rolling back changes:', error);
            
            // Attempt to restore from backups
            try {
                await restoreFromBackup(guildConfigBackup, 'GuildConfigs');
                await restoreFromBackup(streaksBackup, 'Streaks');
                console.log('Successfully restored from backups');
            } catch (restoreError) {
                console.error('Failed to restore from backups:', restoreError);
            }
            
            throw error;
        }
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

// Add retry logic to database operations
async function withRetry(operation, maxRetries = retryConfig.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (retryConfig.retryOnError(error)) {
                console.warn(`Database operation failed, attempt ${attempt}/${maxRetries}:`, error);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryConfig.retryDelay * attempt));
                    continue;
                }
            }
            throw error;
        }
    }
    
    throw lastError;
}

// Update the backup function to use transactions
async function backupTable(tableName, transaction) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupTableName = `${tableName}_backup_${timestamp}`;
        
        await sequelize.query(
            `CREATE TABLE "${backupTableName}" AS SELECT * FROM "${tableName}"`,
            { transaction }
        );
        console.log(`Created backup table: ${backupTableName}`);
        return backupTableName;
    } catch (error) {
        console.error(`Error creating backup for ${tableName}:`, error);
        throw error;
    }
}

// Add restore function
async function restoreFromBackup(backupTableName, originalTableName) {
    try {
        // Drop the original table
        await sequelize.query(`DROP TABLE IF EXISTS "${originalTableName}"`);
        
        // Restore from backup
        await sequelize.query(
            `CREATE TABLE "${originalTableName}" AS SELECT * FROM "${backupTableName}"`
        );
        
        // Drop the backup table
        await sequelize.query(`DROP TABLE "${backupTableName}"`);
        
        console.log(`Successfully restored ${originalTableName} from backup`);
    } catch (error) {
        console.error(`Error restoring from backup ${backupTableName}:`, error);
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
    migrateDatabase,
    withRetry,
    initializeDatabase
};