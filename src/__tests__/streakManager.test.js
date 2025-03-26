const { StreakManager } = require('../storage/streakManager');
const { Streak, GuildConfig } = require('../database/models');

// Mock the database models
jest.mock('../database/models', () => ({
  Streak: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  GuildConfig: {
    findOne: jest.fn(),
  },
}));

describe('StreakManager', () => {
  let streakManager;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    streakManager = new StreakManager();
  });

  describe('isStreakStreakEnabled', () => {
    it('should return true when streakStreakEnabled is true in guild config', async () => {
      GuildConfig.findOne.mockResolvedValue({ streakStreakEnabled: true });
      
      const result = await streakManager.isStreakStreakEnabled('123');
      
      expect(result).toBe(true);
      expect(GuildConfig.findOne).toHaveBeenCalledWith({
        where: { guildId: '123' }
      });
    });

    it('should return false when streakStreakEnabled is false in guild config', async () => {
      GuildConfig.findOne.mockResolvedValue({ streakStreakEnabled: false });
      
      const result = await streakManager.isStreakStreakEnabled('123');
      
      expect(result).toBe(false);
    });

    it('should return true when guild config is not found (default value)', async () => {
      GuildConfig.findOne.mockResolvedValue(null);
      
      const result = await streakManager.isStreakStreakEnabled('123');
      
      expect(result).toBe(true);
    });
  });
}); 