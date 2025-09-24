import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image, File, Video } from "lucide-react";
import { useWorkspaceMessages } from "@/hooks/useWorkspaceMessages";
import { useWorkspaces } from "@/hooks/useWorkspaces";

interface WorkspaceChatProps {
  selectedWorkspace: string | null;
}

export function WorkspaceChat({ selectedWorkspace }: WorkspaceChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const { workspaces } = useWorkspaces();
  const { 
    messages, 
    loading, 
    sending, 
    sendMessage, 
    uploadMedia 
  } = useWorkspaceMessages(selectedWorkspace);

  const selectedWorkspaceData = selectedWorkspace 
    ? workspaces.find(w => w.id === selectedWorkspace) 
    : null;

  const handleSendMessage = async () => {
    if (!selectedWorkspace || !newMessage.trim()) return;
    
    try {
      await sendMessage(newMessage);
      setNewMessage(""); // Clear input after sending
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (type: "image" | "file" | "video") => {
    const input = document.createElement('input');
    input.type = 'file';
    
    switch (type) {
      case "image":
        input.accept = "image/*";
        break;
      case "file":
        input.accept = ".pdf,.doc,.docx,.txt";
        break;
      case "video":
        input.accept = "video/*";
        break;
    }

    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        try {
          const mediaUrl = await uploadMedia(target.files[0]);
          await sendMessage(`Shared ${type}: ${target.files[0].name}`, [mediaUrl]);
        } catch (error) {
          console.error(`Error uploading ${type}:`, error);
        }
      }
    };

    input.click();
  };

  if (!selectedWorkspace || !selectedWorkspaceData) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Workspace</h3>
          <p className="text-gray-500">Choose a workspace from the sidebar to start collaborating</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200">
      {/* Workspace Header */}
      <div className="workspace-header h-15 bg-white border-b border-gray-200 flex items-center px-5 py-4">
        <div className="workspace-info flex items-center flex-1">
          <div className="workspace-avatar w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-xs mr-3 bg-gradient-to-r from-blue-500 to-purple-600">
            {selectedWorkspaceData.avatar || selectedWorkspaceData.name.split(' ').map(word => word[0]).join('').toUpperCase()}
          </div>
          <div>
            <div className="workspace-name text-base font-semibold text-gray-900">
              {selectedWorkspaceData.name}
            </div>
            <div className="workspace-description text-xs text-gray-500">
              {selectedWorkspaceData.description}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="chat-messages flex-1 overflow-y-auto p-5 bg-white">
        {loading && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Loading messages...</p>
          </div>
        )}
        {messages.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className="message-item flex mb-4 animate-in slide-in-from-bottom-2 duration-300">
            <Avatar className="message-avatar w-8 h-8 mr-3 flex-shrink-0">
              <AvatarFallback className="text-xs font-semibold">
                {message.sender.username?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="message-content flex-1">
              <div className="message-header flex items-center mb-1">
                <span className="sender-name text-sm font-semibold text-gray-900 mr-2">
                  {message.sender.full_name || message.sender.username}
                </span>
                <span className="message-time text-xs text-gray-400">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="message-text text-sm text-gray-900 leading-relaxed">
                {message.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input Area */}
      <div className="message-input-container p-4 bg-white border-t border-gray-200">
        <div className="message-input-wrapper flex items-center bg-gray-50 rounded-full px-4 py-3 border border-gray-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="message-input flex-1 border-none bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none resize-none"
            disabled={sending}
          />
          
          <div className="media-buttons flex gap-2 ml-3">
            <Button
              onClick={() => handleFileUpload("image")}
              className="media-button w-8 h-8 p-0 bg-transparent text-gray-500 hover:bg-gray-200 hover:text-blue-600 rounded-full transition-all duration-200"
              title="Share image"
            >
              <Image className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => handleFileUpload("file")}
              className="media-button w-8 h-8 p-0 bg-transparent text-gray-500 hover:bg-gray-200 hover:text-blue-600 rounded-full transition-all duration-200"
              title="Share file"
            >
              <File className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => handleFileUpload("video")}
              className="media-button w-8 h-8 p-0 bg-transparent text-gray-500 hover:bg-gray-200 hover:text-blue-600 rounded-full transition-all duration-200"
              title="Share video"
            >
              <Video className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="media-button w-8 h-8 p-0 bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
