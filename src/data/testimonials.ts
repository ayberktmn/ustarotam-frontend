import type { Testimonial } from "@/types/testimonial";

export const testimonials: readonly Testimonial[] = [
  {
    id: "testimonial-1",
    name: "Mert A.",
    initials: "MA",
    rating: 5,
    quote: {
      tr: "Motor bakımı öncesinde yapılacak işleri tek tek anlattılar. İşlem sonrası aracın sesi belirgin şekilde düzeldi.",
      en: "They explained every step before the engine service. The engine sounded noticeably better afterwards.",
    },
    service: {
      tr: "Motor ve periyodik bakım",
      en: "Engine and periodic maintenance",
    },
    location: "Kadıköy, İstanbul",
  },
  {
    id: "testimonial-2",
    name: "Selin K.",
    initials: "SK",
    rating: 4,
    quote: {
      tr: "Elektrik arızası kısa sürede bulundu. Yoğunluk nedeniyle teslim biraz gecikti ama önceden haber verildi.",
      en: "The electrical fault was found quickly. Delivery was slightly delayed due to workload, but they informed me in advance.",
    },
    service: {
      tr: "Oto elektrik",
      en: "Auto electrical",
    },
    location: "Çankaya, Ankara",
  },
  {
    id: "testimonial-3",
    name: "Gizem S.",
    initials: "GS",
    rating: 5,
    quote: {
      tr: "İşlem öncesi fiyat aralığı verildi, sonunda bu aralıkta kaldı. Atölye düzenli ve iletişim açıktı.",
      en: "They gave a price range before the work and stayed within it. The workshop was tidy and communication was clear.",
    },
    service: {
      tr: "Şanzıman",
      en: "Transmission",
    },
    location: "Nilüfer, Bursa",
  },
  {
    id: "testimonial-4",
    name: "Yusuf M.",
    initials: "YM",
    rating: 5,
    quote: {
      tr: "Fren balatası ve disk kontrolü yapıldı. Gerekli olmayan parçayı değiştirmediler, bu güven verdi.",
      en: "Brake pads and discs were checked. They did not replace parts that were not needed, which built trust.",
    },
    service: {
      tr: "Fren ve yürüyen aksam",
      en: "Brakes and running gear",
    },
    location: "Konak, İzmir",
  },
  {
    id: "testimonial-5",
    name: "Deniz Y.",
    initials: "DY",
    rating: 5,
    quote: {
      tr: "Klima soğutmuyordu; kaçak testi yapıp sonucu gösterdiler. İşçilik ve parça ayrı ayrı fiyatlandırıldı.",
      en: "The air conditioning was not cooling; they ran a leak test and showed me the result. Labour and parts were priced separately.",
    },
    service: {
      tr: "Klima",
      en: "Air conditioning",
    },
    location: "Muratpaşa, Antalya",
  },
  {
    id: "testimonial-6",
    name: "Aslı D.",
    initials: "AD",
    rating: 5,
    quote: {
      tr: "Küçük bir göçük için boya gerekip gerekmediğini açıkladılar. Renk tutturma başarılıydı.",
      en: "They explained whether painting was needed for a small dent. The colour match was successful.",
    },
    service: {
      tr: "Kaporta ve boya",
      en: "Bodywork and paint",
    },
    location: "Selçuklu, Konya",
  },
  {
    id: "testimonial-7",
    name: "Emre P.",
    initials: "EP",
    rating: 4,
    quote: {
      tr: "Radyatörde kaçak vardı, basınç testiyle gösterdiler. Fiyat baştan söylendi.",
      en: "There was a leak in the radiator; they showed it with a pressure test. The price was given upfront.",
    },
    service: {
      tr: "Radyatör ve soğutma",
      en: "Radiator and cooling",
    },
    location: "Tepebaşı, Eskişehir",
  },
  {
    id: "testimonial-8",
    name: "Pelin C.",
    initials: "PC",
    rating: 4,
    quote: {
      tr: "Klima kontrolü için uğradım. İşlem hızlıydı, fiyat önceden söylendi.",
      en: "I stopped by for an air conditioning check. The work was quick and the price was given upfront.",
    },
    service: {
      tr: "Klima",
      en: "Air conditioning",
    },
    location: "Şehzadeler, Manisa",
  },
  {
    id: "testimonial-9",
    name: "Kaan E.",
    initials: "KE",
    rating: 4,
    quote: {
      tr: "Yoğun bir dönemde gittim, parça temini bir gün sürdü. Yapılan işten memnun kaldım.",
      en: "I visited during a busy period and parts took one day to arrive. I was happy with the work.",
    },
    service: {
      tr: "Şanzıman",
      en: "Transmission",
    },
    location: "Melikgazi, Kayseri",
  },
];
