/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 * @format
 * @emails oncall+nuclide
 */

import type {RemoteFileSystem as RemoteFileSystemType} from '../../src/RemoteFileSystem';

import {Observable} from 'rxjs';
import * as vscode from '../../__mocks__/vscode-harness';

const configuration = {
  connectionProfileUpdates: jest.fn(),
};

const Server = jest.fn();
const RemoteFileSystem = jest.fn(function(hostname, server) {
  const disposer = new vscode.EventEmitter();
  this.isDisposed = jest.fn();
  this.onDisposed = jest.fn(listener => disposer.event(listener));
  this.dispose = jest.fn(() => disposer.fire());
  this.getHostname = jest.fn(() => hostname);
});

jest.mock('vscode', () => vscode, {virtual: true});
jest.mock(require.resolve('../../src/configuration'), () => configuration);
jest.mock(require.resolve('../../src/remote/Server'), () => ({Server}));
jest.mock(require.resolve('../../src/RemoteFileSystem'), () => ({
  RemoteFileSystem,
}));

describe('remote', () => {
  let getFilesystems;
  let getFilesystemByHostname;
  let startFilesystems;
  let onEachFilesystem;

  beforeEach(() => {
    // Reimport for each test
    const remote = require('../../src/remote');
    getFilesystems = remote.getFilesystems;
    getFilesystemByHostname = remote.getFilesystemByHostname;
    startFilesystems = remote.startFilesystems;
    onEachFilesystem = remote.onEachFilesystem;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('startFilesystems', () => {
    beforeEach(() => {
      configuration.connectionProfileUpdates.mockImplementation(() =>
        Observable.from([
          {
            kind: 'added',
            profile: {
              folders: ['a', 'b', 'c'],
              hostname: 'localhost',
            },
          },
        ]),
      );
    });

    it('no profiles', () => {
      configuration.connectionProfileUpdates.mockImplementation(() =>
        Observable.never(),
      );
      const sub = startFilesystems();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(0);
      expect(getFilesystems()).toHaveLength(0);
      expect(getFilesystemByHostname('foo')).toBe(undefined);
      sub.dispose();
      expect(getFilesystems()).toHaveLength(0);
      expect(getFilesystemByHostname('foo')).toBe(undefined);
    });

    it('one profile', () => {
      const sub = startFilesystems();
      const rfs = ((RemoteFileSystem.mock.instances: any): Array<
        RemoteFileSystemType,
      >);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(0);
      expect(Server.mock.instances).toHaveLength(1);
      expect(rfs).toHaveLength(1);
      expect(RemoteFileSystem).toHaveBeenCalledWith(
        'localhost',
        Server.mock.instances[0],
      );
      expect(getFilesystems()).toEqual(rfs);
      expect(getFilesystemByHostname('foo')).toBe(undefined);
      expect(rfs[0].getHostname()).toBe('localhost');
      expect(getFilesystemByHostname('localhost')).toBe(rfs[0]);
      sub.dispose();
      expect(getFilesystems()).toHaveLength(0);
      expect(getFilesystemByHostname('localhost')).toBe(undefined);
    });
  });

  describe('onEachFilesystem', () => {
    let disposeHandler;
    let handler;

    beforeEach(() => {
      configuration.connectionProfileUpdates.mockImplementation(() =>
        Observable.from([
          {
            kind: 'added',
            profile: {
              folders: ['a', 'b', 'c'],
              hostname: 'localhost',
            },
          },
        ]),
      );
      disposeHandler = jest.fn();
      handler = jest.fn(() => disposeHandler);
    });

    it('before load', () => {
      onEachFilesystem(handler);
      const sub = startFilesystems();

      expect(handler).toHaveBeenCalledWith(RemoteFileSystem.mock.instances[0]);
      expect(disposeHandler).toHaveBeenCalledTimes(0);

      // $FlowFixMe Dispose of the filesystem
      RemoteFileSystem.mock.instances[0].dispose();
      expect(disposeHandler).toHaveBeenCalledTimes(1);

      sub.dispose();
      expect(disposeHandler).toHaveBeenCalledTimes(1);
    });

    it('after load', async () => {
      const sub = startFilesystems();
      expect(getFilesystems()).toEqual(RemoteFileSystem.mock.instances);
      onEachFilesystem(handler);
      expect(handler).toHaveBeenCalledWith(RemoteFileSystem.mock.instances[0]);

      expect(disposeHandler).toHaveBeenCalledTimes(0);
      // Will dispose of all existing filesystems
      sub.dispose();
      expect(disposeHandler).toHaveBeenCalled();
    });

    it('after load, ignoreCurrent', () => {
      const sub = startFilesystems();
      onEachFilesystem(handler, {ignoreCurrent: true});

      expect(handler).toHaveBeenCalledTimes(0);
      expect(disposeHandler).toHaveBeenCalledTimes(0);
      expect(disposeHandler).toHaveBeenCalledTimes(0);
      sub.dispose();
      expect(handler).toHaveBeenCalledTimes(0);
      expect(disposeHandler).toHaveBeenCalledTimes(0);
    });

    it('unsubscribe early', () => {
      // Subscribe & unsubscribe before loading filesystems
      onEachFilesystem(handler).dispose();

      const sub = startFilesystems();

      // `handler` should not have handled any
      expect(handler).toHaveBeenCalledTimes(0);
      expect(disposeHandler).toHaveBeenCalledTimes(0);

      sub.dispose();
      expect(handler).toHaveBeenCalledTimes(0);
      expect(disposeHandler).toHaveBeenCalledTimes(0);
      expect(disposeHandler).toHaveBeenCalledTimes(0);
    });
  });
});