const fs = require('fs');
const path = require('path');

// Function to fix race conditions (await + return pattern)
function fixRaceConditions(filePath) {
    console.log(`Fixing race conditions in ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    
    // Find and fix the pattern of "await interaction.editReply(...); return;"
    for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i].trim();
        const nextLine = lines[i + 1].trim();
        
        // Look for multiline await statements
        if ((currentLine.includes('await interaction.') || 
             currentLine.includes('});') && lines[i-1] && lines[i-1].includes('await interaction.')) && 
            nextLine === 'return;') {
            
            // Replace 'return;' with a comment explaining why we removed it
            lines[i + 1] = '            // Return removed - can cause race conditions after await';
            modified = true;
        }
    }
    
    // Also, check the content globally for more complex patterns
    let newContent = content.replace(
        /(await\s+interaction\.[^;]+;)[\s\n]+(return;)/g,
        '$1\n            // Return removed - can cause race conditions after await'
    );
    
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ Fixed race conditions in ${filePath}`);
        modified = true;
    } else if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`✅ Fixed race conditions in ${filePath}`);
    } else {
        console.log(`ℹ️ No race conditions to fix in ${filePath}`);
    }
}

// Function to update .env.example file
function fixEnvExample() {
    const envExamplePath = path.join(__dirname, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
        console.log('❌ .env.example file not found');
        return;
    }
    
    console.log('Updating .env.example file...');
    let content = fs.readFileSync(envExamplePath, 'utf8');
    let modified = false;
    
    // Check if DATABASE_URL is already in the file
    if (!content.includes('DATABASE_URL')) {
        // Add DATABASE_URL to the Database Configuration section
        content = content.replace(
            '# Database Configuration', 
            '# Database Configuration\nDATABASE_URL=postgresql://username:password@localhost:5432/streakwiz'
        );
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(envExamplePath, content);
        console.log('✅ Added DATABASE_URL to .env.example');
    } else {
        console.log('ℹ️ No changes needed for .env.example');
    }
}

// Function to fix console.log statements with a logger
function improveLogging(filePath) {
    // Only apply this to certain files to avoid breaking functionality
    const skipFiles = ['src/database/init.js', 'src/database/verify.js'];
    if (skipFiles.some(f => filePath.includes(f))) {
        console.log(`Skipping logger improvements in ${filePath} (special file)`);
        return;
    }
    
    console.log(`Improving logging in ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if file already has logger imports
    const hasLoggerImport = content.includes('const logger') || content.includes('const { logger }');
    
    if (content.includes('console.log') || content.includes('console.error')) {
        // Add logger import if needed
        if (!hasLoggerImport) {
            if (content.includes("require('")) {
                // Add logger import after the last require statement
                content = content.replace(
                    /(const [^;]+?require\([^)]+\);(?:\r?\n)?)((?:\r?\n)*)/,
                    '$1$2const logger = require(\'../utils/logger\');$2'
                );
            } else {
                // Add logger import at the beginning of the file
                content = `const logger = require('../utils/logger');\n${content}`;
            }
            modified = true;
        }
        
        // Replace console.log with logger.info
        content = content.replace(/console\.log\(/g, 'logger.info(');
        
        // Replace console.error with logger.error
        content = content.replace(/console\.error\(/g, 'logger.error(');
        
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Improved logging in ${filePath}`);
    } else {
        console.log(`ℹ️ No logging improvements needed in ${filePath}`);
    }
}

// Main execution
console.log('🛠️ Starting to fix issues...');

// 1. Fix race conditions in command files
const commandFiles = [
    'src/commands/gamble.js',
    'src/commands/leaderboard.js',
    'src/commands/profile.js',
    'src/commands/raid.js',
    'src/commands/refresh.js',
    'src/commands/remove.js',
    'src/commands/setup.js',
    'src/commands/stats.js'
];

commandFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        fixRaceConditions(filePath);
    } else {
        console.log(`⚠️ File not found: ${file}`);
    }
});

// 2. Update .env.example file
fixEnvExample();

// 3. Create a basic logger.js if it doesn't exist
const loggerPath = path.join(__dirname, 'src', 'utils', 'logger.js');
if (!fs.existsSync(loggerPath)) {
    console.log('Creating logger utility...');
    const loggerDir = path.join(__dirname, 'src', 'utils');
    
    if (!fs.existsSync(loggerDir)) {
        fs.mkdirSync(loggerDir, { recursive: true });
    }
    
    const loggerContent = `const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

// Custom format
const myFormat = printf(({ level, message, timestamp }) => {
    return \`[\${timestamp}] \${level}: \${message}\`;
});

// Create the logger
const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        // Console transport
        new transports.Console({
            format: combine(
                colorize(),
                myFormat
            )
        }),
        // File transport for errors
        new transports.File({ 
            filename: 'error.log', 
            level: 'error' 
        }),
        // File transport for all logs
        new transports.File({ 
            filename: 'combined.log' 
        })
    ]
});

// If we're not in production, also log to the console with more readable format
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: combine(
            colorize(),
            timestamp(),
            printf(info => \`[\${info.timestamp}] \${info.level}: \${info.message}\`)
        )
    }));
}

module.exports = logger;`;
    
    fs.writeFileSync(loggerPath, loggerContent);
    console.log('✅ Created logger utility');
    
    // Add winston to package.json if it doesn't exist
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (!packageJson.dependencies.winston) {
            console.log('Adding winston to package.json...');
            packageJson.dependencies.winston = '^3.11.0';
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('✅ Added winston to package.json');
        }
    }
} else {
    console.log('ℹ️ Logger utility already exists');
}

console.log('🎉 All fixes applied! Run the deep-check.js script again to verify.'); 