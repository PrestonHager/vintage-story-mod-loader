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
2. Use the search bar to find mods
3. Click "Download" on any mod you want to install
4. The mod will be downloaded and installed automatically

## Mod Packs

### Importing a Mod Pack

1. Click on "Import Pack" in the navigation bar
2. Select a mod pack JSON file
3. Review the mod pack details
4. Click "Apply Mod Pack" to download missing mods and enable all mods in the pack

### Applying a Mod Pack

When you apply a mod pack:
- Missing mods will be automatically downloaded
- All mods in the pack will be enabled
- The mod list will be updated to reflect the changes

## Configuration Editor

### Editing Mod Config Files

1. Click on "Config" in the navigation bar
2. Select a mod from the left panel
3. Select a config file (JSON files) from the middle panel
4. Edit the configuration in the editor
5. Click "Save" to apply changes

**Note:** Always back up your config files before editing, as incorrect configurations may cause mods to malfunction.

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

