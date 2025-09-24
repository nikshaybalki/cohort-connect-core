import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Globe, Lock } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { formatDistanceToNow } from "date-fns";

interface GroupSidebarProps {
  selectedGroup: string | null;
  onGroupSelect: (groupId: string) => void;
  onCreateGroup: () => void;
}

export function GroupSidebar({ selectedGroup, onGroupSelect, onCreateGroup }: GroupSidebarProps) {
  const { groups, publicGroups, loading, joinGroup } = useGroups();
  const [showPublicGroups, setShowPublicGroups] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroupId(groupId);
    try {
      await joinGroup(groupId);
      // Automatically switch to "My Groups" view after joining
      setShowPublicGroups(false);
    } catch (error) {
      console.error('Failed to join group:', error);
      // You might want to show a toast notification here
    } finally {
      setJoiningGroupId(null);
    }
  };

  const generateAvatar = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPreview = (group: any) => {
    if (group.latest_message) {
      const timeAgo = formatDistanceToNow(new Date(group.latest_message.created_at), { addSuffix: true });
      return `${group.latest_message.sender_name}: ${group.latest_message.content.slice(0, 30)}${group.latest_message.content.length > 30 ? '...' : ''} • ${timeAgo}`;
    }
    return `${group.member_count || 0} members • Created ${formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}`;
  };

  if (loading) {
    return (
      <aside className="hidden lg:block w-[280px] flex-shrink-0">
        <div className="animate-pulse space-y-4">
          <div className="h-11 bg-gray-200 rounded-xl"></div>
          <div className="h-11 bg-gray-200 rounded-xl"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:block w-[280px] flex-shrink-0">
      {/* Action Buttons Section */}
      <div className="group-action-buttons space-y-2 mb-4">
        <Button 
          onClick={onCreateGroup}
          className="action-button w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
        
        <Button 
          onClick={() => setShowPublicGroups(!showPublicGroups)}
          variant={showPublicGroups ? "default" : "outline"}
          className="action-button w-full h-11 font-semibold rounded-xl"
        >
          <Search className="w-4 h-4 mr-2" />
          {showPublicGroups ? "My Groups" : "Explore Groups"}
        </Button>
      </div>

      {/* Group Separator */}
      <div className="group-separator mb-3">
        <span className="text-sm font-medium text-gray-500">
          {showPublicGroups ? "Public Groups" : "My Groups"}
        </span>
      </div>

      {/* Groups List */}
      <div className="groups-container pt-2 space-y-2">
        {showPublicGroups ? (
          // Public Groups Discovery
          publicGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No public groups available</p>
            </div>
          ) : (
            publicGroups.map((group) => (
              <div
                key={group.id}
                className="group-item p-3 border rounded-xl bg-white hover:border-blue-500 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center">
                  {/* Group Avatar */}
                  <div className="group-avatar w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm mr-3">
                    {generateAvatar(group.name)}
                  </div>
                  
                  {/* Group Info */}
                  <div className="group-info flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="group-name text-sm font-semibold text-gray-900 truncate">
                        {group.name}
                      </div>
                      <Globe className="w-3 h-3 text-green-500" />
                    </div>
                    <div className="group-preview text-xs text-gray-500 truncate">
                      {group.member_count} members • {group.description || 'No description'}
                    </div>
                  </div>
                  
                  {/* Join Button */}
                  <Button
                    onClick={() => handleJoinGroup(group.id)}
                    disabled={joiningGroupId === group.id}
                    size="sm"
                    className="ml-2 text-xs px-3 py-1 h-7"
                  >
                    {joiningGroupId === group.id ? "Joining..." : "Join"}
                  </Button>
                </div>
              </div>
            ))
          )
        ) : (
          // User's Groups
          groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-2">No groups yet</p>
              <Button 
                onClick={onCreateGroup}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Create your first group
              </Button>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                onClick={() => onGroupSelect(group.id)}
                className={`group-item p-3 border rounded-xl cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-md hover:scale-[0.98] ${   
                  selectedGroup === group.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center">
                  {/* Group Avatar */}
                  <div className="group-avatar w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm mr-3">
                    {generateAvatar(group.name)}
                  </div>
                  
                  {/* Group Info */}
                  <div className="group-info flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="group-name text-sm font-semibold text-gray-900 truncate">
                        {group.name}
                      </div>
                      {group.visibility === 'private' ? (
                        <Lock className="w-3 h-3 text-gray-400" />
                      ) : (
                        <Globe className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <div className="group-preview text-xs text-gray-500 truncate">
                      {formatPreview(group)}
                    </div>
                  </div>
                  
                  {/* Unread Badge */}
                  {group.unread_count && group.unread_count > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="unread-badge ml-2 min-w-[20px] h-5 text-xs font-semibold rounded-full flex items-center justify-center"
                    >
                      {group.unread_count > 99 ? '99+' : group.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )
        )}
      </div>
    </aside>
  );
}
