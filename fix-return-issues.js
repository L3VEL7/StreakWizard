const fs = require('fs');
const path = require('path');

// Files that likely have early returns after error checks
const commandFilesToCheck = [
    'src/commands/gamble.js',
    'src/commands/leaderboard.js',
    'src/commands/profile.js',
    'src/commands/raid.js',
    'src/commands/refresh.js',
    'src/commands/remove.js',
    'src/commands/reset.js',
    'src/commands/setup.js',
    'src/commands/stats.js',
    'src/commands/togglegambling.js',
    'src/commands/toggle_streakstreak.js'
];

// Fix each file
commandFilesToCheck.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (fs.existsSync(fullPath)) {
        console.log(`Checking ${filePath}...`);
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;
        
        // Find commented out returns that should be restored
        const newContent = content.replace(
            /(await\s+interaction\.[^;]+;)\s*\/\/\s*Return removed[^\n]+/g,
            '$1\n                return;'
        );
        
        if (newContent !== content) {
            fs.writeFileSync(fullPath, newContent);
            console.log(`✅ Fixed return statements in ${filePath}`);
            modified = true;
        } else {
            console.log(`ℹ️ No return statements to fix in ${filePath}`);
        }
    } else {
        console.log(`⚠️ File not found: ${filePath}`);
    }
});

console.log('🎉 All return statements fixed!'); 