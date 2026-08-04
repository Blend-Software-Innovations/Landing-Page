// Bangladesh administrative geography for the delivery address picker.
//
// The order form previously offered three hardcoded areas (Dhanmondi, Mirpur,
// Uttara) inherited from an older template, so buyers anywhere else in the
// country had nothing to select. This provides all 64 districts and their
// thanas/upazilas for a cascading জেলা -> থানা picker.
//
// Delivery zone is DERIVED from the district rather than picked by the buyer:
// Dhaka metropolitan thanas bill at the inside-Dhaka rate, everything else at
// the outside-Dhaka rate. Both the client and the server use the helpers below,
// so a forged "insideDhaka" in the request body cannot buy a cheaper rate.

export type Thana = { en: string; bn: string };
export type District = {
  en: string;
  bn: string;
  division: string;
  /** Dhaka city corporation thanas — billed at the inside-Dhaka rate. */
  metro?: boolean;
  thanas: Thana[];
};

const t = (en: string, bn: string): Thana => ({ en, bn });

export const DISTRICTS: District[] = [
  // ---------------------------------------------------------------- Dhaka
  {
    en: "Dhaka",
    bn: "ঢাকা",
    division: "Dhaka",
    metro: true,
    thanas: [
      t("Adabar", "আদাবর"),
      t("Badda", "বাড্ডা"),
      t("Bangshal", "বংশাল"),
      t("Bhashantek", "ভাষানটেক"),
      t("Cantonment", "ক্যান্টনমেন্ট"),
      t("Chakbazar", "চকবাজার"),
      t("Dakshinkhan", "দক্ষিণখান"),
      t("Darus Salam", "দারুস সালাম"),
      t("Demra", "ডেমরা"),
      t("Dhanmondi", "ধানমন্ডি"),
      t("Gendaria", "গেন্ডারিয়া"),
      t("Gulshan", "গুলশান"),
      t("Hazaribagh", "হাজারীবাগ"),
      t("Jatrabari", "যাত্রাবাড়ী"),
      t("Kadamtali", "কদমতলী"),
      t("Kafrul", "কাফরুল"),
      t("Kalabagan", "কলাবাগান"),
      t("Kamrangirchar", "কামরাঙ্গীরচর"),
      t("Khilgaon", "খিলগাঁও"),
      t("Khilkhet", "খিলক্ষেত"),
      t("Kotwali", "কোতোয়ালী"),
      t("Lalbagh", "লালবাগ"),
      t("Mirpur", "মিরপুর"),
      t("Mohammadpur", "মোহাম্মদপুর"),
      t("Motijheel", "মতিঝিল"),
      t("Mugda", "মুগদা"),
      t("New Market", "নিউ মার্কেট"),
      t("Pallabi", "পল্লবী"),
      t("Paltan", "পল্টন"),
      t("Ramna", "রমনা"),
      t("Rampura", "রামপুরা"),
      t("Sabujbagh", "সবুজবাগ"),
      t("Shah Ali", "শাহ আলী"),
      t("Shahbagh", "শাহবাগ"),
      t("Sher-e-Bangla Nagar", "শেরেবাংলা নগর"),
      t("Shyampur", "শ্যামপুর"),
      t("Sutrapur", "সূত্রাপুর"),
      t("Tejgaon", "তেজগাঁও"),
      t("Turag", "তুরাগ"),
      t("Uttara", "উত্তরা"),
      t("Uttarkhan", "উত্তরখান"),
      t("Vatara", "ভাটারা"),
      t("Wari", "ওয়ারী"),
      // Dhaka district upazilas outside the city corporation
      t("Savar", "সাভার"),
      t("Dhamrai", "ধামরাই"),
      t("Keraniganj", "কেরানীগঞ্জ"),
      t("Nawabganj", "নবাবগঞ্জ"),
      t("Dohar", "দোহার")
    ]
  },
  {
    en: "Gazipur",
    bn: "গাজীপুর",
    division: "Dhaka",
    thanas: [
      t("Gazipur Sadar", "গাজীপুর সদর"),
      t("Kaliakair", "কালিয়াকৈর"),
      t("Kaliganj", "কালীগঞ্জ"),
      t("Kapasia", "কাপাসিয়া"),
      t("Sreepur", "শ্রীপুর"),
      t("Tongi", "টঙ্গী")
    ]
  },
  {
    en: "Narayanganj",
    bn: "নারায়ণগঞ্জ",
    division: "Dhaka",
    thanas: [
      t("Narayanganj Sadar", "নারায়ণগঞ্জ সদর"),
      t("Araihazar", "আড়াইহাজার"),
      t("Bandar", "বন্দর"),
      t("Rupganj", "রূপগঞ্জ"),
      t("Sonargaon", "সোনারগাঁও"),
      t("Siddhirganj", "সিদ্ধিরগঞ্জ")
    ]
  },
  {
    en: "Narsingdi",
    bn: "নরসিংদী",
    division: "Dhaka",
    thanas: [
      t("Narsingdi Sadar", "নরসিংদী সদর"),
      t("Belabo", "বেলাবো"),
      t("Monohardi", "মনোহরদী"),
      t("Palash", "পলাশ"),
      t("Raipura", "রায়পুরা"),
      t("Shibpur", "শিবপুর")
    ]
  },
  {
    en: "Munshiganj",
    bn: "মুন্সিগঞ্জ",
    division: "Dhaka",
    thanas: [
      t("Munshiganj Sadar", "মুন্সিগঞ্জ সদর"),
      t("Gazaria", "গজারিয়া"),
      t("Lohajang", "লৌহজং"),
      t("Sirajdikhan", "সিরাজদিখান"),
      t("Sreenagar", "শ্রীনগর"),
      t("Tongibari", "টংগীবাড়ী")
    ]
  },
  {
    en: "Manikganj",
    bn: "মানিকগঞ্জ",
    division: "Dhaka",
    thanas: [
      t("Manikganj Sadar", "মানিকগঞ্জ সদর"),
      t("Daulatpur", "দৌলতপুর"),
      t("Ghior", "ঘিওর"),
      t("Harirampur", "হরিরামপুর"),
      t("Saturia", "সাটুরিয়া"),
      t("Shibalaya", "শিবালয়"),
      t("Singair", "সিংগাইর")
    ]
  },
  {
    en: "Tangail",
    bn: "টাঙ্গাইল",
    division: "Dhaka",
    thanas: [
      t("Tangail Sadar", "টাঙ্গাইল সদর"),
      t("Basail", "বাসাইল"),
      t("Bhuapur", "ভুয়াপুর"),
      t("Delduar", "দেলদুয়ার"),
      t("Dhanbari", "ধনবাড়ী"),
      t("Ghatail", "ঘাটাইল"),
      t("Gopalpur", "গোপালপুর"),
      t("Kalihati", "কালিহাতী"),
      t("Madhupur", "মধুপুর"),
      t("Mirzapur", "মির্জাপুর"),
      t("Nagarpur", "নাগরপুর"),
      t("Sakhipur", "সখিপুর")
    ]
  },
  {
    en: "Kishoreganj",
    bn: "কিশোরগঞ্জ",
    division: "Dhaka",
    thanas: [
      t("Kishoreganj Sadar", "কিশোরগঞ্জ সদর"),
      t("Austagram", "অষ্টগ্রাম"),
      t("Bajitpur", "বাজিতপুর"),
      t("Bhairab", "ভৈরব"),
      t("Hossainpur", "হোসেনপুর"),
      t("Itna", "ইটনা"),
      t("Karimganj", "করিমগঞ্জ"),
      t("Katiadi", "কটিয়াদী"),
      t("Kuliarchar", "কুলিয়ারচর"),
      t("Mithamain", "মিঠামইন"),
      t("Nikli", "নিকলী"),
      t("Pakundia", "পাকুন্দিয়া"),
      t("Tarail", "তাড়াইল")
    ]
  },
  {
    en: "Faridpur",
    bn: "ফরিদপুর",
    division: "Dhaka",
    thanas: [
      t("Faridpur Sadar", "ফরিদপুর সদর"),
      t("Alfadanga", "আলফাডাঙ্গা"),
      t("Bhanga", "ভাঙ্গা"),
      t("Boalmari", "বোয়ালমারী"),
      t("Charbhadrasan", "চরভদ্রাসন"),
      t("Madhukhali", "মধুখালী"),
      t("Nagarkanda", "নগরকান্দা"),
      t("Sadarpur", "সদরপুর"),
      t("Saltha", "সালথা")
    ]
  },
  {
    en: "Gopalganj",
    bn: "গোপালগঞ্জ",
    division: "Dhaka",
    thanas: [
      t("Gopalganj Sadar", "গোপালগঞ্জ সদর"),
      t("Kashiani", "কাশিয়ানী"),
      t("Kotalipara", "কোটালীপাড়া"),
      t("Muksudpur", "মুকসুদপুর"),
      t("Tungipara", "টুঙ্গিপাড়া")
    ]
  },
  {
    en: "Madaripur",
    bn: "মাদারীপুর",
    division: "Dhaka",
    thanas: [
      t("Madaripur Sadar", "মাদারীপুর সদর"),
      t("Kalkini", "কালকিনি"),
      t("Rajoir", "রাজৈর"),
      t("Shibchar", "শিবচর")
    ]
  },
  {
    en: "Shariatpur",
    bn: "শরীয়তপুর",
    division: "Dhaka",
    thanas: [
      t("Shariatpur Sadar", "শরীয়তপুর সদর"),
      t("Bhedarganj", "ভেদরগঞ্জ"),
      t("Damudya", "ডামুড্যা"),
      t("Gosairhat", "গোসাইরহাট"),
      t("Naria", "নড়িয়া"),
      t("Zajira", "জাজিরা")
    ]
  },
  {
    en: "Rajbari",
    bn: "রাজবাড়ী",
    division: "Dhaka",
    thanas: [
      t("Rajbari Sadar", "রাজবাড়ী সদর"),
      t("Baliakandi", "বালিয়াকান্দি"),
      t("Goalandaghat", "গোয়ালন্দ ঘাট"),
      t("Kalukhali", "কালুখালী"),
      t("Pangsha", "পাংশা")
    ]
  },

  // ------------------------------------------------------------ Chattogram
  {
    en: "Chattogram",
    bn: "চট্টগ্রাম",
    division: "Chattogram",
    thanas: [
      t("Kotwali", "কোতোয়ালী"),
      t("Pahartali", "পাহাড়তলী"),
      t("Panchlaish", "পাঁচলাইশ"),
      t("Double Mooring", "ডবলমুরিং"),
      t("Halishahar", "হালিশহর"),
      t("Bayezid Bostami", "বায়েজিদ বোস্তামী"),
      t("Chandgaon", "চান্দগাঁও"),
      t("Patenga", "পতেঙ্গা"),
      t("Anwara", "আনোয়ারা"),
      t("Banshkhali", "বাঁশখালী"),
      t("Boalkhali", "বোয়ালখালী"),
      t("Chandanaish", "চন্দনাইশ"),
      t("Fatikchhari", "ফটিকছড়ি"),
      t("Hathazari", "হাটহাজারী"),
      t("Lohagara", "লোহাগাড়া"),
      t("Mirsharai", "মীরসরাই"),
      t("Patiya", "পটিয়া"),
      t("Rangunia", "রাঙ্গুনিয়া"),
      t("Raozan", "রাউজান"),
      t("Sandwip", "সন্দ্বীপ"),
      t("Satkania", "সাতকানিয়া"),
      t("Sitakunda", "সীতাকুণ্ড")
    ]
  },
  {
    en: "Cumilla",
    bn: "কুমিল্লা",
    division: "Chattogram",
    thanas: [
      t("Cumilla Sadar", "কুমিল্লা সদর"),
      t("Barura", "বরুড়া"),
      t("Brahmanpara", "ব্রাহ্মণপাড়া"),
      t("Burichang", "বুড়িচং"),
      t("Chandina", "চান্দিনা"),
      t("Chauddagram", "চৌদ্দগ্রাম"),
      t("Daudkandi", "দাউদকান্দি"),
      t("Debidwar", "দেবিদ্বার"),
      t("Homna", "হোমনা"),
      t("Laksam", "লাকসাম"),
      t("Meghna", "মেঘনা"),
      t("Monohorgonj", "মনোহরগঞ্জ"),
      t("Muradnagar", "মুরাদনগর"),
      t("Nangalkot", "নাঙ্গলকোট"),
      t("Titas", "তিতাস")
    ]
  },
  {
    en: "Cox's Bazar",
    bn: "কক্সবাজার",
    division: "Chattogram",
    thanas: [
      t("Cox's Bazar Sadar", "কক্সবাজার সদর"),
      t("Chakaria", "চকরিয়া"),
      t("Kutubdia", "কুতুবদিয়া"),
      t("Maheshkhali", "মহেশখালী"),
      t("Ramu", "রামু"),
      t("Teknaf", "টেকনাফ"),
      t("Ukhia", "উখিয়া"),
      t("Pekua", "পেকুয়া")
    ]
  },
  {
    en: "Brahmanbaria",
    bn: "ব্রাহ্মণবাড়িয়া",
    division: "Chattogram",
    thanas: [
      t("Brahmanbaria Sadar", "ব্রাহ্মণবাড়িয়া সদর"),
      t("Akhaura", "আখাউড়া"),
      t("Ashuganj", "আশুগঞ্জ"),
      t("Bancharampur", "বাঞ্ছারামপুর"),
      t("Bijoynagar", "বিজয়নগর"),
      t("Kasba", "কসবা"),
      t("Nabinagar", "নবীনগর"),
      t("Nasirnagar", "নাসিরনগর"),
      t("Sarail", "সরাইল")
    ]
  },
  {
    en: "Chandpur",
    bn: "চাঁদপুর",
    division: "Chattogram",
    thanas: [
      t("Chandpur Sadar", "চাঁদপুর সদর"),
      t("Faridganj", "ফরিদগঞ্জ"),
      t("Haimchar", "হাইমচর"),
      t("Hajiganj", "হাজীগঞ্জ"),
      t("Kachua", "কচুয়া"),
      t("Matlab Dakshin", "মতলব দক্ষিণ"),
      t("Matlab Uttar", "মতলব উত্তর"),
      t("Shahrasti", "শাহরাস্তি")
    ]
  },
  {
    en: "Noakhali",
    bn: "নোয়াখালী",
    division: "Chattogram",
    thanas: [
      t("Noakhali Sadar", "নোয়াখালী সদর"),
      t("Begumganj", "বেগমগঞ্জ"),
      t("Chatkhil", "চাটখিল"),
      t("Companiganj", "কোম্পানীগঞ্জ"),
      t("Hatiya", "হাতিয়া"),
      t("Kabirhat", "কবিরহাট"),
      t("Senbagh", "সেনবাগ"),
      t("Sonaimuri", "সোনাইমুড়ী"),
      t("Subarnachar", "সুবর্ণচর")
    ]
  },
  {
    en: "Feni",
    bn: "ফেনী",
    division: "Chattogram",
    thanas: [
      t("Feni Sadar", "ফেনী সদর"),
      t("Chhagalnaiya", "ছাগলনাইয়া"),
      t("Daganbhuiyan", "দাগনভূঞা"),
      t("Fulgazi", "ফুলগাজী"),
      t("Parshuram", "পরশুরাম"),
      t("Sonagazi", "সোনাগাজী")
    ]
  },
  {
    en: "Lakshmipur",
    bn: "লক্ষ্মীপুর",
    division: "Chattogram",
    thanas: [
      t("Lakshmipur Sadar", "লক্ষ্মীপুর সদর"),
      t("Kamalnagar", "কমলনগর"),
      t("Raipur", "রায়পুর"),
      t("Ramganj", "রামগঞ্জ"),
      t("Ramgati", "রামগতি")
    ]
  },
  {
    en: "Rangamati",
    bn: "রাঙ্গামাটি",
    division: "Chattogram",
    thanas: [
      t("Rangamati Sadar", "রাঙ্গামাটি সদর"),
      t("Baghaichhari", "বাঘাইছড়ি"),
      t("Barkal", "বরকল"),
      t("Belaichhari", "বিলাইছড়ি"),
      t("Kaptai", "কাপ্তাই"),
      t("Juraichhari", "জুরাছড়ি"),
      t("Langadu", "লংগদু"),
      t("Naniarchar", "নানিয়ারচর"),
      t("Rajasthali", "রাজস্থলী"),
      t("Kaukhali", "কাউখালী")
    ]
  },
  {
    en: "Khagrachhari",
    bn: "খাগড়াছড়ি",
    division: "Chattogram",
    thanas: [
      t("Khagrachhari Sadar", "খাগড়াছড়ি সদর"),
      t("Dighinala", "দীঘিনালা"),
      t("Lakshmichhari", "লক্ষ্মীছড়ি"),
      t("Mahalchhari", "মহালছড়ি"),
      t("Manikchhari", "মানিকছড়ি"),
      t("Matiranga", "মাটিরাঙ্গা"),
      t("Panchhari", "পানছড়ি"),
      t("Ramgarh", "রামগড়")
    ]
  },
  {
    en: "Bandarban",
    bn: "বান্দরবান",
    division: "Chattogram",
    thanas: [
      t("Bandarban Sadar", "বান্দরবান সদর"),
      t("Alikadam", "আলীকদম"),
      t("Lama", "লামা"),
      t("Naikhongchhari", "নাইক্ষ্যংছড়ি"),
      t("Rowangchhari", "রোয়াংছড়ি"),
      t("Ruma", "রুমা"),
      t("Thanchi", "থানচি")
    ]
  },

  // --------------------------------------------------------------- Khulna
  {
    en: "Khulna",
    bn: "খুলনা",
    division: "Khulna",
    thanas: [
      t("Khulna Sadar", "খুলনা সদর"),
      t("Sonadanga", "সোনাডাঙ্গা"),
      t("Khalishpur", "খালিশপুর"),
      t("Daulatpur", "দৌলতপুর"),
      t("Batiaghata", "বটিয়াঘাটা"),
      t("Dacope", "দাকোপ"),
      t("Dighalia", "দিঘলিয়া"),
      t("Dumuria", "ডুমুরিয়া"),
      t("Koyra", "কয়রা"),
      t("Paikgachha", "পাইকগাছা"),
      t("Phultala", "ফুলতলা"),
      t("Rupsha", "রূপসা"),
      t("Terokhada", "তেরখাদা")
    ]
  },
  {
    en: "Jashore",
    bn: "যশোর",
    division: "Khulna",
    thanas: [
      t("Jashore Sadar", "যশোর সদর"),
      t("Abhaynagar", "অভয়নগর"),
      t("Bagherpara", "বাঘারপাড়া"),
      t("Chaugachha", "চৌগাছা"),
      t("Jhikargachha", "ঝিকরগাছা"),
      t("Keshabpur", "কেশবপুর"),
      t("Manirampur", "মণিরামপুর"),
      t("Sharsha", "শার্শা")
    ]
  },
  {
    en: "Kushtia",
    bn: "কুষ্টিয়া",
    division: "Khulna",
    thanas: [
      t("Kushtia Sadar", "কুষ্টিয়া সদর"),
      t("Bheramara", "ভেড়ামারা"),
      t("Daulatpur", "দৌলতপুর"),
      t("Khoksa", "খোকসা"),
      t("Kumarkhali", "কুমারখালী"),
      t("Mirpur", "মিরপুর")
    ]
  },
  {
    en: "Satkhira",
    bn: "সাতক্ষীরা",
    division: "Khulna",
    thanas: [
      t("Satkhira Sadar", "সাতক্ষীরা সদর"),
      t("Assasuni", "আশাশুনি"),
      t("Debhata", "দেবহাটা"),
      t("Kalaroa", "কলারোয়া"),
      t("Kaliganj", "কালীগঞ্জ"),
      t("Shyamnagar", "শ্যামনগর"),
      t("Tala", "তালা")
    ]
  },
  {
    en: "Bagerhat",
    bn: "বাগেরহাট",
    division: "Khulna",
    thanas: [
      t("Bagerhat Sadar", "বাগেরহাট সদর"),
      t("Chitalmari", "চিতলমারী"),
      t("Fakirhat", "ফকিরহাট"),
      t("Kachua", "কচুয়া"),
      t("Mollahat", "মোল্লাহাট"),
      t("Mongla", "মোংলা"),
      t("Morrelganj", "মোড়েলগঞ্জ"),
      t("Rampal", "রামপাল"),
      t("Sarankhola", "শরণখোলা")
    ]
  },
  {
    en: "Jhenaidah",
    bn: "ঝিনাইদহ",
    division: "Khulna",
    thanas: [
      t("Jhenaidah Sadar", "ঝিনাইদহ সদর"),
      t("Harinakunda", "হরিণাকুণ্ডু"),
      t("Kaliganj", "কালীগঞ্জ"),
      t("Kotchandpur", "কোটচাঁদপুর"),
      t("Maheshpur", "মহেশপুর"),
      t("Shailkupa", "শৈলকুপা")
    ]
  },
  {
    en: "Chuadanga",
    bn: "চুয়াডাঙ্গা",
    division: "Khulna",
    thanas: [
      t("Chuadanga Sadar", "চুয়াডাঙ্গা সদর"),
      t("Alamdanga", "আলমডাঙ্গা"),
      t("Damurhuda", "দামুড়হুদা"),
      t("Jibannagar", "জীবননগর")
    ]
  },
  {
    en: "Magura",
    bn: "মাগুরা",
    division: "Khulna",
    thanas: [
      t("Magura Sadar", "মাগুরা সদর"),
      t("Mohammadpur", "মহম্মদপুর"),
      t("Shalikha", "শালিখা"),
      t("Sreepur", "শ্রীপুর")
    ]
  },
  {
    en: "Meherpur",
    bn: "মেহেরপুর",
    division: "Khulna",
    thanas: [t("Meherpur Sadar", "মেহেরপুর সদর"), t("Gangni", "গাংনী"), t("Mujibnagar", "মুজিবনগর")]
  },
  {
    en: "Narail",
    bn: "নড়াইল",
    division: "Khulna",
    thanas: [t("Narail Sadar", "নড়াইল সদর"), t("Kalia", "কালিয়া"), t("Lohagara", "লোহাগড়া")]
  },

  // -------------------------------------------------------------- Rajshahi
  {
    en: "Rajshahi",
    bn: "রাজশাহী",
    division: "Rajshahi",
    thanas: [
      t("Rajshahi Sadar (Boalia)", "রাজশাহী সদর (বোয়ালিয়া)"),
      t("Motihar", "মতিহার"),
      t("Rajpara", "রাজপাড়া"),
      t("Shah Makhdum", "শাহ মখদুম"),
      t("Bagha", "বাঘা"),
      t("Bagmara", "বাগমারা"),
      t("Charghat", "চারঘাট"),
      t("Durgapur", "দুর্গাপুর"),
      t("Godagari", "গোদাগাড়ী"),
      t("Mohanpur", "মোহনপুর"),
      t("Paba", "পবা"),
      t("Puthia", "পুঠিয়া"),
      t("Tanore", "তানোর")
    ]
  },
  {
    en: "Bogura",
    bn: "বগুড়া",
    division: "Rajshahi",
    thanas: [
      t("Bogura Sadar", "বগুড়া সদর"),
      t("Adamdighi", "আদমদীঘি"),
      t("Dhunat", "ধুনট"),
      t("Dhupchanchia", "দুপচাঁচিয়া"),
      t("Gabtali", "গাবতলী"),
      t("Kahaloo", "কাহালু"),
      t("Nandigram", "নন্দীগ্রাম"),
      t("Sariakandi", "সারিয়াকান্দি"),
      t("Shajahanpur", "শাজাহানপুর"),
      t("Sherpur", "শেরপুর"),
      t("Shibganj", "শিবগঞ্জ"),
      t("Sonatala", "সোনাতলা")
    ]
  },
  {
    en: "Pabna",
    bn: "পাবনা",
    division: "Rajshahi",
    thanas: [
      t("Pabna Sadar", "পাবনা সদর"),
      t("Atgharia", "আটঘরিয়া"),
      t("Bera", "বেড়া"),
      t("Bhangura", "ভাঙ্গুড়া"),
      t("Chatmohar", "চাটমোহর"),
      t("Faridpur", "ফরিদপুর"),
      t("Ishwardi", "ঈশ্বরদী"),
      t("Santhia", "সাঁথিয়া"),
      t("Sujanagar", "সুজানগর")
    ]
  },
  {
    en: "Sirajganj",
    bn: "সিরাজগঞ্জ",
    division: "Rajshahi",
    thanas: [
      t("Sirajganj Sadar", "সিরাজগঞ্জ সদর"),
      t("Belkuchi", "বেলকুচি"),
      t("Chauhali", "চৌহালী"),
      t("Kamarkhanda", "কামারখন্দ"),
      t("Kazipur", "কাজীপুর"),
      t("Raiganj", "রায়গঞ্জ"),
      t("Shahjadpur", "শাহজাদপুর"),
      t("Tarash", "তাড়াশ"),
      t("Ullapara", "উল্লাপাড়া")
    ]
  },
  {
    en: "Naogaon",
    bn: "নওগাঁ",
    division: "Rajshahi",
    thanas: [
      t("Naogaon Sadar", "নওগাঁ সদর"),
      t("Atrai", "আত্রাই"),
      t("Badalgachhi", "বদলগাছী"),
      t("Dhamoirhat", "ধামইরহাট"),
      t("Manda", "মান্দা"),
      t("Mahadebpur", "মহাদেবপুর"),
      t("Niamatpur", "নিয়ামতপুর"),
      t("Patnitala", "পত্নীতলা"),
      t("Porsha", "পোরশা"),
      t("Raninagar", "রাণীনগর"),
      t("Sapahar", "সাপাহার")
    ]
  },
  {
    en: "Natore",
    bn: "নাটোর",
    division: "Rajshahi",
    thanas: [
      t("Natore Sadar", "নাটোর সদর"),
      t("Bagatipara", "বাগাতিপাড়া"),
      t("Baraigram", "বড়াইগ্রাম"),
      t("Gurudaspur", "গুরুদাসপুর"),
      t("Lalpur", "লালপুর"),
      t("Singra", "সিংড়া")
    ]
  },
  {
    en: "Chapainawabganj",
    bn: "চাঁপাইনবাবগঞ্জ",
    division: "Rajshahi",
    thanas: [
      t("Chapainawabganj Sadar", "চাঁপাইনবাবগঞ্জ সদর"),
      t("Bholahat", "ভোলাহাট"),
      t("Gomastapur", "গোমস্তাপুর"),
      t("Nachole", "নাচোল"),
      t("Shibganj", "শিবগঞ্জ")
    ]
  },
  {
    en: "Joypurhat",
    bn: "জয়পুরহাট",
    division: "Rajshahi",
    thanas: [
      t("Joypurhat Sadar", "জয়পুরহাট সদর"),
      t("Akkelpur", "আক্কেলপুর"),
      t("Kalai", "কালাই"),
      t("Khetlal", "ক্ষেতলাল"),
      t("Panchbibi", "পাঁচবিবি")
    ]
  },

  // --------------------------------------------------------------- Rangpur
  {
    en: "Rangpur",
    bn: "রংপুর",
    division: "Rangpur",
    thanas: [
      t("Rangpur Sadar", "রংপুর সদর"),
      t("Badarganj", "বদরগঞ্জ"),
      t("Gangachara", "গংগাচড়া"),
      t("Kaunia", "কাউনিয়া"),
      t("Mithapukur", "মিঠাপুকুর"),
      t("Pirgachha", "পীরগাছা"),
      t("Pirganj", "পীরগঞ্জ"),
      t("Taraganj", "তারাগঞ্জ")
    ]
  },
  {
    en: "Dinajpur",
    bn: "দিনাজপুর",
    division: "Rangpur",
    thanas: [
      t("Dinajpur Sadar", "দিনাজপুর সদর"),
      t("Birampur", "বিরামপুর"),
      t("Birganj", "বীরগঞ্জ"),
      t("Biral", "বিরল"),
      t("Bochaganj", "বোচাগঞ্জ"),
      t("Chirirbandar", "চিরিরবন্দর"),
      t("Phulbari", "ফুলবাড়ী"),
      t("Ghoraghat", "ঘোড়াঘাট"),
      t("Hakimpur", "হাকিমপুর"),
      t("Kaharole", "কাহারোল"),
      t("Khansama", "খানসামা"),
      t("Nawabganj", "নবাবগঞ্জ"),
      t("Parbatipur", "পার্বতীপুর")
    ]
  },
  {
    en: "Gaibandha",
    bn: "গাইবান্ধা",
    division: "Rangpur",
    thanas: [
      t("Gaibandha Sadar", "গাইবান্ধা সদর"),
      t("Fulchhari", "ফুলছড়ি"),
      t("Gobindaganj", "গোবিন্দগঞ্জ"),
      t("Palashbari", "পলাশবাড়ী"),
      t("Sadullapur", "সাদুল্লাপুর"),
      t("Saghata", "সাঘাটা"),
      t("Sundarganj", "সুন্দরগঞ্জ")
    ]
  },
  {
    en: "Kurigram",
    bn: "কুড়িগ্রাম",
    division: "Rangpur",
    thanas: [
      t("Kurigram Sadar", "কুড়িগ্রাম সদর"),
      t("Bhurungamari", "ভুরুঙ্গামারী"),
      t("Char Rajibpur", "চর রাজিবপুর"),
      t("Chilmari", "চিলমারী"),
      t("Phulbari", "ফুলবাড়ী"),
      t("Nageshwari", "নাগেশ্বরী"),
      t("Rajarhat", "রাজারহাট"),
      t("Raomari", "রৌমারী"),
      t("Ulipur", "উলিপুর")
    ]
  },
  {
    en: "Nilphamari",
    bn: "নীলফামারী",
    division: "Rangpur",
    thanas: [
      t("Nilphamari Sadar", "নীলফামারী সদর"),
      t("Dimla", "ডিমলা"),
      t("Domar", "ডোমার"),
      t("Jaldhaka", "জলঢাকা"),
      t("Kishoreganj", "কিশোরগঞ্জ"),
      t("Saidpur", "সৈয়দপুর")
    ]
  },
  {
    en: "Lalmonirhat",
    bn: "লালমনিরহাট",
    division: "Rangpur",
    thanas: [
      t("Lalmonirhat Sadar", "লালমনিরহাট সদর"),
      t("Aditmari", "আদিতমারী"),
      t("Hatibandha", "হাতীবান্ধা"),
      t("Kaliganj", "কালীগঞ্জ"),
      t("Patgram", "পাটগ্রাম")
    ]
  },
  {
    en: "Thakurgaon",
    bn: "ঠাকুরগাঁও",
    division: "Rangpur",
    thanas: [
      t("Thakurgaon Sadar", "ঠাকুরগাঁও সদর"),
      t("Baliadangi", "বালিয়াডাঙ্গী"),
      t("Haripur", "হরিপুর"),
      t("Pirganj", "পীরগঞ্জ"),
      t("Ranisankail", "রাণীশংকৈল")
    ]
  },
  {
    en: "Panchagarh",
    bn: "পঞ্চগড়",
    division: "Rangpur",
    thanas: [
      t("Panchagarh Sadar", "পঞ্চগড় সদর"),
      t("Atwari", "আটোয়ারী"),
      t("Boda", "বোদা"),
      t("Debiganj", "দেবীগঞ্জ"),
      t("Tetulia", "তেঁতুলিয়া")
    ]
  },

  // ---------------------------------------------------------------- Sylhet
  {
    en: "Sylhet",
    bn: "সিলেট",
    division: "Sylhet",
    thanas: [
      t("Sylhet Sadar", "সিলেট সদর"),
      t("Balaganj", "বালাগঞ্জ"),
      t("Beanibazar", "বিয়ানীবাজার"),
      t("Bishwanath", "বিশ্বনাথ"),
      t("Companiganj", "কোম্পানীগঞ্জ"),
      t("Dakshin Surma", "দক্ষিণ সুরমা"),
      t("Fenchuganj", "ফেঞ্চুগঞ্জ"),
      t("Golapganj", "গোলাপগঞ্জ"),
      t("Gowainghat", "গোয়াইনঘাট"),
      t("Jaintiapur", "জৈন্তাপুর"),
      t("Kanaighat", "কানাইঘাট"),
      t("Osmani Nagar", "ওসমানী নগর"),
      t("Zakiganj", "জকিগঞ্জ")
    ]
  },
  {
    en: "Moulvibazar",
    bn: "মৌলভীবাজার",
    division: "Sylhet",
    thanas: [
      t("Moulvibazar Sadar", "মৌলভীবাজার সদর"),
      t("Barlekha", "বড়লেখা"),
      t("Juri", "জুড়ী"),
      t("Kamalganj", "কমলগঞ্জ"),
      t("Kulaura", "কুলাউড়া"),
      t("Rajnagar", "রাজনগর"),
      t("Sreemangal", "শ্রীমঙ্গল")
    ]
  },
  {
    en: "Habiganj",
    bn: "হবিগঞ্জ",
    division: "Sylhet",
    thanas: [
      t("Habiganj Sadar", "হবিগঞ্জ সদর"),
      t("Ajmiriganj", "আজমিরীগঞ্জ"),
      t("Bahubal", "বাহুবল"),
      t("Baniyachong", "বানিয়াচং"),
      t("Chunarughat", "চুনারুঘাট"),
      t("Lakhai", "লাখাই"),
      t("Madhabpur", "মাধবপুর"),
      t("Nabiganj", "নবীগঞ্জ")
    ]
  },
  {
    en: "Sunamganj",
    bn: "সুনামগঞ্জ",
    division: "Sylhet",
    thanas: [
      t("Sunamganj Sadar", "সুনামগঞ্জ সদর"),
      t("Bishwambarpur", "বিশ্বম্ভরপুর"),
      t("Chhatak", "ছাতক"),
      t("Derai", "দিরাই"),
      t("Dharampasha", "ধর্মপাশা"),
      t("Dowarabazar", "দোয়ারাবাজার"),
      t("Jagannathpur", "জগন্নাথপুর"),
      t("Jamalganj", "জামালগঞ্জ"),
      t("Sulla", "শাল্লা"),
      t("Tahirpur", "তাহিরপুর")
    ]
  },

  // ------------------------------------------------------------- Barishal
  {
    en: "Barishal",
    bn: "বরিশাল",
    division: "Barishal",
    thanas: [
      t("Barishal Sadar", "বরিশাল সদর"),
      t("Agailjhara", "আগৈলঝাড়া"),
      t("Babuganj", "বাবুগঞ্জ"),
      t("Bakerganj", "বাকেরগঞ্জ"),
      t("Banaripara", "বানারীপাড়া"),
      t("Gaurnadi", "গৌরনদী"),
      t("Hizla", "হিজলা"),
      t("Mehendiganj", "মেহেন্দিগঞ্জ"),
      t("Muladi", "মুলাদী"),
      t("Wazirpur", "উজিরপুর")
    ]
  },
  {
    en: "Patuakhali",
    bn: "পটুয়াখালী",
    division: "Barishal",
    thanas: [
      t("Patuakhali Sadar", "পটুয়াখালী সদর"),
      t("Bauphal", "বাউফল"),
      t("Dashmina", "দশমিনা"),
      t("Dumki", "দুমকি"),
      t("Galachipa", "গলাচিপা"),
      t("Kalapara", "কলাপাড়া"),
      t("Mirzaganj", "মির্জাগঞ্জ"),
      t("Rangabali", "রাঙ্গাবালী")
    ]
  },
  {
    en: "Bhola",
    bn: "ভোলা",
    division: "Barishal",
    thanas: [
      t("Bhola Sadar", "ভোলা সদর"),
      t("Burhanuddin", "বোরহানউদ্দিন"),
      t("Char Fasson", "চরফ্যাশন"),
      t("Daulatkhan", "দৌলতখান"),
      t("Lalmohan", "লালমোহন"),
      t("Manpura", "মনপুরা"),
      t("Tazumuddin", "তজুমদ্দিন")
    ]
  },
  {
    en: "Pirojpur",
    bn: "পিরোজপুর",
    division: "Barishal",
    thanas: [
      t("Pirojpur Sadar", "পিরোজপুর সদর"),
      t("Bhandaria", "ভাণ্ডারিয়া"),
      t("Kawkhali", "কাউখালী"),
      t("Mathbaria", "মঠবাড়িয়া"),
      t("Nazirpur", "নাজিরপুর"),
      t("Nesarabad (Swarupkathi)", "নেছারাবাদ (স্বরূপকাঠি)"),
      t("Zianagar", "জিয়ানগর")
    ]
  },
  {
    en: "Jhalokati",
    bn: "ঝালকাঠি",
    division: "Barishal",
    thanas: [
      t("Jhalokati Sadar", "ঝালকাঠি সদর"),
      t("Kathalia", "কাঁঠালিয়া"),
      t("Nalchity", "নলছিটি"),
      t("Rajapur", "রাজাপুর")
    ]
  },
  {
    en: "Barguna",
    bn: "বরগুনা",
    division: "Barishal",
    thanas: [
      t("Barguna Sadar", "বরগুনা সদর"),
      t("Amtali", "আমতলী"),
      t("Bamna", "বামনা"),
      t("Betagi", "বেতাগী"),
      t("Patharghata", "পাথরঘাটা"),
      t("Taltali", "তালতলী")
    ]
  },

  // ------------------------------------------------------------ Mymensingh
  {
    en: "Mymensingh",
    bn: "ময়মনসিংহ",
    division: "Mymensingh",
    thanas: [
      t("Mymensingh Sadar", "ময়মনসিংহ সদর"),
      t("Bhaluka", "ভালুকা"),
      t("Dhobaura", "ধোবাউড়া"),
      t("Fulbaria", "ফুলবাড়ীয়া"),
      t("Gaffargaon", "গফরগাঁও"),
      t("Gauripur", "গৌরীপুর"),
      t("Haluaghat", "হালুয়াঘাট"),
      t("Ishwarganj", "ঈশ্বরগঞ্জ"),
      t("Muktagachha", "মুক্তাগাছা"),
      t("Nandail", "নান্দাইল"),
      t("Phulpur", "ফুলপুর"),
      t("Trishal", "ত্রিশাল"),
      t("Tarakanda", "তারাকান্দা")
    ]
  },
  {
    en: "Jamalpur",
    bn: "জামালপুর",
    division: "Mymensingh",
    thanas: [
      t("Jamalpur Sadar", "জামালপুর সদর"),
      t("Baksiganj", "বকশীগঞ্জ"),
      t("Dewanganj", "দেওয়ানগঞ্জ"),
      t("Islampur", "ইসলামপুর"),
      t("Madarganj", "মাদারগঞ্জ"),
      t("Melandaha", "মেলান্দহ"),
      t("Sarishabari", "সরিষাবাড়ী")
    ]
  },
  {
    en: "Netrokona",
    bn: "নেত্রকোণা",
    division: "Mymensingh",
    thanas: [
      t("Netrokona Sadar", "নেত্রকোণা সদর"),
      t("Atpara", "আটপাড়া"),
      t("Barhatta", "বারহাট্টা"),
      t("Durgapur", "দুর্গাপুর"),
      t("Kalmakanda", "কলমাকান্দা"),
      t("Kendua", "কেন্দুয়া"),
      t("Khaliajuri", "খালিয়াজুরী"),
      t("Madan", "মদন"),
      t("Mohanganj", "মোহনগঞ্জ"),
      t("Purbadhala", "পূর্বধলা")
    ]
  },
  {
    en: "Sherpur",
    bn: "শেরপুর",
    division: "Mymensingh",
    thanas: [
      t("Sherpur Sadar", "শেরপুর সদর"),
      t("Jhenaigati", "ঝিনাইগাতী"),
      t("Nakla", "নকলা"),
      t("Nalitabari", "নালিতাবাড়ী"),
      t("Sreebardi", "শ্রীবরদী")
    ]
  }
];

// ---------------------------------------------------------------------------
// Helpers — shared by the storefront and the order APIs so both agree on the
// zone (and therefore the shipping fee) for a given address.
// ---------------------------------------------------------------------------

export function findDistrict(districtEn: string): District | undefined {
  if (!districtEn) return undefined;
  return DISTRICTS.find((d) => d.en === districtEn);
}

export function getThanas(districtEn: string): Thana[] {
  return findDistrict(districtEn)?.thanas || [];
}

/** Dhaka city thanas bill at the inside-Dhaka rate; the district's own upazilas
 *  (Savar, Dhamrai, Keraniganj, Nawabganj, Dohar) do not. */
const DHAKA_OUTER_UPAZILAS = new Set(["Savar", "Dhamrai", "Keraniganj", "Nawabganj", "Dohar"]);

export function resolveDeliveryZone(districtEn: string, thanaEn: string): "insideDhaka" | "outsideDhaka" {
  const district = findDistrict(districtEn);
  if (!district?.metro) return "outsideDhaka";
  if (thanaEn && DHAKA_OUTER_UPAZILAS.has(thanaEn)) return "outsideDhaka";
  return "insideDhaka";
}

export function isValidLocation(districtEn: string, thanaEn: string): boolean {
  const district = findDistrict(districtEn);
  if (!district) return false;
  if (!thanaEn) return false;
  return district.thanas.some((th) => th.en === thanaEn);
}

export function districtLabel(district: District, lang: "en" | "bn"): string {
  return lang === "bn" ? district.bn : district.en;
}

export function thanaLabel(thana: Thana, lang: "en" | "bn"): string {
  return lang === "bn" ? thana.bn : thana.en;
}
