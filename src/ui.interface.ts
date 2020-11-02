declare type PluginConfig = Array<Record<string, any>>;

declare global {
  interface Window {
    homebridge: IHomebridgePluginUi;
  }
}

export declare class IHomebridgePluginUi extends EventTarget {
  /**
   * Send a popup toast notification to the UI.
   */
  public toast: IHomebridgeUiToastHelper;

  /**
   * An object containing information about the current plugin.
   */
  public plugin: Record<string, any>;

  /**
   * An object containing information about the server.
   */
  public serverEnv: Record<string, any>;

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
   * Get the current config for the plugin.
   * @returns an array of platforms or accessory config blocks.
   * @returns an empty array if the plugin has no current config.
   * 
   * @example
   * ```ts
   * const pluginConfigBlocks = await homebridge.getPluginConfig();
   * ```
   */
  public getPluginConfig(): Promise<PluginConfig>;

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
  public updatePluginConfig(pluginConfig: PluginConfig): Promise<PluginConfig>;

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