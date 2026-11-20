// Vitest stub for Next's `server-only` import sentinel.
//
// In the apps that marker makes the bundler reject client-side imports. Unit
// tests load the same server modules directly, where the bare specifier is not
// installed, so resolve it to this side-effect-free module. The authorization
// and data-access code under test remains untouched.
export {};
