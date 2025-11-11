import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Users, Ban, Key, Shield, Trash2, RefreshCw, Download, Filter, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  display_name: string | null;
  roles: string[] | null;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [dialogType, setDialogType] = useState<'role' | 'ban' | 'password' | 'bulk-role' | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [banDays, setBanDays] = useState('7');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filterRole, filterStatus, searchQuery]);

  const applyFilters = () => {
    let filtered = [...users];

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => 
        user.roles?.includes(filterRole) || (filterRole === 'user' && (!user.roles || user.roles.length === 0))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => {
        if (filterStatus === 'active') return user.email_confirmed_at && !user.banned_until;
        if (filterStatus === 'banned') return user.banned_until;
        if (filterStatus === 'pending') return !user.email_confirmed_at;
        return true;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(query) ||
        user.display_name?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_users');
      
      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        });
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    try {
      const { error } = await supabase.rpc('update_user_role', {
        _user_id: selectedUser.id,
        _role: newRole as 'admin' | 'moderator' | 'user'
      });

      if (error) {
        console.error('Error updating user role:', error);
        toast({
          title: "Error",
          description: "Failed to update user role",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `User role updated to ${newRole}`,
        });
        fetchUsers();
        setDialogType(null);
        setSelectedUser(null);
        setNewRole('');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleBulkRoleUpdate = async () => {
    if (selectedUsers.size === 0 || !newRole) return;

    try {
      const userIds = Array.from(selectedUsers);
      let successCount = 0;
      let errorCount = 0;

      for (const userId of userIds) {
        try {
          const { error } = await supabase.rpc('update_user_role', {
            _user_id: userId,
            _role: newRole as 'admin' | 'moderator' | 'user'
          });

          if (error) {
            errorCount++;
          } else {
            successCount++;
          }
        } catch {
          errorCount++;
        }
      }

      toast({
        title: "Bulk Update Complete",
        description: `Updated ${successCount} user(s). ${errorCount > 0 ? `Failed: ${errorCount}` : ''}`,
      });

      fetchUsers();
      setDialogType(null);
      setSelectedUsers(new Set());
      setNewRole('');
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast({
        title: "Error",
        description: "Failed to complete bulk update",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const csvHeaders = ['Email', 'Display Name', 'Role', 'Status', 'Created', 'Last Sign In'];
    const csvData = filteredUsers.map(user => [
      user.email,
      user.display_name || '',
      user.roles?.join(';') || 'user',
      user.banned_until ? 'Banned' : user.email_confirmed_at ? 'Active' : 'Pending',
      format(new Date(user.created_at), 'yyyy-MM-dd'),
      user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'yyyy-MM-dd') : 'Never'
    ]);

    const csv = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredUsers.length} user(s) to CSV`,
    });
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    try {
      const banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + parseInt(banDays));

      // Note: This would require admin API access to auth.users
      // For now, we'll show a placeholder
      toast({
        title: "Feature Coming Soon",
        description: "User banning functionality requires Supabase admin API access",
        variant: "destructive",
      });
      
      setDialogType(null);
      setSelectedUser(null);
      setBanDays('7');
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      // Note: This would require admin API access to auth.users
      // For now, we'll show a placeholder
      toast({
        title: "Feature Coming Soon",
        description: "Password change functionality requires Supabase admin API access",
        variant: "destructive",
      });
      
      setDialogType(null);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    }
  };

  const openDialog = (type: 'role' | 'ban' | 'password', user: User) => {
    setSelectedUser(user);
    setDialogType(type);
    if (type === 'role' && user.roles && user.roles.length > 0) {
      setNewRole(user.roles[0]);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage all registered users, their roles, and account status
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedUsers.size > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setDialogType('bulk-role')}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Bulk Update ({selectedUsers.size})
                </Button>
              )}
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Filter by Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            Showing {filteredUsers.length} of {users.length} users
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.display_name || '-'}</TableCell>
                    <TableCell>
                      {user.roles && user.roles.length > 0 ? (
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant={getRoleBadgeVariant(role)}>
                              {role}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline">user</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at 
                        ? format(new Date(user.last_sign_in_at), 'MMM dd, yyyy')
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      {user.banned_until ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : user.email_confirmed_at ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog('role', user)}
                        >
                          <Shield className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog('password', user)}
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog('ban', user)}
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={dialogType === 'role'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={dialogType === 'password'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={dialogType === 'ban'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban {selectedUser?.email} from accessing the platform
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="days">Ban Duration (days)</Label>
              <Select value={banDays} onValueChange={setBanDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="99999">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBanUser}>
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Role Update Dialog */}
      <Dialog open={dialogType === 'bulk-role'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Role Update</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUsers.size} selected user(s)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bulk-role">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleBulkRoleUpdate}>
              Update {selectedUsers.size} User(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}