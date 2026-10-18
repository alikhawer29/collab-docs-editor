export type Role = "owner" | "edit" | "view";
export type Permission = "edit" | "view";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type DocumentSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
  owner: PublicUser;
  shareCount: number;
};

export type ShareGrant = {
  user: PublicUser;
  permission: Permission;
};

export type DocumentDetail = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  role: Role;
  owner: PublicUser;
  shares: ShareGrant[];
};

export type DocumentRecord = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};
