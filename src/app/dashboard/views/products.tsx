
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
import type { Product, User, Store, ProductCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { File, ListFilter, MoreHorizontal, PlusCircle, Search } from 'lucide-react';
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
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { StockAdjustmentCard } from '@/components/dashboard/stock-adjustment-card';

function ProductDetailsDialog({ product, open, onOpenChange, userRole, stores }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void; userRole: User['role']; stores: Store[] }) {
    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">{product.name}</DialogTitle>
                    <DialogDescription>
                        SKU: {product.attributes.barcode || 'N/A'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4 text-sm">
                   <div><strong>Brand:</strong> {product.attributes.brand}</div>
                   <div className="flex items-center gap-1"><strong>Category:</strong> <Badge variant="outline">{product.category}</Badge></div>
                   {product.attributes.flavorProfile && <div><strong>Flavor:</strong> {product.attributes.flavorProfile}</div>}
                   {product.attributes.nicotine && <div><strong>Nicotine:</strong> {product.attributes.nicotine}</div>}
                   {product.attributes.size && <div><strong>Size:</strong> {product.attributes.size}</div>}
                   {product.attributes.powerOutput && <div><strong>Power:</strong> {product.attributes.powerOutput}</div>}
                   <div><strong>Stock:</strong>
                     <ul className="list-disc pl-5 mt-1 space-y-1">
                       {Object.entries(product.stock).map(([storeId, qty]) => {
                         const store = stores.find(s => s.id === storeId);
                         return <li key={storeId}>{(store ? store.name : storeId)}: {qty}</li>
                       })}
                     </ul>
                   </div>
                   {userRole === 'admin' && <div><strong>Cost Price:</strong> Rp {product.costPrice.toLocaleString('id-ID')}</div>}
                   <div><strong>Selling Price:</strong> Rp {product.price.toLocaleString('id-ID')}</div>
                </div>
            </DialogContent>
        </Dialog>
    );
}


export default function Products() {
  const lowStockThreshold = 10;
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  
  const [products, setProducts] = React.useState<Product[]>([]);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userRole, setUserRole] = React.useState<User['role']>('cashier');
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<Set<ProductCategory>>(new Set());

  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  React.useEffect(() => {
    const fetchUserData = async () => {
        if(userId) {
             if (userId === 'admin001') { // Superadmin case
                setUserRole('admin');
            } else {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role);
                }
            }
        }
    };
    fetchUserData();
  }, [userId]);


  const fetchProductsAndStores = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const productsCollection = collection(db, 'products');
        const productSnapshot = await getDocs(productsCollection);
        const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productList);

        const storesCollection = collection(db, 'stores');
        const storeSnapshot = await getDocs(storesCollection);
        const storeList = storeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setStores(storeList);
    } catch (error) {
        console.error("Error fetching data:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memuat Data',
            description: 'Terjadi kesalahan saat mengambil data produk atau toko.'
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchProductsAndStores();
  }, [fetchProductsAndStores]);

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
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
    if (!selectedProduct) return;
    
    try {
        await deleteDoc(doc(db, "products", selectedProduct.id));
        toast({
            title: 'Produk Dihapus!',
            description: `Produk "${selectedProduct.name}" telah berhasil dihapus.`,
        });
        fetchProductsAndStores(); // Re-fetch products after deletion
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
    fetchProductsAndStores(); // Re-fetch data when a product is added or updated
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

  const availableCategories = React.useMemo(() => {
    const categories = new Set(products.map(p => p.category));
    return Array.from(categories).sort();
  }, [products]);
  
  const filteredProducts = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(product.category);
      return matchesSearch && matchesCategory;
  });


  return (
    <>
    <div className="grid gap-6">

      <StockAdjustmentCard 
        products={products}
        stores={stores}
        onStockUpdated={handleDataUpdate}
        isLoading={isLoading}
      />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline tracking-wider">
                Products
              </CardTitle>
              <CardDescription>Manage your product inventory.</CardDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
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
                  <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline" className="h-10 gap-1">
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Export
                </span>
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-10 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Add Product
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">
                      Add New Product
                    </DialogTitle>
                    <DialogDescription>
                      Add a new product to your inventory.
                    </DialogDescription>
                  </DialogHeader>
                  <AddProductForm 
                    setDialogOpen={setIsAddDialogOpen} 
                    userRole={userRole} 
                    onProductAdded={handleDataUpdate}
                    stores={stores}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Total Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                 <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                filteredProducts.map((product) => {
                  const totalStock = Object.values(product.stock).reduce((acc, val) => acc + val, 0);
                  return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {totalStock <= lowStockThreshold ? (
                        <Badge variant="destructive">Low ({totalStock})</Badge>
                      ) : (
                        totalStock
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {product.price.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(product)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(product)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(product)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
      
      {selectedProduct && (
        <ProductDetailsDialog
          product={selectedProduct}
          open={!!selectedProduct && !isEditDialogOpen && !isDeleteDialogOpen}
          onOpenChange={() => setSelectedProduct(null)}
          userRole={userRole}
          stores={stores}
        />
       )}

      {selectedProduct && isEditDialogOpen && (
         <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
             <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">Edit Product</DialogTitle>
                    <DialogDescription>Update details for {selectedProduct.name}.</DialogDescription>
                  </DialogHeader>
                  <EditProductForm 
                    setDialogOpen={setIsEditDialogOpen} 
                    userRole={userRole} 
                    onProductUpdated={handleDataUpdate}
                    stores={stores}
                    product={selectedProduct}
                  />
                </DialogContent>
         </Dialog>
      )}

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product: <br />
              <span className="font-bold">"{selectedProduct?.name}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProduct(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
