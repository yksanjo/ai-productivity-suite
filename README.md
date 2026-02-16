# AI Productivity Suite 🤖📋

A collection of AI-powered productivity and collaboration tools using the Model Context Protocol (MCP).

## Projects Included

### 1. Task/Project Management
AI-powered project management that creates tasks, updates statuses, assigns people, and reorganizes boards through natural language.

**Tools:**
- `create_task` - Create new tasks with AI-suggested details
- `update_task_status` - Update task status (todo, in-progress, done)
- `assign_task` - Assign tasks to team members
- `reorganize_board` - Reorder tasks on the board

### 2. Note-Taking Apps
AI-powered note management that creates, searches, tags, and organizes notes.

**Tools:**
- `create_note` - Create notes with AI-generated tags and organization
- `search_notes` - Search notes using natural language
- `tag_notes` - Auto-tag notes based on content
- `organize_notes` - Organize notes into folders/categories

### 3. Calendar/Scheduling
AI-powered scheduling that books meetings, finds available times, and sends invites.

**Tools:**
- `find_available_times` - Find available meeting slots
- `book_meeting` - Schedule meetings with participants
- `send_invites` - Send meeting invitations
- `reschedule_meeting` - Reschedule existing meetings

### 4. Email Clients
AI-powered email management that drafts replies, searches conversations, organizes folders, and filters spam.

**Tools:**
- `draft_reply` - AI-generated email replies
- `search_emails` - Search emails by content/sender
- `organize_inbox` - Auto-organize emails into folders
- `filter_spam` - Identify and filter spam emails

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yksanjo/ai-productivity-suite.git

# Install dependencies
cd ai-productivity-suite
npm install

# Run the MCP server
npm start
```

## MCP Server Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "ai-productivity-suite": {
      "command": "node",
      "args": ["/path/to/ai-productivity-suite/dist/server.js"]
    }
  }
}
```

## Architecture

Each tool is implemented with:
- **Read-Only Tools**: Use `readOnlyHint: true` for search/query operations
- **State-Modifying Tools**: Require user confirmation before execution
- **Multi-Step Workflows**: Chain multiple tools for complex tasks

## License

MIT
