module.exports = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    testMatch: ['**/+(*.)+(spec).+(ts)'],
    transform: {
      '^.+\\.(ts|js|html)$': 'ts-jest'
    },
    globals: {
      'ts-jest': {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$',
        astTransformers: {
          before: [
            'jest-preset-angular/build/InlineFilesTransformer',
            'jest-preset-angular/build/StripStylesTransformer'
          ]
        }
      }
    },
    moduleNameMapper: {
      '^src/(.*)$': '<rootDir>/src/$1'
    }
  };
  
  