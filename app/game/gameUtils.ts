const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

class GameUtils {
  static generateGameCode(): string {
    const characters = 'ABCEFGHJKMNPQRSTUVWXYZ23456789';
    return Array.from(
      { length: 6 },
      () => characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
  }

  static pickAvailableColor(usedColors: string[]): string {
    const availableColors = colors.filter(color => !usedColors.includes(color));
    return availableColors.length > 0
      ? availableColors[Math.floor(Math.random() * availableColors.length)]!
      : '#FFFFFF';
  }

  static shuffleArray<T>(values: T[]): T[] {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
    }
    return shuffled;
  }
}

export default GameUtils;
