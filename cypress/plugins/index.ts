import '@cypress/code-coverage/task';

export default (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
  require('@cypress/code-coverage/task')(on, config);
  return config;
};
