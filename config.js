/*
 * EVERYTHING YOU NEED TO EDIT IS IN THIS FILE.
 * Change the text between the quotes, save, and reload the page.
 * Leave a value as "" to show a blank line on the card.
 */
window.WEDDING_CONFIG = {
  couple: {
    // Names as shown on the card. Order: groom first, bride second.
    groom: "Đức Dũng",
    bride: "Thanh Thúy",
    // The photo in the polaroid frame, e.g. "assets/album/web/01.jpg". "" shows an empty frame.
    photo: "",
  },

  announcement: "Trân trọng báo tin lễ thành hôn của con chúng tôi",

  families: {
    groom: {
      title: "Nhà trai",
      father: "",
      mother: "",
      address: "",
    },
    bride: {
      title: "Nhà gái",
      father: "Ông Nguyễn Đức Nhã",
      mother: "Bà Phạm Thị Nụ",
      address: "Thôn An Bình, Xã Nam Tiên Hưng, Tỉnh Hưng Yên",
    },
  },

  // Which event guests see first: "groom" or "bride".
  // A link ending in ?side=groom or ?side=bride overrides this.
  defaultSide: "bride",

  events: {
    groom: {
      label: "Nhà trai",
      title: "Lễ Thành Hôn",
      date: "",                  // year-month-day, e.g. "2026-12-20"
      time: "",                  // start time, 24-hour clock, e.g. "11:00"
      arrival: "",               // guest arrival time, e.g. "10:30"
      durationHours: 3,          // used for the add-to-calendar link
      lunar: "",                 // e.g. "Nhằm ngày 12 tháng 11 năm Bính Ngọ"
      venue: "",
      address: "",
      // What Google Maps should search for: an address, a place name, or coordinates. "" = use address.
      mapQuery: "",
    },
    bride: {
      label: "Nhà gái",
      title: "Lễ Vu Quy",
      date: "",
      time: "",
      arrival: "",
      durationHours: 3,
      lunar: "",
      venue: "Tư gia nhà gái",
      address: "Thôn An Bình, Xã Nam Tiên Hưng, Tỉnh Hưng Yên",
      mapQuery: "20.525148,106.288985",   // exact pin of the bride's house (from the shared Google Maps link)
    },
  },

  album: {
    layout: "grid",           // "masonry" or "grid"
    frames: 6,                // number of empty frames shown while there are no photos
    // List your photos here when you have them, e.g. ["assets/album/web/01.jpg", "assets/album/web/02.jpg"].
    photos: [],
  },

  gift: {
    groom: { bank: "", accountName: "", accountNumber: "", qr: "" },
    bride: { bank: "", accountName: "", accountNumber: "", qr: "" },
  },

  // Background music file. "" = no music. This track was synthesized for this site (no copyright);
  // if you replace it, only use a track you are allowed to publish.
  music: "assets/music.mp3",

  // Google Apps Script web app address that receives RSVPs and wishes.
  // While this is empty, RSVPs and wishes are only kept in the visitor's own browser (nobody receives them).
  sheetEndpoint: "",

  thanks: "Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.",

  // Decorations. Swap a file here to change the artwork.
  decor: {
    leaf: "assets/decor/eucalyptus.svg",
    grain: "assets/decor/wheat.svg",
    flower: "assets/decor/bloom.svg",
  },
};
