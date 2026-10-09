import { Alert, Platform } from 'react-native';

import { confirmAction } from './confirmAction';

const options = {
  title: 'Çıkış yapılsın mı?',
  message: 'İstediğin zaman tekrar giriş yapabilirsin.',
  confirmLabel: 'Çıkış yap',
  cancelLabel: 'Vazgeç',
};

describe('confirmAction, native', () => {
  afterEach(() => jest.restoreAllMocks());

  it('Alert açar; onay düğmesi onConfirm çağırır', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onConfirm = jest.fn();
    confirmAction({ ...options, onConfirm });

    const buttons = alert.mock.calls[0][2] ?? [];
    expect(buttons.map((b) => b.text)).toEqual(['Vazgeç', 'Çıkış yap']);
    expect(onConfirm).not.toHaveBeenCalled();
    buttons[1].onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('"Vazgeç" düğmesi onConfirm çağırmaz', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onConfirm = jest.fn();
    confirmAction({ ...options, onConfirm });

    const cancel = (alert.mock.calls[0][2] ?? [])[0];
    expect(cancel.style).toBe('cancel');
    cancel.onPress?.();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('confirmAction, web', () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
  });
  afterEach(() => {
    window.confirm = originalConfirm;
    jest.restoreAllMocks();
  });

  it('window.confirm true dönerse onConfirm çağrılır, Alert kullanılmaz', () => {
    const alert = jest.spyOn(Alert, 'alert');
    window.confirm = jest.fn(() => true);
    const onConfirm = jest.fn();

    confirmAction({ ...options, onConfirm });

    expect(window.confirm).toHaveBeenCalledWith(`${options.title}\n${options.message}`);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
  });

  it('window.confirm false dönerse onConfirm çağrılmaz', () => {
    window.confirm = jest.fn(() => false);
    const onConfirm = jest.fn();

    confirmAction({ ...options, onConfirm });

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
