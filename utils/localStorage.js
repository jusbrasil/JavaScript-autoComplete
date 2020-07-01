var MAX_LOCAL_QUERIES = 5;

function saveSuggestionQueries(storageName, queries) {
    window.localStorage.setItem(storageName, JSON.stringify(queries));
}

function getSuggestionQueries(storageName) {
    try {
        return JSON.parse(window.localStorage.getItem(storageName));
    } catch (ignored) {
        return [];
    }
}

function removeQueryFromLocalStorage(storageName, term) {
    var queries = getSuggestionQueries(storageName);
    var filteredQueries = queries.filter(function (query) {
        return query !== term;
    });
    saveSuggestionQueries(storageName, filteredQueries);
}

function addQueryToLocalStorage(storageName, query) {
    var queries = getSuggestionQueries(storageName);
    if (queries === null) {
        saveSuggestionQueries(storageName, [query]);
    } else {
        if (!queries.includes(query)) {
            if (queries.length >= MAX_LOCAL_QUERIES) {
                queries.shift();
            }
            queries.push(query);
        }
        saveSuggestionQueries(storageName, queries);
    }
}

function getQueriesFromLocalStorage(storageName, term) {
    var localQueries = getSuggestionQueries(storageName);

    if (localQueries !== null) {
        var matchedQueries = localQueries.map(function (query) {
            query.replace(/<b>|<\/b>/g, '');
            var suggestion = new DOMParser().parseFromString( query,"text/html").body.firstElementChild.textContent.trim()
            var regex = new RegExp(`^${term}`);
            var match = regex.exec(suggestion);
            if (match) {
                return query.replace(match, `<b>${match}</b>`);
            }
            return null;
        });
        matchedQueries = matchedQueries.filter(function (value) { return value !== null });
        return matchedQueries;
    }
    return [];
}


function removeDuplicatedQueries(queries) {
    var titles = [];
    var cleanQueries = [];
    for (var query of queries) {
        var text = {...query}
        delete text.isQueryHistory
        var text = JSON.stringify(text).replace(/<b>|<\/b>/g, '')
        if (!titles.includes(text)) {
            titles.push(text);
            cleanQueries.push(query);
        }
    }
    return cleanQueries;
}

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root['autoComplete/utils/localStorage'] = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    return {
        getSuggestionQueries,
        saveSuggestionQueries,
        removeQueryFromLocalStorage,
        addQueryToLocalStorage,
        getQueriesFromLocalStorage,
        removeDuplicatedQueries,
        MAX_LOCAL_QUERIES
    };
}));
