import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

import { Url } from 'src/url/entities/url.entity';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: FirebaseFirestore.Firestore;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT');
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
    this.db = admin.firestore();
  }

  async saveUrl(url: Url): Promise<void> {
    await this.db.collection('urls').doc(url.shortCode).set(url);
  }

  async getUrl(shortCode: string): Promise<Url | null> {
    const doc = await this.db.collection('urls').doc(shortCode).get();
    return doc.exists ? (doc.data() as Url) : null;
  }

  async incrementClickCount(shortCode: string): Promise<void> {
    await this.db
      .collection('urls')
      .doc(shortCode)
      .update({
        clickCount: admin.firestore.FieldValue.increment(1),
      });
  }

  async getStats(shortCode: string): Promise<Url | null> {
    return this.getUrl(shortCode);
  }
}
