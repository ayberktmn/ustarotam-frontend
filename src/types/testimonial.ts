import type { LocalizedText } from "@/types/locale";

export interface Testimonial {
  id: string;
  name: string;
  initials: string;
  rating: 4 | 5;
  quote: LocalizedText;
  service: LocalizedText;
  location: string;
}
