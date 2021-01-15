var _string = require('../../utils/string'),
    escapeSpecialChars = _string.escapeSpecialChars,
    removeHtlmTags = _string.removeHtlmTags;

describe('String related functions', function () {
    it('should escape with \ all special chars',function(){
        // GIVE
        var string = "[something]*/?^+()|{}-";

        // WHEN
        string = escapeSpecialChars(string);

        // THEN
        expect(string).toEqual('\\[something\\]\\*\\/\\?\\^\\+\\(\\)\\|\\{\\}\\-');
    });

    it('should remove any tag mark from string',function(){
        // GIVEN
        var string1 = '<b>test</b>ing';
        var string2 = '<span><span>testing';
        var string3 = '<span><b>Nested</b> test</span>'

        // WHEN
        string1 = removeHtlmTags(string1);
        string2 = removeHtlmTags(string2);
        string3 = removeHtlmTags(string3);

        // THEN
        expect(string1).toEqual('testing');
        expect(string2).toEqual('testing');
        expect(string3).toEqual('Nested test');

    })
})
