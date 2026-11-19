/**
 * Going to another view of the dashboard, as Home Assistant's own `navigate` action does.
 *
 * @packageDocumentation
 */

/**
 * Returns the address of a view: `path` as it is when it begins with "/", else the view of that
 * path on the dashboard the page shows.
 */
export function viewPath(path: string, current: string): string {
  if (path.startsWith("/")) return path;
  const dashboard = current.split("/").find((part) => part !== "") ?? "lovelace";
  return `/${dashboard}/${path}`;
}

/** Goes to a view: Home Assistant follows the address once it hears `location-changed`. */
export function navigate(path: string): void {
  history.pushState(null, "", viewPath(path, location.pathname));
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}
