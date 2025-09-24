import React, { useState, useEffect, useRef } from 'react';
import { X, Edit3, Users, Image, File, Link, Settings, Camera, Upload, Search, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import { useUserSearch } from '@/hooks/useUserSearch';
import { supabase } from '@/integrations/supabase/client';

interface GroupDetailsSidebarProps {
  groupId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GroupDetailsSidebar({ groupId, isOpen, onClose }: GroupDetailsSidebarProps) {
  const { user } = useAuth();
  const { groups, getGroupMembers, updateGroup, getUserRoleInGroup, addMember, forceRefresh } = useGroups();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupProfilePic, setGroupProfilePic] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add Members Modal State
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  
  // User search hook
  const { users: searchResults, loading: searchLoading } = useUserSearch(memberSearchQuery);
  
  // Group permissions state
  const [permissions, setPermissions] = useState({
    onlyAdminCanSendMessage: false,
    onlyAdminCanAddMembers: true,
    adminApprovalRequired: true
  });

  const selectedGroup = groups.find(g => g.id === groupId);

  useEffect(() => {
    if (selectedGroup && isOpen) {
      setGroupName(selectedGroup.name);
      setGroupDescription(selectedGroup.description || '');
      setGroupProfilePic(selectedGroup.profile_pic_url || null);
      loadGroupMembers();
    }
  }, [selectedGroup, isOpen, groupId]);

  const loadGroupMembers = async () => {
    if (!groupId) return;
    
    try {
      const membersData = await getGroupMembers(groupId);
      setMembers(membersData);
      
      // Get current user's role
      const role = await getUserRoleInGroup(groupId);
      setUserRole(role || 'member');
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  // Check if user is admin - either has admin role OR is the group creator
  const isAdmin = userRole === 'admin' || (selectedGroup && user && selectedGroup.created_by === user.id);

  const handleSaveChanges = async () => {
    if (!groupId) return;
    
    try {
      await updateGroup(groupId, {
        name: groupName.trim(),
        description: groupDescription.trim(),
        profile_pic_url: groupProfilePic
      });
      
      console.log('Group updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update group:', error);
      // You might want to show a toast notification here
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !groupId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('Image size should be less than 5MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `group-${groupId}-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('group-avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('group-avatars')
        .getPublicUrl(fileName);

      // Update group with new image URL
      await updateGroup(groupId, {
        profile_pic_url: publicUrl
      });

      setGroupProfilePic(publicUrl);
      console.log('Group image updated successfully');
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: value
    }));
    // TODO: Implement permission update in backend
    console.log('Permission changed:', permission, value);
  };

  const handleAddMembers = async () => {
    if (!groupId || selectedUsersToAdd.length === 0) return;
    
    console.log('Starting to add members:', { groupId, selectedUsersToAdd, userCount: selectedUsersToAdd.length });
    
    setIsAddingMembers(true);
    try {
      // Add all selected users to the group
      for (const userId of selectedUsersToAdd) {
        console.log('Adding user:', userId);
        await addMember(groupId, userId, 'member');
        console.log('Successfully added user:', userId);
      }
      
      console.log('All members added successfully');
      
      // Force refresh the members list to show new members immediately
      console.log('Refreshing members list...');
      await loadGroupMembers();
      
      // Also force refresh all group data to ensure newly added members see the group in their list
      console.log('Force refreshing all group data...');
      await forceRefresh();
      
      console.log('Closing modal and resetting state...');
      // Reset modal state
      setShowAddMembersModal(false);
      setSelectedUsersToAdd([]);
      setMemberSearchQuery('');
      
      console.log('Add members process completed successfully');
      
    } catch (error) {
      console.error('Failed to add members - Full error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // You might want to show a toast notification here
      alert(`Failed to add members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingMembers(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsersToAdd(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Filter out users who are already members
  const availableUsers = searchResults.filter(searchUser => 
    !members.some(member => member.user_id === searchUser.id)
  );

  if (!isOpen || !selectedGroup) return null;

  const sidebarTabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'files', label: 'Files', icon: File },
    { id: 'links', label: 'Links', icon: Link },
  ];

  // Add permissions tab only for admins
  if (isAdmin) {
    sidebarTabs.push({ id: 'permissions', label: 'Permissions', icon: Settings });
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-lg z-50 overflow-hidden flex flex-col transition-transform duration-300 ease-in-out transform">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Group Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-200">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex flex-col">
          {sidebarTabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 text-sm font-medium border-r-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50 border-transparent'
                }`}
              >
                <IconComponent className="w-4 h-4 mr-3" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Group Profile Picture */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                {groupProfilePic ? (
                  <img 
                    src={groupProfilePic} 
                    alt={selectedGroup.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                    {selectedGroup.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {isAdmin && (
                  <>
                    <button 
                      onClick={triggerImageUpload}
                      disabled={isUploadingImage}
                      className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isUploadingImage ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3 text-white" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={triggerImageUpload}
                  disabled={isUploadingImage}
                  className="mt-3 text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {isUploadingImage ? 'Uploading...' : 'Change Photo'}
                </Button>
              )}
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Group Name</label>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {isEditing ? (
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="text-lg font-semibold"
                />
              ) : (
                <h3 className="text-lg font-semibold text-gray-900">{selectedGroup.name}</h3>
              )}
            </div>

            {/* Creation Date */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Created</label>
              <p className="text-sm text-gray-600">
                {new Date(selectedGroup.created_at).toLocaleDateString()} {new Date(selectedGroup.created_at).toLocaleTimeString()}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              {isEditing ? (
                <Textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Add a group description..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {selectedGroup.description || 'No description added'}
                </p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Button onClick={handleSaveChanges} size="sm">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Members ({members.length})</h3>
                {isAdmin && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowAddMembersModal(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Add Members
                  </Button>
                )}
              </div>

              <Input placeholder="Search members" className="mb-4" />

              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.profile?.full_name?.charAt(0) || member.profile?.username?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {member.profile?.full_name || member.profile?.username}
                          {member.user_id === user?.id && ' (You)'}
                        </p>
                        <p className="text-xs text-gray-500">{member.profile?.username}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Media</h3>
            <div className="text-center py-8 text-gray-500">
              <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No media shared yet</p>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Files</h3>
            <div className="text-center py-8 text-gray-500">
              <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No files shared yet</p>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Links</h3>
            <div className="text-center py-8 text-gray-500">
              <Link className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No links shared yet</p>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && isAdmin && (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Permissions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium">Only admins can send messages</p>
                  <p className="text-xs text-gray-500">Restrict messaging to group admins only</p>
                </div>
                <Switch
                  checked={permissions.onlyAdminCanSendMessage}
                  onCheckedChange={(value) => handlePermissionChange('onlyAdminCanSendMessage', value)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium">Only admins can add members</p>
                  <p className="text-xs text-gray-500">Restrict member additions to admins</p>
                </div>
                <Switch
                  checked={permissions.onlyAdminCanAddMembers}
                  onCheckedChange={(value) => handlePermissionChange('onlyAdminCanAddMembers', value)}
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Admin approval required</p>
                  <p className="text-xs text-gray-500">New members need admin approval to join</p>
                </div>
                <Switch
                  checked={permissions.adminApprovalRequired}
                  onCheckedChange={(value) => handlePermissionChange('adminApprovalRequired', value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    
    {/* Add Members Modal */}
    <Dialog open={showAddMembersModal} onOpenChange={setShowAddMembersModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to {selectedGroup?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Search users to add..."
              className="pl-10"
            />
          </div>
          
          {/* Search Results */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchLoading ? (
              <div className="text-center py-4 text-gray-500">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                Searching...
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {memberSearchQuery.length < 2 ? (
                  <p className="text-sm">Type at least 2 characters to search</p>
                ) : (
                  <p className="text-sm">No users found</p>
                )}
              </div>
            ) : (
              availableUsers.map((searchUser) => (
                <div
                  key={searchUser.id}
                  onClick={() => toggleUserSelection(searchUser.id)}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedUsersToAdd.includes(searchUser.id)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    {searchUser.profile_pic_url ? (
                      <img 
                        src={searchUser.profile_pic_url} 
                        alt={searchUser.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {searchUser.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {searchUser.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      @{searchUser.username}
                    </p>
                    {searchUser.branch && (
                      <p className="text-xs text-gray-400">
                        {searchUser.branch} • {searchUser.year_of_study}
                      </p>
                    )}
                  </div>
                  
                  <div className={`w-5 h-5 border-2 rounded transition-colors ${
                    selectedUsersToAdd.includes(searchUser.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedUsersToAdd.includes(searchUser.id) && (
                      <Check className="w-3 h-3 text-white m-0.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Selected Users Count */}
          {selectedUsersToAdd.length > 0 && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {selectedUsersToAdd.length} user{selectedUsersToAdd.length > 1 ? 's' : ''} selected
            </div>
          )}
          
          {/* Modal Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMembersModal(false);
                setSelectedUsersToAdd([]);
                setMemberSearchQuery('');
              }}
              disabled={isAddingMembers}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedUsersToAdd.length === 0 || isAddingMembers}
              className="flex-1"
            >
              {isAddingMembers ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Members
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}