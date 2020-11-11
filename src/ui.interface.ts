declare global {
  interface Window {
    homebridge: IHomebridgePluginUi;
  }
}

export interface PluginSchema extends Record<string, unknown> {
  pluginAlias: string;
  pluginType: string;
  singular?: boolean;
  customUi?: boolean;
  headerDisplay?: string;
  footerDisplay?: string;
  schema?: Record<string, any>;
  layout?: Record<string, any>[];
  form?: Record<string, any>[];
}

export interface PluginMetadata {
  name: string;
  displayName?: string;
  description: string;
  verifiedPlugin: boolean;
  installedVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  publicPackage: boolean;
  globalInstall: boolean;
  settingsSchema: boolean;
  installPath: string;
  links: Record<string, string>[];
  funding?: Record<string, string>[];
}

export interface ServerEnvMetadata {
  theme: string;
  serverTimestamp: string;
  formAuth: boolean | 'none';
  env: {
    ableToConfigureSelf: boolean;
    dockerOfflineUpdate: boolean;
    enableAccessories: boolean;
    enableTerminalAccess: boolean;
    homebridgeInstanceName: string;
    nodeVersion: string;
    packageName: string;
    packageVersion: string;
    platform: string;
    runningInDocker: boolean;
    runningInLinux: boolean;
    serviceMode: boolean;
    temperatureUnits: string;
    lang: string | null;
    instanceId: string;
  };
}

export declare type PluginConfig = Record<string, any>;

export declare class IHomebridgePluginUi extends EventTarget {
  /**
   * Send a popup toast notification to the UI.
   */
  public toast: IHomebridgeUiToastHelper;

  /**
   * An object containing information about the current plugin.
   */
  public plugin: PluginMetadata;

  /**
   * An object containing information about the server.
   */
  public serverEnv: ServerEnvMetadata;

  /**
   * Tell the UI to adjust the height of the iframe container to the same as your document body
   */
  public fixScrollHeight();

  /**
   * Close the Plugin Settings modal.
   * This action does not save any config changes.
   */
  public closeSettings(): void;

  /**
   * Show a loading spinner overlay.
   * Prevents user input until cleared with `homebridge.hideSpinner();`
   * 
   * @example
   * ```ts
   * this.showSpinner();
   * ```
   */
  public showSpinner(): void;

  /**
   * Hide theloading spinner overlay.
   * 
   * @example
   * ```ts
   * this.hideSpinner();
   * ```
   */
  public hideSpinner(): void;

  /**
   * Get the current config for the plugin.
   * @returns an array of platforms or accessory config blocks.
   * @returns an empty array if the plugin has no current config.
   * 
   * @example
   * ```ts
   * const pluginConfigBlocks = await homebridge.getPluginConfig();
   * ```
   */
  public getPluginConfig(): Promise<PluginConfig[]>;

  /**
  * Update the plugin config.
  * This should be called whenever a change to the config is made.
  * This method does not save the changes to the config.json file.
  * Existing blocks not included will be removed.
  *
  * @example
  * ```ts
  * await homebridge.updatePluginConfig(
  *   [
  *      {
  *         "name": "my light",
  *         "platform": "example_platform"
  *      }
  *   ]
  * );
  * ```
  */
  public updatePluginConfig(pluginConfig: PluginConfig[]): Promise<PluginConfig[]>;

  /**
   * Save the plugin config.
   * You must called `homebridge.updatePluginConfig` first.
   * 
   * @example
   * ```ts
   * await homebridge.savePluginConfig();
   * ```
   */
  public savePluginConfig(): Promise<void>;

  /**
   * Returns the plugin's config.schema.json
   * 
   * @example
   * ```ts
   * const schema = await homebridge.getPluginConfigSchema();
   * ```
   */
  public getPluginConfigSchema(): Promise<PluginSchema>;

  /**
   * Make a request to the plugins server side script
   * @param path - the path handler on the server that the request should be sent to
   * @param body - an optional payload
   * 
   * @example
   * ```ts
   * 
   * const response = await homebridge.request('/hello', { who: 'world' });
   * console.log(response); // the response from the server
   * ```
   * 
   * The server side component would handle this using `this.onRequest`.
   * 
   * @example
   * ```ts
   * this.onRequest('/hello', async (payload) => {
   *  return {hello: 'user'};
   * });
   * ```
   */
  public request(path: string, body?: any): Promise<any>;

  /**
   * Return the current language the user interface is displayed in.
   * Returns the i18n country code.
   */
  public i18nCurrentLang(): Promise<string>;

  /**
   * Returns the full translation object for the current language.
   */
  public i18nGetTranslation(): Promise<Record<string, string>>;
}

export declare class IHomebridgeUiToastHelper {
  /**
   * Trigger a success toast notification in the UI
   * @param message 
   * @param title - optional title
   */
  public success(message: string, title?: string);

  /**
   * Trigger an error toast notification in the UI
   * @param message 
   * @param title  - optional title
   */
  public error(message: string, title?: string);

  /**
   * Trigger a warning toast notification in the UI
   * @param message 
   * @param title  - optional title
   */
  public warning(message: string, title?: string);

  /**
   * Trigger an info toast notification in the UI
   * @param message 
   * @param title  - optional title
   */
  public info(message: string, title?: string);
}