import { SavedReflection } from "@/types/entry";
import { IReflectionRepository } from "./types";
import {
  getLocalSavedReflections,
  saveLocalReflection,
  removeLocalReflection,
} from "@/lib/reflection";

export class LocalReflectionRepository implements IReflectionRepository {
  async listReflections(): Promise<SavedReflection[]> {
    return getLocalSavedReflections();
  }

  async saveReflection(reflection: SavedReflection): Promise<SavedReflection> {
    saveLocalReflection(reflection);
    return reflection;
  }

  async deleteReflection(id: string): Promise<void> {
    removeLocalReflection(id);
  }
}

