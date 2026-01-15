export interface Note {
  id: string;
  name: string;
  topic: string;
  content: string;
}

export interface BackendNote {
  id: number;
  boxId: number;
  type: string;
  authorName: string | null;
  content: string;
  anonymous: boolean;
  opened: boolean;
  openedAt: string | null;
  createdAt: string;
}
