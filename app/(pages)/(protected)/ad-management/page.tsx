'use client';

import { ADObjectFormModal } from '@/components/ad/ad-object-form-modal';
import { CreateOUModal } from '@/components/ad/create-ou-modal';
import { DeleteObjectModal } from '@/components/ad/delete-object-modal';
import { DeleteOUModal } from '@/components/ad/delete-ou-modal';
import { ObjectPropertiesModal } from '@/components/ad/ObjectProperties';
import { DataTable, DataTableColumn } from '@/components/data/data-table';
import { FilterForm } from '@/components/forms/filter-form';
import { Header } from '@/components/layout/header';
import { OUTreeSidebar } from '@/components/layout/ou-tree-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAccountStatus } from '@/lib/constants/ldap-attributes';
import { UI_LABELS } from '@/lib/constants/ui-labels';
import { ADComputer, ADGroup, ADOU, ADUser } from '@/lib/types/config';
import { cn } from '@/lib/utils';
import { ChevronRight, Home, Monitor, Plus, Users, Users2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type ObjectType = 'user' | 'computer' | 'group';

export default function ADManagementPage() {
  const [ous, setOus] = useState<ADOU[]>([]);
  const [selectedOuDN, setSelectedOuDN] = useState<string>('ROOT');
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


  const [propertiesItem, setPropertiesItem] = useState<any | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'user' | 'group' | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isOuSheetOpen, setIsOuSheetOpen] = useState(false);

  useEffect(() => {
    loadOUs();
    handleSelectOU('ROOT', { dn: 'ROOT' } as any);
  }, []);

  const breadcrumbs = useMemo(() => {
    if (!selectedOuDN) return [];
    if (selectedOuDN === 'ROOT') return [{ label: 'All Objects', dn: 'ROOT' }];
    const parts = selectedOuDN.match(/(?:\\.|[^,])+/g) || [];
    const result = [];
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
        const error = await res.json();
        toast.error(error.error || 'Failed to load OUs');
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
    setIsOuSheetOpen(false);
    setUsers([]);
    setComputers([]);
    setGroups([]);

    try {
      setIsLoading(true);
      const res = await fetch('/api/ldap/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ouDN,
          objectType,
          scope: ouDN === 'ROOT' ? 'sub' : 'one',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || `Failed to search ${objectType}s`);
        return;
      }

      const data = await res.json();
      switch (objectType) {
        case 'user': setUsers(data); break;
        case 'computer': setComputers(data); break;
        case 'group': setGroups(data); break;
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
      await handleSelectOU('ROOT', {
        dn: 'ROOT',
        ou: 'All Objects',
        objectClass: [],
        cn: 'All Objects',
      });
      return;
    }
    const currentOu = ous.find((o) => o.dn === selectedOuDN);
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ouDN: selectedOuDN,
            objectType: type,
            scope: selectedOuDN === 'ROOT' ? 'sub' : 'one',
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          toast.error(error.error || `Failed to search ${type}s`);
          return;
        }

        const data = await res.json();
        switch (type) {
          case 'user': setUsers(data); break;
          case 'computer': setComputers(data); break;
          case 'group': setGroups(data); break;
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
    setPropertiesItem(item);
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
          ouDN: selectedOuDN,
          objectType: formType,
          dn: selectedItem?.dn,
          action,
          payload: isEditMode ? { attributes: values } : undefined,
          attributes: !isEditMode ? values : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${isEditMode ? 'update' : 'create'} ${formType}`);
      }

      toast.success(`${formType} ${isEditMode ? 'updated' : 'created'} successfully`);
      await refreshCurrentData();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
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
      <main className='container mx-auto py-8 px-4'>
        <h1 className='text-3xl font-bold mb-8'>{UI_LABELS.ad.title}</h1>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Desktop Sidebar */}
          <div className='hidden lg:block lg:col-span-1'>
            <div className='border border-border rounded-lg p-4 bg-card sticky top-24'>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <h2 className='font-semibold'>{UI_LABELS.ad.folders}</h2>
                <button
                  type='button'
                  onClick={() => openCreateOUForm()}
                  className='inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted text-foreground transition-colors hover:bg-muted/80'
                >
                  <Plus className='h-4 w-4' />
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

          <div className='lg:col-span-3'>
            {/* Mobile OU Tree Trigger */}
            <div className='lg:hidden mb-4'>
              <Sheet open={isOuSheetOpen} onOpenChange={setIsOuSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant='outline' className='w-full justify-start gap-2 h-11'>
                    <Plus className='h-4 w-4' />
                    {selectedOuDN ? (
                      <span className='truncate font-medium'>
                        OU: {selectedOuDN === 'ROOT' ? 'All Objects' : selectedOuDN.split(',')[0].replace(/^OU=/i, '')}
                      </span>
                    ) : (
                      'Select an Organizational Unit...'
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side='left' className='w-[300px] p-0'>
                  <SheetHeader className='p-4 border-b'>
                    <SheetTitle>Organizational Units</SheetTitle>
                  </SheetHeader>
                  <div className='p-4'>
                    <OUTreeSidebar
                      ous={ous}
                      selectedOuDN={selectedOuDN}
                      onSelectOU={handleSelectOU}
                      onCreateOU={openCreateOUForm}
                      onDeleteOU={handleDeleteOU}
                      isLoading={isLoading && !selectedOuDN}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {!selectedOuDN ? (
              <div className='flex items-center justify-center h-96 rounded-lg border border-border bg-muted/50'>
                <div className='text-center space-y-2'>
                  <Plus className='h-12 w-12 text-muted-foreground/30 mx-auto' />
                  <p className='text-muted-foreground font-medium'>{UI_LABELS.ad.noSelection}</p>
                  <p className='text-xs text-muted-foreground/60'>Please select a folder from the tree to view its contents.</p>
                </div>
              </div>
            ) : (
              <div className='space-y-6'>
                <nav className='flex items-center gap-1 overflow-x-auto no-scrollbar py-1 text-sm text-muted-foreground bg-muted/30 px-2 rounded-lg border border-border/40 whitespace-nowrap'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 px-2 hover:bg-background'
                    onClick={() => {
                      setSelectedOuDN('');
                      setUsers([]);
                      setComputers([]);
                      setGroups([]);
                    }}
                  >
                    <Home className='h-4 w-4' />
                  </Button>
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const linkedOu = ous.find((o) => o.dn.toLowerCase() === crumb.dn.toLowerCase());
                    return (
                      <div key={crumb.dn} className='flex items-center'>
                        <ChevronRight className='h-4 w-4 mx-1 opacity-30 shrink-0' />
                        <Button
                          variant='ghost'
                          size='sm'
                          disabled={!linkedOu || isLast}
                          className={cn(
                            'h-8 px-2 whitespace-nowrap transition-all',
                            isLast ? 'text-foreground font-semibold cursor-default hover:bg-transparent' : 'text-muted-foreground hover:text-primary hover:bg-background'
                          )}
                          onClick={() => linkedOu && handleSelectOU(linkedOu.dn, linkedOu)}
                        >
                          {crumb.label}
                        </Button>
                      </div>
                    );
                  })}
                </nav>

                <Tabs value={objectType} onValueChange={(value) => handleObjectTypeChange(value as ObjectType)}>
                  <TabsList className='grid w-full grid-cols-3'>
                    <TabsTrigger value='user' className='gap-2'><Users className='h-4 w-4' />Users</TabsTrigger>
                    <TabsTrigger value='computer' className='gap-2'><Monitor className='h-4 w-4' />Computers</TabsTrigger>
                    <TabsTrigger value='group' className='gap-2'><Users2 className='h-4 w-4' />Groups</TabsTrigger>
                  </TabsList>

                  <TabsContent value='user' className='space-y-4'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <FilterForm onSearch={setSearchValue} searchPlaceholder='Search users...' />
                      <Button size='sm' onClick={() => openCreateForm('user')}>{UI_LABELS.ad.addUser}</Button>
                    </div>
                    <DataTable
                      columns={userColumns}
                      data={users}
                      onView={handleView}
                      searchKey='displayName'
                      searchValue={searchValue}
                      isLoading={isLoading}
                    />
                  </TabsContent>

                  <TabsContent value='computer' className='space-y-4'>
                    <FilterForm onSearch={setSearchValue} searchPlaceholder='Search computers...' />
                    <DataTable
                      columns={computerColumns}
                      data={computers}
                      onView={handleView}
                      searchKey='cn'
                      searchValue={searchValue}
                      isLoading={isLoading}
                    />
                  </TabsContent>

                  <TabsContent value='group' className='space-y-4'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <FilterForm onSearch={setSearchValue} searchPlaceholder='Search groups...' />
                      <Button size='sm' onClick={() => openCreateForm('group')}>{UI_LABELS.ad.addGroup}</Button>
                    </div>
                    <DataTable
                      columns={groupColumns}
                      data={groups}
                      onView={handleView}
                      searchKey='cn'
                      searchValue={searchValue}
                      isLoading={isLoading}
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

      <ObjectPropertiesModal
        isOpen={!!propertiesItem}
        onClose={() => setPropertiesItem(null)}
        objectDN={propertiesItem?.dn || ''}
        objectName={propertiesItem?.displayName || propertiesItem?.cn || propertiesItem?.sAMAccountName || ''}
        objectType={
          propertiesItem?.objectClass?.includes('user') && !propertiesItem?.objectClass?.includes('computer') ? 'user' :
          propertiesItem?.objectClass?.includes('computer') ? 'computer' :
          propertiesItem?.objectClass?.includes('group') ? 'group' : 'unknown'
        }
        onSuccess={async (newDN) => {
          if (newDN && propertiesItem) {
            setPropertiesItem({ ...propertiesItem, dn: newDN });
          }
          await refreshCurrentData();
        }}
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
          if (selectedOuDN === ouToDelete?.dn) setSelectedOuDN('');
          await loadOUs();
        }}
      />

    </>
  );
}
