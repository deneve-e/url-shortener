export class Url {
  constructor(
    public shortCode: string,
    public longUrl: string,
    public clickCount: number = 0,
    public createdAt: Date = new Date(),
  ) {}
}
