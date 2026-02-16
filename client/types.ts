export type Topic = "improve" | "keep" | "idea" | "shoutout";

export interface BackendNote {
  id: number;
  boxId: number;
  type: Topic; // ✅ לא string
  authorName: string | null;
  content: string | null; // חשוב! כי בשרת זה יכול להיות null
  imageUrl?: string | null; // הוספנו תמיכה רשמית בתמונה
  anonymous: boolean;
  opened: boolean;
  openedAt: string | null;
  createdAt: string;
}
