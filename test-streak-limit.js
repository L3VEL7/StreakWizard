// Test script for streak limit functionality
const { Client } = require('pg');
const streakManager = require('./src/storage/streakManager');

async function testStreakLimit() {
    try {
        console.log('Testing streak limit functionality...');

        // Test guild ID for testing (this won't affect production data)
        const testGuildId = 'test-guild-123';
        
        // Set streak limit to 180 minutes (3 hours)
        console.log('Setting streak limit to 180 minutes...');
        await streakManager.setStreakLimit(testGuildId, 180);
        
        // Get the streak limit
        const limit = await streakManager.getStreakLimit(testGuildId);
        console.log(`Retrieved streak limit: ${limit} minutes`);
        
        // Check whether our fix worked correctly
        if (limit === 180) {
            console.log('✅ Test PASSED: The streak limit is being saved and retrieved correctly!');
        } else {
            console.log(`❌ Test FAILED: Expected 180 minutes, but got ${limit} minutes.`);
        }
    } catch (error) {
        console.error('Error testing streak limit:', error);
    } finally {
        // Exit the process
        process.exit(0);
    }
}

testStreakLimit(); 