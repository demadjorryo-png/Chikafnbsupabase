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
import { products } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { File, ListFilter, PlusCircle, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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

export default function Products() {
  const lowStockThreshold = 20;
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  return (
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <AddProductForm setDialogOpen={setIsDialogOpen} />
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
              <TableHead>Barcode</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-right">Cost Price</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
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
                <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                <TableCell>
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                <TableCell>{product.attributes.brand}</TableCell>
                <TableCell className="text-center">
                  {product.stock <= lowStockThreshold ? (
                    <Badge variant="destructive">Low ({product.stock})</Badge>
                  ) : (
                    product.stock
                  )}
                </TableCell>
                 <TableCell className="text-right">
                  Rp {product.costPrice.toLocaleString('id-ID')}
                </TableCell>
                <TableCell className="text-right">
                  Rp {product.price.toLocaleString('id-ID')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
