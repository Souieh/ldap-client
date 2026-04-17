# Desktop Version (Tauri)

This project can be built as a cross-platform desktop application using [Tauri](https://tauri.app/).

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- System dependencies for Tauri (see [Tauri's guides](https://tauri.app/v1/guides/getting-started/prerequisites))

## Development

To start the desktop app in development mode:

```bash
pnpm tauri dev
```

## Building

To create a production bundle:

```bash
pnpm tauri build
```

## Migration Notes

### API Routes
Next.js API routes (`app/api/*`) run on a Node.js server. When building for desktop (static export), these routes are not included.

To make the desktop app fully functional, you have two options:
1. **Remote Backend**: Point `getApiBaseUrl()` in `lib/tauri-utils.ts` to your hosted Next.js server.
2. **Native Backend**: Re-implement the LDAP logic (currently in `lib/server/ldap/`) as Tauri Commands in Rust (`src-tauri/src/main.rs`). This is the recommended approach for a true native experience.

### Filesystem & Security
The desktop app has direct access to the system. You can use Tauri's [fs plugin](https://tauri.app/v1/api/js/fs/) to manage local configuration files instead of using `profiles.json` on a server.
