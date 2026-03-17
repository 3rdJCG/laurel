# Privacy Policy

Laurel is a local-first task management app. This document describes what data Laurel stores and what network connections it makes.

## Data Collected

Laurel does not collect personal information for analytics, advertising, or any third-party purpose.

The following data is stored **locally on your computer only**:

- **Task data** — Projects, tasks, issues, and comments you create, saved as JSON files in a folder of your choice (default: `~/Documents/laurel/`)
- **App settings** — Data folder path, genre list, update channel preference, and optionally a display name and email address you enter in Settings. Stored in your system's user data directory.

The optional name and email address fields are used solely as author metadata in issues and comments you create — they are never transmitted outside your machine.

## Network Connections

Laurel makes **one type of outbound connection**: checking for application updates via the [GitHub Releases API](https://docs.github.com/en/rest/releases).

- **When**: On app startup and every 4 hours while running
- **What is sent**: App version, operating system, and platform — the standard information GitHub's API requires to determine whether a newer release is available
- **What is not sent**: Your tasks, settings, name, email address, or any other personal data

No analytics, crash reporting, or telemetry of any kind is collected.

## Data Storage Locations

| Data | Location |
|------|----------|
| Task data (projects, tasks, issues, comments) | Folder you choose in Settings (default: `~/Documents/laurel/`) |
| App settings (genres, data folder path, update channel, name, email) | `{userData}/laurel/settings.json` |

`{userData}` is the Electron user data directory:
- **Windows**: `%APPDATA%\laurel`
- **macOS**: `~/Library/Application Support/laurel`
- **Linux**: `~/.config/laurel`

## Deleting Your Data

To delete all data:

1. Uninstall the application
2. Delete the data folder (shown in Settings → Data)
3. Delete the `{userData}/laurel/` directory listed above
