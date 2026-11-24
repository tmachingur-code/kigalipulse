const NodeCache = require("node-cache");

// Store cached data for 10 minutes (600 seconds)
const cache = new NodeCache({
    stdTTL: 600,
    checkperiod: 120
});

// Retrieve data from the cache
function getCache(key) {
    return cache.get(key);
}

// Save data in the cache 
function setCache(key, data, ttl = 600) {
    cache.set(key, data, ttl);
}

// Remove a specific item from the cache
function deleteCache(key) {
    cache.del(key);
}

module.exports = {
    getCache,
    setCache,
    deleteCache
};