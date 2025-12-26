# Mod Pack Designer Guide

This guide will help you create and submit mod packs using the Vintage Story Mod Loader.

## Creating a Mod Pack

### Step 1: Select Mods

1. Launch the Mod Loader
2. Click on "Mod Packs" in the navigation bar
3. Ensure the mods you want to include are installed and enabled
4. Check the boxes next to the mods you want to include in your pack
5. Enter a name and version for your mod pack
6. Add a description

### Step 2: Edit Metadata

1. Click "Next: Edit Metadata" after selecting mods
2. Fill in all the required and optional fields:

**Required Fields:**
- **Name**: The name of your mod pack
- **Version**: Version number (e.g., "1.0.0")
- **Description**: Detailed description of your mod pack

**Optional Fields:**
- **Status**: Draft or Published
- **Category**: Game Mod, Server-Specific Tweak, External Tool, or Other
- **Tags**: Add relevant tags (QoL, Crafting, Magic, etc.)
- **URL Alias**: Custom URL slug for your mod pack
- **Summary**: Short summary (100 characters max)
- **Side**: Client/Server/Both compatibility
- **Links**: Homepage, Trailer, Source Code, Issues, Wiki, Donate URLs
- **Screenshots**: Add screenshot URLs

### Step 3: Export or Submit

**Export Locally:**
1. Click "Export Mod Pack" to save a JSON file
2. Share this file with others
3. Users can import it using "Import Pack"

**Submit to Database:**
1. Fill in all metadata fields
2. Click "Submit Mod Pack"
3. Enter your mod database credentials if prompted
4. Wait for confirmation

## Best Practices

### Mod Selection

- **Test Compatibility**: Ensure all mods in your pack work together
- **Check Dependencies**: Include all required dependencies
- **Version Locking**: Specify exact mod versions to ensure consistency
- **Documentation**: Clearly document what each mod does

### Metadata

- **Clear Descriptions**: Write clear, detailed descriptions
- **Accurate Tags**: Use relevant tags to help users find your pack
- **Screenshots**: Include high-quality screenshots showing your mod pack in action
- **Links**: Provide links to source code, documentation, and support

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
      "version": "1.2.3"
    },
    {
      "id": "mod-id-2",
      "version": "2.0.0"
    }
  ],
  "metadata": {
    "category": "Game Mod",
    "tags": ["QoL", "Crafting"],
    "status": "Published",
    "summary": "A great mod pack for enhanced gameplay",
    "side": "Client and Server side mod"
  }
}
```

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

