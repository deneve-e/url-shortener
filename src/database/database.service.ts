import path from 'path';
import fs from 'fs';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

import { Url } from 'src/url/entities/url.entity';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: FirebaseFirestore.Firestore;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const configPath = this.configService.get<string>('FIREBASE_CONFIG_PATH');
    const configBase64 = this.configService.get<string>(
      'FIREBASE_CONFIG_BASE64',
    );

    let serviceAccount: admin.ServiceAccount;

    try {
      if (configPath) {
        const absolutePath = path.resolve(process.cwd(), configPath);
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`Firebase config file not found: ${absolutePath}`);
        }
        serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      } else if (configBase64) {
        serviceAccount = JSON.parse(
          Buffer.from(configBase64, 'base64').toString('utf8'),
        );
      } else {
        throw new Error(
          'Firebase configuration not provided. Set FIREBASE_CONFIG_PATH or FIREBASE_CONFIG_BASE64.',
        );
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.db = admin.firestore();
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      throw error;
    }
  }

  async saveUrl(url: Url): Promise<void> {
    await this.db.collection('urls').doc(url.shortCode).set(url.toFirestore());
  }

  async getUrl(shortCode: string): Promise<Url | null> {
    const doc = await this.db.collection('urls').doc(shortCode).get();
    if (!doc.exists) return null;
    return Url.fromFirestore(doc.data());
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
