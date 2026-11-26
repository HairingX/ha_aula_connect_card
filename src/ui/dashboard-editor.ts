/**
 * The Aula Connect dashboard's visual editor: Home Assistant's own form, with the dashboard's
 * fields and the children Aula Connect lists.
 *
 * @packageDocumentation
 */

import { dashboardForm } from "../config/dashboard.ts";
import type { ConfigForm } from "../config/form.ts";
import { fetchChildren, fetchThreads } from "../core/api.ts";
import { rememberChildren, rememberLanguage, rememberThreads } from "../core/memory.ts";
import type { Child, HomeAssistant } from "../core/types.ts";

/** The editor's element. */
export const DASHBOARD_EDITOR = "aula-connect-dashboard-editor";

/** What the editor sets on Home Assistant's `ha-form`. */
interface HaForm extends HTMLElement {
  hass?: HomeAssistant | undefined;
  data?: Readonly<Record<string, unknown>>;
  schema?: ConfigForm["schema"];
  computeLabel?: ConfigForm["computeLabel"];
  computeHelper?: ConfigForm["computeHelper"];
}

/**
 * The editor Home Assistant shows in the dashboard's settings. It fires `config-changed` with
 * the whole configuration each time a field changes.
 */
export class AulaConnectDashboardEditor extends HTMLElement {
  #config: Readonly<Record<string, unknown>> = {};
  #hass: HomeAssistant | undefined;
  #form: HaForm | undefined;
  #listing = false;

  /**
   * Shows `config` in the form.
   *
   * @throws Error for a configuration the form cannot show, so that Home Assistant offers YAML.
   */
  setConfig(config: Readonly<Record<string, unknown>>): void {
    dashboardForm().assertConfig(config);
    this.#config = config;
    this.#render(false);
  }

  /**
   * Home Assistant; the first one given lists the children, in its language, and the threads each
   * can be written about in, to choose from.
   */
  set hass(hass: HomeAssistant) {
    this.#hass = hass;
    if (!this.#listing) {
      this.#listing = true;
      rememberLanguage(hass.language);
      void fetchChildren(hass.callWS)
        .then(
          async (children) => {
            rememberChildren(children);
            this.#render(true);
            await this.#listThreads(hass, children);
          },
          () => undefined,
        )
        .then(() => {
          this.#render(true);
        });
    }
    this.#render(false);
  }

  // A child seen through several entries is asked about once; one that cannot be is left out.
  async #listThreads(hass: HomeAssistant, children: readonly Child[]): Promise<void> {
    const once = new Map(children.map((child) => [child.child_id, child]));
    await Promise.all(
      [...once.values()].map((child) =>
        fetchThreads(hass.callWS, child).then(
          (list) => {
            rememberThreads(child.child_id, list.threads);
          },
          () => undefined,
        ),
      ),
    );
  }

  #render(rebuild: boolean): void {
    let form = this.#form;
    if (form === undefined) {
      form = document.createElement("ha-form");
      form.addEventListener("value-changed", (event) => {
        const { value } = (event as CustomEvent<{ value: Record<string, unknown> }>).detail;
        this.#config = value;
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            bubbles: true,
            composed: true,
            detail: { config: value },
          }),
        );
      });
      this.append(form);
      this.#form = form;
      rebuild = true;
    }
    if (rebuild) {
      const { schema, computeLabel, computeHelper } = dashboardForm();
      form.schema = schema;
      form.computeLabel = computeLabel;
      form.computeHelper = computeHelper;
    }
    form.hass = this.#hass;
    form.data = this.#config;
  }
}
