function escapeSpecialChars(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function removeBoldElement(string) {
    return string.replace(/<\/?[A-z]*>/g, '');
}

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root['autoComplete/utils/string'] = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    return {
        escapeSpecialChars: escapeSpecialChars,
        removeBoldElement: removeBoldElement
    };
}));
