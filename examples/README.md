# Example Mod Pack

This directory contains example mod pack JSON files that demonstrate the mod pack format and can be used as templates or imported directly into the Vintage Story Mod Loader.

## Files

- **example-mod-pack.json**: A comprehensive mod pack featuring 50+ mods for an enhanced survival experience

## Usage

### Importing a Mod Pack

1. Open the Vintage Story Mod Loader
2. Navigate to "Import Pack" in the navigation bar
3. Select the JSON file you want to import
4. Review the mod pack details
5. Click "Apply Mod Pack" to download missing mods and enable all mods

### Creating Your Own Mod Pack

You can use the example mod pack as a template:

1. Copy `example-mod-pack.json` to a new file
2. Edit the mod list, name, description, and metadata
3. Save your custom mod pack
4. Import it into the Mod Loader

## Mod Pack Format

The mod pack JSON follows this structure:

```json
{
  "name": "Mod Pack Name",
  "version": "1.0.0",
  "description": "Description of the mod pack",
  "mods": [
    {
      "id": "mod-id",
      "version": "1.0.0"
    }
  ],
  "metadata": {
    "category": "Game Mod",
    "tags": ["QoL", "Crafting"],
    "status": "Published",
    "summary": "Short summary (100 chars max)",
    "text": "Full description with markdown support",
    "side": "Client and Server side mod"
  }
}
```

## Example Mod Pack Details

The `example-mod-pack.json` includes:

- **50+ mods** covering various aspects of gameplay
- **Quality of Life** improvements
- **Expanded crafting** and building options
- **Combat enhancements**
- **Visual and audio** improvements
- **Food and survival** mechanics
- **World generation** enhancements

All mods are properly formatted with their mod IDs and versions extracted from the provided zip files and URLs.
