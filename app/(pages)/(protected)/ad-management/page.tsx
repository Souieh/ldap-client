'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Monitor, Users2, Plus, ChevronRight, Home, UserCheck, UserX } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { OUTreeSidebar } from '@/components/layout/ou-tree-sidebar';
import { FilterForm } from '@/components/forms/filter-form';
import { DataTable, DataTableColumn } from '@/components/data/data-table';
import { CreateOUModal } from '@/components/ad/create-ou-modal';
import { DeleteOUModal } from '@/components/ad/delete-ou-modal';
import { ManageGroupsModal } from '@/components/ad/manage-groups-modal';
import { GroupMembersModal } from '@/components/ad/group-members-modal';
import { MoveObjectModal } from '@/components/ad/move-object-modal';
import { DeleteObjectModal } from '@/components/ad/delete-object-modal';
import { UpdatePasswordModal } from '@/components/ad/update-password-modal';
import { ToggleStatusModal } from '@/components/ad/toggle-status-modal';
import { ADObjectFormModal } from '@/components/ad/ad-object-form-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UI_LABELS } from '@/lib/constants/ui-labels';
import { LDAP_ATTRIBUTES, getAccountStatus } from '@/lib/constants/ldap-attributes';
import { ADOU, ADUser, ADComputer, ADGroup } from '@/lib/types/config';
import { isAccountEnabled } from '@/lib/constants/ldap-attributes';

type ObjectType = 'user' | 'computer' | 'group';

export default function ADManagementPage() { 
  const router = useRouter();
  const [ous, setOus] = useState<ADOU[]>([]);
  const [selectedOuDN, setSelectedOuDN] = useState<string>('');
  const [objectType, setObjectType] = useState<ObjectType>('user');

  const [users, setUsers] = useState<ADUser[]>([]);
  const [computers, setComputers] = useState<ADComputer[]>([]);
  const [groups, setGroups] = useState<ADGroup[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isCreateOuOpen, setIsCreateOuOpen] = useState(false);
  const [createOuParentDN, setCreateOuParentDN] = useState('');
  const [ouToDelete, setOuToDelete] = useState<{ dn: string; name: string } | null>(null);
  const [objectToDelete, setObjectToDelete] = useState<{ dn: string; name: string; type: string } | null>(null);
  const [objectToMove, setObjectToMove] = useState<{ dn: string; name: string } | null>(null);
  const [objectForPassword, setObjectForPassword] = useState<{ dn: string; name: string } | null>(null);
  const [objectForStatus, setObjectForStatus] = useState<{ dn: string; name: string; enabled: boolean; type: string } | null>(null);
  const [objectForGroups, setObjectForGroups] = useState<any | null>(null);
  const [groupForMembers, setGroupForMembers] = useState<{ dn: string; name: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'user' | 'group' | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    loadOUs();
  }, []);
 
  const breadcrumbs = useMemo(() => {
    if (!selectedOuDN) return [];
    if (selectedOuDN === 'ROOT') return [{ label: 'All Objects', dn: 'ROOT' }];
    // Split DN by commas not preceded by backslash
    const parts = selectedOuDN.match(/(?:\\.|[^,])+/g) || [];
    const result = [];
    // Iterate from root (end of array) to leaf (start of array)
    for (let i = parts.length - 1; i >= 0; i--) {
      const dn = parts.slice(i).join(',');
      const label = parts[i].split('=')[1] || parts[i];
      result.push({ label, dn });
    }
    return result;
  }, [selectedOuDN]);

  const loadOUs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ldap/ous');

      if (!res.ok) {
        try {
          const error = await res.json();
          toast.error(error.error || 'Failed to load OUs');
        } catch {
          toast.error('Failed to load OUs');
        }
        return;
      }

      const data = await res.json();
      setOus(data);
    } catch (error) {
      toast.error('Error loading OUs');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOU = async (ouDN: string, ou: ADOU) => {
    setSelectedOuDN(ouDN);
    setSearchValue('');
    setUsers([]);
    setComputers([]);
    setGroups([]);

    try {
      setIsLoading(true);
      const res = await fetch('/api/ldap/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ouDN,
          objectType,
          scope: ouDN === 'ROOT' ? 'sub' : 'one',
        }),
      });

      if (!res.ok) {
        try {
          const error = await res.json();
          toast.error(error.error || `Failed to search ${objectType}s`);
        } catch {
          toast.error(`Failed to search ${objectType}s`);
        }
        return;
      }

      const data = await res.json();

      switch (objectType) {
        case 'user':
          setUsers(data);
          break;
        case 'computer':
          setComputers(data);
          break;
        case 'group':
          setGroups(data);
          break;
      }
    } catch (error) {
      toast.error(`Error loading ${objectType}s`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateOUForm = (parentOuDN?: string) => {
    setCreateOuParentDN(parentOuDN || selectedOuDN || '');
    setIsCreateOuOpen(true);
  };

  const handleDeleteOU = (ouDN: string, ouName: string) => {
    setOuToDelete({ dn: ouDN, name: ouName });
  };

  const refreshCurrentData = async () => {
    if (selectedOuDN === 'ROOT') {
      await handleSelectOU('ROOT', { dn: 'ROOT', ou: 'All Objects', objectClass: [], cn: 'All Objects' });
      return;
    }
    const currentOu = ous.find(o => o.dn === selectedOuDN);
    if (currentOu && selectedOuDN) {
      await handleSelectOU(selectedOuDN, currentOu);
    }
  };

  const handleObjectTypeChange = async (type: ObjectType) => {
    setObjectType(type);
    setSearchValue('');

    if (selectedOuDN) {
      try {
        setIsLoading(true);
        const res = await fetch('/api/ldap/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ouDN: selectedOuDN,
            objectType: type,
            scope: selectedOuDN === 'ROOT' ? 'sub' : 'one',
          }),
        });

        if (!res.ok) {
          try {
            const error = await res.json();
            toast.error(error.error || `Failed to search ${type}s`);
          } catch {
            toast.error(`Failed to search ${type}s`);
          }
          return;
        }

        const data = await res.json();

        switch (type) {
          case 'user':
            setUsers(data);
            break;
          case 'computer':
            setComputers(data);
            break;
          case 'group':
            setGroups(data);
            break;
        }
      } catch (error) {
        toast.error(`Error loading ${type}s`);
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleView = (item: any) => {
    const encodedDN = encodeURIComponent(item.dn);
    router.push(`/ad-management/details?dn=${encodedDN}`);
  };

  const openCreateForm = (type: 'user' | 'group', item?: any) => {
    setFormType(type);
    setSelectedItem(item || null);
    setIsEditMode(!!item);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: Record<string, any>) => {
    if (!formType) return;
    const method = isEditMode ? 'PATCH' : 'POST';
    const action = isEditMode ? 'update' : undefined;

    try {
      const password = sessionStorage.getItem('ldap-password') || '';
      const res = await fetch('/api/ldap/objects', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-ldap-password': password,
        },
        body: JSON.stringify({
          ouDN: selectedOuDN, // The OU where the object will be created
          objectType: formType,
          dn: selectedItem?.dn,
          action,
          payload: isEditMode ? { attributes: values } : undefined,
          attributes: !isEditMode ? values : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to create ${formType}`);
      }

      toast.success(`${formType} ${isEditMode ? 'updated' : 'created'} successfully`);
      // After successful creation, refresh the data for the current OU
      await refreshCurrentData();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
    // Close modal is handled by ADObjectFormModal's onSubmit prop
  };

  const handleDelete = (item: any) => {
    setObjectToDelete({
      dn: item.dn,
      name: item.displayName || item.cn || item.sAMAccountName,
      type: objectType,
    });
  };

  const handleMove = (item: any) => {
    setObjectToMove({ dn: item.dn, name: item.displayName || item.cn });
  };

  const handlePasswordReset = (item: any) => {
    setObjectForPassword({ dn: item.dn, name: item.displayName || item.cn || item.sAMAccountName });
  };

  const handleManageGroups = (item: any) => {
    setObjectForGroups(item);
  };

  const handleViewMembers = (item: any) => {
    setGroupForMembers({
      dn: item.dn,
      name: item.displayName || item.cn || item.sAMAccountName,
    });
  };

  const handleToggleStatus = (item: any) => {
    const enabled = isAccountEnabled(item.userAccountControl);
    return {
      label: enabled ? 'Disable' : 'Enable',
      icon: enabled ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />,
      onClick: (item: any) => {
        setObjectForStatus({
          dn: item.dn,
          name: item.displayName || item.cn || item.sAMAccountName,
          enabled: enabled,
          type: item.objectClass.includes('computer') ? 'Computer' : 'User',
        });
      }
    };
  };

  const userColumns: DataTableColumn<ADUser>[] = [
    { id: 'displayName', label: 'Name', key: 'displayName', sortable: true },
    { id: 'sAMAccountName', label: 'Username', key: 'sAMAccountName', sortable: true },
    { id: 'mail', label: 'Email', key: 'mail' },
    {
      id: 'status',
      label: 'Status',
      key: 'userAccountControl',
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            getAccountStatus(value) === 'Enabled'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {getAccountStatus(value)}
        </span>
      ),
    },
    { id: 'whenChanged', label: 'Modified', key: 'whenChanged' },
  ];

  const computerColumns: DataTableColumn<ADComputer>[] = [
    { id: 'cn', label: 'Name', key: 'cn', sortable: true },
    { id: 'sAMAccountName', label: 'Account', key: 'sAMAccountName' },
    { id: 'dNSHostName', label: 'DNS Name', key: 'dNSHostName' },
    { id: 'operatingSystem', label: 'OS', key: 'operatingSystem' },
    { id: 'whenChanged', label: 'Modified', key: 'whenChanged' },
  ];

  const groupColumns: DataTableColumn<ADGroup>[] = [
    { id: 'cn', label: 'Name', key: 'cn', sortable: true },
    { id: 'sAMAccountName', label: 'Account', key: 'sAMAccountName' },
    { id: 'mail', label: 'Email', key: 'mail' },
    {
      id: 'memberCount',
      label: 'Members',
      key: 'member',
      render: (value) => (Array.isArray(value) ? value.length : 0),
    },
    { id: 'whenChanged', label: 'Modified', key: 'whenChanged' },
  ];

  return (
    <>
      <Header />
      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">{UI_LABELS.ad.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with OU Tree */}
          <div className="lg:col-span-1">
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold">{UI_LABELS.ad.folders}</h2>
                <button
                  type="button"
                  onClick={() => openCreateOUForm()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted text-foreground transition-colors hover:bg-muted/80"
                  aria-label="Create Organizational Unit"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <OUTreeSidebar
                ous={ous}
                selectedOuDN={selectedOuDN}
                onSelectOU={handleSelectOU}
                onCreateOU={openCreateOUForm}
                onDeleteOU={handleDeleteOU}
                isLoading={isLoading && !selectedOuDN}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!selectedOuDN ? (
              <div className="flex items-center justify-center h-96 rounded-lg border border-border bg-muted/50">
                <p className="text-muted-foreground">{UI_LABELS.ad.noSelection}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Breadcrumb Path Navigation */}
                <nav className="flex items-center flex-wrap gap-y-1 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/40">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 hover:bg-background"
                    onClick={() => {
                      setSelectedOuDN('');
                      setUsers([]);
                      setComputers([]);
                      setGroups([]);
                    }}
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const linkedOu = ous.find(o => o.dn.toLowerCase() === crumb.dn.toLowerCase());

                    return (
                      <div key={crumb.dn} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-1 opacity-30 shrink-0" />
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!linkedOu || isLast}
                          className={cn(
                            "h-8 px-2 whitespace-nowrap transition-all",
                            isLast ? "text-foreground font-semibold cursor-default hover:bg-transparent" : "text-muted-foreground hover:text-primary hover:bg-background",
                            !linkedOu && !isLast && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => linkedOu && handleSelectOU(linkedOu.dn, linkedOu)}
                        >
                          {crumb.label}
                        </Button>
                      </div>
                    );
                  })}
                </nav>

                {/* Object Type Tabs */}
                <Tabs
                  value={objectType}
                  onValueChange={(value) =>
                    handleObjectTypeChange(value as ObjectType)
                  }
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="user" className="gap-2">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {UI_LABELS.ad.users}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="computer" className="gap-2">
                      <Monitor className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {UI_LABELS.ad.computers}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="group" className="gap-2">
                      <Users2 className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {UI_LABELS.ad.groups}
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  {/* User Tab */}
                  <TabsContent value="user" className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <FilterForm
                        onSearch={setSearchValue}
                        searchPlaceholder={`Search ${UI_LABELS.ad.users.toLowerCase()}...`}
                      />
                      <Button size="sm" onClick={() => openCreateForm('user')}>
                        {UI_LABELS.ad.addUser}
                      </Button>
                    </div>
                    <DataTable
                      columns={userColumns}
                      data={users}
                      onView={handleView}
                      onEdit={(item) => openCreateForm('user', item)}
                      onMove={handleMove}
                      onPassword={handlePasswordReset}
                      onGroups={handleManageGroups}
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDelete}
                      searchKey="displayName"
                      searchValue={searchValue}
                      isLoading={isLoading}
                      emptyMessage={`No ${UI_LABELS.ad.users.toLowerCase()} found`}
                    />
                  </TabsContent>

                  {/* Computer Tab */}
                  <TabsContent value="computer" className="space-y-4">
                    <FilterForm
                      onSearch={setSearchValue}
                      searchPlaceholder={`Search ${UI_LABELS.ad.computers.toLowerCase()}...`}
                    />
                    <DataTable
                      columns={computerColumns}
                      data={computers}
                      onView={handleView}
                      onMove={handleMove}
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDelete}
                      searchKey="cn"
                      searchValue={searchValue}
                      isLoading={isLoading}
                      emptyMessage={`No ${UI_LABELS.ad.computers.toLowerCase()} found`}
                    />
                  </TabsContent>

                  {/* Group Tab */}
                  <TabsContent value="group" className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <FilterForm
                        onSearch={setSearchValue}
                        searchPlaceholder={`Search ${UI_LABELS.ad.groups.toLowerCase()}...`}
                      />
                      <Button size="sm" onClick={() => openCreateForm('group')}>
                        {UI_LABELS.ad.addGroup}
                      </Button>
                    </div>
                    <DataTable
                      columns={groupColumns}
                      data={groups}
                      onView={handleView}
                      onEdit={(item) => openCreateForm('group', item)}
                      onMove={handleMove}
                      onGroups={handleManageGroups}
                      onMembers={handleViewMembers}
                      onDelete={handleDelete}
                      searchKey="cn"
                      searchValue={searchValue}
                      isLoading={isLoading}
                      emptyMessage={`No ${UI_LABELS.ad.groups.toLowerCase()} found`}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </main>

      <ADObjectFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        type={formType}
        onSubmit={handleFormSubmit}
        initialValues={isEditMode ? selectedItem : undefined}
      />

      <CreateOUModal
        isOpen={isCreateOuOpen}
        onClose={() => setIsCreateOuOpen(false)}
        ous={ous}
        parentOuDN={createOuParentDN}
        onSuccess={loadOUs}
      />

      <DeleteOUModal
        isOpen={!!ouToDelete}
        onClose={() => setOuToDelete(null)}
        ouDN={ouToDelete?.dn || ''}
        ouName={ouToDelete?.name || ''}
        onSuccess={async () => {
          if (selectedOuDN === ouToDelete?.dn) {
            setSelectedOuDN('');
          }
          await loadOUs();
        }}
      />

      <DeleteObjectModal
        isOpen={!!objectToDelete}
        onClose={() => setObjectToDelete(null)}
        dn={objectToDelete?.dn || ''}
        name={objectToDelete?.name || ''}
        type={objectToDelete?.type || ''}
        onSuccess={refreshCurrentData}
      />

      <UpdatePasswordModal
        isOpen={!!objectForPassword}
        onClose={() => setObjectForPassword(null)}
        dn={objectForPassword?.dn || ''}
        name={objectForPassword?.name || ''}
        onSuccess={refreshCurrentData}
      />

      <MoveObjectModal
        isOpen={!!objectToMove}
        onClose={() => setObjectToMove(null)}
        dn={objectToMove?.dn || ''}
        name={objectToMove?.name || ''}
        ous={ous}
        onSuccess={refreshCurrentData}
      />

      <ManageGroupsModal
        isOpen={!!objectForGroups}
        onClose={() => setObjectForGroups(null)}
        objectDN={objectForGroups?.dn || ''}
        objectName={
          objectForGroups?.displayName || objectForGroups?.cn || objectForGroups?.sAMAccountName || ''
        }
        memberOf={objectForGroups?.memberOf}
        onSuccess={refreshCurrentData}
      />

      <ToggleStatusModal
        isOpen={!!objectForStatus}
        onClose={() => setObjectForStatus(null)}
        dn={objectForStatus?.dn || ''}
        name={objectForStatus?.name || ''}
        enabled={objectForStatus?.enabled || false}
        type={objectForStatus?.type || ''}
        onSuccess={refreshCurrentData}
      />

      <GroupMembersModal
        isOpen={!!groupForMembers}
        onClose={() => setGroupForMembers(null)}
        groupDN={groupForMembers?.dn || ''}
        groupName={groupForMembers?.name || ''}
      />
    </>
  );
}
