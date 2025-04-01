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
    },
    gamblingEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    gamblingSuccessChance: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
        allowNull: false
    },
    gamblingMaxPercent: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
        allowNull: false
    },
    gamblingMinStreaks: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        allowNull: false
    },
    raidEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    raidMaxStealPercent: {
        type: DataTypes.INTEGER,
        defaultValue: 20,
        allowNull: false
    },
    raidRiskPercent: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        allowNull: false
    },
    raidSuccessChance: {
        type: DataTypes.INTEGER,
        defaultValue: 40,
        allowNull: false
    },
    raidCooldownHours: {
        type: DataTypes.INTEGER,
        defaultValue: 24,
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
    },
    lastRaidDate: {
        type: DataTypes.DATE,
        allowNull: true
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

            // Check and add gamblingEnabled
            const hasGamblingEnabled = await checkColumnExists('GuildConfigs', 'gamblingEnabled');
            if (!hasGamblingEnabled) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"gamblingEnabled\" BOOLEAN NOT NULL DEFAULT false",
                    { transaction }
                );
                console.log('Added gamblingEnabled column to GuildConfigs');
            }

            // Check and add gamblingSuccessChance
            const hasGamblingSuccessChance = await checkColumnExists('GuildConfigs', 'gamblingSuccessChance');
            if (!hasGamblingSuccessChance) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"gamblingSuccessChance\" INTEGER NOT NULL DEFAULT 50",
                    { transaction }
                );
                console.log('Added gamblingSuccessChance column to GuildConfigs');
            }

            // Check and add gamblingMaxPercent
            const hasGamblingMaxPercent = await checkColumnExists('GuildConfigs', 'gamblingMaxPercent');
            if (!hasGamblingMaxPercent) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"gamblingMaxPercent\" INTEGER NOT NULL DEFAULT 50",
                    { transaction }
                );
                console.log('Added gamblingMaxPercent column to GuildConfigs');
            }

            // Check and add gamblingMinStreaks
            const hasGamblingMinStreaks = await checkColumnExists('GuildConfigs', 'gamblingMinStreaks');
            if (!hasGamblingMinStreaks) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"gamblingMinStreaks\" INTEGER NOT NULL DEFAULT 10",
                    { transaction }
                );
                console.log('Added gamblingMinStreaks column to GuildConfigs');
            }

            // Check and add raid configuration
            const hasRaidEnabled = await checkColumnExists('GuildConfigs', 'raidEnabled');
            if (!hasRaidEnabled) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"raidEnabled\" BOOLEAN NOT NULL DEFAULT false",
                    { transaction }
                );
                console.log('Added raidEnabled column to GuildConfigs');
            }

            const hasRaidMaxStealPercent = await checkColumnExists('GuildConfigs', 'raidMaxStealPercent');
            if (!hasRaidMaxStealPercent) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"raidMaxStealPercent\" INTEGER NOT NULL DEFAULT 20",
                    { transaction }
                );
                console.log('Added raidMaxStealPercent column to GuildConfigs');
            }

            const hasRaidRiskPercent = await checkColumnExists('GuildConfigs', 'raidRiskPercent');
            if (!hasRaidRiskPercent) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"raidRiskPercent\" INTEGER NOT NULL DEFAULT 30",
                    { transaction }
                );
                console.log('Added raidRiskPercent column to GuildConfigs');
            }

            const hasRaidSuccessChance = await checkColumnExists('GuildConfigs', 'raidSuccessChance');
            if (!hasRaidSuccessChance) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"raidSuccessChance\" INTEGER NOT NULL DEFAULT 40",
                    { transaction }
                );
                console.log('Added raidSuccessChance column to GuildConfigs');
            }

            // Check and add raidCooldownHours
            const hasRaidCooldownHours = await checkColumnExists('GuildConfigs', 'raidCooldownHours');
            if (!hasRaidCooldownHours) {
                await sequelize.query(
                    "ALTER TABLE \"GuildConfigs\" ADD COLUMN \"raidCooldownHours\" INTEGER NOT NULL DEFAULT 24",
                    { transaction }
                );
                console.log('Added raidCooldownHours column to GuildConfigs');
            }

            // Migrate Streaks
            console.log('Migrating Streaks table...');
            
            // Check and add new columns
            const columnsToAdd = [
                { name: 'streakStreak', type: 'INTEGER NOT NULL DEFAULT 0' },
                { name: 'lastStreakDate', type: 'DATE' },
                { name: 'bestStreak', type: 'INTEGER NOT NULL DEFAULT 1' },
                { name: 'lastRaidDate', type: 'DATE' }
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

            // Ensure all required columns exist with correct types
            const requiredColumns = {
                'id': 'INTEGER PRIMARY KEY',
                'guildId': 'STRING NOT NULL',
                'userId': 'STRING NOT NULL',
                'triggerWord': 'STRING NOT NULL',
                'count': 'INTEGER NOT NULL DEFAULT 1',
                'bestStreak': 'INTEGER NOT NULL DEFAULT 1',
                'streakStreak': 'INTEGER NOT NULL DEFAULT 0',
                'lastStreakDate': 'DATE',
                'lastUpdated': 'DATE NOT NULL DEFAULT CURRENT_TIMESTAMP',
                'lastRaidDate': 'DATE'
            };

            for (const [columnName, columnType] of Object.entries(requiredColumns)) {
                const exists = await checkColumnExists('Streaks', columnName);
                if (!exists) {
                    await sequelize.query(
                        `ALTER TABLE "Streaks" ADD COLUMN "${columnName}" ${columnType}`,
                        { transaction }
                    );
                    console.log(`Added missing column ${columnName} to Streaks`);
                }
            }

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
        }
    } catch (error) {
        console.error('Migration failed:', error);
        await transaction.rollback();
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

// Helper function to check if a table exists
async function checkTableExists(tableName) {
    try {
        const result = await sequelize.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${tableName}')`,
            { type: sequelize.QueryTypes.SELECT }
        );
        return result[0].exists;
    } catch (error) {
        console.error(`Error checking if table ${tableName} exists:`, error);
        return false;
    }
}

// Helper function to check if a column exists
async function checkColumnExists(tableName, columnName) {
    try {
        const result = await sequelize.query(
            `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}')`,
            { type: sequelize.QueryTypes.SELECT }
        );
        return result[0].exists;
    } catch (error) {
        console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
        return false;
    }
}

// Helper function to backup a table
async function backupTable(tableName, transaction) {
    try {
        const result = await sequelize.query(
            `SELECT * FROM "${tableName}"`,
            { transaction, type: sequelize.QueryTypes.SELECT }
        );
        return result;
    } catch (error) {
        console.error(`Error backing up table ${tableName}:`, error);
        throw error;
    }
}

// Helper function to restore a table from backup
async function restoreFromBackup(backup, tableName) {
    try {
        // Clear existing data
        await sequelize.query(`DELETE FROM "${tableName}"`, { type: sequelize.QueryTypes.DELETE });
        
        // Restore from backup
        if (backup && backup.length > 0) {
            for (const row of backup) {
                const columns = Object.keys(row);
                const values = columns.map(col => {
                    const val = row[col];
                    
                    // Handle array values (like triggerWords)
                    if (Array.isArray(val)) {
                        return `ARRAY[${val.map(item => `'${escapeSQLString(item)}'`).join(', ')}]::text[]`;
                    }
                    
                    // Handle string values
                    if (typeof val === 'string') {
                        return `'${escapeSQLString(val)}'`;
                    }
                    
                    // Handle null values
                    if (val === null) {
                        return 'NULL';
                    }
                    
                    // Handle date values
                    if (val instanceof Date) {
                        return `'${val.toISOString()}'`;
                    }
                    
                    // Handle other values
                    return val;
                });
                
                // Insert one row at a time
                await sequelize.query(
                    `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${values.join(', ')})`,
                    { type: sequelize.QueryTypes.INSERT }
                );
            }
        }
    } catch (error) {
        console.error(`Error restoring table ${tableName} from backup:`, error);
        throw error;
    }
}

// Helper function to escape SQL string values
function escapeSQLString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/'/g, "''");
}

async function initializeDatabase() {
    try {
        console.log('Starting database initialization...');
        
        // Run migration first
        await migrateDatabase();
        
        // Then sync the models without altering existing tables
        await sequelize.sync({ alter: false });
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