export class Repo {
  id: string;
  name: string;
  description: string;
  status: Status;
}


export enum Status {
  Draft,
  Validated
}
