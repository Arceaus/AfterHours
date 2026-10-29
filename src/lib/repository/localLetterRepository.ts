import { FutureLetter } from "@/types/entry";
import { IFutureLetterRepository } from "./types";
import {
  getSavedLetters,
  getLetterById,
  persistLetter,
  removeLetter,
  openLetter,
  unsealLetterToDraft,
} from "@/lib/letters";

export class LocalLetterRepository implements IFutureLetterRepository {
  async listLetters(): Promise<FutureLetter[]> {
    return getSavedLetters();
  }

  async getLetter(id: string): Promise<FutureLetter | null> {
    return getLetterById(id);
  }

  async saveLetter(letter: FutureLetter): Promise<FutureLetter> {
    persistLetter(letter);
    return letter;
  }

  async deleteLetter(id: string): Promise<void> {
    removeLetter(id);
  }

  async openLetter(id: string): Promise<FutureLetter | null> {
    return openLetter(id);
  }

  async unsealLetter(id: string): Promise<FutureLetter | null> {
    return unsealLetterToDraft(id);
  }
}

