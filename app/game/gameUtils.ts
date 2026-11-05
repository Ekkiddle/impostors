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
      const swapIndex = GameUtils.randomInt(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
    }
    return shuffled;
  }

  private static randomInt(maxExclusive: number): number {
    const range = 0x1_0000_0000;
    const limit = range - (range % maxExclusive);
    const value = new Uint32Array(1);

    do {
      globalThis.crypto.getRandomValues(value);
    } while (value[0]! >= limit);

    return value[0]! % maxExclusive;
  }
}

export default GameUtils;
