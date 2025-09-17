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
import { stores } from '@/lib/data';
import type { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { AddEmployeeForm } from '@/components/dashboard/add-employee-form';
import { EditEmployeeForm } from '@/components/dashboard/edit-employee-form';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';

export default function Employees() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const { toast } = useToast();

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    const firestoreUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    setUsers(firestoreUsers);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };
  
  const handleStatusChangeClick = (user: User) => {
    setSelectedUser(user);
    setIsStatusChangeDialogOpen(true);
  }

  const handleConfirmStatusChange = async () => {
    if (!selectedUser) return;
    
    const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    const userDocRef = doc(db, 'users', selectedUser.id);

    try {
        await updateDoc(userDocRef, { status: newStatus });
        
        setUsers(prevUsers => prevUsers.map(u => u.id === selectedUser.id ? {...u, status: newStatus} : u));

        toast({
        title: 'Status Karyawan Diperbarui',
        description: `Status untuk ${selectedUser.name} telah diubah menjadi ${newStatus}.`,
        });

    } catch (error) {
        console.error("Error updating user status:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Memperbarui Status',
            description: 'Terjadi kesalahan saat mengubah status karyawan. Silakan coba lagi.'
        });
    }


    setIsStatusChangeDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-headline tracking-wider">
                Employees
              </CardTitle>
              <CardDescription>
                Manage employee accounts and roles.
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add Employee
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="font-headline tracking-wider">
                    Add New Employee
                  </DialogTitle>
                  <DialogDescription>
                    Create a new user account for an employee.
                  </DialogDescription>
                </DialogHeader>
                <AddEmployeeForm setDialogOpen={setIsAddDialogOpen} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Primary Store</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className={user.status === 'inactive' ? 'text-muted-foreground' : ''}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.userId}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                     <TableCell>
                      <Badge
                        variant={user.status === 'active' ? 'secondary' : 'destructive'}
                        className={user.status === 'active' ? 'border-green-500/50 text-green-700' : ''}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {stores.find((s) => s.id === user.storeId)?.name || 'N/A'}
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
                          <DropdownMenuItem onClick={() => handleEditClick(user)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Reset Password</DropdownMenuItem>
                          <DropdownMenuItem 
                            className={user.status === 'active' ? 'text-destructive' : 'text-green-600 focus:text-green-600'}
                            onClick={() => handleStatusChangeClick(user)}
                          >
                            {user.status === 'active' ? (
                                <>
                                 <XCircle className="mr-2 h-4 w-4"/> Deactivate
                                </>
                            ) : (
                                <>
                                 <CheckCircle className="mr-2 h-4 w-4"/> Activate
                                </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline tracking-wider">
                Edit Employee
              </DialogTitle>
              <DialogDescription>
                Update employee details for {selectedUser.name}.
              </DialogDescription>
            </DialogHeader>
            <EditEmployeeForm 
              setDialogOpen={handleDialogClose} 
              employee={selectedUser}
            />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isStatusChangeDialogOpen} onOpenChange={setIsStatusChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will {selectedUser?.status === 'active' ? 'deactivate' : 'activate'} the account for{' '}
              <span className="font-bold">{selectedUser?.name}</span>. 
              {selectedUser?.status === 'active' 
                ? ' They will no longer be able to log in.' 
                : ' They will be able to log in again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusChange}
              className={selectedUser?.status === 'active' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Yes, {selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
