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
import { products, stores } from '@/lib/data';
import type { Product } from '@/lib/types';
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

function ProductDetailsDialog({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void }) {
    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">{product.name}</DialogTitle>
                    <DialogDescription>
                        SKU: {product.barcode || 'N/A'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-4 py-4">
                    <Image
                        alt={product.name}
                        className="aspect-square rounded-md object-cover"
                        height="128"
                        src={product.imageUrl}
                        width="128"
                        data-ai-hint={product.imageHint}
                    />
                    <div className="space-y-1 text-sm">
                       <div><strong>Brand:</strong> {product.attributes.brand}</div>
                       <div className="flex items-center gap-1"><strong>Category:</strong> <Badge variant="outline">{product.category}</Badge></div>
                       {product.attributes.flavorProfile && <div><strong>Flavor:</strong> {product.attributes.flavorProfile}</div>}
                       {product.attributes.nicotine && <div><strong>Nicotine:</strong> {product.attributes.nicotine}</div>}
                       {product.attributes.size && <div><strong>Size:</strong> {product.attributes.size}</div>}
                       {product.attributes.powerOutput && <div><strong>Power:</strong> {product.attributes.powerOutput}</div>}
                       <div><strong>Stock:</strong> 
                         <ul className="list-disc pl-4">
                           {Object.entries(product.stock).map(([storeId, qty]) => (
                             <li key={storeId}>{stores.find(s => s.id === storeId)?.name}: {qty}</li>
                           ))}
                         </ul>
                       </div>
                       <div><strong>Cost Price:</strong> Rp {product.costPrice.toLocaleString('id-ID')}</div>
                       <div><strong>Selling Price:</strong> Rp {product.price.toLocaleString('id-ID')}</div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}


export default function Products() {
  const lowStockThreshold = 10;
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
  };


  return (
    <>
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
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <ListFilter className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Filter
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>Liquid</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Device</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Atomizer</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Accessories</DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Export
                </span>
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Add Product
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="font-headline tracking-wider">
                      Add New Product
                    </DialogTitle>
                    <DialogDescription>
                      Add a new product to your inventory.
                    </DialogDescription>
                  </DialogHeader>
                  <AddProductForm setDialogOpen={setIsAddDialogOpen} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  Image
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Total Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                 <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const totalStock = Object.values(product.stock).reduce((acc, val) => acc + val, 0);
                return (
                <TableRow key={product.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={product.name}
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={product.imageUrl}
                      width="64"
                      data-ai-hint={product.imageHint}
                    />
                  </TableCell>
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
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedProduct && (
        <ProductDetailsDialog
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={() => setSelectedProduct(null)}
        />
       )}
    </>
  );
}
