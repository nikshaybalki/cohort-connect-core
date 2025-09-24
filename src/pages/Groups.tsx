import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { NavBar } from "@/components/layout/NavBar";
import { GroupSidebar } from "@/components/groups/GroupSidebar";
import { WorkspaceSidebar } from "@/components/groups/WorkspaceSidebar";
import { GroupChat } from "@/components/groups/GroupChat";
import { WorkspaceChat } from "@/components/groups/WorkspaceChat";
import { TasksSection } from "@/components/groups/workspace/TasksSection";
import { AnalysisSection } from "@/components/groups/workspace/AnalysisSection";
import { CreateGroupModal } from "@/components/modals/CreateGroupModal";
import { AddWorkspaceModal } from "@/components/modals/AddWorkspaceModal";
import { Button } from "@/components/ui/button";
import { useWorkspaces, type Workspace } from "@/hooks/useWorkspaces";
import { useGroups } from "@/hooks/useGroups";

const Groups = () => {
  const [openCreateGroup, setOpenCreateGroup] = useState(false);
  const [openCreateWorkspace, setOpenCreateWorkspace] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<"group" | "workspace">("group");
  const [rightPanelView, setRightPanelView] = useState<"tasks" | "analysis">("tasks");
  
  // Use real hooks for data management
  const { groups } = useGroups();
  const { workspaces, createWorkspace } = useWorkspaces();

  const handleModeSwitch = (mode: "group" | "workspace") => {
    setCurrentMode(mode);
    // Reset selections when switching modes
    if (mode === "group") {
      setSelectedWorkspace(null);
    } else {
      setSelectedGroup(null);
    }
  };

  const handleAddWorkspace = async (workspaceData: {
    name: string;
    description: string;
    flowSteps: string[];
    members: string[];
    group_id: string;
  }) => {
    try {
      const newWorkspace = await createWorkspace({
        name: workspaceData.name,
        description: workspaceData.description,
        group_id: workspaceData.group_id,
        workflow_steps: workspaceData.flowSteps
      });
      
      setSelectedWorkspace(newWorkspace.id);
      setCurrentMode("workspace");
    } catch (error) {
      console.error('Failed to create workspace:', error);
      // Handle error - could show a toast notification
    }
  };

  const selectedWorkspaceData = selectedWorkspace 
    ? workspaces.find(w => w.id === selectedWorkspace) 
    : null;

  // Convert workspace data for components that expect flowSteps
  const selectedWorkspaceWithFlowSteps = selectedWorkspaceData ? {
    ...selectedWorkspaceData,
    avatar: selectedWorkspaceData.avatar || selectedWorkspaceData.name.split(' ').map(word => word[0]).join('').toUpperCase(),
    progress: selectedWorkspaceData.progress || 0,
    flowSteps: selectedWorkspaceData.workflow_steps
  } : null;

  return (
    <div>
      {/* SEO H1 for page intent */}
      <h1 className="sr-only">Groups - CampusConnect</h1>

      <Header onOpenCreate={() => setOpenCreateGroup(true)} />
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[280px,1fr,400px] gap-6 relative">
        {/* Left Sidebar */}
        {currentMode === "group" ? (
          <GroupSidebar 
            selectedGroup={selectedGroup}
            onGroupSelect={setSelectedGroup}
            onCreateGroup={() => setOpenCreateGroup(true)}
          />
        ) : (
          <WorkspaceSidebar 
            selectedWorkspace={selectedWorkspace}
            onWorkspaceSelect={setSelectedWorkspace}
            onCreateWorkspace={() => setOpenCreateWorkspace(true)}
            workspaces={workspaces.map(w => ({
              ...w,
              avatar: w.avatar || w.name.split(' ').map(word => word[0]).join('').toUpperCase(),
              progress: w.progress || 0,
              flowSteps: w.workflow_steps
            }))}
          />
        )}

        {/* Middle Section with Toggle Buttons and Chat */}
        <section aria-labelledby="chat-heading" className="min-w-0 flex flex-col">
          <h2 id="chat-heading" className="sr-only">Chat</h2>
          
          {/* Mode Toggle Buttons - Above Chat Section */}
          <div className="mode-toggle-buttons mb-4">
            <div className="flex gap-3">
              <Button
                onClick={() => handleModeSwitch("group")}
                className={`mode-toggle-btn px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  currentMode === "group"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                Group
              </Button>
              <Button
                onClick={() => handleModeSwitch("workspace")}
                className={`mode-toggle-btn px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  currentMode === "workspace"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                Workspace
              </Button>
            </div>
          </div>

          {/* Chat Section */}
          {currentMode === "group" ? (
            <GroupChat 
              selectedGroup={selectedGroup} 
            />
          ) : (
            <WorkspaceChat 
              selectedWorkspace={selectedWorkspace}
            />
          )}
        </section>

        {/* Right Panel - Tasks/Analysis (Only in Workspace Mode) */}
        {currentMode === "workspace" && (
          <aside className="hidden xl:block w-[400px] flex-shrink-0">
            <div className="rounded-lg border border-border bg-card h-full flex flex-col">
              {/* Panel Header with Toggle Buttons */}
              <div className="p-6 border-b border-border">
                <div className="flex gap-3">
                  <button
                    onClick={() => setRightPanelView("tasks")}
                    className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      rightPanelView === "tasks"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => setRightPanelView("analysis")}
                    className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      rightPanelView === "analysis"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Analysis
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-hidden">
                {rightPanelView === "tasks" ? (
                  <TasksSection selectedWorkspace={selectedWorkspaceWithFlowSteps} />
                ) : (
                  <AnalysisSection selectedWorkspace={selectedWorkspaceWithFlowSteps} />
                )}
              </div>
            </div>
          </aside>
        )}
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Groups - CampusConnect',
            description: 'Collaborate with your peers in study groups and project teams.'
          })
        }}
      />

      <CreateGroupModal open={openCreateGroup} onOpenChange={setOpenCreateGroup} />
      <AddWorkspaceModal 
        open={openCreateWorkspace} 
        onOpenChange={setOpenCreateWorkspace}
        onAddWorkspace={handleAddWorkspace}
        selectedGroupId={selectedGroup || groups[0]?.id} // Pass first group if none selected
      />
    </div>
  );
};

export default Groups;
