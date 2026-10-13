import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, type TextInput } from 'react-native';

import { fill, profileTr } from '@/i18n';
import { ServiceError, useServices } from '@/services';
import {
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_MIN_LENGTH,
  checkAvatarInitial,
  checkProfileName,
  deriveAvatarInitial,
  upperCaseTr,
  type ProfilePatch,
} from '@/services/profileRules';
import type { Profile } from '@/types';

import { hapticSuccess } from './haptics';

function nameMessage(issue: keyof typeof profileTr.edit.nameErrors): string {
  return fill(profileTr.edit.nameErrors[issue], { min: PROFILE_NAME_MIN_LENGTH, max: PROFILE_NAME_MAX_LENGTH });
}

function saveMessage(error: unknown): string {
  const errors = profileTr.edit.saveErrors;
  return error instanceof ServiceError ? errors[error.code] : errors.unknown;
}

/**
 * Profil düzenleme formunun durumu: ad, avatar harfi (varsayılan adın baş harfi, istenirse elle seçilen tek harf),
 * satır içi doğrulama ve kaydetme. Kurallar servis katmanıyla ortaktır (services/profileRules).
 * Başarılı kayıttan sonra `onSaved` çağrılır; hata olursa form olduğu gibi kalır.
 */
export function useEditProfileForm(
  profile: Profile,
  onSaved: () => void,
  /** Doğrulama başarısız olunca odaklanılacak alanlar (bileşen oluşturur, ilgili girdiye bağlar). */
  inputs: { name: RefObject<TextInput | null>; letter: RefObject<TextInput | null> },
) {
  const { profile: service } = useServices();
  const storedInitial = upperCaseTr(profile.avatarInitial);
  const [name, setName] = useState(profile.name);
  /** null: harf adın baş harfinden gelir; metin: kullanıcının seçtiği harf. */
  const [customInitial, setCustomInitial] = useState<string | null>(
    storedInitial === deriveAvatarInitial(profile.name) ? null : storedInitial,
  );
  const [nameTouched, setNameTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /** Senkron kilit: state güncellemesi gelmeden aynı tick'te gelen ikinci submit'i de engeller. */
  const lock = useRef(false);
  const mounted = useRef(true);
  /** Başarılı kayıttan sonra ekrandan çıkış serbesttir (onay sorulmaz, engellenmez). */
  const savedRef = useRef(false);
  const dirtyRef = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const nameCheck = checkProfileName(name);
  const derivedInitial = deriveAvatarInitial(name);
  const rawInitial = customInitial ?? derivedInitial;
  const letterCheck = checkAvatarInitial(rawInitial);
  const initial = letterCheck.ok ? letterCheck.value : rawInitial;

  const nameChanged = (nameCheck.ok ? nameCheck.value : name) !== profile.name;
  const initialChanged = initial !== storedInitial;
  const dirty = nameChanged || initialChanged;
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  /** Çıkış denemesi için karar: kayıt sürerken sessizce engelle, kirliyse onay iste, değilse serbest bırak. */
  const leaveDecision = useCallback((): 'allow' | 'block' | 'confirm' => {
    if (savedRef.current) return 'allow';
    if (lock.current) return 'block';
    return dirtyRef.current ? 'confirm' : 'allow';
  }, []);

  // Uzun ad düzeltilemez bir uyarıdır: hemen gösterilir. Diğerleri alan terk edilince ya da kaydetmeyi denerken.
  const nameError =
    !nameCheck.ok && (nameTouched || submitted || nameCheck.issue === 'long') ? nameMessage(nameCheck.issue) : null;
  // Elle yazılan geçersiz karakter hemen, boş harf ise kaydetmeyi denerken bildirilir.
  const letterError = letterCheck.ok
    ? null
    : customInitial === null
      ? submitted
        ? profileTr.edit.letterEmptyFromName
        : null
      : customInitial !== '' || submitted
        ? profileTr.edit.letterError
        : null;

  const changeName = useCallback((text: string) => {
    setName(text);
    setSaveError(null);
  }, []);

  /** Tek harf alanı: yeni yazılan son karakter eskisinin yerini alır. */
  const changeLetter = useCallback((text: string) => {
    const points = Array.from(text);
    setCustomInitial(points.length ? upperCaseTr(points[points.length - 1]) : '');
    setSaveError(null);
  }, []);

  const pickOtherLetter = useCallback(() => setCustomInitial(derivedInitial), [derivedInitial]);
  const useNameLetter = useCallback(() => {
    setCustomInitial(null);
    setSaveError(null);
  }, []);

  const submit = useCallback(async () => {
    if (lock.current) return;
    setSubmitted(true);
    if (!nameCheck.ok) {
      inputs.name.current?.focus();
      return;
    }
    if (!letterCheck.ok) {
      inputs.letter.current?.focus();
      return;
    }
    if (!dirty) return;

    lock.current = true;
    const patch: ProfilePatch = {};
    if (nameChanged) patch.name = nameCheck.value;
    if (initialChanged) patch.avatarInitial = letterCheck.value;

    setSaving(true);
    setSaveError(null);
    try {
      await service.updateProfile(patch);
    } catch (error) {
      lock.current = false;
      if (mounted.current) {
        setSaveError(saveMessage(error));
        setSaving(false);
      }
      return;
    }
    // Kilit açılmaz: kayıt tamamlandı, ikinci kez kaydedilemez. Çıkış serbest.
    savedRef.current = true;
    if (!mounted.current) return;
    setSaving(false);
    setSaved(true);
    hapticSuccess();
    AccessibilityInfo.announceForAccessibility(profileTr.edit.saved);
    onSaved();
  }, [nameCheck, letterCheck, dirty, nameChanged, initialChanged, service, onSaved, inputs]);

  return {
    name,
    changeName,
    onNameBlur: () => setNameTouched(true),
    nameError,
    customInitial,
    derivedInitial,
    initial,
    letterError,
    changeLetter,
    pickOtherLetter,
    useNameLetter,
    /** Avatar rengi kaydedilecek (kırpılmış) addan türer. */
    avatarName: nameCheck.ok ? nameCheck.value : name,
    dirty,
    saving,
    saved,
    leaveDecision,
    saveError,
    submit,
  };
}
