import { createContext, useContext, type ReactNode } from 'react';

import { services as defaultServices } from './defaultServices';
import type { Services } from './types';

const ServicesContext = createContext<Services>(defaultServices);

type Props = {
  /** Verilmezse mock servisler kullanılır. Testlerde istenen servis seti buradan geçirilir. */
  services?: Services;
  children: ReactNode;
};

export function ServicesProvider({ services = defaultServices, children }: Props) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

/** Ekranlar veriye sadece bu hook üzerinden erişir. */
export function useServices(): Services {
  return useContext(ServicesContext);
}
