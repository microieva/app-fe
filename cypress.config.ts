import { defineConfig } from 'cypress';
import codeCoverageTask from '@cypress/code-coverage/task';
import { environment } from './src/environments/environment.prod';

export default defineConfig({
  e2e: {
    baseUrl:environment.url,
    supportFile: 'cypress/support/support.ts', 
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config);
      return config;
    }
  },
});

