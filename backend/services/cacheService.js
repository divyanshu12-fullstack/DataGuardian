import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour default TTL

export const cacheService = {
  get: (key) => cache.get(key),
  set: (key, value) => cache.set(key, value),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
};
