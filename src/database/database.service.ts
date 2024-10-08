import path from 'path';
import fs from 'fs/promises';
import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

import { Url } from '../url/entities/url.entity';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: FirebaseFirestore.Firestore;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const serviceAccount = await this.getServiceAccount();
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.db = admin.firestore();
      this.logger.log('Firebase initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Firebase:', error);
      throw new Error(
        'Failed to initialize Firebase. Check your configuration.',
      );
    }
  }

  private async getServiceAccount(): Promise<admin.ServiceAccount> {
    const configPath = this.configService.get<string>('FIREBASE_CONFIG_PATH');
    if (!configPath) {
      throw new Error(
        'FIREBASE_CONFIG_PATH is not set in the environment variables.',
      );
    }

    const absolutePath = path.resolve(process.cwd(), configPath);
    try {
      const fileContent = await fs.readFile(absolutePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      this.logger.error(
        `Failed to read Firebase config file: ${absolutePath}`,
        error,
      );
      throw new Error(
        'Failed to read Firebase config file. Check the file path and permissions.',
      );
    }
  }

  async saveUrl(url: Url): Promise<void> {
    try {
      await this.db
        .collection('urls')
        .doc(url.shortCode)
        .set(url.toFirestore());
      this.logger.log(`URL saved successfully: ${url.shortCode}`);
    } catch (error) {
      this.logger.error(`Failed to save URL: ${url.shortCode}`, error);
      throw new Error('Failed to save URL to the database.');
    }
  }

  async getUrl(shortCode: string): Promise<Url | null> {
    try {
      const doc = await this.getDocument(shortCode);
      if (!doc) {
        throw new NotFoundException('URL not found');
      }
      return Url.fromFirestore(doc.data());
    } catch (error) {
      this.logger.error(`Failed to get URL: ${shortCode}`, error);
      throw new Error('Failed to retrieve URL from the database.');
    }
  }

  async getStats(shortCode: string): Promise<Url | null> {
    return this.getUrl(shortCode);
  }

  async findByLongUrl(longUrl: string): Promise<Url | null> {
    try {
      const querySnapshot = await this.db
        .collection('urls')
        .where('longUrl', '==', longUrl)
        .limit(1)
        .get();

      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      return Url.fromFirestore(doc.data());
    } catch (error) {
      this.logger.error(`Failed to find URL by long URL: ${longUrl}`, error);
      throw new Error('Failed to search for URL in the database.');
    }
  }

  async incrementClickCount(shortCode: string): Promise<void> {
    const urlDoc = this.db.collection('urls').doc(shortCode);

    try {
      const docSnapshot = await this.getDocument(shortCode);
      if (!docSnapshot) {
        throw new NotFoundException(
          `URL with shortCode ${shortCode} not found.`,
        );
      }

      await urlDoc.update({
        clickCount: admin.firestore.FieldValue.increment(1),
      });
      this.logger.log(`Click count incremented for shortCode: ${shortCode}`);
    } catch (error) {
      this.logger.error(
        `Failed to increment click count for ${shortCode}:`,
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      } else {
        throw new Error('Failed to update click count.');
      }
    }
  }

  private async getDocument(
    shortCode: string,
  ): Promise<FirebaseFirestore.DocumentSnapshot | null> {
    try {
      const doc = await this.db.collection('urls').doc(shortCode).get();
      return doc.exists ? doc : null;
    } catch (error) {
      this.logger.error(`Failed to get document: ${shortCode}`, error);
      throw new Error('Failed to retrieve document from the database.');
    }
  }
}
