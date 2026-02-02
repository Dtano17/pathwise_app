import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, Table, Calendar as CalendarIcon, Loader2, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgradeRequired?: () => void;
}

type DateRange = '7days' | '30days' | '90days' | 'year' | 'all' | 'custom';
type ExportFormat = 'csv' | 'excel';
type DataType = 'journal' | 'activities' | 'tasks' | 'all';

export default function ExportDialog({ open, onOpenChange, onUpgradeRequired }: ExportDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [dataTypes, setDataTypes] = useState<DataType[]>(['journal']);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  // Check if user has Pro subscription
  const isPro = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'family';

  const handleDataTypeToggle = (type: DataType) => {
    if (type === 'all') {
      if (dataTypes.includes('all')) {
        setDataTypes([]);
      } else {
        setDataTypes(['all']);
      }
    } else {
      if (dataTypes.includes('all')) {
        setDataTypes([type]);
      } else if (dataTypes.includes(type)) {
        setDataTypes(dataTypes.filter(t => t !== type));
      } else {
        setDataTypes([...dataTypes, type]);
      }
    }
  };

  const getDateRangeDescription = () => {
    switch (dateRange) {
      case '7days': return 'Last 7 days';
      case '30days': return 'Last 30 days';
      case '90days': return 'Last 90 days';
      case 'year': return 'Last year';
      case 'all': return 'All time';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${format(customStartDate, 'MMM d, yyyy')} - ${format(customEndDate, 'MMM d, yyyy')}`;
        }
        return 'Select custom range';
      default: return '';
    }
  };

  const handleExport = async () => {
    // Check if user is Pro
    if (!isPro) {
      toast({
        title: "Pro Feature",
        description: "Export is only available for Pro and Family plan subscribers.",
        variant: "destructive"
      });

      if (onUpgradeRequired) {
        onUpgradeRequired();
      }
      return;
    }

    // Validate selections
    if (dataTypes.length === 0) {
      toast({
        title: "No data selected",
        description: "Please select at least one data type to export.",
        variant: "destructive"
      });
      return;
    }

    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
      toast({
        title: "Invalid date range",
        description: "Please select both start and end dates for custom range.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);

      // Calculate date range
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateRange === 'custom') {
        startDate = customStartDate?.toISOString();
        endDate = customEndDate?.toISOString();
      } else if (dateRange !== 'all') {
        const now = new Date();
        endDate = now.toISOString();

        const start = new Date();
        switch (dateRange) {
          case '7days':
            start.setDate(start.getDate() - 7);
            break;
          case '30days':
            start.setDate(start.getDate() - 30);
            break;
          case '90days':
            start.setDate(start.getDate() - 90);
            break;
          case 'year':
            start.setFullYear(start.getFullYear() - 1);
            break;
        }
        startDate = start.toISOString();
      }

      // Make export request
      const endpoint = exportFormat === 'csv' ? '/api/export/csv' : '/api/export/excel';
      const response = await apiRequest('POST', endpoint, {
        dataTypes: dataTypes.includes('all') ? ['journal', 'activities', 'tasks'] : dataTypes,
        startDate,
        endDate
      });

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journalmate-export-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful!",
        description: `Your ${exportFormat.toUpperCase()} file has been downloaded.`,
      });

      onOpenChange(false);

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export Your Data
            {isPro && <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
              <Crown className="w-3 h-3 mr-1" />
              Pro
            </Badge>}
          </DialogTitle>
          <DialogDescription>
            {isPro
              ? "Export your journal entries, activities, and tasks to CSV or Excel."
              : "This feature is available for Pro and Family plan subscribers only."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)} disabled={!isPro}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="year">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{getDateRangeDescription()}</p>
          </div>

          {/* Custom Date Range Picker */}
          {dateRange === 'custom' && isPro && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'MMM d, yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'MMM d, yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)} disabled={!isPro}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CSV (Comma-separated values)
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Types */}
          <div className="space-y-2">
            <Label>What to Export</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all"
                  checked={dataTypes.includes('all')}
                  onCheckedChange={() => handleDataTypeToggle('all')}
                  disabled={!isPro}
                />
                <label htmlFor="all" className="text-sm font-medium cursor-pointer">
                  Everything
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="journal"
                  checked={dataTypes.includes('journal') || dataTypes.includes('all')}
                  onCheckedChange={() => handleDataTypeToggle('journal')}
                  disabled={!isPro || dataTypes.includes('all')}
                />
                <label htmlFor="journal" className="text-sm cursor-pointer">
                  Journal Entries
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activities"
                  checked={dataTypes.includes('activities') || dataTypes.includes('all')}
                  onCheckedChange={() => handleDataTypeToggle('activities')}
                  disabled={!isPro || dataTypes.includes('all')}
                />
                <label htmlFor="activities" className="text-sm cursor-pointer">
                  Activities & Plans
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tasks"
                  checked={dataTypes.includes('tasks') || dataTypes.includes('all')}
                  onCheckedChange={() => handleDataTypeToggle('tasks')}
                  disabled={!isPro || dataTypes.includes('all')}
                />
                <label htmlFor="tasks" className="text-sm cursor-pointer">
                  Tasks & Completions
                </label>
              </div>
            </div>
          </div>

          {/* Pro Upgrade Message */}
          {!isPro && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Unlock Export Feature</p>
                  <p className="text-xs text-muted-foreground">
                    Upgrade to Pro to export your data in CSV or Excel format. Perfect for backups and data analysis.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          {isPro ? (
            <Button onClick={handleExport} disabled={isExporting || dataTypes.length === 0}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          ) : (
            <Button onClick={onUpgradeRequired}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
