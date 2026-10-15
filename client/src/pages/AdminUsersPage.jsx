import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth.js";
import { useToast } from "../context/useToast.js";
import { adminUsersClient } from "../services/adminUsersClient.js";
import { AdminTabs } from "../components/layout/AdminTabs.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { ConfirmModal } from "../components/ui/ConfirmModal.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { LoadingSpinner } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import {
  FiSearch,
  FiEdit2,
  FiShield,
  FiUser,
  FiSlash,
  FiCheckCircle,
  FiTrash2,
} from "react-icons/fi";

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "user", label: "Standard Users" },
  { value: "admin", label: "Administrators" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
];

const EDIT_ROLE_OPTIONS = [
  { value: "user", label: "Standard User (user)" },
  { value: "admin", label: "Administrator (admin)" },
];

export function AdminUsersPage() {
  const { user: currentAuthUser, isAdmin } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    role: "user",
    displayName: "",
    city: "",
    isBlocked: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom confirmation popup state for block/unblock and deletion
  const [confirmAction, setConfirmAction] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadUsers = useCallback(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);

    const params = { limit: 50 };
    if (selectedRole !== "all") params.role = selectedRole;
    if (selectedStatus !== "all") params.status = selectedStatus;
    if (searchTerm.trim()) params.search = searchTerm.trim();

    adminUsersClient
      .listUsers(params)
      .then((data) => {
        setUsers(data?.items || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load user directory.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAdmin, selectedRole, selectedStatus, searchTerm]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers, isAdmin]);

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      role: u.role || "user",
      displayName: u.profile?.displayName || "",
      city: u.profile?.city || "",
      isBlocked: Boolean(u.isBlocked),
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      await adminUsersClient.updateUser(editingUser.id, {
        role: editForm.role,
        isBlocked: editForm.isBlocked,
        profile: {
          displayName: editForm.displayName.trim() || undefined,
          city: editForm.city.trim() || undefined,
        },
      });

      toast.success(
        `User ${editingUser.email} updated successfully!`,
        "User Updated",
      );
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      toast.error(err.message || "Failed to update user.", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const promptToggleBlock = (u) => {
    if (currentAuthUser?.id === u.id) {
      toast.error("You cannot block your own administrator account.", "Action Prohibited");
      return;
    }
    setConfirmAction({
      type: u.isBlocked ? "unblock" : "block",
      user: u,
    });
  };

  const promptDeleteUser = (u) => {
    if (currentAuthUser?.id === u.id) {
      toast.error("You cannot delete your own administrator account.", "Action Prohibited");
      return;
    }
    setConfirmAction({
      type: "delete",
      user: u,
    });
  };

  const handleExecuteConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, user: targetUser } = confirmAction;

    try {
      setIsActionLoading(true);
      if (type === "block" || type === "unblock") {
        const nextBlocked = type === "block";
        await adminUsersClient.updateUser(targetUser.id, { isBlocked: nextBlocked });
        toast.success(
          `User ${targetUser.email} is now ${nextBlocked ? "blocked" : "active"}.`,
          nextBlocked ? "User Blocked" : "User Unblocked"
        );
      } else if (type === "delete") {
        await adminUsersClient.deleteUser(targetUser.id);
        toast.success(`User ${targetUser.email} was permanently deleted.`, "User Deleted");
      }
      setConfirmAction(null);
      loadUsers();
    } catch (err) {
      toast.error(err.message || `Failed to ${type} user.`, "Action Failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-12">
        <Alert title="403 Forbidden: Administrator Privilege Required" variant="error">
          You are currently signed in as {currentAuthUser?.email || "guest"} with insufficient permissions.
          User administration requires an authorized administrator role.
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-4">
      <AdminTabs />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email, name, city..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/70 backdrop-blur-md text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#D8FF2A]"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="w-full sm:w-44">
            <Select
              id="role-filter"
              options={ROLE_OPTIONS}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              id="status-filter"
              options={STATUS_OPTIONS}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading users..." size="lg" className="py-16" />}

      {error && !loading && (
        <Alert title="Directory Load Error" variant="error">
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Card className="overflow-x-auto p-0 border border-white/80 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/80 backdrop-blur-xl rounded-2xl shadow-sm">
          <table className="w-full min-w-[750px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-white/10 bg-[#1F5A3A]/10 dark:bg-[#2B2B2B] backdrop-blur-md">
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">User Account</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Display Name</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Location</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Joined</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = currentAuthUser?.id === u.id;
                  const joinedDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString()
                    : "Unknown";

                  return (
                    <tr key={u.id} className="hover:bg-[#1F5A3A]/5 dark:hover:bg-[#0A0A0A]/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{u.email}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">ID: {u.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {u.profile?.displayName || <span className="text-slate-400 italic">Not specified</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {u.profile?.city || <span className="text-slate-400 italic">Not specified</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "admin" ? (
                          <Badge variant="forest" size="sm" className="inline-flex items-center gap-1 font-bold">
                            <FiShield className="w-3 h-3 text-[#D8FF2A]" />
                            <span>ADMIN</span>
                          </Badge>
                        ) : (
                          <Badge variant="subtle" size="sm" className="inline-flex items-center gap-1">
                            <FiUser className="w-3 h-3 opacity-60" />
                            <span>USER</span>
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.isBlocked ? (
                          <Badge variant="red" size="sm" className="inline-flex items-center gap-1 font-bold">
                            <FiSlash className="w-3 h-3" />
                            <span>BLOCKED</span>
                          </Badge>
                        ) : (
                          <Badge variant="green" size="sm" className="inline-flex items-center gap-1 font-semibold">
                            <FiCheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>ACTIVE</span>
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {joinedDate}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1"
                            title="Modify role and profile"
                          >
                            <FiEdit2 className="w-3 h-3" />
                            <span>Modify</span>
                          </Button>
                          <Button
                            variant={u.isBlocked ? "lemon" : "secondary"}
                            size="sm"
                            disabled={isSelf}
                            onClick={() => promptToggleBlock(u)}
                            className="inline-flex items-center gap-1"
                            title={isSelf ? "You cannot block yourself" : (u.isBlocked ? "Unblock account" : "Block account")}
                          >
                            <FiSlash className={`w-3 h-3 ${u.isBlocked ? "text-slate-900" : "text-amber-500"}`} />
                            <span>{u.isBlocked ? "Unblock" : "Block"}</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isSelf}
                            onClick={() => promptDeleteUser(u)}
                            className="inline-flex items-center gap-1"
                            title={isSelf ? "You cannot delete yourself" : "Permanently delete account"}
                          >
                            <FiTrash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Edit User Modal */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={`Modify User: ${editingUser?.email || ""}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Select
            id="edit-user-role"
            name="role"
            label="System Role"
            options={EDIT_ROLE_OPTIONS}
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            hint="Administrators have full catalog and user management privileges."
          />

          <Input
            id="edit-user-displayName"
            name="displayName"
            label="Display Name"
            placeholder="e.g. John Doe"
            value={editForm.displayName}
            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
          />

          <Input
            id="edit-user-city"
            name="city"
            label="City / Location"
            placeholder="e.g. Bengaluru"
            value={editForm.city}
            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
          />

          <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
            <input
              type="checkbox"
              id="edit-user-isBlocked"
              checked={editForm.isBlocked}
              disabled={currentAuthUser?.id === editingUser?.id}
              onChange={(e) => setEditForm({ ...editForm, isBlocked: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="edit-user-isBlocked" className="text-xs font-medium cursor-pointer">
              <span className="block font-bold text-slate-800 dark:text-slate-100">
                Block this account
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                When blocked, all active sessions are revoked immediately and the user cannot sign in.
              </span>
            </label>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving Changes..." : "Save Modifications"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Custom Confirmation Popup for Blocking and Deleting Users */}
      <ConfirmModal
        isOpen={Boolean(confirmAction)}
        onClose={() => {
          if (!isActionLoading) setConfirmAction(null);
        }}
        onConfirm={handleExecuteConfirmAction}
        isLoading={isActionLoading}
        title={
          confirmAction?.type === "block"
            ? "Block User Account"
            : confirmAction?.type === "unblock"
              ? "Unblock User Account"
              : "Delete User Account"
        }
        variant={
          confirmAction?.type === "delete"
            ? "danger"
            : confirmAction?.type === "block"
              ? "warning"
              : "primary"
        }
        confirmText={
          confirmAction?.type === "block"
            ? "Block Account"
            : confirmAction?.type === "unblock"
              ? "Unblock Account"
              : "Permanently Delete"
        }
        icon={
          confirmAction?.type === "delete" ? (
            <FiTrash2 className="w-5 h-5" />
          ) : confirmAction?.type === "block" ? (
            <FiSlash className="w-5 h-5" />
          ) : (
            <FiCheckCircle className="w-5 h-5" />
          )
        }
      >
        {confirmAction && (
          <div className="space-y-3">
            <p>
              Are you sure you want to{" "}
              <strong>
                {confirmAction.type === "delete"
                  ? "permanently delete"
                  : confirmAction.type === "block"
                    ? "block"
                    : "unblock"}
              </strong>{" "}
              user account{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {confirmAction.user.email}
              </span>
              ?
            </p>

            {confirmAction.type === "block" && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <span className="font-bold block mb-1">Session Revocation Notice:</span>
                Blocking will immediately revoke all active sessions and prevent future logins or token refreshes.
              </div>
            )}

            {confirmAction.type === "unblock" && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-bold block mb-1">Account Reactivation:</span>
                This will restore access for this user, permitting them to log in and access the application.
              </div>
            )}

            {confirmAction.type === "delete" && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300">
                <span className="font-bold block mb-1">Permanent Deletion:</span>
                This will completely remove the user record and revoke all active sessions. This action <strong>cannot be undone</strong>.
              </div>
            )}
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
