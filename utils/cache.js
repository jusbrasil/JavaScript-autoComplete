(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./string'));
    } else {
        root['autoComplete/utils/cache'] = factory(root['autoComplete/utils/string']);
    }
}(typeof self !== 'undefined' ? self : this, function (_string) {
    var removeHtlmTags = _string.removeHtlmTags;

    function removeSuggestionFromCache(cache, suggestion) {
        var cleanCache = {};
        for (var key in cache) {
            cleanCache[key] = cache[key].filter(function (element) {
                return removeHtlmTags(JSON.stringify(element)) !== removeHtlmTags(JSON.stringify(suggestion));
            })
        }
        return cleanCache;
    }
    return {
        removeSuggestionFromCache: removeSuggestionFromCache
    };
}));
