import { enableProdMode, Injector } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

  interface Window {
      angular: {
          get: <T>(serviceName: string) => T;
      };
  }

platformBrowserDynamic().bootstrapModule(AppModule)
  .then(ref => {
    window['angular'] = ref.injector.get;
  })
  .catch(err => console.error('ERROR *** '+err));
