/**
 * Unit tests for the offline hazard pin queue store.
 *
 * Verifies: enqueue, dequeue-by-id, user-namespaced key isolation,
 * and safe fallback on corrupt/missing data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueuePin,
  getQueuedPins,
  removeQueuedPin,
  clearQueue,
} from './offlineHazardPinQueue';

// Mock AsyncStorage at the module level
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGet = AsyncStorage.getItem as jest.Mock;
const mockSet = AsyncStorage.setItem as jest.Mock;
const mockRemove = AsyncStorage.removeItem as jest.Mock;

const USER_A = 'user-uuid-a';
const USER_B = 'user-uuid-b';

const samplePin = {
  plot_id: 'plot-123',
  location: [77.5, 28.6] as [number, number],
  description: 'Tree stump hazard',
};

describe('offlineHazardPinQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
  });

  describe('getQueuedPins', () => {
    it('returns [] when AsyncStorage has no entry', async () => {
      mockGet.mockResolvedValueOnce(null);
      const result = await getQueuedPins(USER_A);
      expect(result).toEqual([]);
    });

    it('returns [] and does NOT throw on corrupt JSON', async () => {
      mockGet.mockResolvedValueOnce('not-valid-json{{');
      const result = await getQueuedPins(USER_A);
      expect(result).toEqual([]);
    });

    it('returns [] when stored value is not an array', async () => {
      mockGet.mockResolvedValueOnce(JSON.stringify({ invalid: true }));
      const result = await getQueuedPins(USER_A);
      expect(result).toEqual([]);
    });
  });

  describe('enqueuePin', () => {
    it('adds a pin with a localId and queuedAt timestamp', async () => {
      mockGet.mockResolvedValueOnce(null); // empty queue

      const queued = await enqueuePin(USER_A, samplePin);

      expect(queued.localId).toBeDefined();
      expect(queued.queuedAt).toBeDefined();
      expect(new Date(queued.queuedAt).toISOString()).toBe(queued.queuedAt);
      expect(queued.plot_id).toBe('plot-123');
    });

    it('uses user-namespaced key (offline_queue:hazard_pins:<userId>)', async () => {
      mockGet.mockResolvedValueOnce(null);
      await enqueuePin(USER_A, samplePin);

      const [calledKey] = mockSet.mock.calls[0];
      expect(calledKey).toBe(`offline_queue:hazard_pins:${USER_A}`);
    });

    it('two different users get isolated queue keys', async () => {
      mockGet.mockResolvedValue(null);

      await enqueuePin(USER_A, samplePin);
      await enqueuePin(USER_B, samplePin);

      const keys = mockSet.mock.calls.map(([k]) => k);
      expect(keys).toContain(`offline_queue:hazard_pins:${USER_A}`);
      expect(keys).toContain(`offline_queue:hazard_pins:${USER_B}`);
      // Crucially they are different
      expect(keys[0]).not.toBe(keys[1]);
    });

    it('appends to an existing queue without overwriting previous items', async () => {
      const existing = [{ ...samplePin, localId: 'existing-1', queuedAt: new Date().toISOString() }];
      mockGet.mockResolvedValueOnce(JSON.stringify(existing));

      await enqueuePin(USER_A, samplePin);

      const [, storedJson] = mockSet.mock.calls[0];
      const stored = JSON.parse(storedJson);
      expect(stored).toHaveLength(2);
      expect(stored[0].localId).toBe('existing-1');
    });
  });

  describe('removeQueuedPin', () => {
    it('removes only the item with the matching localId', async () => {
      const queue = [
        { ...samplePin, localId: 'keep-me', queuedAt: '' },
        { ...samplePin, localId: 'remove-me', queuedAt: '' },
      ];
      mockGet.mockResolvedValueOnce(JSON.stringify(queue));

      await removeQueuedPin(USER_A, 'remove-me');

      const [, storedJson] = mockSet.mock.calls[0];
      const stored = JSON.parse(storedJson);
      expect(stored).toHaveLength(1);
      expect(stored[0].localId).toBe('keep-me');
    });
  });

  describe('clearQueue', () => {
    it('calls AsyncStorage.removeItem with the namespaced key', async () => {
      await clearQueue(USER_A);
      expect(mockRemove).toHaveBeenCalledWith(`offline_queue:hazard_pins:${USER_A}`);
    });
  });
});
