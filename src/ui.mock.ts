/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  IHomebridgePluginUi,
  IHomebridgeUiToastHelper,
  PluginConfig,
  PluginMetadata,
  PluginSchema,
  ServerEnvMetadata,
} from './ui.interface';

export class MockHomebridgePluginUi extends EventTarget implements IHomebridgePluginUi {
  public mockPluginConfig: PluginConfig[] = [];

  public mockPluginSchema: PluginSchema = {
    pluginAlias: 'HomebridgeTest',
    pluginType: 'platform',
  };

  public plugin: PluginMetadata = {
    name: 'homebridge-test',
    description: 'description sample text',
    verifiedPlugin: false,
    installPath: '/path/to/plugin',
    latestVersion: 'v1.0.0',
    installedVersion: 'v1.0.0',
    updateAvailable: false,
    globalInstall: true,
    settingsSchema: true,
    publicPackage: true,
    links: [],
    funding: [],
  };

  public serverEnv: ServerEnvMetadata = {
    env: {
      ableToConfigureSelf: true,
      enableAccessories: true,
      enableTerminalAccess: true,
      homebridgeInstanceName: 'Homebridge 1B77',
      nodeVersion: 'v14.15.0',
      packageName: 'homebridge-config-ui-x',
      packageVersion: '4.32.1',
      platform: 'darwin',
      runningInDocker: false,
      runningInLinux: false,
      dockerOfflineUpdate: false,
      serviceMode: true,
      temperatureUnits: 'c',
      lang: null,
      instanceId: 'eca2e929f20e8a1292893a2852cba6c10d5efb1a77e20238ce9fe2da8da75b88',
    },
    formAuth: true,
    theme: 'auto',
    serverTimestamp: new Date().toISOString(),
  };

  constructor() {
    super();
    this.dispatchEvent(new Event('ready'));
  }

  public toast = new MockHomebridgeUiToastHelper();

  public fixScrollHeight() { }
  public closeSettings() { }
  public showSpinner() { }
  public hideSpinner() { }
  public showSchemaForm() { }
  public hideSchemaForm() { }

  public async getPluginConfig() {
    return this.mockPluginConfig;
  }

  public async updatePluginConfig(pluginConfig: PluginConfig[]) {
    this.mockPluginConfig = pluginConfig;
    return this.mockPluginConfig;
  }

  public async savePluginConfig() { }

  public async getPluginConfigSchema() {
    return this.mockPluginSchema;
  }

  public async request(path: string, body: string) {
    return {};
  }

  public async i18nCurrentLang() {
    return 'en';
  }

  public async i18nGetTranslation() {
    return {};
  }
}

export class MockHomebridgeUiToastHelper implements IHomebridgeUiToastHelper {
  success(message: string, title: string) { }
  error(message: string, title: string) { }
  warning(message: string, title: string) { }
  info(message: string, title: string) { }
}
