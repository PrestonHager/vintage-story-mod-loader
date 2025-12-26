# Mod Pack Designer Guide

This guide will help you create and submit mod packs using the Vintage Story Mod Loader.

## Creating a Mod Pack

### Step 1: Select Mods

1. Launch the Mod Loader
2. Click on "Create Pack" in the navigation bar
3. Ensure the mods you want to include are installed (they don't need to be enabled)
4. You'll see a list of all your installed mods
5. Use the selection buttons:
   - **Select All**: Selects every mod in the list
   - **Deselect All**: Clears all selections
   - **Select All Enabled**: Selects only currently enabled mods
6. Check the boxes next to individual mods you want to include
7. Enter a name and version for your mod pack
8. Add a description (this can be expanded later)

**Tips for Mod Selection:**
- Test mods together before including them in a pack
- Include all dependencies required by your selected mods
- Consider mod compatibility and load order
- Start with a focused set of mods rather than including everything

### Step 2: Export or Save for Editing

After selecting mods, you have two options:

**Option A: Export Locally**
1. Click "Export Mod Pack" to save a JSON file
2. Share this file with others
3. Users can import it using "Import Pack"

**Option B: Save & Publish**
1. Click "Save & Publish" to save the pack locally and open the editor
2. This takes you to the Mod Pack Editor where you can add detailed metadata

### Step 3: Edit Metadata (In Mod Pack Editor)

The Mod Pack Editor provides a comprehensive form for all mod pack metadata:

**Required Fields:**
- **Name**: The name of your mod pack (must be unique)
- **Version**: Version number following semantic versioning (e.g., "1.0.0")
- **Description**: Detailed description of your mod pack (supports Markdown)

**Optional Fields:**
- **Status**: Draft (not visible publicly) or Published (visible on database)
- **Category**: 
  - Game Mod
  - Server-Specific Tweak
  - External Tool
  - Other
- **Tags**: Add relevant tags by typing and pressing Enter (e.g., QoL, Crafting, Magic, Combat, Building)
- **URL Alias**: Custom URL slug for your mod pack (auto-generated from name if not provided)
- **Summary**: Short summary (100 characters max - warning shown if exceeded)
- **Side**: 
  - Client side mod
  - Server side mod
  - Client and Server side mod
- **Links**: 
  - Homepage URL
  - Trailer URL
  - Source Code URL
  - Issues URL
  - Wiki URL
  - Donate URL
- **Screenshots**: Add screenshot URLs (one per line)
  - Click "Add Screenshot" to add a new URL field
  - Screenshots are displayed in order
  - Use direct image URLs for best results

**Rich Text Description:**
- The description field supports Markdown formatting
- Use headers, lists, bold, italic, links, and code blocks
- Preview your description before submitting

### Step 4: Submit to Database

**Before Submitting:**
1. Fill in all metadata fields in the Mod Pack Editor
2. Review all information for accuracy
3. Ensure your mod database credentials are configured in Settings
4. Verify all mods in your pack are available on the mod database

**Submitting:**
1. Click "Submit Mod Pack" in the editor
2. The loader will:
   - Save the pack locally first
   - Submit to the mod database using your credentials
   - Show a success or error message
3. If successful, your pack will appear on the database (if Published) or in your drafts

**After Submission:**
- The pack is saved locally even if submission fails
- You can edit and resubmit if needed
- Check the mod database to verify your submission
- Monitor for user feedback and questions

## Best Practices

### Mod Selection

- **Test Compatibility**: Ensure all mods in your pack work together
  - Test in a fresh Vintage Story installation
  - Check for conflicts and load order issues
  - Document any known incompatibilities
- **Check Dependencies**: Include all required dependencies
  - Use the mod status feature to check for missing dependencies
  - Include dependency mods in your pack
  - Specify exact versions for consistency
- **Version Locking**: Specify exact mod versions to ensure consistency
  - Use specific version numbers, not "unknown"
  - Test with the exact versions you specify
  - Update your pack when mods release new versions
- **Documentation**: Clearly document what each mod does
  - Explain why each mod is included
  - Note any special configuration requirements
  - Provide setup instructions if needed

### Metadata

- **Clear Descriptions**: Write clear, detailed descriptions
  - Use Markdown formatting for better readability
  - Include sections for features, installation, and compatibility
  - Explain what makes your pack unique
  - Provide usage instructions if needed
- **Accurate Tags**: Use relevant tags to help users find your pack
  - Use common tags like QoL, Crafting, Magic, Combat, Building
  - Don't over-tag - use only relevant tags
  - Consider what users might search for
- **Screenshots**: Include high-quality screenshots showing your mod pack in action
  - Use direct image URLs (not embedded in pages)
  - Show key features and gameplay
  - Include 3-5 screenshots for best results
  - Ensure images are properly sized and clear
- **Links**: Provide links to source code, documentation, and support
  - Homepage: Your main project page
  - Source: GitHub or other repository
  - Issues: Where users can report problems
  - Wiki: Documentation if available
  - Donate: Support link if applicable

### Versioning

- Use semantic versioning (MAJOR.MINOR.PATCH)
- Increment version when:
  - **MAJOR**: Breaking changes or major mod additions/removals
  - **MINOR**: New mods added or significant updates
  - **PATCH**: Bug fixes or minor updates

### Testing

1. **Test Locally**: Always test your mod pack before sharing
2. **Fresh Install**: Test on a clean Vintage Story installation
3. **Multiple Scenarios**: Test in different game scenarios
4. **Document Issues**: Note any known issues or incompatibilities

## Mod Pack Format

Mod packs are stored as JSON files with the following structure:

```json
{
  "name": "My Mod Pack",
  "version": "1.0.0",
  "description": "A collection of quality-of-life mods",
  "mods": [
    {
      "id": "mod-id-1",
      "version": "1.2.3",
      "url": "https://mods.vintagestory.at/api/mod/mod-id-1",
      "hash": "abc123def456..." // Optional: file hash for verification
    },
    {
      "id": "mod-id-2",
      "version": "2.0.0",
      "url": "https://mods.vintagestory.at/api/mod/mod-id-2"
    }
  ],
  "metadata": {
    "category": "Game Mod",
    "tags": ["QoL", "Crafting"],
    "status": "Published",
    "summary": "A great mod pack for enhanced gameplay",
    "side": "Client and Server side mod",
    "url_alias": "my-mod-pack",
    "links": {
      "homepage": "https://example.com",
      "source": "https://github.com/user/repo"
    },
    "screenshots": [
      "https://example.com/screenshot1.png",
      "https://example.com/screenshot2.png"
    ]
  }
}
```

**Field Descriptions:**
- **name**: Unique name for your mod pack
- **version**: Semantic version (MAJOR.MINOR.PATCH)
- **description**: Full description (supports Markdown)
- **mods**: Array of mod objects
  - **id**: Mod ID from the mod database
  - **version**: Specific mod version (or "unknown" if version is not specified)
  - **url**: Optional API URL or direct download URL
  - **hash**: Optional file hash for integrity verification
- **metadata**: Additional information
  - **category**: One of the predefined categories
  - **tags**: Array of tag strings
  - **status**: "Draft" or "Published"
  - **summary**: Short summary (max 100 characters)
  - **side**: Compatibility information
  - **url_alias**: URL-friendly version of the name
  - **links**: Object with various link URLs
  - **screenshots**: Array of screenshot URLs

## Submission Guidelines

### Before Submitting

- [ ] All mods are tested and working together
- [ ] All metadata fields are filled out accurately
- [ ] Screenshots are included and show the mod pack in action
- [ ] Description clearly explains what the mod pack does
- [ ] Tags are relevant and help users find your pack
- [ ] Version number follows semantic versioning

### Submission Process

1. Complete all metadata fields in the Mod Pack Editor
2. Review all information for accuracy
3. Click "Submit Mod Pack"
4. Enter your mod database credentials
5. Wait for confirmation
6. Your mod pack will appear on the database (if Published) or in your drafts

### After Submission

- Monitor feedback from users
- Update your mod pack as needed
- Keep mod versions up to date
- Respond to issues and questions

## Troubleshooting

### Submission Fails

- Check your internet connection
- Verify your credentials are correct
- Ensure all required fields are filled
- Check that the mod database is accessible

### Mod Pack Not Appearing

- If set to "Draft", check your drafts on the mod database
- If "Published", wait a few minutes for the database to update
- Verify your submission was successful

### Import/Export Issues

- Ensure the JSON file is valid
- Check that all required fields are present
- Verify mod IDs match those in the database

## Tips

- **Start Small**: Begin with a small, focused mod pack
- **Get Feedback**: Share drafts with friends for feedback
- **Stay Updated**: Keep your mod pack updated as mods are updated
- **Document Everything**: Clear documentation helps users understand your pack
- **Be Responsive**: Respond to user questions and issues

