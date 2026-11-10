// Kurs verileri. Her ünite: kelimeler (tr <-> hedef dil) ve cümleler.
// Alıştırmalar bu verilerden otomatik olarak üretilir.
const COURSES = {
  en: {
    name: "İngilizce",
    flag: "🇬🇧",
    speechLang: "en-US",
    units: [
      {
        title: "Temel İfadeler",
        icon: "👋",
        words: [
          ["merhaba", "hello"], ["güle güle", "goodbye"], ["evet", "yes"], ["hayır", "no"],
          ["teşekkürler", "thanks"], ["lütfen", "please"], ["günaydın", "good morning"], ["iyi geceler", "good night"],
        ],
        sentences: [
          ["Merhaba, nasılsın?", "Hello, how are you?"],
          ["Ben iyiyim, teşekkürler.", "I am fine, thanks."],
          ["Benim adım Ali.", "My name is Ali."],
          ["Tanıştığıma memnun oldum.", "Nice to meet you."],
          ["Görüşürüz!", "See you!"],
        ],
      },
      {
        title: "Yiyecek ve İçecek",
        icon: "🍎",
        words: [
          ["elma", "apple"], ["ekmek", "bread"], ["su", "water"], ["süt", "milk"],
          ["peynir", "cheese"], ["çay", "tea"], ["kahve", "coffee"], ["yumurta", "egg"],
        ],
        sentences: [
          ["Ben bir elma yerim.", "I eat an apple."],
          ["O su içer.", "She drinks water."],
          ["Biz ekmek ve peynir yeriz.", "We eat bread and cheese."],
          ["Kahve sıcak.", "The coffee is hot."],
          ["Ben çay severim.", "I like tea."],
        ],
      },
      {
        title: "Aile",
        icon: "👨‍👩‍👧",
        words: [
          ["anne", "mother"], ["baba", "father"], ["kardeş", "sibling"], ["kız kardeş", "sister"],
          ["erkek kardeş", "brother"], ["aile", "family"], ["çocuk", "child"], ["bebek", "baby"],
        ],
        sentences: [
          ["Bu benim annem.", "This is my mother."],
          ["Benim bir erkek kardeşim var.", "I have a brother."],
          ["Babam bir doktor.", "My father is a doctor."],
          ["Ailem büyük.", "My family is big."],
          ["Bebek uyuyor.", "The baby is sleeping."],
        ],
      },
      {
        title: "Renkler ve Sayılar",
        icon: "🎨",
        words: [
          ["kırmızı", "red"], ["mavi", "blue"], ["yeşil", "green"], ["sarı", "yellow"],
          ["bir", "one"], ["iki", "two"], ["üç", "three"], ["on", "ten"],
        ],
        sentences: [
          ["Araba kırmızı.", "The car is red."],
          ["Gökyüzü mavi.", "The sky is blue."],
          ["Benim iki kedim var.", "I have two cats."],
          ["Üç elma istiyorum.", "I want three apples."],
          ["Çimen yeşil.", "The grass is green."],
        ],
      },
      {
        title: "Seyahat",
        icon: "✈️",
        words: [
          ["havalimanı", "airport"], ["otel", "hotel"], ["bilet", "ticket"], ["tren", "train"],
          ["harita", "map"], ["pasaport", "passport"], ["plaj", "beach"], ["şehir", "city"],
        ],
        sentences: [
          ["Havalimanı nerede?", "Where is the airport?"],
          ["Bir bilet istiyorum.", "I want a ticket."],
          ["Otel çok güzel.", "The hotel is very nice."],
          ["Tren geç kaldı.", "The train is late."],
          ["Pasaportum burada.", "My passport is here."],
        ],
      },
    ],
  },
  de: {
    name: "Almanca",
    flag: "🇩🇪",
    speechLang: "de-DE",
    units: [
      {
        title: "Temel İfadeler",
        icon: "👋",
        words: [
          ["merhaba", "hallo"], ["güle güle", "tschüss"], ["evet", "ja"], ["hayır", "nein"],
          ["teşekkürler", "danke"], ["lütfen", "bitte"], ["günaydın", "guten Morgen"], ["iyi geceler", "gute Nacht"],
        ],
        sentences: [
          ["Merhaba, nasılsın?", "Hallo, wie geht es dir?"],
          ["Ben iyiyim, teşekkürler.", "Mir geht es gut, danke."],
          ["Benim adım Ali.", "Ich heiße Ali."],
          ["Tanıştığıma memnun oldum.", "Freut mich."],
          ["Görüşürüz!", "Bis später!"],
        ],
      },
      {
        title: "Yiyecek ve İçecek",
        icon: "🍎",
        words: [
          ["elma", "Apfel"], ["ekmek", "Brot"], ["su", "Wasser"], ["süt", "Milch"],
          ["peynir", "Käse"], ["çay", "Tee"], ["kahve", "Kaffee"], ["yumurta", "Ei"],
        ],
        sentences: [
          ["Ben bir elma yerim.", "Ich esse einen Apfel."],
          ["O su içer.", "Sie trinkt Wasser."],
          ["Biz ekmek ve peynir yeriz.", "Wir essen Brot und Käse."],
          ["Kahve sıcak.", "Der Kaffee ist heiß."],
          ["Ben çay severim.", "Ich mag Tee."],
        ],
      },
      {
        title: "Aile",
        icon: "👨‍👩‍👧",
        words: [
          ["anne", "Mutter"], ["baba", "Vater"], ["kız kardeş", "Schwester"], ["erkek kardeş", "Bruder"],
          ["aile", "Familie"], ["çocuk", "Kind"], ["bebek", "Baby"], ["büyükanne", "Oma"],
        ],
        sentences: [
          ["Bu benim annem.", "Das ist meine Mutter."],
          ["Benim bir erkek kardeşim var.", "Ich habe einen Bruder."],
          ["Babam bir doktor.", "Mein Vater ist Arzt."],
          ["Ailem büyük.", "Meine Familie ist groß."],
          ["Bebek uyuyor.", "Das Baby schläft."],
        ],
      },
      {
        title: "Renkler ve Sayılar",
        icon: "🎨",
        words: [
          ["kırmızı", "rot"], ["mavi", "blau"], ["yeşil", "grün"], ["sarı", "gelb"],
          ["bir", "eins"], ["iki", "zwei"], ["üç", "drei"], ["on", "zehn"],
        ],
        sentences: [
          ["Araba kırmızı.", "Das Auto ist rot."],
          ["Gökyüzü mavi.", "Der Himmel ist blau."],
          ["Benim iki kedim var.", "Ich habe zwei Katzen."],
          ["Üç elma istiyorum.", "Ich möchte drei Äpfel."],
          ["Çimen yeşil.", "Das Gras ist grün."],
        ],
      },
    ],
  },
  es: {
    name: "İspanyolca",
    flag: "🇪🇸",
    speechLang: "es-ES",
    units: [
      {
        title: "Temel İfadeler",
        icon: "👋",
        words: [
          ["merhaba", "hola"], ["güle güle", "adiós"], ["evet", "sí"], ["hayır", "no"],
          ["teşekkürler", "gracias"], ["lütfen", "por favor"], ["günaydın", "buenos días"], ["iyi geceler", "buenas noches"],
        ],
        sentences: [
          ["Merhaba, nasılsın?", "Hola, ¿cómo estás?"],
          ["Ben iyiyim, teşekkürler.", "Estoy bien, gracias."],
          ["Benim adım Ali.", "Me llamo Ali."],
          ["Tanıştığıma memnun oldum.", "Mucho gusto."],
          ["Görüşürüz!", "¡Hasta luego!"],
        ],
      },
      {
        title: "Yiyecek ve İçecek",
        icon: "🍎",
        words: [
          ["elma", "manzana"], ["ekmek", "pan"], ["su", "agua"], ["süt", "leche"],
          ["peynir", "queso"], ["çay", "té"], ["kahve", "café"], ["yumurta", "huevo"],
        ],
        sentences: [
          ["Ben bir elma yerim.", "Yo como una manzana."],
          ["O su içer.", "Ella bebe agua."],
          ["Biz ekmek ve peynir yeriz.", "Comemos pan y queso."],
          ["Kahve sıcak.", "El café está caliente."],
          ["Ben çay severim.", "Me gusta el té."],
        ],
      },
      {
        title: "Aile",
        icon: "👨‍👩‍👧",
        words: [
          ["anne", "madre"], ["baba", "padre"], ["kız kardeş", "hermana"], ["erkek kardeş", "hermano"],
          ["aile", "familia"], ["çocuk", "niño"], ["bebek", "bebé"], ["büyükanne", "abuela"],
        ],
        sentences: [
          ["Bu benim annem.", "Esta es mi madre."],
          ["Benim bir erkek kardeşim var.", "Tengo un hermano."],
          ["Babam bir doktor.", "Mi padre es médico."],
          ["Ailem büyük.", "Mi familia es grande."],
          ["Bebek uyuyor.", "El bebé duerme."],
        ],
      },
    ],
  },
};

const LESSONS_PER_UNIT = 3;
