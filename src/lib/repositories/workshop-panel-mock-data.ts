import type {
  WorkshopPanelConversation,
  WorkshopPanelMessage,
  WorkshopPanelNotification,
  WorkshopPanelOffer,
  WorkshopPanelProfile,
  WorkshopPanelRequest,
  WorkshopPanelReview,
} from "@/types/usta-panel";

/**
 * Demo panel verisi. Gerçek iş talebi ve teklif uçları bağlandığında bu dosya
 * yerini HTTP repository'sine bırakacaktır. İçerik kurgusal işletme ve
 * müşterilerden oluşur; gerçek kişi veya işletme verisi değildir.
 */
export const panelProfileSeed: WorkshopPanelProfile = {
  id: "wp-001",
  name: "Ege Motor Servisi",
  ownerName: "İlhan Usta",
  email: "ilhan@egemotorservisi.example",
  phone: "+90 555 000 00 10",
  about: {
    tr: "Motor mekaniği, fren ve periyodik bakım alanında çalışan, on iki yıllık deneyime sahip bir atölye. Yapılan işlemi ve kullanılan parçaları iş öncesinde açıklamayı önceliklendiririz.",
    en: "A workshop with twelve years of experience in engine mechanics, brakes and periodic maintenance. We prioritise explaining the work and the parts used before we start.",
  },
  city: "Manisa",
  district: "Şehzadeler",
  address: {
    tr: "Örnek Oto Sanayi Sitesi, 2. Blok No: 14, Şehzadeler / Manisa",
    en: "Sample Auto Industrial Site, Block 2 No: 14, Şehzadeler / Manisa",
  },
  status: "PUBLISHED",
  verification: "VERIFIED",
  specialties: [
    { tr: "Motor mekaniği", en: "Engine mechanics" },
    { tr: "Fren ve yürüyen aksam", en: "Brakes and running gear" },
    { tr: "Periyodik bakım", en: "Periodic maintenance" },
    { tr: "Oto elektrik", en: "Auto electrics" },
  ],
  specialtyIds: [],
  serviceAreas: [
    { city: "Manisa", district: "Şehzadeler" },
    { city: "Manisa", district: "Yunusemre" },
    { city: "İzmir", district: "Bornova" },
  ],
  rating: 4.4,
  reviewCount: 5,
};

export const panelRequestsSeed: WorkshopPanelRequest[] = [
  {
    id: "req-1001",
    vehicle: {
      type: { tr: "Otomobil", en: "Car" },
      brand: "Ford",
      model: "Focus",
      year: 2018,
      fuel: { tr: "Dizel", en: "Diesel" },
    },
    specialty: { tr: "Fren ve yürüyen aksam", en: "Brakes and running gear" },
    city: "İzmir",
    district: "Bornova",
    distanceKm: 8.4,
    description: {
      tr: "Fren pedalına basınca direksiyonda titreme oluyor. Ön disk ve balataların kontrol edilmesini, gerekirse değiştirilmesini istiyorum.",
      en: "The steering wheel vibrates when I press the brake pedal. I would like the front discs and pads checked and replaced if necessary.",
    },
    photoCount: 2,
    budget: { min: 2500, max: 4000 },
    status: "PUBLISHED",
    createdAt: "2026-10-22T09:15:00.000Z",
  },
  {
    id: "req-1002",
    vehicle: {
      type: { tr: "Otomobil", en: "Car" },
      brand: "Renault",
      model: "Clio",
      year: 2020,
      fuel: { tr: "Benzin", en: "Petrol" },
    },
    specialty: { tr: "Klima", en: "Air conditioning" },
    city: "Manisa",
    district: "Şehzadeler",
    distanceKm: 3.1,
    description: {
      tr: "Klima soğutmuyor. Gaz dolumu ve kaçak kontrolü yapılmasını istiyorum. Çalışma saatleri içinde uğrayabilirim.",
      en: "The air conditioning is not cooling. I would like a gas refill and leak check. I can visit during working hours.",
    },
    photoCount: 1,
    budget: { min: 1500, max: 2500 },
    status: "PUBLISHED",
    createdAt: "2026-10-22T07:40:00.000Z",
  },
  {
    id: "req-1003",
    vehicle: {
      type: { tr: "Otomobil", en: "Car" },
      brand: "Volkswagen",
      model: "Passat",
      year: 2017,
      fuel: { tr: "Dizel", en: "Diesel" },
    },
    specialty: { tr: "Motor mekaniği", en: "Engine mechanics" },
    city: "Ankara",
    district: "Çankaya",
    distanceKm: 12.6,
    description: {
      tr: "Motor arıza lambası yanıyor ve rölantide dalgalanma var. Arıza tespiti yapılıp bana bilgi verilmesini istiyorum.",
      en: "The engine warning light is on and the idle is uneven. I would like a diagnostic check and an explanation of the fault.",
    },
    photoCount: 3,
    budget: null,
    status: "PUBLISHED",
    createdAt: "2026-10-21T16:05:00.000Z",
  },
  {
    id: "req-1004",
    vehicle: {
      type: { tr: "Otomobil", en: "Car" },
      brand: "Fiat",
      model: "Egea",
      year: 2021,
      fuel: { tr: "Benzin", en: "Petrol" },
    },
    specialty: { tr: "Periyodik bakım", en: "Periodic maintenance" },
    city: "Manisa",
    district: "Yunusemre",
    distanceKm: 5.2,
    description: {
      tr: "20.000 kilometre periyodik bakımı yapılacak. Yağ, filtre ve genel kontroller dahil fiyat teklifi bekliyorum.",
      en: "The 20,000 kilometre periodic maintenance is due. I am waiting for a quote including oil, filters and general checks.",
    },
    photoCount: 0,
    budget: { min: 3000, max: 4500 },
    status: "PUBLISHED",
    createdAt: "2026-10-21T11:20:00.000Z",
  },
  {
    id: "req-1005",
    vehicle: {
      type: { tr: "Otomobil", en: "Car" },
      brand: "Toyota",
      model: "Corolla",
      year: 2019,
      fuel: { tr: "Hibrit", en: "Hybrid" },
    },
    specialty: { tr: "Şanzıman", en: "Transmission" },
    city: "İstanbul",
    district: "Kadıköy",
    distanceKm: 18,
    description: {
      tr: "Şanzıman yağı ve filtresi değişimi için teklif almak istiyorum. Aracın bakım geçmişi düzenli.",
      en: "I would like a quote for a transmission oil and filter change. The car has a regular service history.",
    },
    photoCount: 1,
    budget: { min: 4000, max: 6000 },
    status: "ASSIGNED",
    createdAt: "2026-10-20T14:30:00.000Z",
  },
  {
    id: "req-1006",
    vehicle: {
      type: { tr: "Otomobil", en: "Car" },
      brand: "Honda",
      model: "Civic",
      year: 2016,
      fuel: { tr: "Benzin", en: "Petrol" },
    },
    specialty: { tr: "Kaporta ve boya", en: "Bodywork and paint" },
    city: "Bursa",
    district: "Nilüfer",
    distanceKm: 25.5,
    description: {
      tr: "Arka tamponda park kaynaklı çizik ve göçük var. Boya gerekip gerekmediğini değerlendirip fiyat vermenizi istiyorum.",
      en: "There are parking scratches and a dent on the rear bumper. I would like you to assess whether painting is needed and provide a price.",
    },
    photoCount: 4,
    budget: { min: 7000, max: 12000 },
    status: "PUBLISHED",
    createdAt: "2026-10-19T08:10:00.000Z",
  },
];

export const panelOffersSeed: WorkshopPanelOffer[] = [
  {
    id: "off-2001",
    requestId: "req-1001",
    request: {
      vehicleLabel: "2018 Ford Focus",
      specialty: { tr: "Fren ve yürüyen aksam", en: "Brakes and running gear" },
      city: "İzmir",
      district: "Bornova",
    },
    amount: 3200,
    currency: "TRY",
    description:
      "Ön disk ve balata değişimi, fren hidroliği kontrolü ve yol testi dahil.",
    expiresAt: "2026-11-05T20:59:59.000Z",
    status: "SUBMITTED",
    createdAt: "2026-10-22T10:05:00.000Z",
    updatedAt: "2026-10-22T10:05:00.000Z",
  },
  {
    id: "off-2002",
    requestId: "req-1003",
    request: {
      vehicleLabel: "2017 Volkswagen Passat",
      specialty: { tr: "Motor mekaniği", en: "Engine mechanics" },
      city: "Ankara",
      district: "Çankaya",
    },
    amount: 900,
    currency: "TRY",
    description:
      "Arıza tespiti, sensör kontrolleri ve yazılı hata raporu. Onarım gerekirse ayrıca bilgi verilecek.",
    expiresAt: "2026-11-02T20:59:59.000Z",
    status: "SUBMITTED",
    createdAt: "2026-10-21T17:30:00.000Z",
    updatedAt: "2026-10-21T17:30:00.000Z",
  },
  {
    id: "off-2003",
    requestId: "req-1005",
    request: {
      vehicleLabel: "2019 Toyota Corolla",
      specialty: { tr: "Şanzıman", en: "Transmission" },
      city: "İstanbul",
      district: "Kadıköy",
    },
    amount: 5200,
    currency: "TRY",
    description:
      "Orijinal şanzıman yağı ve filtre değişimi, test sürüşü ve kontrol dahil.",
    expiresAt: "2026-10-30T20:59:59.000Z",
    status: "ACCEPTED",
    createdAt: "2026-10-20T15:10:00.000Z",
    updatedAt: "2026-10-21T09:00:00.000Z",
  },
  {
    id: "off-2004",
    requestId: "req-1006",
    request: {
      vehicleLabel: "2016 Honda Civic",
      specialty: { tr: "Kaporta ve boya", en: "Bodywork and paint" },
      city: "Bursa",
      district: "Nilüfer",
    },
    amount: 9500,
    currency: "TRY",
    description:
      "Arka tampon onarımı, renk eşleştirme ve lokal boya. İşlem süresi iki gün.",
    expiresAt: "2026-10-25T20:59:59.000Z",
    status: "REJECTED",
    createdAt: "2026-10-19T10:00:00.000Z",
    updatedAt: "2026-10-20T12:45:00.000Z",
  },
];

export const panelConversationsSeed: WorkshopPanelConversation[] = [
  {
    id: "con-3001",
    customerName: "Selin K.",
    requestId: "req-1005",
    requestTitle: {
      tr: "Şanzıman · 2019 Toyota Corolla",
      en: "Transmission · 2019 Toyota Corolla",
    },
    lastMessage: {
      tr: "Teşekkürler, yarın sabah 09.00'da getirebilirim.",
      en: "Thank you, I can bring it tomorrow morning at 09.00.",
    },
    lastMessageAt: "2026-10-22T18:42:00.000Z",
    unreadCount: 2,
  },
  {
    id: "con-3002",
    customerName: "Mert A.",
    requestId: "req-1001",
    requestTitle: {
      tr: "Fren bakımı · 2018 Ford Focus",
      en: "Brake service · 2018 Ford Focus",
    },
    lastMessage: {
      tr: "Disklerin durumunu görmek için fotoğraf paylaşabilir misiniz?",
      en: "Could you share a photo so I can see the condition of the discs?",
    },
    lastMessageAt: "2026-10-22T12:18:00.000Z",
    unreadCount: 1,
  },
  {
    id: "con-3003",
    customerName: "Ayşe D.",
    requestId: "req-1004",
    requestTitle: {
      tr: "Periyodik bakım · 2021 Fiat Egea",
      en: "Periodic maintenance · 2021 Fiat Egea",
    },
    lastMessage: {
      tr: "Fiyat teklifinizi eşleşen işler sayfasından aldım, teşekkürler.",
      en: "I received your quote on the matched jobs page, thank you.",
    },
    lastMessageAt: "2026-10-21T15:05:00.000Z",
    unreadCount: 0,
  },
];

export const panelMessagesSeed: Record<string, WorkshopPanelMessage[]> = {
  "con-3001": [
    {
      id: "msg-4001",
      conversationId: "con-3001",
      sender: "WORKSHOP",
      body: {
        tr: "Teklifiniz için teşekkür ederim. Aracı ne zaman getirebilirsiniz?",
        en: "Thank you for the quote. When can you bring the car in?",
      },
      sentAt: "2026-10-22T09:10:00.000Z",
      read: true,
    },
    {
      id: "msg-4002",
      conversationId: "con-3001",
      sender: "CUSTOMER",
      body: {
        tr: "Merhaba, yarın sabah uygunum. İşlem ne kadar sürer?",
        en: "Hello, I am available tomorrow morning. How long will the work take?",
      },
      sentAt: "2026-10-22T17:55:00.000Z",
      read: false,
    },
    {
      id: "msg-4003",
      conversationId: "con-3001",
      sender: "WORKSHOP",
      body: {
        tr: "Yaklaşık iki saat sürer. Sabah 09.00 uygundur.",
        en: "It takes about two hours. 09.00 in the morning works for us.",
      },
      sentAt: "2026-10-22T18:20:00.000Z",
      read: true,
    },
    {
      id: "msg-4004",
      conversationId: "con-3001",
      sender: "CUSTOMER",
      body: {
        tr: "Teşekkürler, yarın sabah 09.00'da getirebilirim.",
        en: "Thank you, I can bring it tomorrow morning at 09.00.",
      },
      sentAt: "2026-10-22T18:42:00.000Z",
      read: false,
    },
  ],
  "con-3002": [
    {
      id: "msg-4005",
      conversationId: "con-3002",
      sender: "WORKSHOP",
      body: {
        tr: "Merhaba, teklifi incelediğiniz için teşekkürler. Diskte çizik varsa fotoğraf ekleyebilirim.",
        en: "Hello, thank you for reviewing the quote. I can add photos if the disc shows scoring.",
      },
      sentAt: "2026-10-22T11:30:00.000Z",
      read: true,
    },
    {
      id: "msg-4006",
      conversationId: "con-3002",
      sender: "CUSTOMER",
      body: {
        tr: "Disklerin durumunu görmek için fotoğraf paylaşabilir misiniz?",
        en: "Could you share a photo so I can see the condition of the discs?",
      },
      sentAt: "2026-10-22T12:18:00.000Z",
      read: false,
    },
  ],
  "con-3003": [
    {
      id: "msg-4007",
      conversationId: "con-3003",
      sender: "CUSTOMER",
      body: {
        tr: "Periyodik bakım için en erken hangi gün uygun?",
        en: "Which is the earliest day available for periodic maintenance?",
      },
      sentAt: "2026-10-21T13:40:00.000Z",
      read: true,
    },
    {
      id: "msg-4008",
      conversationId: "con-3003",
      sender: "WORKSHOP",
      body: {
        tr: "Bu hafta içi her gün 08.30-17.30 arası uygunuz. Randevu için yeterli.",
        en: "We are available weekdays between 08.30 and 17.30. No appointment needed.",
      },
      sentAt: "2026-10-21T14:10:00.000Z",
      read: true,
    },
    {
      id: "msg-4009",
      conversationId: "con-3003",
      sender: "CUSTOMER",
      body: {
        tr: "Fiyat teklifinizi eşleşen işler sayfasından aldım, teşekkürler.",
        en: "I received your quote on the matched jobs page, thank you.",
      },
      sentAt: "2026-10-21T15:05:00.000Z",
      read: true,
    },
  ],
};

export const panelNotificationsSeed: WorkshopPanelNotification[] = [
  {
    id: "not-5001",
    type: "NEW_MESSAGE",
    title: { tr: "Yeni mesaj", en: "New message" },
    body: {
      tr: "Selin K. şanzıman işi için yarın sabah geleceğini yazdı.",
      en: "Selin K. wrote that she will come tomorrow morning for the transmission job.",
    },
    createdAt: "2026-10-22T18:42:00.000Z",
    read: false,
    href: "/usta-panel/mesajlar",
  },
  {
    id: "not-5002",
    type: "NEW_MATCH",
    title: { tr: "Yeni eşleşen iş", en: "New matched job" },
    body: {
      tr: "Manisa / Şehzadeler'de klima bakımı talebi yayınlandı.",
      en: "An air conditioning request was published in Manisa / Şehzadeler.",
    },
    createdAt: "2026-10-22T07:45:00.000Z",
    read: false,
    href: "/usta-panel/isler",
  },
  {
    id: "not-5003",
    type: "OFFER_ACCEPTED",
    title: { tr: "Teklifiniz kabul edildi", en: "Your offer was accepted" },
    body: {
      tr: "2019 Toyota Corolla şanzıman işi için verdiğiniz teklif kabul edildi.",
      en: "Your offer for the 2019 Toyota Corolla transmission job was accepted.",
    },
    createdAt: "2026-10-21T09:00:00.000Z",
    read: true,
    href: "/usta-panel/teklifler",
  },
  {
    id: "not-5004",
    type: "OFFER_REJECTED",
    title: { tr: "Teklif reddedildi", en: "Offer rejected" },
    body: {
      tr: "Honda Civic kaporta işi için verdiğiniz teklif reddedildi.",
      en: "Your offer for the Honda Civic bodywork job was rejected.",
    },
    createdAt: "2026-10-20T12:45:00.000Z",
    read: true,
    href: "/usta-panel/teklifler",
  },
  {
    id: "not-5005",
    type: "REVIEW_RECEIVED",
    title: { tr: "Yeni değerlendirme", en: "New review" },
    body: {
      tr: "Periyodik bakım işi için 5 yıldızlı bir değerlendirme aldınız.",
      en: "You received a five-star review for a periodic maintenance job.",
    },
    createdAt: "2026-10-19T16:20:00.000Z",
    read: true,
    href: "/usta-panel/yorumlar",
  },
  {
    id: "not-5006",
    type: "REQUEST_COMPLETED",
    title: { tr: "İş tamamlandı", en: "Job completed" },
    body: {
      tr: "Fren bakımı işi müşteri tarafından tamamlandı olarak işaretlendi.",
      en: "The brake service job was marked as completed by the customer.",
    },
    createdAt: "2026-10-18T10:05:00.000Z",
    read: true,
    href: "/usta-panel/isler",
  },
];

export const panelReviewsSeed: WorkshopPanelReview[] = [
  {
    id: "wrev-6001",
    authorName: "Selin K.",
    rating: 5,
    comment: {
      tr: "Şanzıman yağı değişimi öncesinde tüm işlemi anlattılar. Teslim saati birebir tuttu, araç temiz teslim edildi.",
      en: "They explained the whole transmission oil change before starting. The delivery time was exact and the car was returned clean.",
    },
    serviceDate: "2026-10-18",
    vehicleLabel: "2019 Toyota Corolla",
    verified: true,
  },
  {
    id: "wrev-6002",
    authorName: "Mert A.",
    rating: 5,
    comment: {
      tr: "Fren titremesi için disk ve balata değişti. Fiyat baştan söylenen tutardı, ek ücret çıkmadı. Yol testine birlikte çıktık.",
      en: "The discs and pads were replaced for the brake vibration. The price matched the original quote with no extras. We took a test drive together.",
    },
    serviceDate: "2026-10-12",
    vehicleLabel: "2018 Ford Focus",
    verified: true,
  },
  {
    id: "wrev-6003",
    authorName: "Ayşe D.",
    rating: 4,
    comment: {
      tr: "Bakım işi sorunsuz yapıldı. İş yoğunluğu nedeniyle teslim yarım saat gecikti ama önceden haber verildi.",
      en: "The maintenance was done without problems. Delivery was half an hour late due to workload, but I was informed in advance.",
    },
    serviceDate: "2026-10-05",
    vehicleLabel: "2021 Fiat Egea",
    verified: true,
  },
  {
    id: "wrev-6004",
    authorName: "Onur T.",
    rating: 5,
    comment: {
      tr: "Arıza tespiti kısa sürdü ve gereksiz parça değişimi önerilmedi. Motor sesi düzeldi, tekrar geleceğim.",
      en: "The diagnosis was quick and no unnecessary parts were suggested. The engine noise is gone; I will come back.",
    },
    serviceDate: "2026-09-28",
    vehicleLabel: "2017 Volkswagen Passat",
    verified: true,
  },
  {
    id: "wrev-6005",
    authorName: "Deniz Y.",
    rating: 3,
    comment: {
      tr: "İş kalitesi iyiydi ancak randevu saatinde biraz bekleme oldu. Yine de iletişimleri açıktı ve sorunu çözdüler.",
      en: "The work quality was good but there was some waiting at the appointment time. Communication was open and they solved the issue.",
    },
    serviceDate: "2026-09-15",
    vehicleLabel: "2016 Honda Civic",
    verified: false,
  },
];
