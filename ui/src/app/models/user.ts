export class User {
    id: number;
    username: string;
    password?: string;
    displayName: string;
    token?: string;
  admin: boolean;
  editor: boolean;
}
