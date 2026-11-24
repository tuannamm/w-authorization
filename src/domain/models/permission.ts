/** Permission key has the form `resource:action`, e.g. `users:read`. */
export interface Permission {
  key: string;
  description: string;
}
