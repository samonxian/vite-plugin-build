/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module '*.svelte' {
  export { SvelteComponentDev as default } from 'svelte/internal';
}
