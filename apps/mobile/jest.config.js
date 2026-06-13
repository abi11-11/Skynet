/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  transformIgnorePatterns: [
    'node_modules/(?!(expo-secure-store|expo|@expo|react-native|@react-native)/)',
  ],
  testMatch: ['**/src/lib/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@skynet/types$': '<rootDir>/../../packages/types/index.ts',
  },
};

