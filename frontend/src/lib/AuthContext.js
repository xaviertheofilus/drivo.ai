import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

const translations = {
  en: {
    nav: { home: 'Home', personas: 'Personas', history: 'History', settings: 'Settings', analysis: 'Analysis' },
    landing: {
      login: 'Log in',
      getStarted: 'Get Started',
      eyebrow: 'AI Co-Pilot for Every Drive',
      heroLine1: 'Stay Awake.',
      heroLine2: 'Stay Present.',
      heroDesc:
        'DrivoAI keeps you engaged and alert through intelligent conversation that adapts to you — in English or Bahasa Indonesia, with the kind of co-pilot you actually want to talk to.',
      ctaStart: 'Start Your First Drive',
      ctaSeeHow: 'See how it works',
      feature1Title: 'Personalized Persona',
      feature1Desc: 'Choose a template or design your own AI companion in minutes.',
      feature2Title: 'Real-Time Voice',
      feature2Desc: 'Natural spoken conversation, hands-free, bilingual EN / ID.',
      feature3Title: 'Drowsiness Detection',
      feature3Desc: 'Adaptive prompts and alerts when fatigue creeps in.',
      bilingualTitle: 'Bilingual by design',
      bilingualSubtitle: 'Speak naturally in English or Bahasa Indonesia.',
      bilingualDesc: 'Switch on the fly during a drive. DrivoAI follows your language seamlessly.',
      companionTitle: 'Live Companion',
      companionQuote: "Hey, you've been quiet. Everything okay?",
      footerCopy: '© 2026 DrivoAI. Built for safer drives.',
      footerPrivacy: 'Privacy',
      footerTerms: 'Terms',
      heroImageAlt: 'Dark vehicle interior',
    },
    common: {
      en: 'EN',
      id: 'ID',
      auto: 'AUTO',
      back: 'Back',
      save: 'Save',
      saving: 'Saving…',
      loading: 'Loading…',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      activate: 'Activate',
      alreadyActive: 'Already Active',
      active: 'Active',
      then: 'then',
      upload: 'Upload',
      changePhoto: 'Change photo',
      uploadPhoto: 'Upload photo',
      uploadFailed: 'Upload failed',
      english: 'English',
      bahasaIndonesia: 'Bahasa Indonesia',
      driver: 'Driver',
      logout: 'Logout',
    },
    auth: {
      login: 'Log in',
      register: 'Create account',
      email: 'Email',
      password: 'Password',
      fullName: 'Full name',
      confirmPassword: 'Confirm password',
      namePlaceholder: 'Your name',
      emailPlaceholder: 'you@example.com',
      passwordPlaceholder: '••••••••',
      passwordHint: 'Min 8 chars · 1 uppercase · 1 number · 1 special character',
      passwordDescPlaceholder: 'At least 8 chars with uppercase, number, symbol',
      confirmPasswordPlaceholder: 'Re-enter password',
      togglePassword: 'Toggle password visibility',
      sideLoginQuote: "The road is long.\nYou don't drive it alone.",
      sideLoginTagline: 'A voice companion that adapts to you — in EN or ID.',
      sideRegisterTitle: 'A companion who notices when you go quiet.',
      sideRegisterTagline: 'Voice-first. Bilingual. Built for safer drives.',
      passwordsDontMatch: "Passwords don't match",
      welcomeBack: 'Welcome back to DrivoAI',
      welcome: 'Welcome to DrivoAI',
      loginFailed: 'Login failed',
      registrationFailed: 'Registration failed',
      loginDesc: 'Sign in to continue your drive.',
      registerDesc: 'Takes less than a minute.',
      newTo: 'New to DrivoAI?',
      alreadyHave: 'Already have an account?',
    },
    dashboard: {
      title: 'Dashboard',
      activePersona: 'Active Persona',
      changePersona: 'Change Persona',
      choosePersona: 'Choose Persona',
      startSession: 'Start Session',
      starting: 'Starting…',
      talkFirst: 'Talk first',
      noPersonaTitle: 'No persona? Just talk.',
      noPersonaDesc: "Let DrivoAI learn your style from this conversation — you'll get a tailored persona suggestion at the end.",
      startUnassigned: 'Start Unassigned Session',
      recentDrives: 'Recent Drives',
      lastFew: 'Last few sessions',
      viewAll: 'View all',
      noDrives: 'No drives yet. Start one to see it here.',
      greetings: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
      couldNotStartSession: 'Could not start session',
      noPersonaSet: "You haven't set a persona yet.",
    },
    settings: {
      title: 'Settings',
      yourProfile: 'Your profile',
      preferredLanguage: 'Preferred language',
      defaultLanguageHint: 'This is the default language for new sessions. You can switch any time during a drive.',
      profileUpdated: 'Profile updated',
      saveFailed: 'Save failed',
      uploadFailed: 'Upload failed',
      photoUploaded: 'Photo uploaded',
      danger: 'Danger zone',
      dangerText: 'Deleting your account removes all personas and session history. Currently locked—contact support to remove your data.',
      customizeDesc: 'Customize your DrivoAI experience.',
    },
    session: {
      active: 'Active',
      lastReply: 'Last reply',
      listening: 'Listening…',
      typeMessage: 'Type a message to DrivoAI…',
      voiceNotSupported: 'Voice not supported in this browser. Use text input above.',
      end: 'End',
      couldNotEnd: 'Could not end session, try again',
      mute: 'Toggle microphone',
      text: 'Toggle text input',
      micPermissionDenied: 'Microphone permission denied. Use text input.',
      voiceRecognitionError: 'Voice input error. Use text input.',
      connectionIssue: 'Connection issue, try again',
    },
    drowsiness: {
      titleWarning: 'Drowsiness rising',
      titleDanger: 'Critical fatigue',
      messageWarning: 'You seem less responsive. Take a moment to stay engaged.',
      messageDanger: 'High drowsiness detected. Please pull over safely.',
      dismiss: 'Dismiss',
    },
    personaBuilder: {
      step1Describe: 'Step 1 · Describe',
      step1Upload: 'Step 1 · Upload',
      defineTitle: 'Define your companion',
      defineHint: "The more specific you are, the more uniquely they'll talk to you.",
      description: 'Description',
      descriptionPlaceholder: 'Describe who you want your driving companion to be. Their personality, how they talk, what they care about. The more specific, the better.',
      uploadInstead: 'or attach a file instead',
      attachFileOptional: 'Reference file (optional)',
      attachFileHint: 'Attach .txt / .pdf / .docx up to 10MB. We will use it when you generate.',
      attachedFile: 'Attached file',
      chooseFile: 'Choose file',
      removeFile: 'Remove',
      uploadingFile: 'Uploading…',
      fileUploaded: 'File uploaded',
      minWordsHint: (n) => `Minimum ${n} words`,
      minWordsError: (n) => `Please write at least ${n} words.`,
      guideTitle: 'Quick guide (for drivers)',
      guide1: 'Mention your preferred tone (calm / energetic) and how the companion should speak.',
      guide2: 'Add your routine: trip length, time of day, and what usually makes you sleepy.',
      guide3: 'List topics you like: music, football, business, family, jokes, etc.',
      photoOptional: 'Persona photo (optional)',
      photoHint: "This becomes your AI agent's profile photo. PNG/JPG up to 10MB.",
      generating: 'Generating…',
      generatePersona: 'Generate persona',
      couldNotGenerate: 'Could not generate persona',
      dropTitle: 'Drop a reference file',
      dropHint: "We'll read it and design a companion around the voice in your document.",
      sourceDocument: 'Source document',
      dropHere: 'Drop your file here or click to browse',
      formatsHint: '.txt · .pdf · .docx · max 10MB',
      onlyFormats: 'Only .txt, .pdf, .docx supported',
      maxSize: 'Max 10MB',
      readingGenerating: 'Reading & generating…',
      switchToText: 'Switch to text input',
    },
    personaPreview: {
      step2Preview: 'Step 2 · Preview',
      meetTitle: 'Meet your companion',
      meetHint: (n) => `Make adjustments below. You can regenerate up to ${n} times.`,
      name: 'Name',
      personality: 'Personality',
      style: 'Style',
      toneTags: 'Tone tags',
      toneTagsPlaceholder: 'warm, calm, witty',
      voiceTone: 'Voice tone',
      voiceIdOptional: 'Voice ID (optional)',
      voiceIdPlaceholder: 'e.g. Google US English / Microsoft Aria',
      voiceRate: 'Voice rate',
      voicePitch: 'Voice pitch',
      voiceRateHint: '0.6–1.4 (default 1.0)',
      voicePitchHint: '0.6–1.4 (default 1.0)',
      voiceTones: { neutral: 'Neutral', calm: 'Calm', energetic: 'Energetic', warm: 'Warm', serious: 'Serious' },
      sampleDialogue: 'Sample dialogue',
      systemPrompt: 'System prompt',
      systemPromptHint: 'This is exactly how DrivoAI will instruct the model in your sessions.',
      saveActivate: 'Save & activate',
      saveOnly: 'Save without activating',
      regenerate: 'Regenerate',
      regenerateFailed: 'Regenerate failed',
      saveFailed: 'Save failed',
      uploading: 'Uploading…',
      photo: 'Photo',
    },
    historyPage: {
      allDrives: 'All your drives',
      tapHint: 'Tap any session to open its report.',
      loading: 'Loading…',
      noDrives: 'No drives yet. Start a session from the dashboard.',
      unassigned: 'Unassigned',
      flags: (n) => `${n} flags`,
    },
    report: {
      backToDashboard: 'Dashboard',
      driveReport: 'Drive report',
      sessionDebrief: 'Session debrief',
      loading: 'Loading…',
      notFound: 'Not found.',
      runAnalysis: 'Run analysis',
      analysisFailed: 'Analysis failed',
      couldNotAccept: 'Could not accept',
      autoActivated: 'Auto-persona activated',
      topics: 'Topics',
      analyzing: 'Analyzing…',
      drowsinessTimeline: 'Drowsiness timeline',
      autoRecommendation: 'Auto-persona recommendation',
      draftedFromDrive: 'We drafted a companion from this drive',
      discard: 'Discard',
      transcript: 'Transcript',
      viewTurns: (n) => `View ${n} turns`,
      noTurns: 'No turns recorded.',
      you: 'You',
      stats: {
        engagement: 'Engagement',
        tone: 'Tone',
        turns: 'Turns',
        drowsiness: 'Drowsiness',
        overall: 'overall',
        exchanges: 'exchanges',
        high: (n) => `${n} high`,
      },
    },
    personas: {
      title: 'Your Companions',
      pickDesc: 'Pick a template or design your own.',
      fromFile: 'From File',
      createCustom: 'Create Custom',
      prebuilt: 'Prebuilt Templates',
      curated: 'Curated by DrivoAI',
      yourCustom: 'Your Custom',
      yourDesigned: 'Your designed personas',
      loading: 'Loading…',
      activateFailed: 'Activate failed',
      noCustomYet: 'No custom personas yet. Build one in 30 seconds.',
      createFirst: 'Create your first',
      deleteConfirm: (name) => `Delete "${name}"?`,
      deleted: 'Persona deleted',
      saved: 'Persona saved',
      activeNow: (name) => `${name} is now your active persona`,
    },
    history: { title: 'History', viewReport: 'View report' },
  },
  id: {
    nav: { home: 'Beranda', personas: 'Persona', history: 'Riwayat', settings: 'Pengaturan', analysis: 'Analisis' },
    landing: {
      login: 'Masuk',
      getStarted: 'Mulai',
      eyebrow: 'Co-Pilot AI untuk Setiap Perjalanan',
      heroLine1: 'Tetap Sadar.',
      heroLine2: 'Tetap Fokus.',
      heroDesc:
        'DrivoAI membuat kamu tetap terlibat dan waspada lewat percakapan cerdas yang beradaptasi — bisa Bahasa Indonesia atau English, dengan co-pilot yang benar-benar enak diajak ngobrol.',
      ctaStart: 'Mulai Perjalanan Pertama',
      ctaSeeHow: 'Lihat cara kerjanya',
      feature1Title: 'Persona yang Personal',
      feature1Desc: 'Pilih template atau buat pendamping AI kamu sendiri dalam hitungan menit.',
      feature2Title: 'Voice Real-Time',
      feature2Desc: 'Percakapan natural, hands-free, bilingual EN / ID.',
      feature3Title: 'Deteksi Kantuk',
      feature3Desc: 'Prompt adaptif dan peringatan saat kantuk mulai terasa.',
      bilingualTitle: 'Bilingual dari awal',
      bilingualSubtitle: 'Ngobrol natural pakai English atau Bahasa Indonesia.',
      bilingualDesc: 'Bisa ganti bahasa kapan saja saat berkendara. DrivoAI mengikuti dengan mulus.',
      companionTitle: 'Pendamping Live',
      companionQuote: 'Hei, kamu lagi diam. Semuanya aman?',
      footerCopy: '© 2026 DrivoAI. Dibuat untuk perjalanan lebih aman.',
      footerPrivacy: 'Privasi',
      footerTerms: 'Ketentuan',
      heroImageAlt: 'Interior kendaraan gelap',
    },
    common: {
      en: 'EN',
      id: 'ID',
      auto: 'AUTO',
      back: 'Kembali',
      save: 'Simpan',
      saving: 'Menyimpan…',
      loading: 'Memuat…',
      cancel: 'Batal',
      delete: 'Hapus',
      edit: 'Edit',
      activate: 'Aktifkan',
      alreadyActive: 'Sudah Aktif',
      active: 'Aktif',
      then: 'lalu',
      upload: 'Unggah',
      changePhoto: 'Ganti foto',
      uploadPhoto: 'Unggah foto',
      uploadFailed: 'Gagal unggah',
      english: 'English',
      bahasaIndonesia: 'Bahasa Indonesia',
      driver: 'Pengemudi',
      logout: 'Keluar',
    },
    auth: {
      login: 'Masuk',
      register: 'Buat akun',
      email: 'Email',
      password: 'Kata sandi',
      fullName: 'Nama lengkap',
      confirmPassword: 'Konfirmasi kata sandi',
      namePlaceholder: 'Nama kamu',
      emailPlaceholder: 'kamu@email.com',
      passwordPlaceholder: '••••••••',
      passwordHint: 'Min 8 karakter · 1 huruf besar · 1 angka · 1 karakter spesial',
      passwordDescPlaceholder: 'Minimal 8 karakter dengan huruf besar, angka, simbol',
      confirmPasswordPlaceholder: 'Ulangi kata sandi',
      togglePassword: 'Tampilkan/sembunyikan kata sandi',
      sideLoginQuote: 'Perjalanan itu panjang.\nKamu tidak sendirian.',
      sideLoginTagline: 'Pendamping suara yang mengikuti kamu — EN atau ID.',
      sideRegisterTitle: 'Pendamping yang peka saat kamu mulai diam.',
      sideRegisterTagline: 'Voice-first. Bilingual. Untuk perjalanan lebih aman.',
      passwordsDontMatch: 'Kata sandi tidak sama',
      welcomeBack: 'Selamat datang kembali di DrivoAI',
      welcome: 'Selamat datang di DrivoAI',
      loginFailed: 'Gagal masuk',
      registrationFailed: 'Gagal daftar',
      loginDesc: 'Masuk untuk melanjutkan sesi berkendara.',
      registerDesc: 'Kurang dari satu menit.',
      newTo: 'Baru di DrivoAI?',
      alreadyHave: 'Sudah punya akun?',
    },
    dashboard: {
      title: 'Dasbor',
      activePersona: 'Persona Aktif',
      changePersona: 'Ganti Persona',
      choosePersona: 'Pilih Persona',
      startSession: 'Mulai Sesi',
      starting: 'Memulai…',
      talkFirst: 'Ngobrol dulu',
      noPersonaTitle: 'Belum ada persona? Langsung ngobrol.',
      noPersonaDesc: 'Biarkan DrivoAI belajar dari percakapan ini — kamu akan dapat saran persona di akhir sesi.',
      startUnassigned: 'Mulai Sesi Tanpa Persona',
      recentDrives: 'Sesi Terakhir',
      lastFew: 'Beberapa sesi terakhir',
      viewAll: 'Lihat semua',
      noDrives: 'Belum ada sesi. Mulai dulu supaya muncul di sini.',
      greetings: { morning: 'Selamat pagi', afternoon: 'Selamat siang', evening: 'Selamat malam' },
      couldNotStartSession: 'Gagal memulai sesi',
      noPersonaSet: 'Kamu belum memilih persona.',
    },
    settings: {
      title: 'Pengaturan',
      yourProfile: 'Profil kamu',
      preferredLanguage: 'Bahasa pilihan',
      defaultLanguageHint: 'Ini bahasa default untuk sesi baru. Kamu bisa ganti kapan saja saat berkendara.',
      profileUpdated: 'Profil tersimpan',
      saveFailed: 'Gagal menyimpan',
      uploadFailed: 'Gagal unggah',
      photoUploaded: 'Foto terunggah',
      danger: 'Zona berbahaya',
      dangerText: 'Menghapus akun akan menghapus semua persona dan riwayat. Saat ini dikunci—hubungi support untuk menghapus data.',
      customizeDesc: 'Atur pengalaman DrivoAI kamu.',
    },
    session: {
      active: 'Aktif',
      lastReply: 'Balasan terakhir',
      listening: 'Mendengarkan…',
      typeMessage: 'Ketik pesan ke DrivoAI…',
      voiceNotSupported: 'Voice tidak didukung di browser ini. Gunakan input teks di atas.',
      end: 'Selesai',
      couldNotEnd: 'Gagal mengakhiri sesi, coba lagi',
      mute: 'Aktifkan/nonaktifkan mikrofon',
      text: 'Tampilkan/sembunyikan input teks',
      micPermissionDenied: 'Izin mikrofon ditolak. Gunakan input teks.',
      voiceRecognitionError: 'Voice error. Gunakan input teks.',
      connectionIssue: 'Koneksi bermasalah, coba lagi',
    },
    drowsiness: {
      titleWarning: 'Kantuk meningkat',
      titleDanger: 'Kelelahan kritis',
      messageWarning: 'Kamu kelihatan kurang fokus. Ambil napas dan tetap waspada ya.',
      messageDanger: 'Tingkat ngantuk tinggi terdeteksi. Tolong menepi dengan aman.',
      dismiss: 'Tutup',
    },
    personaBuilder: {
      step1Describe: 'Langkah 1 · Deskripsi',
      step1Upload: 'Langkah 1 · Unggah',
      defineTitle: 'Tentukan teman pendampingmu',
      defineHint: 'Semakin spesifik, semakin unik gaya bicaranya ke kamu.',
      description: 'Deskripsi',
      descriptionPlaceholder: 'Jelaskan teman berkendara yang kamu mau. Kepribadiannya, gaya bicara, dan hal yang dia pedulikan. Makin detail makin bagus.',
      uploadInstead: 'atau lampirkan file',
      attachFileOptional: 'File referensi (opsional)',
      attachFileHint: 'Lampirkan .txt / .pdf / .docx maks 10MB. Akan dipakai saat kamu klik generate.',
      attachedFile: 'File terlampir',
      chooseFile: 'Pilih file',
      removeFile: 'Hapus',
      uploadingFile: 'Mengunggah…',
      fileUploaded: 'File terunggah',
      minWordsHint: (n) => `Minimal ${n} kata`,
      minWordsError: (n) => `Tulis minimal ${n} kata dulu ya.`,
      guideTitle: 'Panduan cepat (untuk driver)',
      guide1: 'Sebutkan gaya bicara yang kamu mau (tenang / berenergi) dan cara dia bicara.',
      guide2: 'Tambahkan rutinitas: durasi perjalanan, jam berapa, dan apa yang bikin kamu ngantuk.',
      guide3: 'Tulis topik yang kamu suka: musik, bola, bisnis, keluarga, jokes, dll.',
      photoOptional: 'Foto persona (opsional)',
      photoHint: 'Ini jadi foto profil agen AI kamu. PNG/JPG maks 10MB.',
      generating: 'Membuat…',
      generatePersona: 'Buat persona',
      couldNotGenerate: 'Gagal membuat persona',
      dropTitle: 'Taruh file referensi',
      dropHint: 'Kami akan membaca file dan membentuk persona dari gaya tulisan di dokumenmu.',
      sourceDocument: 'Dokumen sumber',
      dropHere: 'Taruh file di sini atau klik untuk pilih',
      formatsHint: '.txt · .pdf · .docx · maks 10MB',
      onlyFormats: 'Hanya .txt, .pdf, .docx yang didukung',
      maxSize: 'Maks 10MB',
      readingGenerating: 'Membaca & membuat…',
      switchToText: 'Ganti ke input teks',
    },
    personaPreview: {
      step2Preview: 'Langkah 2 · Pratinjau',
      meetTitle: 'Kenali teman pendampingmu',
      meetHint: (n) => `Atur detail di bawah. Kamu bisa regenerate sampai ${n} kali.`,
      name: 'Nama',
      personality: 'Kepribadian',
      style: 'Gaya',
      toneTags: 'Tag nada',
      toneTagsPlaceholder: 'hangat, tenang, lucu',
      voiceTone: 'Nada suara',
      voiceIdOptional: 'Voice ID (opsional)',
      voiceIdPlaceholder: 'contoh: Google US English / Microsoft Aria',
      voiceRate: 'Kecepatan suara',
      voicePitch: 'Pitch suara',
      voiceRateHint: '0.6–1.4 (default 1.0)',
      voicePitchHint: '0.6–1.4 (default 1.0)',
      voiceTones: { neutral: 'Netral', calm: 'Tenang', energetic: 'Berenergi', warm: 'Hangat', serious: 'Serius' },
      sampleDialogue: 'Contoh dialog',
      systemPrompt: 'System prompt',
      systemPromptHint: 'Ini instruksi persis yang dipakai DrivoAI untuk sesi kamu.',
      saveActivate: 'Simpan & aktifkan',
      saveOnly: 'Simpan tanpa mengaktifkan',
      regenerate: 'Regenerate',
      regenerateFailed: 'Regenerate gagal',
      saveFailed: 'Gagal menyimpan',
      uploading: 'Mengunggah…',
      photo: 'Foto',
    },
    historyPage: {
      allDrives: 'Semua sesi kamu',
      tapHint: 'Ketuk sesi untuk membuka laporannya.',
      loading: 'Memuat…',
      noDrives: 'Belum ada sesi. Mulai sesi dari dasbor.',
      unassigned: 'Tanpa persona',
      flags: (n) => `${n} tanda`,
    },
    report: {
      backToDashboard: 'Dasbor',
      driveReport: 'Laporan perjalanan',
      sessionDebrief: 'Ringkasan sesi',
      loading: 'Memuat…',
      notFound: 'Tidak ditemukan.',
      runAnalysis: 'Jalankan analisis',
      analysisFailed: 'Analisis gagal',
      couldNotAccept: 'Gagal menerima',
      autoActivated: 'Auto-persona diaktifkan',
      topics: 'Topik',
      analyzing: 'Menganalisis…',
      drowsinessTimeline: 'Timeline kantuk',
      autoRecommendation: 'Rekomendasi auto-persona',
      draftedFromDrive: 'Kami buat persona dari sesi ini',
      discard: 'Buang',
      transcript: 'Transkrip',
      viewTurns: (n) => `Lihat ${n} turn`,
      noTurns: 'Tidak ada turn tercatat.',
      you: 'Kamu',
      stats: {
        engagement: 'Keterlibatan',
        tone: 'Nada',
        turns: 'Turn',
        drowsiness: 'Kantuk',
        overall: 'overall',
        exchanges: 'pertukaran',
        high: (n) => `${n} tinggi`,
      },
    },
    personas: {
      title: 'Teman Pendampingmu',
      pickDesc: 'Pilih template atau buat persona sendiri.',
      fromFile: 'Dari File',
      createCustom: 'Buat Kustom',
      prebuilt: 'Template Siap Pakai',
      curated: 'Kurasi DrivoAI',
      yourCustom: 'Kustom Kamu',
      yourDesigned: 'Persona buatanmu',
      loading: 'Memuat…',
      activateFailed: 'Gagal mengaktifkan',
      noCustomYet: 'Belum ada persona kustom. Buat satu dalam 30 detik.',
      createFirst: 'Buat yang pertama',
      deleteConfirm: (name) => `Hapus "${name}"?`,
      deleted: 'Persona dihapus',
      saved: 'Persona tersimpan',
      activeNow: (name) => `${name} sekarang aktif`,
    },
    history: { title: 'Riwayat', viewReport: 'Lihat laporan' },
  },
};

function getBrowserLang() {
  try {
    const lang = (navigator.language || 'en').toLowerCase();
    return lang.startsWith('id') ? 'id' : 'en';
  } catch {
    return 'en';
  }
}

function deepGet(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
    else return undefined;
  }
  return cur;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('drivoai_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('drivoai_token'));
  const [bootstrapped, setBootstrapped] = useState(false);
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem('drivoai_lang');
      if (stored === 'en' || stored === 'id') return stored;
    } catch {}
    return getBrowserLang();
  });

  const t = (key, vars) => {
    const lang = language === 'id' ? 'id' : 'en';
    const v = deepGet(translations[lang], key) ?? deepGet(translations.en, key);
    if (typeof v === 'function') return v(vars);
    if (typeof v === 'string') return v;
    return key;
  };

  const tWithLang = (lang, key, vars) => {
    const resolved = lang === 'id' ? 'id' : 'en';
    const v = deepGet(translations[resolved], key) ?? deepGet(translations.en, key);
    if (typeof v === 'function') return v(vars);
    if (typeof v === 'string') return v;
    return key;
  };

  const setLanguage = async (lang, { persist = true } = {}) => {
    const next = lang === 'id' ? 'id' : 'en';
    setLanguageState(next);
    if (persist) {
      try { localStorage.setItem('drivoai_lang', next); } catch {}
    }
    if (token) {
      try {
        const { data } = await api.put('/auth/profile', { language: next });
        setUser(data);
        localStorage.setItem('drivoai_user', JSON.stringify(data));
      } catch {}
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function refreshMe() {
      if (!token) { setBootstrapped(true); return; }
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled) {
          setUser(data);
          localStorage.setItem('drivoai_user', JSON.stringify(data));
          const profileLang = data?.language;
          if (profileLang === 'en' || profileLang === 'id') {
            setLanguageState(profileLang);
            try { localStorage.setItem('drivoai_lang', profileLang); } catch {}
          }
        }
      } catch {
        // ignore; interceptor handles 401
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    }
    refreshMe();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('drivoai_token', data.access_token);
    localStorage.setItem('drivoai_refresh', data.refresh_token);
    localStorage.setItem('drivoai_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (email, password, full_name) => {
    const { data } = await api.post('/auth/register', { email, password, full_name });
    localStorage.setItem('drivoai_token', data.access_token);
    localStorage.setItem('drivoai_refresh', data.refresh_token);
    localStorage.setItem('drivoai_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('drivoai_refresh');
      if (refresh) await api.post('/auth/logout', { refresh_token: refresh });
    } catch {}
    localStorage.removeItem('drivoai_token');
    localStorage.removeItem('drivoai_refresh');
    localStorage.removeItem('drivoai_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (u) => {
    setUser(u);
    localStorage.setItem('drivoai_user', JSON.stringify(u));
    const profileLang = u?.language;
    if (profileLang === 'en' || profileLang === 'id') {
      setLanguageState(profileLang);
      try { localStorage.setItem('drivoai_lang', profileLang); } catch {}
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, bootstrapped, login, register, logout, updateUser, language, setLanguage, t, tWithLang }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
