/** Giriş, kayıt ve şifre sıfırlama metinleri. Bileşenlere ve servislere metin gömülmez. */
export const authTr = {
  brand: '4Tree',
  back: 'Geri',
  welcome: {
    /** {km} yerine KM_PER_TREE gelir. */
    tagline: 'Her {km} km, gerçek bir ağaç.',
    subtitle: 'Koş ya da yürü, ormanın senin adımlarınla büyüsün.',
    register: 'Hesap oluştur',
    login: 'Giriş yap',
  },
  fields: {
    name: 'Adın',
    namePlaceholder: 'Elif',
    email: 'E-posta',
    emailPlaceholder: 'ad@ornek.com',
    password: 'Şifre',
    passwordHint: 'En az {min} karakter.',
    showPassword: 'Göster',
    hidePassword: 'Gizle',
    showPasswordLabel: 'Şifreyi göster',
    hidePasswordLabel: 'Şifreyi gizle',
  },
  login: {
    title: 'Giriş yap',
    subtitle: 'Ağaçların seni bekliyor.',
    submit: 'Giriş yap',
    submitting: 'Giriş yapılıyor',
    forgot: 'Şifremi unuttum',
    or: 'ya da',
    noAccount: 'Hesabın yok mu?',
    toRegister: 'Hesap oluştur',
  },
  google: {
    action: 'Google ile devam et',
    pending: 'Google açılıyor',
    letter: 'G',
  },
  register: {
    title: 'Hesap oluştur',
    subtitle: 'Her koşun ağacına bir halka ekler.',
    submit: 'Hesap oluştur',
    submitting: 'Hesap oluşturuluyor',
    hasAccount: 'Zaten hesabın var mı?',
    toLogin: 'Giriş yap',
    confirmTitle: 'E-postanı kontrol et',
    /** {email} yerine kullanıcının adresi gelir. */
    confirmMessage: '{email} adresine bir onay bağlantısı gönderdik. Bağlantıya dokun, sonra giriş yap.',
    confirmAction: 'Giriş yap',
  },
  forgot: {
    title: 'Şifreni sıfırla',
    subtitle: 'E-posta adresini yaz, sıfırlama bağlantısını gönderelim.',
    submit: 'Bağlantı gönder',
    submitting: 'Gönderiliyor',
    sentTitle: 'Bağlantı yolda',
    /** {email} yerine kullanıcının adresi gelir. */
    sentMessage:
      'Bu adres kayıtlıysa {email} adresine bir sıfırlama bağlantısı gönderdik. Gelmezse istenmeyen klasörüne de bak.',
    backToLogin: 'Girişe dön',
  },
  retry: 'Tekrar dene',
  validation: {
    nameRequired: 'Adını yaz.',
    emailRequired: 'E-posta adresini yaz.',
    emailInvalid: 'E-posta adresi geçerli görünmüyor.',
    passwordRequired: 'Şifreni yaz.',
    /** {min} yerine en az karakter sayısı gelir. */
    passwordShort: 'Şifre en az {min} karakter olmalı.',
    passwordMismatch: 'Şifreler eşleşmiyor.',
    confirmRequired: 'Şifreni bir kez daha yaz.',
  },
  /** Servis hataları: Supabase'in ham mesajları kullanıcıya gösterilmez, bunlara eşlenir. */
  errors: {
    invalidCredentials: 'E-posta veya şifre hatalı.',
    emailTaken: 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.',
    emailInvalid: 'E-posta adresi geçerli görünmüyor.',
    weakPassword: 'Bu şifre kolay tahmin edilir. Daha uzun ya da farklı bir şifre seç.',
    emailNotConfirmed: 'E-postanı henüz onaylamadın. Gelen kutundaki bağlantıya dokun.',
    signupDisabled: 'Şu an yeni hesap açılamıyor. Biraz sonra tekrar dene.',
    tooManyRequests: 'Çok fazla deneme yaptın. Birkaç dakika sonra tekrar dene.',
    network: 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.',
    unauthenticated: 'Oturumun sona erdi. Tekrar giriş yap.',
    googleFailed: 'Google ile giriş tamamlanamadı. Tekrar dene.',
    linkInvalid: 'Bu bağlantı geçersiz ya da süresi dolmuş. Yeniden iste.',
    samePassword: 'Yeni şifren eskisinden farklı olmalı.',
    generic: 'Bir şeyler ters gitti. Tekrar dene.',
  },
  resetPassword: {
    title: 'Yeni şifre belirle',
    subtitle: 'Hesabına girerken kullanacağın yeni şifreyi yaz.',
    newPassword: 'Yeni şifre',
    confirmPassword: 'Yeni şifre (tekrar)',
    submit: 'Şifreyi kaydet',
    submitting: 'Kaydediliyor',
    cancel: 'Vazgeç',
  },
  link: {
    errorTitle: 'Bağlantı açılamadı',
  },
  signOutError: {
    title: 'Çıkış yapılamadı',
  },
} as const;
