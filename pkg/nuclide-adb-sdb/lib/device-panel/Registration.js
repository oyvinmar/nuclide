/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {NuclideUri} from 'nuclide-commons/nuclideUri';
import type {DevicePanelServiceApi} from '../../../nuclide-devices/lib/types';

import UniversalDisposable from 'nuclide-commons/UniversalDisposable';
import {getAdbServiceByNuclideUri} from '../../../nuclide-remote-connection';
import {ATDeviceListProvider} from './ATDeviceListProvider';
import {ATDeviceInfoProvider} from './ATDeviceInfoProvider';
import {ATDeviceProcessesProvider} from './ATDeviceProcessesProvider';
import {ATDeviceStopPackageProvider} from './ATDeviceStopPackageProvider';
import {ATConfigurePathTaskProvider} from './ATConfigurePathTaskProvider';
import {getSdbServiceByNuclideUri} from '../../../nuclide-remote-connection';

const TIZEN = 'tizen';
const ANDROID = 'android';

const tizenSdkFactory = (host: NuclideUri) => getSdbServiceByNuclideUri(host);
const androidSdkFactory = (host: NuclideUri) => getAdbServiceByNuclideUri(host);

export function registerDevicePanelProviders(
  api: DevicePanelServiceApi,
): IDisposable {
  return new UniversalDisposable(
    // list
    api.registerListProvider(
      new ATDeviceListProvider(ANDROID, androidSdkFactory),
    ),
    api.registerListProvider(new ATDeviceListProvider(TIZEN, tizenSdkFactory)),
    // info
    api.registerInfoProvider(
      new ATDeviceInfoProvider(ANDROID, androidSdkFactory),
    ),
    api.registerInfoProvider(new ATDeviceInfoProvider(TIZEN, tizenSdkFactory)),
    // processes
    api.registerProcessesProvider(
      new ATDeviceProcessesProvider(ANDROID, androidSdkFactory),
    ),
    // process tasks
    api.registerProcessTaskProvider(
      new ATDeviceStopPackageProvider(ANDROID, androidSdkFactory),
    ),
    // device type tasks
    api.registerDeviceTypeTaskProvider(
      new ATConfigurePathTaskProvider(ANDROID, androidSdkFactory),
    ),
    api.registerDeviceTypeTaskProvider(
      new ATConfigurePathTaskProvider(TIZEN, tizenSdkFactory),
    ),
  );
}
