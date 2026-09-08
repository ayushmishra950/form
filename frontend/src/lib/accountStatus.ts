export type AccountStatus = 'active' | 'inactive' | 'deleted';

/** Derives the single status of an account from its two flags. */
export const accountStatus = (user: {
  isActive: boolean;
  deletedAt: string | null;
}): AccountStatus => (user.deletedAt ? 'deleted' : user.isActive ? 'active' : 'inactive');
