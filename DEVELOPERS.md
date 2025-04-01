# Developer Guide

This document provides technical details and guidelines for developers working on the Streakwiz Discord bot.

## Project Structure

```
streakwiz/
├── src/
│   ├── commands/           # Discord bot commands
│   │   ├── help.js
│   │   ├── leaderboard.js
│   │   ├── profile.js
│   │   ├── remove.js
│   │   ├── reset.js
│   │   ├── setup.js
│   │   ├── setstreak_limit.js
│   │   ├── stats.js
│   │   └── toggle_streakstreak.js
│   ├── database/          # Database configuration and models
│   │   ├── config.js     # Database connection configuration
│   │   ├── migrate.js    # Database migration logic
│   │   └── models.js     # Sequelize models
│   ├── storage/          # Data management
│   │   └── streakManager.js
│   ├── utils/           # Utility functions
│   │   └── logger.js    # Winston logger configuration
│   ├── __tests__/      # Test files
│   │   └── streakManager.test.js
│   └── index.js        # Main entry point
├── logs/              # Application logs
├── .env.example      # Example environment variables
├── .eslintrc.json   # ESLint configuration
├── .prettierrc      # Prettier configuration
├── .gitignore      # Git ignore rules
├── package.json    # Project configuration
└── README.md      # Project documentation
```

## Architecture

### Core Components

1. **Command Handler** (`src/commands/`)
   - Each command is a separate module
   - Commands follow a consistent structure
   - Implements permission checks and validation

2. **Database Layer** (`src/database/`)
   - Uses Sequelize ORM
   - Models:
     - `GuildConfig`: Server-specific settings
     - `Streak`: User streak data
   - Includes migration system for schema updates

3. **Streak Manager** (`src/storage/streakManager.js`)
   - Core business logic for streak handling
   - Manages streak updates and validation
   - Handles milestone tracking

4. **Utility Functions** (`src/utils/`)
   - Logging system
   - Common helper functions

### Database Schema

#### GuildConfig
```javascript
{
    guildId: string,              // Primary key
    triggerWords: string[],       // Array of trigger words
    streakStreakEnabled: boolean, // Whether streak streak tracking is enabled
    gamblingEnabled: boolean,     // Whether gambling is enabled
    raidEnabled: boolean,         // Whether raid feature is enabled
    raidMaxStealPercent: number,  // Maximum percentage that can be stolen
    raidRiskPercent: number,      // Percentage of streaks to risk
    raidSuccessChance: number,    // Base success chance for raids
    raidCooldownHours: number,    // Cooldown period between raids
    gamblingSuccessChance: number,// Success chance for gambling
    gamblingMaxPercent: number,   // Maximum gamble percentage
    gamblingMinStreaks: number,   // Minimum streaks required to gamble
    createdAt: Date,              // When the config was created
    updatedAt: Date               // When the config was last updated
}
```

#### Streak
```javascript
{
    id: number,                   // Primary key
    guildId: string,              // Foreign key to GuildConfig
    userId: string,               // Discord user ID
    trigger: string,              // The trigger word
    count: number,                // Current streak count
    streakStreak: number,         // Current streak streak count
    lastStreak: Date,             // Last streak update timestamp
    lastStreakStreak: Date,       // Last streak streak update timestamp
    createdAt: Date,              // When the streak was created
    updatedAt: Date               // When the streak was last updated
}
```

## Development Workflow

### Setting Up Development Environment

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/streakwiz.git
   cd streakwiz
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your development credentials
   ```

3. **Database Setup**
   ```bash
   npm run migrate
   ```

### Development Process

1. **Creating New Features**
   - Create feature branch: `git checkout -b feature/your-feature`
   - Implement changes
   - Add tests
   - Update documentation
   - Submit pull request

2. **Adding New Commands**
   ```javascript
   // src/commands/your-command.js
   module.exports = {
     name: 'command-name',
     description: 'Command description',
     async execute(interaction) {
       // Command logic
     }
   };
   ```

3. **Database Changes**
   - Add new models in `src/database/models.js`
   - Update migration logic in `src/database/migrate.js`
   - Test migration process

### Testing

1. **Running Tests**
   ```bash
   npm test                 # Run all tests
   npm test -- --watch     # Watch mode
   npm test -- --coverage  # Coverage report
   ```

2. **Writing Tests**
   ```javascript
   describe('Feature', () => {
     it('should behave as expected', () => {
       // Test logic
     });
   });
   ```

### Code Style

- ESLint and Prettier are configured
- Run `npm run lint` to check code
- Run `npm run format` to format code
- Follow existing patterns in the codebase

### Logging

```javascript
const logger = require('../utils/logger');

logger.info('Informational message');
logger.error('Error message', { error });
logger.debug('Debug message', { context });
```

### Error Handling

1. **Database Errors**
   ```javascript
   try {
     await streakManager.addTriggerWord(guildId, word, description);
   } catch (error) {
     if (error.name === 'SequelizeUniqueConstraintError') {
       // Handle duplicate entry
     } else if (error.name === 'SequelizeValidationError') {
       // Handle validation error
     } else {
       // Handle other database errors
     }
   }
   ```

2. **Discord API Errors**
   ```javascript
   try {
     await interaction.reply({ content: message });
   } catch (error) {
     if (error.code === 50001) {
       // Missing permissions
     } else if (error.code === 50013) {
       // Missing access
     } else {
       // Handle other Discord API errors
     }
   }
   ```

3. **Transaction Errors**
   ```javascript
   try {
     await sequelize.transaction(async (t) => {
       // Perform multiple database operations
     });
   } catch (error) {
     // Transaction failed, all changes are rolled back
     console.error('Transaction failed:', error);
   }
   ```

### Safety Features

1. **Rate Limiting**
   ```javascript
   const rateLimiter = new Map();

   function isRateLimited(userId, command, limit = 5, window = 60000) {
     const key = `${userId}-${command}`;
     const now = Date.now();
     
     if (!rateLimiter.has(key)) {
       rateLimiter.set(key, [now]);
       return false;
     }
     
     const timestamps = rateLimiter.get(key);
     const windowStart = now - window;
     
     // Remove old timestamps
     while (timestamps.length > 0 && timestamps[0] < windowStart) {
       timestamps.shift();
     }
     
     if (timestamps.length >= limit) {
       return true;
     }
     
     timestamps.push(now);
     return false;
   }
   ```

2. **Anti-Exploit Protection**
   ```javascript
   function validateGambling(userStreaks, gambleAmount, maxPercent) {
     // Check minimum streak requirement
     if (userStreaks < 2) {
       throw new Error('You need at least 2 streaks to gamble.');
     }
     
     // Check maximum gamble percentage
     const maxGamble = Math.floor(userStreaks * (maxPercent / 100));
     if (gambleAmount > maxGamble) {
       throw new Error(`You can only gamble up to ${maxPercent}% of your streaks.`);
     }
     
     // Check for suspicious activity
     if (gambleAmount === userStreaks) {
       throw new Error('Cannot gamble all your streaks at once.');
     }
   }
   ```

3. **Input Validation**
   ```javascript
   function validateTriggerWord(word) {
     // Check length
     if (word.length > 100) {
       throw new Error('Trigger word must be 100 characters or less.');
     }
     
     // Check characters
     if (!/^[a-z0-9\s-]+$/.test(word)) {
       throw new Error('Trigger word can only contain letters, numbers, spaces, and hyphens.');
     }
     
     // Check for common exploits
     if (word.includes('@everyone') || word.includes('@here')) {
       throw new Error('Trigger word cannot contain mentions.');
     }
   }
   ```

### Logging System

1. **Command Logging**
   ```javascript
   function logCommand(command, interaction, result) {
     console.log(`=== ${command} Command ===`);
     console.log(`Time: ${new Date().toISOString()}`);
     console.log(`User: ${interaction.user.tag} (${interaction.user.id})`);
     console.log(`Guild: ${interaction.guild.name} (${interaction.guild.id})`);
     console.log(`Channel: ${interaction.channel.name} (${interaction.channel.id})`);
     console.log(`Result: ${result}`);
     console.log('=====================');
   }
   ```

2. **Error Logging**
   ```javascript
   function logError(error, context) {
     console.error('=== Error Occurred ===');
     console.error(`Time: ${new Date().toISOString()}`);
     console.error(`Context: ${context}`);
     console.error(`Error: ${error.message}`);
     console.error(`Stack: ${error.stack}`);
     console.error('=====================');
   }
   ```

3. **Action Logging**
   ```javascript
   function logAction(action, details) {
     console.log(`=== ${action} ===`);
     console.log(`Time: ${new Date().toISOString()}`);
     Object.entries(details).forEach(([key, value]) => {
       console.log(`${key}: ${value}`);
     });
     console.log('=====================');
   }
   ```

## Deployment

### Production Considerations

1. **Environment**
   - Set `NODE_ENV=production`
   - Configure proper logging levels
   - Use production database credentials

2. **Database**
   - Run migrations before deployment
   - Backup data regularly
   - Monitor database performance

3. **Monitoring**
   - Check application logs
   - Monitor Discord API rate limits
   - Track error rates

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Check connection string
   - Verify database credentials
   - Ensure database server is running

2. **Command Registration**
   - Verify command file structure
   - Check Discord application commands
   - Clear command cache if needed

3. **Migration Issues**
   - Backup database before migrations
   - Check migration logs
   - Verify database permissions

## Future Improvements

### Planned Features
1. **Enhanced Rate Limiting**
   - Per-guild rate limits
   - Dynamic rate limit adjustment based on server size
   - Custom rate limit exceptions for trusted users

2. **Backup System**
   - Automatic database backups
   - Backup restoration tools
   - Backup verification

3. **Leaderboards**
   - Global leaderboards
   - Category-based leaderboards
   - Time-based leaderboards (daily, weekly, monthly)

4. **Analytics Dashboard**
   - Server activity metrics
   - User engagement statistics
   - Streak growth trends

### Technical Improvements
1. **Performance Optimization**
   - Query caching
   - Batch updates
   - Connection pooling

2. **Security Enhancements**
   - Input sanitization
   - SQL injection prevention
   - Rate limit bypass detection

3. **Error Recovery**
   - Automatic retry mechanism
   - Fallback options
   - State recovery

4. **Monitoring**
   - Health checks
   - Performance metrics
   - Error tracking 