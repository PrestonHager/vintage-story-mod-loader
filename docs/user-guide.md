# User Guide

This guide will help you get started with the Vintage Story Mod Loader as a user.

## Installation

### Windows

1. Download the latest `.exe` installer from the releases page
2. Run the installer and follow the setup wizard
3. Launch "Vintage Story Mod Loader" from the Start menu

### macOS

1. Download the latest `.dmg` file from the releases page
2. Open the `.dmg` file and drag the application to your Applications folder
3. Launch the application from Applications

### Linux

1. Download the latest `.AppImage` or `.deb` package from the releases page
2. For `.AppImage`: Make it executable (`chmod +x`) and run it
3. For `.deb`: Install with `sudo dpkg -i package.deb`

## First Launch

When you first launch the Mod Loader:

1. The application will attempt to auto-detect your Vintage Story installation
2. If detection fails, you'll be prompted to manually select the mods directory
3. Go to Settings to configure your Vintage Story path if needed

## Managing Mods

### Viewing Installed Mods

1. Click on "Mods" in the navigation bar
2. You'll see a list of all installed mods with their status (Enabled/Disabled)
3. Use the search bar to filter mods by name or ID

### Enabling/Disabling Mods

**Single Mod:**
- Check the checkbox next to a mod
- Click "Enable Selected" or "Disable Selected"

**Multiple Mods:**
- Check multiple mods using the checkboxes
- Use "Select All" to select all visible mods
- Click "Enable Selected" or "Disable Selected" to apply changes

### Downloading Mods

1. Click on "Browse" in the navigation bar
2. Use the search bar to find mods by name or ID
3. Browse through search results
4. Click "Download" on any mod you want to install
5. The mod will be downloaded and installed automatically
6. The mod will appear in your mod list after installation

**Search Tips:**
- Search by mod name or mod ID
- Results are fetched from the Vintage Story mod database
- Click on a mod to see more details before downloading

## Mod Packs

Mod packs are collections of mods that work well together. They can be shared with other players and make it easy to set up a curated modded experience.

### Viewing Installed Mod Packs

1. Click on "Mod Packs" in the navigation bar
2. You'll see a list of all mod packs you've imported or created
3. Each mod pack shows:
   - Name and version
   - Number of mods included
   - Enabled/Disabled status
   - List of mods in the pack

### Enabling/Disabling Mod Packs

**Enabling a Mod Pack:**
- Click the checkbox next to a mod pack
- Click "Enable Selected"
- All mods in the pack will be enabled

**Disabling a Mod Pack:**
- Click the checkbox next to an enabled mod pack
- Click "Disable Selected"
- The mod pack will check if any mods are shared with other enabled packs
- If a mod is shared, it will remain enabled
- If a mod is only in this pack, it will be disabled

**Note:** When disabling a mod pack, the loader ensures that mods shared between multiple enabled packs remain active.

### Importing a Mod Pack

1. Click on "Import Pack" in the navigation bar
2. Click "Import Mod Pack JSON"
3. Select a mod pack JSON file from your computer
4. Review the mod pack details:
   - Name and version
   - Description
   - List of mods included
5. Click "Apply Mod Pack" to download missing mods and enable all mods in the pack

### Applying a Mod Pack

When you apply a mod pack:
- **Progress Tracking**: A progress bar shows the current status
- **Missing Mods**: Automatically downloads any mods you don't have installed
- **Download URLs**: The loader attempts to find download URLs for each mod
- **Mod Installation**: Downloaded mods are automatically installed
- **Mod Enabling**: All mods in the pack are enabled
- **Cancellation**: You can cancel the process at any time
- **Results**: You'll see a summary of succeeded, failed, and skipped mods

**During Application:**
- You can minimize the progress bar to continue using the app
- The progress bar shows:
  - Current mod being processed
  - Number of mods completed
  - Success/failed/skipped counts
- If a mod fails to download, it will be marked as failed but the process continues
- Already installed mods are skipped automatically

### Managing Mod Packs

**Viewing Mod Pack Contents:**
- Click on a mod pack in the Mod Packs list to see its details
- Expand the mod pack to view all included mods
- See which mods are currently enabled or disabled

**Removing Mod Packs:**
- Mod packs are stored locally in your mod loader data directory
- To remove a mod pack, delete its JSON file from the packs directory
- The mod pack will disappear from the list after refreshing

## Mod Status and Updates

The Mod Loader can check for mod updates and missing dependencies.

### Checking Mod Status

Each mod in your mod list shows its status:
- **Up to Date**: The mod is on the latest version
- **Update Available**: A newer version is available
- **Missing Dependencies**: Required mods are not installed
- **Outdated Dependencies**: Installed dependencies are older than required

### Installing Dependencies

If a mod shows missing dependencies:
1. Click the "Install Dependencies" button next to the mod
2. The loader will download and install all required mods
3. Dependencies are automatically enabled

### Updating Mods

If a mod has an update available:
1. Click the "Update" button next to the mod
2. The loader will download the latest version
3. The old version is replaced automatically
4. Your mod configuration is preserved

**Note:** Always back up your world before updating mods, as updates may introduce breaking changes.

## Settings

Access settings by clicking "Settings" in the navigation bar.

### Available Settings

- **Vintage Story Mods Path**: The directory where your mods are stored
  - Click "Auto-detect" to automatically find the path
  - Or manually enter the path
- **API Username/Password**: Credentials for submitting mod packs to the database
- **Theme**: Choose between light and dark themes

## Troubleshooting

### Mod Loader Can't Find Vintage Story

1. Go to Settings
2. Click "Auto-detect" to try automatic detection
3. If that fails, manually enter the path to your Vintage Story mods directory:
   - Windows: `%APPDATA%\VintagestoryData\Mods`
   - Linux: `~/.config/VintagestoryData/Mods`
   - macOS: `~/Library/Application Support/VintagestoryData/Mods`

### Mods Not Showing Up

- Ensure mods are in the correct directory (see paths above)
- Check that mods have a valid `modinfo.json` file
- Try refreshing the mod list
- For ZIP mods, ensure they're properly extracted or placed in the mods directory
- The loader indexes mods based on file hashes - if a mod file changes, it will be reindexed automatically

### Download Failures

- Check your internet connection
- Verify the mod database is accessible
- Some mods may require authentication - check the mod's page on the database

### Configuration Editor Not Working

- Ensure the selected mod has JSON config files
- Check file permissions
- Verify the JSON syntax is valid before saving

## Tips

- **Backup First**: Always back up your mods and configs before making bulk changes
- **Test Incrementally**: When applying a mod pack, test it in-game before adding more mods
- **Check Dependencies**: Some mods require other mods to function - check mod descriptions
- **Version Compatibility**: Ensure mod versions are compatible with your Vintage Story version

