import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Url } from '../url/entities/url.entity';
import { NotFoundException, Logger } from '@nestjs/common';

jest.mock('firebase-admin', () => {
  const mockCollection = jest.fn().mockReturnThis();
  const mockWhere = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();
  const mockGet = jest.fn();
  const mockDoc = jest.fn().mockReturnThis();
  const mockSet = jest.fn();
  const mockUpdate = jest.fn();

  const mockFirestore = jest.fn(() => ({
    collection: mockCollection,
    where: mockWhere,
    limit: mockLimit,
    get: mockGet,
    doc: mockDoc,
    set: mockSet,
    update: mockUpdate,
  }));

  class MockTimestamp {
    constructor(
      public seconds: number,
      public nanoseconds: number,
    ) {}
    toDate() {
      return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
    }
  }

  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
    firestore: Object.assign(mockFirestore, {
      FieldValue: {
        increment: jest.fn((n) => ({ _increment: n })),
      },
      Timestamp: {
        fromDate: jest.fn(
          (date) => new MockTimestamp(Math.floor(date.getTime() / 1000), 0),
        ),
      },
    }),
  };
});

describe('DatabaseService', () => {
  let service: DatabaseService;
  let firestoreMock: any;
  let loggerMock: jest.Mocked<Logger>;

  beforeEach(async () => {
    loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('./mock-firebase-config.json'),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    // Inject the mock logger
    (service as any).logger = loggerMock;
    firestoreMock = admin.firestore();

    // Mock fs.readFile
    jest
      .spyOn(require('fs/promises'), 'readFile')
      .mockResolvedValue(JSON.stringify({ type: 'service_account' }));

    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize Firebase successfully', () => {
    expect(admin.initializeApp).toHaveBeenCalled();
    expect(loggerMock.log).toHaveBeenCalledWith(
      'Firebase initialized successfully',
    );
  });

  it('should save a URL', async () => {
    const url = new Url(
      'testCode',
      'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
    );
    await service.saveUrl(url);

    expect(firestoreMock.collection).toHaveBeenCalledWith('urls');
    expect(firestoreMock.doc).toHaveBeenCalledWith('testCode');
    expect(firestoreMock.set).toHaveBeenCalledWith(expect.any(Object));
    expect(loggerMock.log).toHaveBeenCalledWith(
      'URL saved successfully: testCode',
    );
  });

  it('should retrieve a URL by short code', async () => {
    const mockDocData = {
      shortCode: 'testCode',
      longUrl:
        'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
      clickCount: 0,
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
    };

    firestoreMock.get.mockResolvedValueOnce({
      exists: true,
      data: () => mockDocData,
    });

    const result = await service.getUrl('testCode');
    expect(result).toBeInstanceOf(Url);
    expect(result.shortCode).toBe('testCode');
    expect(result.longUrl).toBe(
      'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
    );
    expect(result.clickCount).toBe(0);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should increment click count', async () => {
    firestoreMock.get.mockResolvedValueOnce({
      exists: true,
      ref: {
        update: firestoreMock.update,
      },
    });

    await service.incrementClickCount('testCode');

    expect(firestoreMock.update).toHaveBeenCalledWith({
      clickCount: { _increment: 1 },
    });
  });

  it('should throw NotFoundException when incrementing click count for non-existent short code', async () => {
    firestoreMock.get.mockResolvedValueOnce({
      exists: false,
    });

    await expect(
      service.incrementClickCount('nonexistentCode'),
    ).rejects.toThrow(NotFoundException);
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to increment click count for nonexistentCode:',
      ),
      expect.any(NotFoundException),
    );
  });

  it('should find URL by long URL', async () => {
    const mockDocData = {
      shortCode: 'testCode',
      longUrl:
        'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
      clickCount: 0,
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
    };

    firestoreMock.get.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => mockDocData }],
    });

    const result = await service.findByLongUrl(
      'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
    );
    expect(result).toBeInstanceOf(Url);
    expect(result.shortCode).toBe('testCode');
    expect(result.longUrl).toBe(
      'https://www.example.com/some/very/long/path/that/needs/to/be/shortened?query=params&more=values',
    );
    expect(result.clickCount).toBe(0);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should return null when URL is not found by long URL', async () => {
    firestoreMock.get.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    const result = await service.findByLongUrl('https://nonexistent.com');
    expect(result).toBeNull();
  });

  it('should throw an error when failing to save URL', async () => {
    const url = new Url('testCode', 'https://www.example.com');
    firestoreMock.set.mockRejectedValueOnce(new Error('Firebase error'));

    await expect(service.saveUrl(url)).rejects.toThrow(
      'Failed to save URL to the database.',
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Failed to save URL: testCode',
      expect.any(Error),
    );
  });

  it('should throw an error when failing to get URL', async () => {
    firestoreMock.get.mockRejectedValueOnce(new Error('Firebase error'));

    await expect(service.getUrl('testCode')).rejects.toThrow(
      'Failed to retrieve URL from the database.',
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Failed to get URL: testCode',
      expect.any(Error),
    );
  });
});
