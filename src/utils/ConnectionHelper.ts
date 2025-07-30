export class ConnectionHelper {
  private static lastConnectionAttempts = new Map<string, number>();
  private static readonly MIN_DELAY_BETWEEN_ATTEMPTS = 60000; // 1 minute

  static canAttemptConnection(phoneNumber: string): boolean {
    const lastAttempt = this.lastConnectionAttempts.get(phoneNumber);
    if (!lastAttempt) return true;

    const timeSinceLastAttempt = Date.now() - lastAttempt;
    return timeSinceLastAttempt >= this.MIN_DELAY_BETWEEN_ATTEMPTS;
  }

  static recordConnectionAttempt(phoneNumber: string): void {
    this.lastConnectionAttempts.set(phoneNumber, Date.now());
  }

  static getNextAllowedTime(phoneNumber: string): Date | null {
    const lastAttempt = this.lastConnectionAttempts.get(phoneNumber);
    if (!lastAttempt) return null;

    return new Date(lastAttempt + this.MIN_DELAY_BETWEEN_ATTEMPTS);
  }

  static generateRandomTestNumber(): string {
    // Generate a random Brazilian number for testing
    const areaCode = Math.floor(Math.random() * 89) + 11; // 11-99
    const firstPart = Math.floor(Math.random() * 90000) + 10000; // 10000-99999
    const secondPart = Math.floor(Math.random() * 9000) + 1000; // 1000-9999

    return `55${areaCode}${firstPart}${secondPart}`;
  }

  static isValidBrazilianNumber(phoneNumber: string): boolean {
    // Remove any non-digits
    const digits = phoneNumber.replace(/\D/g, "");

    // Brazilian numbers: 55 + area code (2 digits) + number (8-9 digits)
    return /^55\d{10,11}$/.test(digits);
  }
}
