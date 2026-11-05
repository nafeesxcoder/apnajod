import { describe, expect, it } from 'vitest';

import { socketTarget } from './chatSocket';

/**
 * The API can live behind a path prefix.
 *
 * In production nginx serves the API at http://host/api on port 80, so the
 * backend's own port never has to be open to the internet. socket.io reads a
 * path in the URL as a namespace rather than a prefix, so connecting to
 * ".../api" asked for a namespace the server does not have and chat was
 * refused while every REST call worked - the kind of split that looks like a
 * chat bug and is really a URL bug.
 */
describe('socketTarget', () => {
  it('moves a path prefix out of the URL and into the path option', () => {
    expect(socketTarget('http://31.42.125.109/api')).toEqual({
      origin: 'http://31.42.125.109',
      path: '/api/socket.io',
    });
  });

  it('ignores a trailing slash', () => {
    expect(socketTarget('http://31.42.125.109/api/')).toEqual({
      origin: 'http://31.42.125.109',
      path: '/api/socket.io',
    });
  });

  it('leaves a plain origin alone', () => {
    expect(socketTarget('http://localhost:4000')).toEqual({
      origin: 'http://localhost:4000',
      path: '/socket.io',
    });
  });

  it('keeps https and a port', () => {
    expect(socketTarget('https://apnajod.in/api')).toEqual({
      origin: 'https://apnajod.in',
      path: '/api/socket.io',
    });
  });
});
