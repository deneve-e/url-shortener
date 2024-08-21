export class Url {
  constructor(
    public shortCode: string,
    public longUrl: string,
    public clickCount: number = 0,
    public createdAt: Date = new Date(),
  ) {}

  // Method to convert Url instance to a plain object for Firestore
  toFirestore() {
    return {
      shortCode: this.shortCode,
      longUrl: this.longUrl,
      clickCount: this.clickCount,
      createdAt: this.createdAt,
    };
  }

  // Static method to create a Url instance from Firestore data
  static fromFirestore(data: any): Url {
    return new Url(
      data.shortCode,
      data.longUrl,
      data.clickCount,
      data.createdAt.toDate(), // Convert Firestore Timestamp to Date
    );
  }
}
