

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Armchair, Trash2, Edit, MoreVertical, X, Check, ShoppingCart, BookMarked } from 'lucide-react';
import type { Table, CartItem, TableStatus } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


type TablesProps = {
  tables: Table[];
  onDataChange: () => void;
  isLoading: boolean;
};

export default function Tables({ tables, onDataChange, isLoading }: TablesProps) {
  const { currentUser, activeStore } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const { toast } = useToast();
  const router = useRouter();

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isClearTableDialogOpen, setIsClearTableDialogOpen] = React.useState(false);
  
  const [selectedTable, setSelectedTable] = React.useState<Table | null>(null);
  const [tableName, setTableName] = React.useState('');
  const [tableCapacity, setTableCapacity] = React.useState(2);
  
  const handleAddOrEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore || !tableName || tableCapacity <= 0) {
      toast({ variant: 'destructive', title: 'Data tidak valid' });
      return;
    }

    const tableCollectionName = `tables_${activeStore.id}`;
    
    try {
      if (isEditDialogOpen && selectedTable) {
        // Edit mode
        const tableRef = doc(db, tableCollectionName, selectedTable.id);
        await updateDoc(tableRef, { name: tableName, capacity: tableCapacity });
        toast({ title: 'Meja diperbarui!' });
      } else {
        // Add mode
        await addDoc(collection(db, tableCollectionName), {
          name: tableName,
          capacity: tableCapacity,
          status: 'Tersedia',
        });
        toast({ title: 'Meja baru ditambahkan!' });
      }
      onDataChange();
      closeDialogs();
    } catch (error) {
      console.error("Error saving table:", error);
      toast({ variant: 'destructive', title: 'Gagal menyimpan meja' });
    }
  };
  
  const handleDeleteTable = async () => {
    if (!activeStore || !selectedTable) return;
    const tableCollectionName = `tables_${activeStore.id}`;
    const tableRef = doc(db, tableCollectionName, selectedTable.id);
    
    try {
      await deleteDoc(tableRef);
      toast({ title: `Meja ${selectedTable.name} dihapus` });
      onDataChange();
      closeDialogs();
    } catch (error) {
       console.error("Error deleting table:", error);
       toast({ variant: 'destructive', title: 'Gagal menghapus meja' });
    }
  }

  const handleClearTable = async () => {
    if (!activeStore || !selectedTable || !currentUser) return;
     const tableCollectionName = `tables_${activeStore.id}`;
     const tableRef = doc(db, tableCollectionName, selectedTable.id);
     
     const transactionCollectionName = `transactions_${activeStore.id}`;
     
     try {
        await runTransaction(db, async (transaction) => {
            const tableDoc = await transaction.get(tableRef);
            if (!tableDoc.exists() || !tableDoc.data().currentOrder) {
                throw new Error("Meja ini tidak memiliki pesanan aktif.");
            }
            
            const order = tableDoc.data().currentOrder as Table['currentOrder'];

            // Create a transaction record
            const newTransactionRef = doc(collection(db, transactionCollectionName));
            const finalTransactionData = {
                id: newTransactionRef.id,
                storeId: activeStore.id,
                customerId: 'N/A',
                customerName: `Meja ${selectedTable.name}`,
                staffId: currentUser?.id || 'unknown',
                createdAt: new Date().toISOString(),
                subtotal: order!.totalAmount,
                discountAmount: 0,
                totalAmount: order!.totalAmount,
                paymentMethod: 'Cash', // Default payment method for clearing table
                pointsEarned: 0,
                pointsRedeemed: 0,
                items: order!.items,
                tableId: selectedTable.id,
                status: 'Selesai',
            };
            transaction.set(newTransactionRef, finalTransactionData);
            
            // Clear the table
            transaction.update(tableRef, {
                status: 'Tersedia',
                currentOrder: null
            });
        });

        toast({ title: `Meja ${selectedTable.name} telah diselesaikan dan dikosongkan.` });
        onDataChange();
        closeDialogs();

     } catch (error) {
        console.error("Error clearing table:", error);
        toast({ variant: 'destructive', title: 'Gagal menyelesaikan meja', description: (error as Error).message });
     }
  }
  
  const openEditDialog = (table: Table) => {
    setSelectedTable(table);
    setTableName(table.name);
    setTableCapacity(table.capacity);
    setIsEditDialogOpen(true);
  }
  
  const openDeleteDialog = (table: Table) => {
    setSelectedTable(table);
    setIsDeleteDialogOpen(true);
  }
  
  const openClearDialog = (table: Table) => {
    setSelectedTable(table);
    setIsClearTableDialogOpen(true);
  }

  const handleChangeStatus = async (table: Table, newStatus: TableStatus) => {
    if (!activeStore) return;
    const tableCollectionName = `tables_${activeStore.id}`;
    const tableRef = doc(db, tableCollectionName, table.id);
    try {
        await updateDoc(tableRef, { status: newStatus });
        toast({ title: `Status meja ${table.name} diubah menjadi ${newStatus}` });
        onDataChange();
    } catch(error) {
        console.error("Error changing status:", error);
        toast({ variant: 'destructive', title: 'Gagal mengubah status' });
    }
  }
  
  const closeDialogs = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setIsClearTableDialogOpen(false);
    setSelectedTable(null);
    setTableName('');
    setTableCapacity(2);
  }
  
  const handleTableClick = (table: Table) => {
    if (table.status === 'Tersedia' || table.status === 'Dipesan') {
      const params = new URLSearchParams();
      params.set('view', 'pos');
      params.set('tableId', table.id);
      params.set('tableName', table.name);
      router.push(`/dashboard?${params.toString()}`);
    } else { // Terisi
        openClearDialog(table);
    }
  }

  const getStatusColor = (status: TableStatus) => {
    switch(status) {
        case 'Tersedia':
            return 'bg-green-100/10 border-green-500/30 hover:border-green-500';
        case 'Terisi':
            return 'bg-amber-100/10 border-amber-500/30 hover:border-amber-500';
        case 'Dipesan':
            return 'bg-blue-100/10 border-blue-500/30 hover:border-blue-500';
        default:
            return '';
    }
  }

  const getBadgeStyle = (status: TableStatus) => {
      switch(status) {
        case 'Tersedia':
            return 'bg-green-500/20 text-green-700 border-green-500/50';
        case 'Terisi':
            return 'bg-amber-500/20 text-amber-800 border-amber-500/50';
        case 'Dipesan':
            return 'bg-blue-500/20 text-blue-800 border-blue-500/50';
        default:
            return '';
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-headline tracking-wider">
                Manajemen Meja
              </CardTitle>
              <CardDescription>
                Lihat status meja, buat pesanan, dan kelola tata letak meja Anda.
              </CardDescription>
            </div>
            {isAdmin && (
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                  if (open) setIsAddDialogOpen(true);
                  else closeDialogs();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Tambah Meja
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleAddOrEditTable}>
                    <DialogHeader>
                      <DialogTitle className="font-headline tracking-wider">Tambah Meja Baru</DialogTitle>
                      <DialogDescription>
                        Masukkan nama dan kapasitas untuk meja baru.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nama</Label>
                        <Input id="name" value={tableName} onChange={(e) => setTableName(e.target.value)} className="col-span-3" placeholder="e.g., Meja 1"/>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="capacity" className="text-right">Kapasitas</Label>
                        <Input id="capacity" type="number" value={tableCapacity} onChange={(e) => setTableCapacity(Number(e.target.value))} className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Simpan</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-32 rounded-lg" />
                ))
            ) : tables.map(table => (
              <Card 
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={cn(
                    "flex flex-col justify-between p-4 cursor-pointer transition-all hover:shadow-lg",
                    getStatusColor(table.status)
                )}
              >
                <CardHeader className="p-0 flex-row items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Armchair className="h-5 w-5" />
                    <CardTitle className="text-lg">{table.name}</CardTitle>
                  </div>
                   {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Aksi Cepat</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleChangeStatus(table, 'Dipesan')} disabled={table.status === 'Dipesan' || table.status === 'Terisi'}>
                          <BookMarked className="mr-2 h-4 w-4" /> Tandai Dipesan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus(table, 'Tersedia')} disabled={table.status === 'Tersedia'}>
                          <Check className="mr-2 h-4 w-4" /> Tandai Tersedia
                        </DropdownMenuItem>
                         <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(table)}>
                          <Edit className="mr-2 h-4 w-4" /> Ubah Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(table)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Hapus Meja
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>
                <CardContent className="p-0 mt-2">
                    <Badge variant={'secondary'} className={cn('font-semibold', getBadgeStyle(table.status))}>{table.status}</Badge>
                </CardContent>
                <CardFooter className="p-0 mt-2 text-xs text-muted-foreground">
                    {table.status === 'Terisi' && table.currentOrder ? (
                         <span>Rp {table.currentOrder.totalAmount.toLocaleString('id-ID')}</span>
                    ) : (
                         <span>Kapasitas: {table.capacity} orang</span>
                    )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) closeDialogs() }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddOrEditTable}>
            <DialogHeader>
              <DialogTitle className="font-headline tracking-wider">Ubah Meja</DialogTitle>
              <DialogDescription>
                Ubah nama atau kapasitas untuk meja {selectedTable?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name-edit" className="text-right">Nama</Label>
                <Input id="name-edit" value={tableName} onChange={(e) => setTableName(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="capacity-edit" className="text-right">Kapasitas</Label>
                <Input id="capacity-edit" type="number" value={tableCapacity} onChange={(e) => setTableCapacity(Number(e.target.value))} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) closeDialogs() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus meja 
              <span className="font-bold"> {selectedTable?.name}</span> secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialogs}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Clear Table Confirmation */}
       <AlertDialog open={isClearTableDialogOpen} onOpenChange={(open) => { if (!open) closeDialogs() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selesaikan & Kosongkan Meja?</AlertDialogTitle>
            <AlertDialogDescription>
                Tindakan ini akan menyelesaikan pesanan untuk meja <span className="font-bold">{selectedTable?.name}</span>
                sebesar <span className="font-bold">Rp {selectedTable?.currentOrder?.totalAmount.toLocaleString('id-ID')}</span> dan mengosongkan meja.
                Sebuah catatan transaksi akan dibuat. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialogs}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearTable}>
              <Check className="mr-2 h-4 w-4" /> Ya, Selesaikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
