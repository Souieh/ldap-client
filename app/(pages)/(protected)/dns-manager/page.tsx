'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { FilterForm } from '@/components/forms/filter-form';
import { DataTable, DataTableColumn } from '@/components/data/data-table';
import { Modal } from '@/components/ui/modal';
import { DynamicForm, FormField } from '@/components/forms/dynamic-form';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { UI_LABELS } from '@/lib/constants/ui-labels';
import {
  DNS_RECORD_TYPES,
  DNS_RECORD_TYPE_LIST,
  DNSRecord,
  DNSRecordType,
} from '@/lib/constants/dns-record-types';
import { useRouter } from 'next/navigation';

type ZoneTreeNode = {
  path: string;
  label: string;
  zone?: string;
  count: number;
  children: ZoneTreeNode[];
};

const buildZoneTree = (zoneNames: string[], records: DNSRecord[]): ZoneTreeNode[] => {
  const forwardZones: ZoneTreeNode[] = [];
  const reverseZones: ZoneTreeNode[] = [];

  zoneNames.forEach((zone) => {
    const count = records.filter((record) => record.zone === zone).length;
    const node: ZoneTreeNode = {
      path: zone,
      label: zone,
      zone,
      count,
      children: [],
    };

    if (zone.includes('in-addr.arpa') || zone.includes('ip6.arpa')) {
      reverseZones.push(node);
    } else {
      forwardZones.push(node);
    }
  });

  // Sort within categories
  forwardZones.sort((a, b) => a.label.localeCompare(b.label));
  reverseZones.sort((a, b) => a.label.localeCompare(b.label));

  const categories: ZoneTreeNode[] = [];

  if (forwardZones.length > 0) {
    categories.push({
      path: 'forward',
      label: 'Forward Lookup Zones',
      count: forwardZones.reduce((sum, z) => sum + z.count, 0),
      children: forwardZones,
    });
  }

  if (reverseZones.length > 0) {
    categories.push({
      path: 'reverse',
      label: 'Reverse Lookup Zones',
      count: reverseZones.reduce((sum, z) => sum + z.count, 0),
      children: reverseZones,
    });
  }

  return categories;
};

export default function DNSManagerPage() {
  const router = useRouter();
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isZoneSheetOpen, setIsZoneSheetOpen] = useState(false);

  const zones = useMemo(() => {
    const unique = Array.from(new Set(records.map((record) => record.zone))).sort();
    return unique;
  }, [records]);

  const forwardZones = useMemo(() => zones.filter(z => !z.includes('in-addr.arpa') && !z.includes('ip6.arpa')), [zones]);
  const reverseZones = useMemo(() => zones.filter(z => z.includes('in-addr.arpa') || z.includes('ip6.arpa')), [zones]);

  const selectedZoneRecords = useMemo(() => {
    if (!selectedFilter) return [];
    if (selectedFilter === 'forward') return records.filter(r => forwardZones.includes(r.zone));
    if (selectedFilter === 'reverse') return records.filter(r => reverseZones.includes(r.zone));
    return records.filter((record) => record.zone === selectedFilter);
  }, [records, selectedFilter, forwardZones, reverseZones]);

  const visibleRecords = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const filteredByZone = selectedZoneRecords;

    if (!normalizedSearch) {
      return filteredByZone;
    }

    return filteredByZone.filter((record) => {
      return [record.name, record.zone, record.type, record.data]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );
    });
  }, [selectedZoneRecords, searchValue]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleRecords.slice(start, start + pageSize);
  }, [visibleRecords, currentPage, pageSize]);

  const zoneTree = useMemo(() => buildZoneTree(zones, records), [zones, records]);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    // Initialize expanded paths
    const initialExpanded = new Set<string>();
    zoneTree.forEach(node => initialExpanded.add(node.path));
    setExpandedPaths(initialExpanded);
  }, [zoneTree]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ldap/dns');
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else if (res.status === 401) {
        toast.error('Session expired or unauthorized');
        router.push('/login');
      } else {
        toast.error('Failed to load DNS records');
      }
    } catch (error) {
      toast.error('Error connecting to server');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewRecord = () => {
    setEditingRecord(null);
    // Default to first zone if a specific zone is selected, else first zone
    const defaultZone = selectedFilter === 'forward' || selectedFilter === 'reverse' ? zones[0] : selectedFilter;
    setFormValues({
      name: '',
      zone: defaultZone || '',
      type: 'A',
      data: '',
      ttl: 3600,
      priority: '',
    });
    setShowModal(true);
  };

  const handleEditRecord = (record: DNSRecord) => {
    setEditingRecord(record);
    setFormValues({
      name: record.name,
      zone: record.zone,
      type: record.type,
      data: record.data,
      ttl: record.ttl || 3600,
      priority: record.priority || '',
    });
    setShowModal(true);
  };

  const handleSaveRecord = async () => {
    try {
      if (!formValues.name || !formValues.zone || !formValues.data) {
        toast.error('Please fill in required fields');
        return;
      }

      const payload = {
        id: editingRecord?.id,
        name: formValues.name,
        zone: formValues.zone,
        type: formValues.type,
        data: formValues.data,
        ttl: parseInt(formValues.ttl),
        priority: formValues.priority ? parseInt(formValues.priority) : undefined,
      };

      let res;
      if (editingRecord) {
        res = await fetch(`/api/ldap/dns`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' ,  },
          
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/ldap/dns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(UI_LABELS.messages.saved);
        setShowModal(false);
        loadRecords();
      } else { 
         
        toast.error(  'Failed to save record');
      }
    } catch (error) {
      toast.error('Error saving record');
      console.error(error);
    }
  };

  const handleDeleteRecord = async (record: DNSRecord) => {
    if (confirm(`Delete ${record.name}.${record.zone} ${record.type} record?`)) {
      const res = await fetch(`/api/ldap/dns/${record.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(UI_LABELS.messages.deleted);
        loadRecords();
      } else {
        toast.error('Failed to delete record');
      }
    }
  };

  const handleSelectFilter = (filter: string) => {
    setSelectedFilter(filter);
    setSearchValue('');
    setCurrentPage(1);
    setIsZoneSheetOpen(false);
  };

  const toggleExpanded = (path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderZoneNodes = (nodes: ZoneTreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const isActive = node.zone ? node.zone === selectedFilter : node.path === selectedFilter;
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedPaths.has(node.path);

      return (
        <div key={node.path}>
          <div
            style={{ paddingLeft: depth * 12 }}
            className="flex items-center"
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpanded(node.path)}
                className="mr-1 p-1 rounded hover:bg-muted"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <button
              type="button"
              onClick={() => handleSelectFilter(node.zone || node.path)}
              className={`flex-1 flex items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className="truncate">
                {node.label}
              </span>
              <span className="text-muted-foreground text-xs">
                ({node.count})
                {hasChildren && ` ${node.children.length}`}
              </span>
            </button>
          </div>
          {hasChildren && isExpanded ? renderZoneNodes(node.children, depth + 1) : null}
        </div>
      );
    });
  };

  const getRecordTypeFields = (recordType: DNSRecordType): FormField[] => {
    const baseFields: FormField[] = [
      {
        name: 'zone',
        label: 'Zone',
        type: 'text',
        required: true,
        placeholder: 'example.com',
      },
      {
        name: 'name',
        label: 'Record Name',
        type: 'text',
        required: true,
        placeholder: '@ for root, or subdomain',
      },
      {
        name: 'type',
        label: 'Record Type',
        type: 'select',
        options: DNS_RECORD_TYPE_LIST.map((type) => ({
          value: type,
          label: DNS_RECORD_TYPES[type].description,
        })),
      },
      {
        name: 'data',
        label: 'Record Data',
        type: 'text',
        required: true,
        placeholder: DNS_RECORD_TYPES[recordType]?.example || 'Enter record data',
      },
      {
        name: 'ttl',
        label: 'TTL (seconds)',
        type: 'number',
        defaultValue: 3600,
      },
    ];

    // Add priority field for MX and SRV records
    if (recordType === 'MX' || recordType === 'SRV') {
      baseFields.push({
        name: 'priority',
        label: 'Priority',
        type: 'number',
        placeholder: 'Lower value = higher priority',
      });
    }

    return baseFields;
  };

  const formFields = getRecordTypeFields(
    (formValues.type || 'A') as DNSRecordType
  );

  const columns: DataTableColumn<DNSRecord>[] = [
    { id: 'name', label: 'Name', key: 'name', sortable: true },
    { id: 'zone', label: 'Zone', key: 'zone', sortable: true },
    {
      id: 'type',
      label: 'Type',
      key: 'type',
      render: (value) => (
        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-medium text-xs">
          {value}
        </span>
      ),
    },
    { id: 'data', label: 'Data', key: 'data' },
    {
      id: 'ttl',
      label: 'TTL',
      key: 'ttl',
      render: (value) => (value ? `${value}s` : '—'),
    },
    {
      id: 'priority',
      label: 'Priority',
      key: 'priority',
      render: (value) => value || '—',
    },
  ];

  return (
    <>
      <Header />
      <main className="container mx-auto py-8 px-4">
        <div className="  mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{UI_LABELS.dns.title}</h1>
              <p className="text-muted-foreground mt-2">
                Manage DNS records for your zones
              </p>
            </div>
            <Button onClick={handleNewRecord} className="gap-2">
              <Plus className="h-4 w-4" />
              {UI_LABELS.dns.addRecord}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Desktop Zone Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="rounded-lg border border-border bg-card p-4 sticky top-24">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Zones</h2>
                    <p className="text-sm text-muted-foreground">
                      {zones.length} zone{zones.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {visibleRecords.length}
                  </span>
                </div>

                {zones.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No DNS zones found.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {renderZoneNodes(zoneTree)}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 lg:col-span-3">
              {/* Mobile Zone Trigger */}
              <div className='lg:hidden'>
                <Sheet open={isZoneSheetOpen} onOpenChange={setIsZoneSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant='outline' className='w-full justify-start gap-2 h-11'>
                      <Plus className='h-4 w-4' />
                      {selectedFilter ? (
                        <span className='truncate font-medium'>
                          Zone: {selectedFilter === 'forward' ? 'Forward' : selectedFilter === 'reverse' ? 'Reverse' : selectedFilter}
                        </span>
                      ) : (
                        'Select a DNS Zone...'
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side='left' className='w-[300px] p-0'>
                    <SheetHeader className='p-4 border-b'>
                      <SheetTitle>DNS Zones</SheetTitle>
                    </SheetHeader>
                    <div className='p-4'>
                      {zones.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground">No DNS zones found.</div>
                      ) : (
                        <div className="space-y-1">
                          {renderZoneNodes(zoneTree)}
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {selectedFilter && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>Zones</span>
                  <ChevronRight className="h-4 w-4 mx-2" />
                  <span>
                    {selectedFilter === 'forward'
                      ? 'Forward Lookup Zones'
                      : selectedFilter === 'reverse'
                      ? 'Reverse Lookup Zones'
                      : selectedFilter}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <FilterForm
                  onSearch={setSearchValue}
                  searchPlaceholder={`Search records in ${selectedFilter === 'forward' ? 'forward zones' : selectedFilter === 'reverse' ? 'reverse zones' : selectedFilter || 'selected zone'}...`}
                />
                <div className="text-sm text-muted-foreground">
                  {selectedFilter === 'forward'
                    ? `Showing ${visibleRecords.length} record${visibleRecords.length === 1 ? '' : 's'} in forward zones`
                    : selectedFilter === 'reverse'
                    ? `Showing ${visibleRecords.length} record${visibleRecords.length === 1 ? '' : 's'} in reverse zones`
                    : selectedFilter
                    ? `Showing ${visibleRecords.length} record${visibleRecords.length === 1 ? '' : 's'} for ${selectedFilter}`
                    : 'Select a zone or category'}
                </div>
              </div>

              {selectedFilter ? (
                <>
                  <DataTable
                    columns={columns}
                    data={paginatedRecords}
                    onEdit={handleEditRecord}
                    onDelete={handleDeleteRecord}
                    searchKey="name"
                    searchValue={searchValue}
                    isLoading={isLoading}
                    emptyMessage={`No DNS records found for ${selectedFilter === 'forward' ? 'forward zones' : selectedFilter === 'reverse' ? 'reverse zones' : selectedFilter}`}
                  />

                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(visibleRecords.length / pageSize)}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    totalItems={visibleRecords.length}
                    showSizeSelector
                  />
                </>
              ) : (
                <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-muted/50">
                  <p className="text-muted-foreground">Select a zone or category from the sidebar to view records.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Record Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRecord ? 'Edit DNS Record' : 'New DNS Record'}
        size="lg"
        actions={[
          {
            label: UI_LABELS.actions.save,
            onClick: handleSaveRecord,
            disabled:
              !formValues.name ||
              !formValues.zone ||
              !formValues.data,
          },
        ]}
      >
        <DynamicForm
          fields={formFields}
          values={formValues}
          onChange={(field, value) =>
            setFormValues((prev) => ({ ...prev, [field]: value }))
          }
        />
      </Modal>
    </>
  );
}
