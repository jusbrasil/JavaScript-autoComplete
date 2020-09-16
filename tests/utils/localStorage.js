var _localStorage = require('../../utils/localStorage'),
    removeQueryFromLocalStorage = _localStorage.removeQueryFromLocalStorage,
    addQueryToLocalStorage = _localStorage.addQueryToLocalStorage,
    getQueriesFromLocalStorage = _localStorage.getQueriesFromLocalStorage,
    getSuggestionQueries = _localStorage.getSuggestionQueries,
    saveSuggestionQueries = _localStorage.saveSuggestionQueries,
    removeDuplicatedQueries = _localStorage.removeDuplicatedQueries
    defaultLocalSize = 5;


describe('Local storage functions', function () {
    var testStorageName = 'testStorage';

    beforeEach(function () {
        window.localStorage.removeItem(testStorageName);
    });

    it('should return null if localStorage does not exists', function () {
        // WHEN
        var queries = getSuggestionQueries(expect);

        // THEN
        expect(queries).toEqual(null);

    });

    it('should return empty array when getting from localStorage if throw error', function () {
        // GIVEN
        window.localStorage.setItem(testStorageName, "{ { test:broken JSON object }");

        // WHEN
        var queries = getSuggestionQueries(testStorageName);

        // THEN
        expect(queries).toEqual([]);
    })

    it('should remove queries from localStorage', function () {
        // GIVEN
        window.localStorage.setItem(testStorageName, JSON.stringify(['any', 'target', 'any']));

        // WHEN
        removeQueryFromLocalStorage(testStorageName, 'target');

        // THEN
        var queries = getSuggestionQueries(testStorageName);
        expect(queries).toEqual(['any', 'any']);
    });

    it('should create localStorage if not exists', function () {
        // WHEN
        addQueryToLocalStorage(testStorageName, 'target', defaultLocalSize);

        // THEN
        var queries = getSuggestionQueries(testStorageName);
        expect(queries).not.toBeNull();
    });

    it('should not add query if already is in localStorage', function () {
        // GIVEN 
        addQueryToLocalStorage(testStorageName, 'target', defaultLocalSize);

        // WHEN 
        addQueryToLocalStorage(testStorageName, 'target', defaultLocalSize);

        // THEN
        var queries = getSuggestionQueries(testStorageName);
        expect(queries).toEqual(['target']);
    });

    it('should delete last query if localStorage full', function () {
        // GIVEN
        addQueryToLocalStorage(testStorageName, 'last', defaultLocalSize);
        for (var i = 0; i < defaultLocalSize - 1; i++) {
            addQueryToLocalStorage(testStorageName, i, defaultLocalSize);
        }

        // WHEN
        addQueryToLocalStorage(testStorageName, i, defaultLocalSize);

        // THEN
        var queries = getSuggestionQueries(testStorageName);
        expect(queries).toEqual(expect.not.arrayContaining(['last']));
    });

    it('should add query if localStorage exist and not full', function () {
        // GIVEN 
        addQueryToLocalStorage(testStorageName, 'first', defaultLocalSize);

        // WHEN
        addQueryToLocalStorage(testStorageName, 'second', defaultLocalSize);

        // THEN
        var queries = getSuggestionQueries(testStorageName);
        expect(queries).toEqual(['first', 'second']);
    });


    it('should return empty arry if localStorage does not exists', function () {
        // WHEN
        var queries = getQueriesFromLocalStorage(testStorageName, 'any');

        // THEN
        expect(queries).toEqual([]);
    })

    it('should returne formated queries', function () {
        // GIVEN
        addQueryToLocalStorage(testStorageName, { target: 'first' }, defaultLocalSize);
        addQueryToLocalStorage(testStorageName, { target: '[a]bo{b}ora' }, defaultLocalSize); //special characters test

        // WHEN
        var queries = getQueriesFromLocalStorage(testStorageName, { target: '[a]bo{b}o' }, 'target');

        // THEN
        expect(queries).toMatchObject([{ target: '<b>[a]bo{b}o</b>ra', isQueryHistory: true }])
    });

    it('should return matched queries with bold propety in matched characters', function () {
        // GIVEN 
        addQueryToLocalStorage(testStorageName, {target: "testing"}, defaultLocalSize);

        // WHEN 
        var queries = getQueriesFromLocalStorage(testStorageName, { target: "test" }, 'target');

        // THEN
        expect(queries).toMatchObject([{target:'<b>test</b>ing',isQueryHistory:true}]);
    });

    it('should remove queries with same title', function () {
        // GIVEN
        var queries = [{ titulo: 'equal' }, { titulo: 'any' }, { titulo: 'equal' }, { titulo: 'diff' }];

        // WHEN
        removeDuplicatedQueries(queries);

        // THEN
        expect(queries).toMatchObject([{ titulo: 'equal' },
        { titulo: 'any' },
        { titulo: 'equal' },
        { titulo: 'diff' }]);
    });
})