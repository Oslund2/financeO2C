# Workspace Management Guide

Complete guide to creating, managing, and switching between workspaces in the animation production platform.

---

## Overview

The platform supports unlimited workspaces per user, allowing you to organize multiple animation projects, studios, or brands independently. Each workspace has its own series, episodes, characters, assets, and team members.

---

## Creating a Workspace

### Step 1: Access Workspace Creation

1. Click the workspace switcher dropdown in the top navigation bar
2. Click the "Create Workspace" button at the bottom of the dropdown

### Step 2: Configure Workspace

**Workspace Name:**
- Enter a descriptive name (e.g., "Acme Animation Studio")
- Maximum 100 characters
- Can include spaces and special characters
- This name appears in the workspace switcher

**Automatic Slug Generation:**
- The system automatically generates a unique URL slug
- Format: `workspace-name-1234abc` (name + timestamp + random suffix)
- Used in URLs and API calls
- Cannot be manually edited (ensures uniqueness)

**Billing Tier Selection:**

Choose from four tiers based on your needs:

#### Free Tier
- **Cost:** $0/month
- **Features:**
  - 3 brands/series
  - 10 episodes per month
  - 5 GB storage
- **Best for:** Solo creators, testing, small projects

#### Starter Tier
- **Cost:** TBD
- **Features:**
  - 10 brands/series
  - 50 episodes per month
  - 20 GB storage
- **Best for:** Growing creators, small studios

#### Professional Tier (Recommended)
- **Cost:** TBD
- **Features:**
  - Unlimited brands/series
  - Unlimited episodes
  - 100 GB storage
- **Best for:** Production studios, agencies

#### Enterprise Tier
- **Cost:** Custom pricing
- **Features:**
  - Everything in Professional
  - Single Sign-On (SSO)
  - Custom domain
  - API access
  - Priority support
- **Best for:** Large organizations, enterprise clients

### Step 3: Create

1. Click "Create Workspace"
2. The system automatically:
   - Creates the organization record
   - Adds you as the owner
   - Generates a unique workspace slug
   - Initializes default settings
   - Copies system prompt templates (optional)
3. You're immediately switched to the new workspace

---

## Switching Workspaces

### Quick Switch

1. Click the workspace switcher dropdown in the top navigation
2. View list of all your workspaces
3. Click any workspace name to switch
4. The entire interface updates to show that workspace's content

### Current Workspace Indicator

- The active workspace name is always visible in the top navigation
- A checkmark icon indicates the currently selected workspace
- All content (series, episodes, characters) is filtered to the current workspace

---

## Workspace Roles & Permissions

### Role Hierarchy

**Owner**
- Full control over workspace
- Can delete workspace
- Can manage billing
- Can add/remove members
- Can assign roles
- Access to all features

**Admin**
- Can manage content and settings
- Can add/remove members (except owner)
- Cannot delete workspace
- Cannot change billing
- Access to all production features

**Member**
- Can create and edit content
- Can view all workspace content
- Cannot manage team members
- Cannot change settings
- Standard production access

### Inviting Team Members

1. Go to Settings > Organization Settings
2. Click "Invite Member"
3. Enter email address
4. Select role (Admin or Member)
5. Send invitation
6. Invitee receives email with invitation link

---

## Workspace Settings

### General Settings

Access via: **Settings > Organization Settings**

**Editable Fields:**
- Workspace name
- Description
- Logo/branding
- Default language
- Timezone

**Read-Only Fields:**
- Workspace slug (cannot be changed)
- Created date
- Member count
- Current billing tier

### Billing Management

**View Current Plan:**
- See active billing tier
- View usage statistics
- Check storage limits

**Upgrade/Downgrade:**
1. Go to Settings > Billing
2. Select new tier
3. Confirm change
4. Changes take effect immediately

**Billing Limits:**
- Free: 3 series, 10 episodes/month
- Starter: 10 series, 50 episodes/month
- Professional: Unlimited
- Enterprise: Unlimited + custom features

---

## Prompt Library Initialization

Each new workspace can optionally initialize the system prompt library.

### Automatic Initialization

When creating a workspace, the system can automatically copy 10 default prompt templates:

1. **script_generation** - Episode script generation
2. **claymation_style_base** - Base style description
3. **claymation_style_full** - Complete style guide
4. **video_negative_prompts** - Generation exclusions
5. **audio_directives** - Audio instructions
6. **shot_description** - Storyboard shots
7. **storyboard_image** - Storyboard panels
8. **camera_shot_types** - Camera reference
9. **character_description** - Character templates
10. **veo3_video_prompt** - Video generation

### Manual Initialization

If prompts weren't initialized during creation:

```sql
SELECT initialize_organization_prompts('<your-organization-id>');
```

### Customizing Prompts

1. Go to Settings > Prompt Library
2. Select a prompt template
3. Click "Edit" or "Create New Version"
4. Modify the prompt content
5. Save as new version
6. Deploy the version to make it active

---

## Workspace Data Isolation

### Complete Separation

Each workspace maintains complete data isolation:

- **Series & Episodes:** Each workspace has its own library
- **Characters:** Character libraries are workspace-specific
- **Assets:** Uploaded assets belong to one workspace
- **Scripts:** Scripts and translations are isolated
- **Production Jobs:** Rendering jobs are workspace-scoped
- **Analytics:** Cost and LTV tracking per workspace
- **Team Members:** Member lists are independent

### Benefits

- **Multi-Client Support:** Agencies can manage multiple clients
- **Brand Separation:** Keep different IPs completely separate
- **Team Isolation:** Different teams don't see each other's work
- **Cost Tracking:** Track costs per workspace/client
- **Security:** RLS policies prevent cross-workspace access

---

## Workspace Management Best Practices

### Naming Conventions

**Recommended Formats:**
- Client-based: "Acme Studios Production"
- Project-based: "Clayville Craniums - Season 2"
- Brand-based: "Educational Series Hub"

### When to Create Multiple Workspaces

**Create separate workspaces for:**
- Different clients (if you're an agency)
- Different brands or IPs
- Different production teams
- Test vs. production environments
- Different business units

**Use a single workspace for:**
- Multiple series within the same brand
- Different seasons of the same show
- Related content in the same universe

### Workspace Cleanup

**Before Deleting a Workspace:**
1. Export all important data
2. Download final video files
3. Archive scripts and storyboards
4. Notify team members
5. Verify no active production jobs

**Deletion Process:**
1. Only owners can delete workspaces
2. All data is permanently deleted
3. This action cannot be undone
4. Team members lose access immediately

---

## Troubleshooting

### Can't Create Workspace

**Issue:** "Failed to create workspace" error

**Solutions:**
1. Check your internet connection
2. Verify workspace name is not empty
3. Try a different workspace name
4. Clear browser cache and retry
5. Check browser console for errors

### Can't Switch Workspaces

**Issue:** Workspace switcher not loading

**Solutions:**
1. Refresh the page
2. Check you're still logged in
3. Verify you have access to the workspace
4. Clear browser cache

### Missing Workspace

**Issue:** Workspace disappeared from list

**Solutions:**
1. Check you weren't removed by owner
2. Verify your organization membership
3. Contact workspace owner
4. Check if workspace was deleted

### Billing Tier Limits

**Issue:** "Limit reached" error

**Solutions:**
1. Check current usage in Settings
2. Upgrade to higher tier
3. Delete old content to free space
4. Archive completed projects

---

## API Access (Enterprise Only)

### Authentication

```typescript
// Include workspace ID in API requests
const headers = {
  'Authorization': `Bearer ${apiKey}`,
  'X-Organization-ID': workspaceId
};
```

### Endpoints

- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create new workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PATCH /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

---

## Security & Privacy

### Data Protection

- All workspace data uses Row Level Security (RLS)
- Users can only access workspaces they're members of
- Cross-workspace queries are prevented at the database level
- All API calls are workspace-scoped

### Access Control

- Owner approval required for new members
- Members can be removed at any time
- Role changes take effect immediately
- Audit logs track all member changes

### Compliance

- GDPR compliant data handling
- Data deletion upon workspace deletion
- Export capabilities for data portability
- Secure authentication via Supabase

---

## Frequently Asked Questions

**Q: How many workspaces can I create?**
A: Unlimited. There's no limit on the number of workspaces per user.

**Q: Can I transfer ownership of a workspace?**
A: Yes, owners can transfer ownership to another admin member in Settings.

**Q: What happens to my data if I downgrade tiers?**
A: Existing data is preserved, but you may be limited in creating new content.

**Q: Can I rename my workspace slug?**
A: No, slugs are permanent to maintain consistent URLs and API references.

**Q: Can workspaces share assets?**
A: No, assets must be uploaded separately to each workspace for data isolation.

**Q: Can I collaborate across workspaces?**
A: No, each workspace is completely isolated. Users need separate invitations.

**Q: What's included in the Free tier?**
A: 3 series, 10 episodes per month, 5 GB storage - perfect for testing.

**Q: How do I upgrade my workspace?**
A: Go to Settings > Billing and select your desired tier.

---

## Support

For additional help with workspace management:

- Check the main README.md for technical details
- Review TECHNICAL_REQUIREMENTS.md for architecture
- Contact support via the Settings page
- Join the community discussions

---

**Last Updated:** December 14, 2024
**Version:** 1.0.0
