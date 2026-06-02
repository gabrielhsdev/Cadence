import type { Api } from '../main/preload';

declare global {
  interface Window {
    api: Api;
  }
}

export const api = window.api;
