(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./string'));
    } else {
        root['autoComplete/utils/localStorage'] = factory(root['autoComplete/utils/string']);
    }
}(typeof self !== 'undefined' ? self : this, function (_string) {
    var escapeSpecialChars = _string.escapeSpecialChars,
        removeHtlmTags = _string.removeHtlmTags;

    function saveSuggestionQueries(storageName, queries) {
        queries = removeHtlmTags(JSON.stringify(queries));
        window.localStorage.setItem(storageName, queries);
    }

    function getSuggestionQueries(storageName) {
        try {
            return JSON.parse(window.localStorage.getItem(storageName));
        } catch (ignored) {
            return [];
        }
    }

    function removeQueryFromLocalStorage(storageName, term) {
        delete term.isQueryHistory;
        var queries = getSuggestionQueries(storageName);
        var filteredQueries = queries.filter(function (query) {
            return JSON.stringify(query) !== removeHtlmTags(JSON.stringify(term));
        });
        saveSuggestionQueries(storageName, filteredQueries);
    }

    function addQueryToLocalStorage(storageName, query, localSize) {
        delete query.isQueryHistory;
        var queries = getSuggestionQueries(storageName);
        if (queries === null) {
            saveSuggestionQueries(storageName, [query]);
        } else {
            queries = queries.filter(function (element) {
                return JSON.stringify(element) !== removeHtlmTags(JSON.stringify(query));
            })
            if (queries.length >= localSize) {
                queries.shift();
            }
            queries.push(query);
            saveSuggestionQueries(storageName, queries);
        }
    }

    function getQueriesFromLocalStorage(storageName, term, target) {
        var queries = getSuggestionQueries(storageName);
        if (queries !== null) {
            var matchedQueries = queries.map(function (query) {
                var match
                var regex
                if (target !== null && query[target]) {
                    regex = new RegExp('^'+escapeSpecialChars(term[target]));
                    match = regex.exec(query[target]);
                    if (match !== null) {
                        query[target] = query[target].replace(match[0], '<span>'.concat(match[0], '</span>'))
                        query.isQueryHistory = true;
                        return query
                    }
                }
                return null;
            });
            matchedQueries = matchedQueries.filter(function (value) { return value !== null });
            return matchedQueries.reverse();
        }
        return [];
    }


    function removeDuplicatedQueries(queries) {
        var titles = [];
        var cleanQueries = [];
        for (var i = 0; i < queries.length; i++) {
            var isLocal = queries[i].isQueryHistory;
            delete queries[i].isQueryHistory;
            var text = removeHtlmTags(JSON.stringify(queries[i]))
            if (titles.indexOf(text) === -1) {
                titles.push(text);
                queries[i].isQueryHistory = isLocal;
                cleanQueries.push(queries[i]);
            }
        }
        return cleanQueries;
    }
    return {
        getSuggestionQueries: getSuggestionQueries,
        saveSuggestionQueries: saveSuggestionQueries,
        removeQueryFromLocalStorage: removeQueryFromLocalStorage,
        addQueryToLocalStorage: addQueryToLocalStorage,
        getQueriesFromLocalStorage: getQueriesFromLocalStorage,
        removeDuplicatedQueries: removeDuplicatedQueries
    };
}));
