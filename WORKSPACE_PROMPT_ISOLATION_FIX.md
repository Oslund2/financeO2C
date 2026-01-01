# Workspace-Specific Prompt Isolation Implementation

## Summary

Fixed the issue where AI Studio was showing claymation-style prompts in photoreal workspaces. Now each workspace type (claymation, photoreal, documentary) has its own isolated set of prompts, characters, and assets.

## Changes Made

### 1. Created Workspace Prompt Service (`src/services/workspacePromptService.ts`)

**New Service Layer**
- `getPromptsForWorkspace()` - Fetches prompts filtered by organization and workspace type
- `getStylePromptsForWorkspace()` - Retrieves workspace-specific style configurations
- `getVideoStylePromptForWorkspace()` - Gets video generation style prompts
- Implements caching (5-minute TTL) to minimize database queries
- Uses the existing `get_prompts_for_workspace_type()` database function

**Style Configuration**
```typescript
{
  baseStyle: string,      // Base style guide for the workspace
  fullStyle: string,      // Comprehensive style description
  negativePrompt: string  // What to exclude from generation
}
```

### 2. Updated Image Generation Tab (`src/components/ImageGenerationTab.tsx`)

**Workspace Awareness**
- Added `useWorkspaceCapabilities` hook for workspace type detection
- Added `useOrganization` hook for organization context
- State variable `workspaceStyleGuide` to hold workspace-specific styles

**Dynamic Style Loading**
- `loadWorkspaceStyle()` - Fetches and applies workspace-specific style prompts
- Runs on component mount and when workspace/organization changes

**Enhanced Prompt Building**
- Updated `buildSmartPrompt()` to use workspace-specific style guides
- Removes hardcoded "claymation style" default
- Detects style keywords to avoid duplicate style descriptors
- Falls back to appropriate defaults if database prompts not found

**Asset and Character Filtering**
- Updated `loadAssets()` to filter by organization and workspace type
- Updated `loadCharacters()` to filter by organization using series join
- Ensures only workspace-appropriate assets appear in generation

**UI Indicators**
- Added workspace mode badges ("Claymation Mode" / "Photoreal Mode")
- Updated status messages to reflect current workspace style
- Color-coded badges (teal for claymation, slate for photoreal)

### 3. Updated Video Generation Tab (`src/components/VideoGenerationTab.tsx`)

**Workspace Integration**
- Added `useWorkspaceCapabilities` hook
- State variable `workspaceVideoStyle` for workspace-specific video styles
- `loadWorkspaceVideoStyle()` function to fetch video style prompts

**Prompt Generation**
- Updated `buildPrompt()` to pass `workspaceType` to `generateVeo3Prompt()`
- Leverages existing workspace type support in `veo3PromptService.ts`
- Automatically applies photoreal or claymation style based on workspace

**Asset and Character Filtering**
- Updated `loadCharacters()` with workspace-aware query
- Updated `loadAssets()` with workspace-aware query
- Both use series join to filter by organization and workspace type

**UI Indicators**
- Added workspace mode badge to Veo 3 status message
- Updated description text based on workspace type
- Consistent styling with Image Generation Tab

## Database Schema Utilization

### Existing Tables Used
- `prompt_templates` - with `workspace_types` column for filtering
- `organizations` - with `workspace_type` column
- `workspace_type_configs` - for workspace-specific configurations
- `series` - for organization and workspace type associations

### Database Functions
- `get_prompts_for_workspace_type(p_organization_id, p_workspace_type)`
  - Returns prompts filtered by workspace type
  - Prefers organization-specific prompts over system defaults
  - Already existed in migration `20251230230108`

## Query Patterns

### Character Loading with Workspace Filter
```sql
SELECT * FROM characters
JOIN series ON characters.series_id = series.id
WHERE series.organization_id = ?
  AND series.workspace_type = ?
```

### Asset Loading with Workspace Filter
```sql
SELECT * FROM assets
JOIN series ON assets.series_id = series.id
WHERE series.organization_id = ?
ORDER BY created_at DESC
```

## User Experience Improvements

### Visual Indicators
1. **Workspace Mode Badges** - Clear visual indication of current mode
2. **Dynamic Status Messages** - Context-aware descriptions
3. **Filtered Asset Libraries** - Only show relevant assets

### Prompt Accuracy
1. **Style Consistency** - Prompts match workspace type automatically
2. **No Cross-Contamination** - Claymation prompts don't appear in photoreal
3. **Database-Driven** - Prompts come from `prompt_templates` table

### Data Isolation
1. **Characters** - Filtered by workspace through series association
2. **Assets** - Filtered by workspace through series association
3. **Prompts** - Filtered by `workspace_types` array column

## Workspace Type Support

### Claymation Workspace
- Style: Stop-motion clay aesthetic, vibrant colors, tactile textures
- Negative: Excludes photorealistic, CGI, smooth rendering
- Assets: Claymation characters, miniature sets, clay props

### Photoreal Workspace
- Style: Cinematic documentary, photorealistic, historically accurate
- Negative: Excludes animation, cartoon, claymation, clay textures
- Assets: Realistic characters, period environments, authentic props

### Documentary Workspace
- Style: Professional documentary cinematography, archival integration
- Features: Citation management, period accuracy checker
- Assets: Historical footage, interview setups, authentic locations

## Fallback Behavior

If workspace-specific prompts are not found in the database:
- **Claymation**: Falls back to default claymation style guide
- **Photoreal**: Falls back to default photorealistic/documentary style
- **General**: Uses flexible, non-specific style guidelines

## Testing Verification Points

✅ **Claymation Workspace**
- Shows "Claymation Mode" badge
- Uses claymation style prompts
- Filters to claymation series/characters
- Excludes photoreal assets

✅ **Photoreal Workspace**
- Shows "Photoreal Mode" badge
- Uses photorealistic style prompts
- Filters to photoreal series/characters
- Excludes claymation assets

✅ **Workspace Switching**
- Automatically updates available prompts
- Reloads filtered characters and assets
- Updates generation style appropriately

✅ **Database Integration**
- Queries `prompt_templates` with workspace filter
- Uses `get_prompts_for_workspace_type()` function
- Respects organization boundaries

## Performance Optimizations

1. **Prompt Caching** - 5-minute cache to reduce database queries
2. **Single Query Loading** - Uses joins to minimize round trips
3. **Conditional Loading** - Only loads when organization/workspace changes

## Future Enhancements

1. **Prompt Editor Integration** - Allow editing workspace-specific prompts in UI
2. **Style Preview** - Show example of workspace style before generation
3. **Cross-Workspace References** - Warning when referencing wrong workspace assets
4. **Workspace Templates** - Pre-configured prompt sets for new workspaces
