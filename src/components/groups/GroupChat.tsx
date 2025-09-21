import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Image, File, Video, Users, Globe, Lock } from "lucide-react";
import { useGroupMessages } from "@/hooks/useGroupMessages";
import { useGroups } from "@/hooks/useGroups";
import { formatDistanceToNow } from "date-fns";

interface GroupChatProps {
  selectedGroup: string | null;
}

export function GroupChat({ selectedGroup }: GroupChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const { messages, loading, sending, sendMessage, uploadMedia } = useGroupMessages(selectedGroup);
  const { groups } = useGroups();

  const selectedGroupData = selectedGroup ? groups.find(g => g.id === selectedGroup) : null;

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    try {
      await sendMessage(newMessage);
      setNewMessage("");
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
          await sendMessage(`Shared a ${type}`, [mediaUrl]);
        } catch (error) {
          console.error(`Error uploading ${type}:`, error);
        }
      }
    };

    input.click();
  };

  const generateAvatar = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  };

  if (!selectedGroup) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Group</h3>
          <p className="text-gray-500">Choose a group from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  if (!selectedGroupData) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200">
      {/* Chat Header */}
      <div className="chat-header h-15 bg-white border-b border-gray-200 flex items-center px-5 py-4">
        <div className="group-chat-info flex items-center flex-1">
          <div className="group-avatar w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs mr-3">
            {generateAvatar(selectedGroupData.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="group-chat-name text-base font-semibold text-gray-900">
                {selectedGroupData.name}
              </div>
              {selectedGroupData.visibility === 'private' ? (
                <Lock className="w-4 h-4 text-gray-400" />
              ) : (
                <Globe className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div className="text-xs text-gray-500">
              {selectedGroupData.member_count} members
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="chat-messages flex-1 overflow-y-auto p-5 bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start the conversation</h3>
              <p className="text-gray-500 text-sm">Be the first to send a message in this group!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="message-item flex mb-4 animate-in slide-in-from-bottom-2 duration-300">
              <Avatar className="message-avatar w-8 h-8 mr-3 flex-shrink-0">
                <AvatarImage src={message.sender.profile_pic_url || undefined} />
                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {generateAvatar(message.sender.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="message-content flex-1">
                <div className="message-header flex items-center mb-1">
                  <span className="sender-name text-sm font-semibold text-gray-900 mr-2">
                    {message.sender.full_name}
                  </span>
                  <span className="message-time text-xs text-gray-400">
                    {formatMessageTime(message.created_at)}
                  </span>
                  {message.is_edited && (
                    <span className="text-xs text-gray-400 ml-1">(edited)</span>
                  )}
                </div>
                <div className="message-text text-sm text-gray-900 leading-relaxed">
                  {message.content}
                </div>
                
                {/* Media attachments */}
                {message.media_urls && message.media_urls.length > 0 && (
                  <div className="media-attachments mt-2 space-y-2">
                    {message.media_urls.map((url, index) => (
                      <div key={index} className="media-item">
                        {url.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url) ? (
                          <img 
                            src={url} 
                            alt="Shared image" 
                            className="max-w-xs rounded-lg border"
                            loading="lazy"
                          />
                        ) : (
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <File className="w-4 h-4" />
                            View attachment
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Input Area */}
      <div className="message-input-container p-4 bg-white border-t border-gray-200">
        <div className="message-input-wrapper flex items-center bg-gray-50 rounded-full px-4 py-3 border border-gray-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="message-input flex-1 border-none bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none resize-none"
            disabled={sending}
          />
          
          <div className="media-buttons flex gap-2 ml-3">
            <Button
              onClick={() => handleFileUpload("image")}
              className="media-button w-8 h-8 p-0 bg-transparent text-gray-500 hover:bg-gray-200 hover:text-blue-600 rounded-full transition-all duration-200"
              disabled={sending}
            >
              <Image className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => handleFileUpload("file")}
              className="media-button w-8 h-8 p-0 bg-transparent text-gray-500 hover:bg-gray-200 hover:text-blue-600 rounded-full transition-all duration-200"
              disabled={sending}
            >
              <File className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => handleFileUpload("video")}
              className="media-button w-8 h-8 p-0 bg-transparent text-gray-500 hover:bg-gray-200 hover:text-blue-600 rounded-full transition-all duration-200"
              disabled={sending}
            >
              <Video className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="media-button w-8 h-8 p-0 bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
