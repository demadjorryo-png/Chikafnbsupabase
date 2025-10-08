
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Product, ProductCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListFilter, MoreHorizontal, PlusCircle, Search, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AddProductForm } from '@/components/dashboard/add-product-form';
import { EditProductForm } from '@/components/dashboard/edit-product-form';
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
import { supabase } from '@/lib/supabase'; // Mengganti Firebase dengan Supabase
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/contexts/dashboard-context';

function StockInput({ product, onStockChange, isUpdating }: { product: Product; onStockChange: (productId: string, newStock: number) => void; isUpdating: boolean; }) {
  const [currentStock, setCurrentStock] = React.useState(product.stock);

  React.useEffect(() => {
    // Sync with external changes
    setCurrentStock(product.stock);
  }, [product.stock]);

  const handleBlur = () => {
    if (currentStock !== product.stock) {
      onStockChange(product.id, currentStock);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (currentStock !== product.stock) {
        onStockChange(product.id, currentStock);
      }
      (e.target as HTMLInputElement).blur();
    }
  };

  const getStockColorClass = (stock: number): string => {
    if (stock < 3) return 'text-destructive';
    if (stock < 10) return 'text-yellow-500';
    if (stock < 20) return '';
    return 'text-green-600';
  };

  return (
    <div className="flex items-center justify-center">
      {isUpdating ?
        <Loader2 className="h-4 w-4 animate-spin mx-auto" /> :
        <Input
          type="number"
          value={currentStock}
          onBlur={handleBlur}
          onChange={(e) => setCurrentStock(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          className={cn('w-20 h-7 text-center', getStockColorClass(currentStock))}
        />
      }
    </div>
  );
}


export default function Products() {
  const { currentUser, activeStore } = useAuth();
  const { dashboardData, isLoading, refreshData } = useDashboard();
  const products = dashboardData?.products || [];

  const userRole = currentUser?.role || 'cashier';
  const isAdmin = userRole === 'admin';

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [updatingStock, setUpdatingStock] = React.useState<string | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<Set<ProductCategory>>(new Set());

  const currentStoreId = activeStore?.id;


  const handleStockChange = async (productId: string, newStock: number) => {
    if (!currentStoreId || newStock < 0) return;

    setUpdatingStock(productId);

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId)
        .eq('store_id', currentStoreId); // Pastikan update hanya untuk produk di toko aktif

      if (error) {
        throw error;
      }

      refreshData(); // Refresh data from parent
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui Stok',
        description: 'Terjadi kesalahan. Coba lagi.',
      });
    } finally {
      setTimeout(() => setUpdatingStock(null), 300);
    }
  };


  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct || !currentStoreId) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', selectedProduct.id)
        .eq('store_id', currentStoreId); // Pastikan delete hanya untuk produk di toko aktif

      if (error) {
        throw error;
      }

      toast({
        title: 'Produk Dihapus!',
        description: `Produk "${selectedProduct.name}" telah berhasil dihapus.`,
      });
      refreshData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Produk',
        description: 'Terjadi kesalahan saat menghapus produk dari database.'
      });
      console.error("Error deleting product:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  }


  const handleDataUpdate = () => {
    refreshData();
  }

  const handleCategoryFilterChange = (category: ProductCategory) => {
    setSelectedCategories(prev => {
      const newCategories = new Set(prev);
      if (newCategories.has(category)) {
        newCategories.delete(category);
      } else {
        newCategories.add(category);
      }
      return newCategories;
    });
  };

  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(product.category);
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategories]);

  const availableCategories = React.useMemo(() => {
    const categories = new Set((products || []).map(p => p.category));
    return Array.from(categories).sort();
  }, [products]);


  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline tracking-wider">
                Daftar Produk
              </CardTitle>
              <CardDescription>
                Kelola inventaris produk di toko {activeStore?.name || 'Anda'}.
              </CardDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari produk..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-1">
                    <ListFilter className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Filter
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter berdasarkan kategori</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <ScrollArea className="h-48">
                    {availableCategories.map(category => (
                      <DropdownMenuCheckboxItem
                        key={category}
                        checked={selectedCategories.has(category)}
                        onSelect={(e) => e.preventDefault()} // prevent menu from closing
                        onClick={() => handleCategoryFilterChange(category)}
                      >
                        {category}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-10 gap-1" disabled={!activeStore}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Tambah Produk
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">
                      Tambah Produk Baru
                    </DialogTitle>
                    <DialogDescription>
                      Menambahkan produk baru ke inventaris {activeStore?.name}.
                    </DialogDescription>
                  </DialogHeader>
                  {activeStore && <AddProductForm
                    setDialogOpen={setIsAddDialogOpen}
                    userRole={userRole}
                    onProductAdded={handleDataUpdate}
                    activeStore={activeStore}
                  />}
                </DialogContent>
              </Dialog>

            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-center">Stok</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                {isAdmin && <TableHead className="w-[100px] text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    {isAdmin && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono" onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <StockInput
                          product={product}
                          onStockChange={handleStockChange}
                          isUpdating={updatingStock === product.id}
                        />
                      ) : (
                        product.stock
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {product.price.toLocaleString('id-ID')}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditClick(product)}>Ubah</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(product)}>Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedProduct && isEditDialogOpen && activeStore && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline tracking-wider">Ubah Produk</DialogTitle>
              <DialogDescription>Perbarui detail untuk {selectedProduct.name}.</DialogDescription>
            </DialogHeader>
            <EditProductForm
              setDialogOpen={setIsEditDialogOpen}
              userRole={userRole}
              onProductUpdated={handleDataUpdate}
              activeStore={activeStore}
              product={selectedProduct}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus produk secara permanen: <br />
              <span className="font-bold">&quot;{selectedProduct?.name}&quot;</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProduct(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
