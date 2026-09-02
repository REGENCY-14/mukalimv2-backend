export type Role = "admin" | "editor" | "viewer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string; // user id
  type: "refresh";
}
