import { initialize } from "@turbostarter/monitoring-web/server";

export function register() {
  initialize();
}

export { onRequestError } from "@turbostarter/monitoring-web/server";
