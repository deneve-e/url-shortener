import path from 'path';
import fs from 'fs/promises'; // Use promises API
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

import { Url } from 'src/url/entities/url.entity';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: FirebaseFirestore.Firestore;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const serviceAccount = await this.getServiceAccount();
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.db = admin.firestore();
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      throw error;
    }
  }

  private async getServiceAccount(): Promise<admin.ServiceAccount> {
    const configPath = this.configService.get<string>('FIREBASE_CONFIG_PATH');
    const configBase64 = this.configService.get<string>(
      'FIREBASE_CONFIG_BASE64',
    );

    if (configPath) {
      const absolutePath = path.resolve(process.cwd(), configPath);
      try {
        const fileContent = await fs.readFile(absolutePath, 'utf8');
        return JSON.parse(fileContent);
      } catch (error) {
        throw new Error(`Failed to read Firebase config file: ${absolutePath}`);
      }
    }

    if (configBase64) {
      try {
        const decodedConfig = Buffer.from(configBase64, 'base64').toString(
          'utf8',
        );
        return JSON.parse(decodedConfig);
      } catch (error) {
        throw new Error('Failed to decode Firebase config from BASE64.');
      }
    }

    throw new Error(
      'Firebase configuration not provided. Set FIREBASE_CONFIG_PATH or FIREBASE_CONFIG_BASE64.',
    );
  }

  async saveUrl(url: Url): Promise<void> {
    await this.db.collection('urls').doc(url.shortCode).set(url.toFirestore());
  }

  async getUrl(shortCode: string): Promise<Url | null> {
    const doc = await this.getDocument(shortCode);
    return doc ? Url.fromFirestore(doc.data()) : null;
  }

  async getStats(shortCode: string): Promise<Url | null> {
    return this.getUrl(shortCode);
  }

  async findByLongUrl(longUrl: string): Promise<Url | null> {
    const querySnapshot = await this.db
      .collection('urls')
      .where('longUrl', '==', longUrl)
      .limit(1)
      .get();

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    return Url.fromFirestore(doc.data());
  }

  async incrementClickCount(shortCode: string): Promise<void> {
    const urlDoc = this.db.collection('urls').doc(shortCode);

    const docSnapshot = await this.getDocument(shortCode);
    if (!docSnapshot) {
      throw new NotFoundException(`URL with shortCode ${shortCode} not found.`);
    }

    try {
      await urlDoc.update({
        clickCount: admin.firestore.FieldValue.increment(1),
      });
      console.log(`Click count incremented for shortCode: ${shortCode}`);
    } catch (error) {
      console.error(`Failed to increment click count for ${shortCode}:`, error);
      throw new Error('Failed to update click count.');
    }
  }

  private async getDocument(
    shortCode: string,
  ): Promise<FirebaseFirestore.DocumentSnapshot | null> {
    const doc = await this.db.collection('urls').doc(shortCode).get();
    return doc.exists ? doc : null;
  }
}
