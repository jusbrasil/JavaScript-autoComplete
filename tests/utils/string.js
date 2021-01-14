var _string = require('../../utils/string'),
    escapeSpecialChars = _string.escapeSpecialChars,
    removeBoldElement = _string.removeBoldElement;

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

        // WHEN
        string1 = removeBoldElement(string1);
        string2 = removeBoldElement(string2);


        // THEN
        expect(string1).toEqual('testing');
        expect(string2).toEqual('testing');

    })
})
