# FAQ and Troubleshooting

## General Questions

### What is the Vintage Story Mod Loader?

The Vintage Story Mod Loader is a cross-platform desktop application that helps you manage mods and mod packs for Vintage Story. It provides an easy-to-use interface for downloading, enabling/disabling, and organizing mods.

### Which platforms are supported?

The Mod Loader supports:
- Windows (x64)
- macOS (x64 and ARM64)
- Linux (x64)

### Is the Mod Loader free?

Yes, the Mod Loader is free and open-source.

## Installation

### Where does the Mod Loader install?

The Mod Loader installs as a standalone application. It doesn't modify your Vintage Story installation.

### How do I update the Mod Loader?

Download the latest version from the releases page and install it. Your settings and configurations will be preserved.

## Mod Management

### How does the Mod Loader detect my Vintage Story installation?

The Mod Loader automatically searches common installation paths:
- **Windows**: `%APPDATA%\VintagestoryData\Mods`
- **Linux**: `~/.config/VintagestoryData/Mods`
- **macOS**: `~/Library/Application Support/VintagestoryData/Mods`

If auto-detection fails, you can manually set the path in Settings.

### Can I use the Mod Loader alongside the game's built-in mod manager?

Yes! The Mod Loader works with the same mod directory that the game uses. Changes made in the Mod Loader will be reflected in the game.

### What happens when I disable a mod?

Disabled mods are moved to a `disabled` subdirectory. They remain on your system but won't be loaded by Vintage Story.

### Can I delete mods from the Mod Loader?

Currently, the Mod Loader focuses on enabling/disabling mods. To delete mods, manually remove them from the mods directory.

## Mod Packs

### What is a mod pack?

A mod pack is a collection of mods packaged together with metadata. It allows you to easily share a curated set of mods with others.

### How do I share a mod pack?

1. Create your mod pack in the Mod Loader
2. Click "Export Mod Pack" to save a JSON file
3. Share the JSON file with others
4. They can import it using "Import Pack"

### Can I edit a mod pack after creating it?

Yes! You can edit mod pack metadata at any time. However, you'll need to re-export or re-submit if you make changes.

### What happens when I apply a mod pack?

When you apply a mod pack:
- Missing mods are automatically downloaded
- All mods in the pack are enabled
- Your mod list is updated

## Configuration

### Can I edit mod config files?

Yes! Use the Configuration Editor to browse and edit JSON config files for your mods.

### Will my config changes persist?

Yes, changes are saved directly to the mod's config files. Always back up before making changes.

### What if I break a config file?

If a config file becomes invalid:
1. The mod may fail to load
2. Check the JSON syntax
3. Restore from backup if needed
4. Or reinstall the mod

## Troubleshooting

### The Mod Loader can't find my Vintage Story installation

**Solution:**
1. Go to Settings
2. Click "Auto-detect"
3. If that fails, manually enter the path:
   - Windows: `C:\Users\YourName\AppData\Roaming\VintagestoryData\Mods`
   - Linux: `/home/yourname/.config/VintagestoryData/Mods`
   - macOS: `/Users/yourname/Library/Application Support/VintagestoryData/Mods`

### Mods aren't showing up in the list

**Possible causes:**
- Mods are in the wrong directory
- Mods don't have a valid `modinfo.json` file
- Mods are in a subdirectory (they should be directly in the Mods folder)

**Solution:**
- Verify the mods directory path in Settings
- Check that each mod has a `modinfo.json` file
- Ensure mods are in the correct location

### Download fails

**Possible causes:**
- Internet connection issues
- Mod database is down
- Authentication required
- Invalid mod ID

**Solution:**
- Check your internet connection
- Verify the mod database is accessible
- Check if the mod requires authentication
- Verify the mod ID is correct

### Mod pack import fails

**Possible causes:**
- Invalid JSON format
- Missing required fields
- Mod IDs don't exist

**Solution:**
- Verify the JSON file is valid
- Check that all required fields are present
- Ensure mod IDs in the pack are correct

### Configuration Editor shows no files

**Possible causes:**
- Mod doesn't have JSON config files
- Files are in a subdirectory
- Permissions issue

**Solution:**
- Not all mods have config files - this is normal
- Check file permissions
- Verify the mod is properly installed

## Platform-Specific Issues

### Linux

**Issue:** AppImage won't run
**Solution:** Make it executable: `chmod +x ModLoader.AppImage`

**Issue:** Can't find mods directory
**Solution:** The path is usually `~/.config/VintagestoryData/Mods`

### macOS

**Issue:** "App is damaged" error
**Solution:** Run: `xattr -cr /path/to/ModLoader.app`

**Issue:** Can't find mods directory
**Solution:** The path is usually `~/Library/Application Support/VintagestoryData/Mods`

### Windows

**Issue:** Antivirus flags the application
**Solution:** Add an exception for the Mod Loader in your antivirus settings

**Issue:** Can't find mods directory
**Solution:** The path is usually `%APPDATA%\VintagestoryData\Mods`

## Getting Help

### Where can I get help?

- Check this FAQ first
- Review the User Guide or Designer Guide
- Open an issue on GitHub
- Check the mod database forums

### How do I report a bug?

1. Open an issue on GitHub
2. Include:
   - Your operating system and version
   - Mod Loader version
   - Steps to reproduce the issue
   - Error messages (if any)
   - Screenshots (if helpful)

### Can I contribute to the project?

Yes! The project is open-source. Check the GitHub repository for contribution guidelines.

