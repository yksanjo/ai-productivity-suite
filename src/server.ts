import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ============ DATA STORES (In-Memory for MVP) ============
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  createdAt: Date;
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  participants: string[];
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'cancelled' | 'completed';
}

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'spam' | 'archive';
  isRead: boolean;
  isSpam: boolean;
  receivedAt: Date;
}

// In-memory data stores
const tasks: Map<string, Task> = new Map();
const notes: Map<string, Note> = new Map();
const meetings: Map<string, Meeting> = new Map();
const emails: Map<string, Email> = new Map();

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function searchByKeyword<T>(items: Map<string, T>, keyword: string, searchFields: (keyof T)[]): T[] {
  const results: T[] = [];
  const lowerKeyword = keyword.toLowerCase();
  
  for (const item of items.values()) {
    for (const field of searchFields) {
      const value = String(item[field]).toLowerCase();
      if (value.includes(lowerKeyword)) {
        results.push(item);
        break;
      }
    }
  }
  return results;
}

// ============ TOOL DEFINITIONS ============

// Task Management Tools
const taskTools = [
  {
    name: 'create_task',
    description: 'Create a new task in the project management system with AI-suggested details',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority' },
        assignee: { type: 'string', description: 'Person to assign the task to' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task_status',
    description: 'Update the status of an existing task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task to update' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'New status' },
      },
      required: ['taskId', 'status'],
    },
  },
  {
    name: 'assign_task',
    description: 'Assign a task to a team member',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task' },
        assignee: { type: 'string', description: 'Name of the person to assign' },
      },
      required: ['taskId', 'assignee'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List all tasks, optionally filtered by status or assignee',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'Filter by status' },
        assignee: { type: 'string', description: 'Filter by assignee' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'reorganize_board',
    description: 'Reorder tasks on the project board',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID of the task to move' },
        newPosition: { type: 'number', description: 'New position index' },
        status: { type: 'string', description: 'Status/column to move to' },
      },
      required: ['taskId', 'newPosition'],
    },
  },
];

// Note-Taking Tools
const noteTools = [
  {
    name: 'create_note',
    description: 'Create a new note with AI-generated tags and organization',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        content: { type: 'string', description: 'Note content' },
        folder: { type: 'string', description: 'Folder to store the note in' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'search_notes',
    description: 'Search notes using natural language queries',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'tag_notes',
    description: 'Auto-tag notes based on their content',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to tag' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add' },
      },
      required: ['noteId', 'tags'],
    },
  },
  {
    name: 'list_notes',
    description: 'List all notes, optionally filtered by folder or tags',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'Filter by folder' },
        tag: { type: 'string', description: 'Filter by tag' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'organize_notes',
    description: 'Organize notes into folders based on content analysis',
    inputSchema: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to organize' },
        targetFolder: { type: 'string', description: 'Target folder name' },
      },
      required: ['noteId', 'targetFolder'],
    },
  },
];

// Calendar/Scheduling Tools
const calendarTools = [
  {
    name: 'find_available_times',
    description: 'Find available meeting time slots for participants',
    inputSchema: {
      type: 'object',
      properties: {
        participants: { type: 'array', items: { type: 'string' }, description: 'List of participants' },
        duration: { type: 'number', description: 'Meeting duration in minutes' },
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
      },
      required: ['participants', 'duration', 'date'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'book_meeting',
    description: 'Schedule a new meeting with participants',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Meeting title' },
        description: { type: 'string', description: 'Meeting description' },
        participants: { type: 'array', items: { type: 'string' } },
        startTime: { type: 'string', description: 'Start time (ISO 8601)' },
        duration: { type: 'number', description: 'Duration in minutes' },
      },
      required: ['title', 'participants', 'startTime', 'duration'],
    },
  },
  {
    name: 'send_invites',
    description: 'Send meeting invitations to participants',
    inputSchema: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'ID of the meeting' },
      },
      required: ['meetingId'],
    },
  },
  {
    name: 'list_meetings',
    description: 'List scheduled meetings',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Filter by date (YYYY-MM-DD)' },
        participant: { type: 'string', description: 'Filter by participant' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'reschedule_meeting',
    description: 'Reschedule an existing meeting',
    inputSchema: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'ID of the meeting to reschedule' },
        newStartTime: { type: 'string', description: 'New start time (ISO 8601)' },
        newDuration: { type: 'number', description: 'New duration in minutes' },
      },
      required: ['meetingId', 'newStartTime'],
    },
  },
];

// Email Tools
const emailTools = [
  {
    name: 'draft_reply',
    description: 'Generate an AI-powered reply to an email',
    inputSchema: {
      type: 'object',
      properties: {
        emailId: { type: 'string', description: 'ID of the email to reply to' },
        tone: { type: 'string', enum: ['formal', 'casual', 'friendly'], description: 'Reply tone' },
        keyPoints: { type: 'array', items: { type: 'string' }},      },
      required: ['emailId'],
    },
  },
  {
    name: 'search_emails',
    description: 'Search emails by content, sender, or subject',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        folder: { type: 'string', enum: ['inbox', 'sent', 'drafts', 'spam', 'archive'] },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'organize_inbox',
    description: 'Automatically organize emails into appropriate folders',
    inputSchema: {
      type: 'object',
      properties: {
        emailId: { type: 'string', description: 'ID of the email to organize' },
        targetFolder: { type: 'string', enum: ['inbox', 'archive', 'spam'] },
      },
      required: ['emailId', 'targetFolder'],
    },
  },
  {
    name: 'list_emails',
    description: 'List emails from a specific folder',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', enum: ['inbox', 'sent', 'drafts', 'spam', 'archive'], default: 'inbox' },
        unreadOnly: { type: 'boolean', description: 'Show only unread emails' },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'filter_spam',
    description: 'Identify and mark spam emails',
    inputSchema: {
      type: 'object',
      properties: {
        emailId: { type: 'string', description: 'ID of the email to check' },
      },
      required: ['emailId'],
    },
  },
];

// Combine all tools
const allTools = [...taskTools, ...noteTools, ...calendarTools, ...emailTools];

// ============ TOOL EXECUTION HANDLERS ============

async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    // Task Management
    case 'create_task': {
      const task: Task = {
        id: generateId(),
        title: args.title,
        description: args.description || '',
        status: 'todo',
        priority: args.priority || 'medium',
        assignee: args.assignee,
        createdAt: new Date(),
      };
      tasks.set(task.id, task);
      return { success: true, task };
    }
    
    case 'update_task_status': {
      const task = tasks.get(args.taskId);
      if (!task) return { success: false, error: 'Task not found' };
      task.status = args.status;
      return { success: true, task };
    }
    
    case 'assign_task': {
      const task = tasks.get(args.taskId);
      if (!task) return { success: false, error: 'Task not found' };
      task.assignee = args.assignee;
      return { success: true, task };
    }
    
    case 'list_tasks': {
      let result = Array.from(tasks.values());
      if (args.status) result = result.filter(t => t.status === args.status);
      if (args.assignee) result = result.filter(t => t.assignee === args.assignee);
      return { success: true, tasks: result };
    }
    
    case 'reorganize_board': {
      const task = tasks.get(args.taskId);
      if (!task) return { success: false, error: 'Task not found' };
      if (args.status) task.status = args.status;
      return { success: true, task };
    }

    // Note-Taking
    case 'create_note': {
      // AI-suggest tags based on content
      const content = args.content.toLowerCase();
      const autoTags: string[] = [];
      if (content.includes('urgent') || content.includes('important')) autoTags.push('urgent');
      if (content.includes('meeting') || content.includes('call')) autoTags.push('meeting');
      if (content.includes('idea') || content.includes('thought')) autoTags.push('idea');
      
      const note: Note = {
        id: generateId(),
        title: args.title,
        content: args.content,
        tags: autoTags,
        folder: args.folder || 'General',
        createdAt: new Date(),
      };
      notes.set(note.id, note);
      return { success: true, note, aiSuggestions: { tags: autoTags } };
    }
    
    case 'search_notes': {
      const results = searchByKeyword(notes, args.query, ['title', 'content', 'tags']);
      return { success: true, results };
    }
    
    case 'tag_notes': {
      const note = notes.get(args.noteId);
      if (!note) return { success: false, error: 'Note not found' };
      note.tags = [...new Set([...note.tags, ...args.tags])];
      return { success: true, note };
    }
    
    case 'list_notes': {
      let result = Array.from(notes.values());
      if (args.folder) result = result.filter(n => n.folder === args.folder);
      if (args.tag) result = result.filter(n => n.tags.includes(args.tag));
      return { success: true, notes: result };
    }
    
    case 'organize_notes': {
      const note = notes.get(args.noteId);
      if (!note) return { success: false, error: 'Note not found' };
      note.folder = args.targetFolder;
      return { success: true, note };
    }

    // Calendar/Scheduling
    case 'find_available_times': {
      // Simple availability check (mock implementation)
      const slots = [];
      const date = new Date(args.date);
      for (let hour = 9; hour < 17; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        
        // Check if slot conflicts with existing meetings
        const hasConflict = Array.from(meetings.values()).some(m => {
          const mStart = new Date(m.startTime);
          return mStart.getTime() === startTime.getTime();
        });
        
        if (!hasConflict) {
          slots.push(startTime.toISOString());
        }
      }
      return { success: true, availableSlots: slots };
    }
    
    case 'book_meeting': {
      const startTime = new Date(args.startTime);
      const endTime = new Date(startTime.getTime() + args.duration * 60000);
      
      const meeting: Meeting = {
        id: generateId(),
        title: args.title,
        description: args.description || '',
        participants: args.participants,
        startTime,
        endTime,
        status: 'scheduled',
      };
      meetings.set(meeting.id, meeting);
      return { success: true, meeting };
    }
    
    case 'send_invites': {
      const meeting = meetings.get(args.meetingId);
      if (!meeting) return { success: false, error: 'Meeting not found' };
      // Mock sending invites
      return { success: true, invitesSent: meeting.participants };
    }
    
    case 'list_meetings': {
      let result = Array.from(meetings.values());
      if (args.date) {
        const targetDate = args.date.split('-').join('-');
        result = result.filter(m => {
          const mDate = m.startTime.toISOString().split('T')[0];
          return mDate === targetDate;
        });
      }
      if (args.participant) {
        result = result.filter(m => m.participants.includes(args.participant));
      }
      return { success: true, meetings: result };
    }
    
    case 'reschedule_meeting': {
      const meeting = meetings.get(args.meetingId);
      if (!meeting) return { success: false, error: 'Meeting not found' };
      meeting.startTime = new Date(args.newStartTime);
      if (args.newDuration) {
        meeting.endTime = new Date(meeting.startTime.getTime() + args.newDuration * 60000);
      }
      return { success: true, meeting };
    }

    // Email
    case 'draft_reply': {
      const email = emails.get(args.emailId);
      if (!email) return { success: false, error: 'Email not found' };
      
      // AI-generated reply (mock)
      const replies = {
        formal: `Dear ${email.from},\n\nThank you for your email. I will get back to you shortly.\n\nBest regards`,
        casual: `Hi ${email.from},\n\nGot it, thanks! I'll follow up soon.\n\nCheers`,
        friendly: `Hey ${email.from}!\n\nThanks so much for reaching out! Talk soon :)\n\nBest`,
      };
      
      const tone = args.tone || 'casual';
      return { 
        success: true, 
        draft: {
          to: email.from,
          subject: `Re: ${email.subject}`,
          body: replies[tone],
          originalEmail: email.id,
        }
      };
    }
    
    case 'search_emails': {
      const allEmails = Array.from(emails.values());
      let results = searchByKeyword(allEmails, args.query, ['subject', 'body', 'from']);
      if (args.folder) results = results.filter(e => e.folder === args.folder);
      return { success: true, results };
    }
    
    case 'organize_inbox': {
      const email = emails.get(args.emailId);
      if (!email) return { success: false, error: 'Email not found' };
      email.folder = args.targetFolder;
      return { success: true, email };
    }
    
    case 'list_emails': {
      let result = Array.from(emails.values());
      result = result.filter(e => e.folder === (args.folder || 'inbox'));
      if (args.unreadOnly) result = result.filter(e => !e.isRead);
      return { success: true, emails: result };
    }
    
    case 'filter_spam': {
      const email = emails.get(args.emailId);
      if (!email) return { success: false, error: 'Email not found' };
      
      // Simple spam detection (mock)
      const spamKeywords = ['win', 'prize', 'free', 'click here', 'urgent action'];
      const isSpam = spamKeywords.some(kw => email.body.toLowerCase().includes(kw));
      email.isSpam = isSpam;
      if (isSpam) email.folder = 'spam';
      
      return { success: true, isSpam, email };
    }

    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

// ============ SERVER SETUP ============

const server = new Server(
  {
    name: 'ai-productivity-suite',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools,
  };
});

// Handle tool call request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await handleToolCall(name, args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: false, error: String(error) }),
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI Productivity Suite MCP Server running on stdio');
}

main().catch(console.error);
