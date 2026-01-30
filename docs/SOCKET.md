# Socket.io Implementation Documentation

## Overview

The Chat Heretics backend uses **Socket.io** for real-time bidirectional communication, enabling instant messaging, typing indicators, and online presence tracking.

## Architecture

### File Location
```
backend/src/utils/socket.ts
```

### Core Components

1. **Socket Server Initialization** - Creates Socket.io instance attached to HTTP server
2. **Authentication Middleware** - Clerk JWT token verification
3. **Online User Tracking** - Map-based state management
4. **Event Handlers** - Real-time message and presence management

## Implementation Details

### 1. Socket Server Setup

```typescript
export const initializeSocket = (httpServer: HttpServer) => {
  const allowedOrigins = [
      "http://localhost:8081", // expo mobile
      "http://localhost:5173", // vite web devs
       process.env.FRONTEND_URL || "", // production
  ].filter(Boolean) as string[];

  const io = new SocketServer(httpServer, {
      cors: {
          origin: allowedOrigins
      }
  })
  // ... handlers
  return io;
}
```

**Key Points:**
- Attaches to existing HTTP server (from Express)
- CORS configured for multiple origins (Expo, Vite dev, production)
- Returns io instance for external access if needed

### 2. Authentication Middleware

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  if(!token) return next(new Error("Unauthorized"))

  try {
      const session = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!
      })
      const clerkId = session.sub
      const user = await User.findOne({ clerkId })
      if(!user) return next(new Error("User not found!"))
      
      socket.data.userId = user._id.toString()
      next()
  } catch (error) {
      return next(new Error("Unauthorized"));
  }
})
```

**Security Features:**
- Clerk JWT token verification from `socket.handshake.auth.token`
- Validates user exists in database
- Stores MongoDB user ID in `socket.data.userId`
- Rejects connections without valid authentication

### 3. Online User Tracking

```typescript
export const onlineUsers: Map<string, string> = new Map()
```

**Structure:**
- **Key**: MongoDB user ID (string)
- **Value**: Socket.io socket ID

**Usage:**
- Track which users are currently connected
- Map user IDs to their active socket connections
- Broadcast presence updates to other users

### 4. Connection Handler

```typescript
io.on("connection", (socket) => {
  const userId = socket.data.userId
  
  // 1. Send current online users to newly connected user
  socket.emit("online-users", { 
      userIds: Array.from(onlineUsers.keys())
  })
  
  // 2. Register user as online
  onlineUsers.set(userId, socket.id)
  
  // 3. Broadcast to others that user is online
  socket.broadcast.emit("user-online", { userId })
  
  // 4. Join personal room for direct notifications
  socket.join(`user:${userId}`)
})
```

**Connection Flow:**
1. New user receives list of currently online users
2. User is added to online users map
3. Other users are notified of new connection
4. User joins personal room (`user:${userId}`) for direct messages

### 5. Chat Room Management

#### Join Chat
```typescript
socket.on("join-chat", (chatId: string) => {
  socket.join(`chat:${chatId}`)
})
```

#### Leave Chat
```typescript
socket.on("leave-chat", (chatId: string) => {
  socket.leave(`chat:${chatId}`)
})
```

**Room Strategy:**
- Chat rooms use prefix `chat:` (e.g., `chat:abc123`)
- User rooms use prefix `user:` (e.g., `user:xyz789`)
- Users join chat rooms when entering a chat screen
- Users leave chat rooms when navigating away

### 6. Message Handling

```typescript
socket.on("send-message", async (data: {chatId: string, text: string}) => {
  try {
      const { chatId, text } = data
      
      // Verify user is participant in chat
      const chat = await Chat.findOne({_id: chatId, participants: userId})
      if(!chat) {
          socket.emit("socket-error", { message: "Chat not found" });
          return;
      }
      
      // Create message in database
      const message = await Message.create({
          chat: chatId,
          sender: userId,
          text,
      })
      
      // Update chat metadata
      chat.lastMessage = message._id
      chat.lastMessageAt = new Date()
      await chat.save()
      
      // Populate sender details
      await message.populate("sender", "name email avatar")
      
      // Emit to chat room (for users currently viewing the chat)
      io.to(`chat:${chatId}`).emit("new-message", message)
      
      // Emit to all participants' personal rooms (for notifications)
      for(const participant of chat.participants) {
          io.to(`user:${participant}`).emit("new-message", message)
      }
      
  } catch (error) {
      socket.emit("error", { message: "Failed to send message" });
  }
})
```

**Key Features:**
- Validates user is chat participant before allowing message
- Persists message to MongoDB
- Updates chat's last message metadata
- Dual emission strategy:
  - To chat room: Real-time updates for active viewers
  - To personal rooms: Notifications for all participants

### 7. Typing Indicators

```typescript
socket.on("typing", async (data: {
  chatId: string,
  isTyping: boolean,
}) => {
  const typePayload = {
      userId,
      chatId: data.chatId,
      isTyping: data.isTyping,
  }
  
  // Emit to chat room (excluding sender)
  socket.to(`chat:${data.chatId}`).emit("typing", typePayload)
  
  // Also emit to other participant's personal room
  try {
      const chat = await Chat.findById(data.chatId)
      if(chat) {
          const otherParticipant = chat.participants.find(
              (p:any) => p._id.toString() !== userId
          )
          if(otherParticipant){
              io.to(`user:${otherParticipant}`).emit("typing", typePayload)
          }
      }
  } catch (error) {
      // Silently fail - no need to notify user
  }
})
```

**Behavior:**
- Emits to chat room (other users in the same chat)
- Emits to other participant's personal room
- Silent error handling (not critical functionality)

### 8. Disconnect Handler

```typescript
socket.on("disconnect", () => {
  onlineUsers.delete(userId)
  
  // Notify other users
  socket.broadcast.emit("user-offline", { userId })
})
```

**Cleanup:**
- Removes user from online users map
- Broadcasts offline status to all other connected users

## Event Reference

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join-chat` | `{ chatId: string }` | Join a chat room |
| `leave-chat` | `{ chatId: string }` | Leave a chat room |
| `send-message` | `{ chatId: string, text: string }` | Send a message |
| `typing` | `{ chatId: string, isTyping: boolean }` | Typing indicator |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `online-users` | `{ userIds: string[] }` | List of online users (sent on connect) |
| `user-online` | `{ userId: string }` | New user connected |
| `user-offline` | `{ userId: string }` | User disconnected |
| `new-message` | `Message` object | New message received |
| `typing` | `{ userId, chatId, isTyping }` | Typing status update |
| `socket-error` | `{ message: string }` | Error message |

## Room Architecture

### Room Types

1. **Chat Rooms** (`chat:${chatId}`)
   - Created when users join a specific chat
   - Used for real-time messages in active conversations
   - Users auto-join when entering chat screen

2. **User Rooms** (`user:${userId}`)
   - Created on connection, unique per user
   - Used for notifications and updates
   - Messages emitted here for offline/sync updates

### Emission Patterns

```
┌─────────────────────────────────────────────────────────────┐
│  send-message Event Flow                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User sends message                                      │
│     ↓                                                       │
│  2. Server validates & saves to DB                          │
│     ↓                                                       │
│  3. Server emits to chat:${chatId} room                     │
│     → Active users in chat receive immediately              │
│     ↓                                                       │
│  4. Server emits to user:${participantId} for each member   │
│     → All participants receive (for notifications)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Integration with Express

### Setup in index.ts

```typescript
import "dotenv/config";
import { createServer } from "http";
import app from "./src/app";
import { connectDB } from "./src/config/database";
import { initializeSocket } from "./src/utils/socket";

const PORT = process.env.PORT || 3000;

connectDB()
.then(() => {
    // Create HTTP server from Express app
    const httpServer = createServer(app);
    
    // Initialize Socket.io
    const io = initializeSocket(httpServer);
    
    // Start server
    httpServer.listen(PORT, () => {
        console.log(`✅ Server is running on port ${PORT}`);
    });
})
.catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
});
```

**Important:**
- Must use `createServer(app)` instead of `app.listen()`
- Socket.io attaches to HTTP server, not Express app directly
- Start server with `httpServer.listen()`

## Client Implementation Guide

### Connection Setup

```typescript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: clerkToken // Get from Clerk
  }
});
```

### Event Listeners

```typescript
// Listen for new messages
socket.on("new-message", (message) => {
  console.log("New message:", message);
  // Update UI
});

// Listen for typing indicators
socket.on("typing", ({ userId, chatId, isTyping }) => {
  console.log(`User ${userId} is typing: ${isTyping}`);
  // Show/hide typing indicator
});

// Listen for online status changes
socket.on("user-online", ({ userId }) => {
  console.log(`User ${userId} came online`);
});

socket.on("user-offline", ({ userId }) => {
  console.log(`User ${userId} went offline`);
});
```

### Emitting Events

```typescript
// Join a chat
socket.emit("join-chat", chatId);

// Send a message
socket.emit("send-message", { chatId, text: "Hello!" });

// Typing indicator
socket.emit("typing", { chatId, isTyping: true });
// ... stop typing
socket.emit("typing", { chatId, isTyping: false });
```

## Error Handling

### Server-Side

All event handlers wrap database operations in try-catch blocks:

```typescript
try {
  // Database operation
} catch (error) {
  console.error("Error in handler:", error);
  socket.emit("error", { message: "Operation failed" });
}
```

### Client-Side

Listen for errors:

```typescript
socket.on("error", ({ message }) => {
  console.error("Socket error:", message);
  // Show error to user
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
  // Handle auth failure
});
```

## Best Practices

1. **Always Authenticate**: All socket connections require valid Clerk token
2. **Validate Participation**: Check user is chat participant before message operations
3. **Handle Disconnects**: Clean up user state on disconnect
4. **Room Management**: Join/leave rooms appropriately when navigating
5. **Error Boundaries**: Wrap all async operations in try-catch
6. **Silent Failures**: Non-critical features (like typing) fail silently
7. **Dual Emission**: Emit to both chat rooms and personal rooms for reliability

## Environment Variables

Required for Socket.io:

```env
PORT=3000
FRONTEND_URL=https://your-production-url.com
CLERK_SECRET_KEY=sk_test_...
```

## Testing

### Using Socket.io Client

```bash
# Install client
npm install socket.io-client

# Test connection
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  auth: { token: 'your-clerk-token' }
});

socket.on('connect', () => console.log('Connected!'));
socket.on('online-users', (data) => console.log('Online users:', data));
socket.on('new-message', (msg) => console.log('Message:', msg));
"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Check server is running on correct port |
| Authentication failed | Verify Clerk token is valid and not expired |
| CORS errors | Ensure origin is in allowedOrigins array |
| Messages not received | Verify user joined chat room correctly |
| Typing not showing | Check event name matches exactly (case-sensitive) |

## Security Considerations

1. **Token Validation**: All connections verified via Clerk
2. **Room Access**: Users can only access chats they're participants in
3. **Data Sanitization**: Text stored in MongoDB (handled by Mongoose)
4. **No Direct Broadcasting**: Messages only go to authorized participants
5. **Socket ID Not Exposed**: Internal socket IDs not shared with clients

## Future Enhancements

Potential improvements:
- Message read receipts
- Message editing/deletion
- File attachments via socket
- Voice/video signaling (WebRTC)
- Message reactions
- Threaded replies
